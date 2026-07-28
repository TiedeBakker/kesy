import { eq, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { dbLocal, dbRemote, isCloudOnly } from "./index";
import {
  objects,
  relations,
  relationValues,
  parameters,
  parameterValues,
} from "./schema";

export type EntityType =
  | "object"
  | "relation"
  | "relation_value"
  | "parameter"
  | "parameter_value";

//
// 1. GENERIEK ITEM AANMAKEN
//
export async function maakNieuwItem(type: EntityType, data: Record<string, any>) {
  const newId = uuidv7();
  const timestamp = new Date().toISOString();

  // Zorg dat 1 of true altijd als boolean true wordt gezien
  const isConfidential = Boolean(data.isConfidential);

  const baseData = {
    id: newId,
    ...data,
  };

  // Stamgegevens (relations & parameters) schrijven we naar beide databases
  if (type === "relation" || type === "parameter") {
    if (dbRemote) await insertIntoTable(dbRemote, type, baseData);
    await insertIntoTable(dbLocal, type, baseData);
    return newId;
  }

  // Waarden sturen naar de juiste DB
  const targetDb = isConfidential || !dbRemote ? dbLocal : dbRemote;

  const dataWithTime = {
    ...baseData,
    validFrom: data.validFrom || timestamp,
    isConfidential,
  };

  await insertIntoTable(targetDb, type, dataWithTime);
  return newId;
}

async function insertIntoTable(targetDb: any, type: EntityType, baseData: any) {
  switch (type) {
    case "object":
      await targetDb.insert(objects).values(baseData as any);
      break;
    case "relation":
      await targetDb.insert(relations).values(baseData as any);
      break;
    case "relation_value":
      await targetDb.insert(relationValues).values(baseData as any);
      break;
    case "parameter":
      await targetDb.insert(parameters).values(baseData as any);
      break;
    case "parameter_value":
      await targetDb.insert(parameterValues).values(baseData as any);
      break;
  }
}

//
// 2. RELATIE AANMAKEN MET AUTOMATISCHE BEVEILIGINGSREGEL
//
export async function voegRelatieToeMetBeveiliging(
  sourceId: string,
  targetId: string,
  relationId: string
) {
  // 1. Haal de objecten expliciet op uit de LOKALE database
  const sourceLocal = (
    await dbLocal.select().from(objects).where(eq(objects.id, sourceId))
  )[0];
  const targetLocal = (
    await dbLocal.select().from(objects).where(eq(objects.id, targetId))
  )[0];

  // 2. Haal de objecten op uit de REMOTE database (als aanwezig)
  let sourceRemote = null;
  let targetRemote = null;
  if (dbRemote) {
    sourceRemote = (
      await dbRemote.select().from(objects).where(eq(objects.id, sourceId))
    )[0];
    targetRemote = (
      await dbRemote.select().from(objects).where(eq(objects.id, targetId))
    )[0];
  }

  // Debug informatie in de terminal weergeven
  console.log("--- DEBUG RELATIE AANMAKEN ---");
  console.log("Source ID:", sourceId);
  console.log("Source lokaal aanwezig?:", !!sourceLocal, "isConfidential:", sourceLocal?.isConfidential);
  console.log("Target ID:", targetId);
  console.log("Target lokaal aanwezig?:", !!targetLocal, "isConfidential:", targetLocal?.isConfidential);

  // 3. REGEL: Is een object LOKAAL aanwezig EN NIET in de cloud? 
  // Dan is het een vertrouwelijk/lokaal object!
  const isSourceOnlyLocal = !!sourceLocal && !sourceRemote;
  const isTargetOnlyLocal = !!targetLocal && !targetRemote;

  // 4. Bepaal of de relatie vertrouwelijk MOET zijn
  const isSourceConfidential =
    Boolean(sourceLocal?.isConfidential) || isSourceOnlyLocal;
  const isTargetConfidential =
    Boolean(targetLocal?.isConfidential) || isTargetOnlyLocal;

  const moetLokaalOpgeslagenWorden =
    isSourceConfidential || isTargetConfidential;

  console.log("Is Source vertrouwelijk/lokaal?:", isSourceConfidential);
  console.log("Is Target vertrouwelijk/lokaal?:", isTargetConfidential);
  console.log("-> Relatie opslaan in:", moetLokaalOpgeslagenWorden ? "LOKAAL (dbLocal)" : "TURSO (dbRemote)");
  console.log("------------------------------");

  return await maakNieuwItem("relation_value", {
    sourceId,
    targetId,
    relationId,
    isConfidential: moetLokaalOpgeslagenWorden,
  });
}

//
// 3. ITEM INVALIDE VERKLAREN
//
export async function maakItemOngeldig(type: EntityType, id: string) {
  const timestamp = new Date().toISOString();

  const dbs = [dbLocal, dbRemote].filter(
    (db): db is NonNullable<typeof db> => db !== null
  );

  for (const dbClient of dbs) {
    switch (type) {
      case "object":
        await dbClient.update(objects).set({ validTo: timestamp }).where(eq(objects.id, id));
        break;
      case "relation_value":
        await dbClient.update(relationValues).set({ validTo: timestamp }).where(eq(relationValues.id, id));
        break;
      case "parameter_value":
        await dbClient.update(parameterValues).set({ validTo: timestamp }).where(eq(parameterValues.id, id));
        break;
    }
  }
}

//
// 4. HAAL CENTRAAL OBJECT OP
//
export async function haalObjectOp(objectId: string) {
  let [obj] = await dbLocal.select().from(objects).where(eq(objects.id, objectId));

  if (!obj && dbRemote) {
    [obj] = await dbRemote.select().from(objects).where(eq(objects.id, objectId));
  }

  if (!obj) return null;

  const [paramsLocal, paramsRemote] = await Promise.all([
    dbLocal
      .select()
      .from(parameterValues)
      .where(
        sql`${parameterValues.targetId} = ${objectId} AND ${parameterValues.targetType} = 'object'`
      ),
    dbRemote
      ? dbRemote
          .select()
          .from(parameterValues)
          .where(
            sql`${parameterValues.targetId} = ${objectId} AND ${parameterValues.targetType} = 'object'`
          )
      : Promise.resolve([]),
  ]);

  return {
    ...obj,
    parameters: [...paramsLocal, ...paramsRemote],
  };
}

//
// 5. HAAL ALLE OBJECTEN OP
//
export async function haalAlleObjectenOp() {
  if (isCloudOnly) {
    return dbRemote
      ? await dbRemote.select().from(objects).where(sql`${objects.validTo} IS NULL`)
      : [];
  }

  const [lokaleObjecten, remoteObjecten] = await Promise.all([
    dbLocal.select().from(objects).where(sql`${objects.validTo} IS NULL`),
    dbRemote ? dbRemote.select().from(objects).where(sql`${objects.validTo} IS NULL`) : Promise.resolve([]),
  ]);

  const objectenMap = new Map();
  [...lokaleObjecten, ...remoteObjecten].forEach((obj) => objectenMap.set(obj.id, obj));

  return Array.from(objectenMap.values());
}

//
// 6. HAAL BOOM OP
//
export interface RelatieBoomItem {
  relation_value_id: string;
  source_id: string;
  target_id: string;
  relation_id: string;
  source_label?: string;
  target_label?: string;
  depth?: number;
}

//
// HELPERFUNCTIES: DIRECTE RELATIES OPHALEN
//
export async function haalDirecteIngaandeRelatiesOp(targetId: string): Promise<RelatieBoomItem[]> {
  const query = sql`
    SELECT 
      rv.id as relation_value_id,
      rv.source_id,
      rv.target_id,
      rv.relation_id,
      s.label as source_label
    FROM ${relationValues} rv
    LEFT JOIN ${objects} s ON rv.source_id = s.id
    WHERE rv.target_id = ${targetId} AND rv.valid_to IS NULL
  `;

  const localPromise = dbLocal.all<RelatieBoomItem>(query);
  const remotePromise = dbRemote ? dbRemote.all<RelatieBoomItem>(query) : Promise.resolve([]);

  const [localRows, remoteRows] = await Promise.all([localPromise, remotePromise]);
  const gecombineerd = [...remoteRows, ...localRows];

  const uniekMap = new Map<string, RelatieBoomItem>();
  for (const item of gecombineerd) {
    if (!uniekMap.has(item.relation_value_id)) {
      uniekMap.set(item.relation_value_id, item);
    }
  }

  return Array.from(uniekMap.values());
}

export async function haalDirecteUitgaandeRelatiesOp(sourceId: string): Promise<RelatieBoomItem[]> {
  const query = sql`
    SELECT 
      rv.id as relation_value_id,
      rv.source_id,
      rv.target_id,
      rv.relation_id,
      t.label as target_label
    FROM ${relationValues} rv
    LEFT JOIN ${objects} t ON rv.target_id = t.id
    WHERE rv.source_id = ${sourceId} AND rv.valid_to IS NULL
  `;

  const localPromise = dbLocal.all<RelatieBoomItem>(query);
  const remotePromise = dbRemote ? dbRemote.all<RelatieBoomItem>(query) : Promise.resolve([]);

  const [localRows, remoteRows] = await Promise.all([localPromise, remotePromise]);
  const gecombineerd = [...remoteRows, ...localRows];

  const uniekMap = new Map<string, RelatieBoomItem>();
  for (const item of gecombineerd) {
    if (!uniekMap.has(item.relation_value_id)) {
      uniekMap.set(item.relation_value_id, item);
    }
  }

  return Array.from(uniekMap.values());
}

//
// RECURSIEVE BOOM OPHALEN MET VERTAKKINGS-STOP EN CIRKEL-DETECTIE
//
export async function haalObjectenBoomOp(startId: string) {
  const visitedIngaand = new Set<string>([startId]);
  const visitedUitgaand = new Set<string>([startId]);

  const ingaandResultaat: RelatieBoomItem[] = [];
  await verzamelIngaand(startId, 1, visitedIngaand, ingaandResultaat);

  const uitgaandResultaat: RelatieBoomItem[] = [];
  await verzamelUitgaand(startId, 1, visitedUitgaand, uitgaandResultaat);

  return {
    ingaand: ingaandResultaat,
    uitgaand: uitgaandResultaat,
  };
}

async function verzamelIngaand(
  huidigId: string,
  diepte: number,
  visited: Set<string>,
  resultaat: RelatieBoomItem[],
  maxDiepte: number = 5
) {
  if (diepte > maxDiepte) return;

  const ouders = await haalDirecteIngaandeRelatiesOp(huidigId);
  const uniekeOuders = ouders.filter((o: RelatieBoomItem) => !visited.has(o.source_id));

  for (const ouder of uniekeOuders) {
    resultaat.push({ ...ouder, depth: diepte });
    visited.add(ouder.source_id);
  }

  const isVertakking = uniekeOuders.length >= 2;

  for (const ouder of uniekeOuders) {
    if (isVertakking) {
      const subOuders = await haalDirecteIngaandeRelatiesOp(ouder.source_id);
      const uniekeSubOuders = subOuders.filter((so: RelatieBoomItem) => !visited.has(so.source_id));

      for (const sub of uniekeSubOuders) {
        resultaat.push({ ...sub, depth: diepte + 1 });
        visited.add(sub.source_id);
      }
    } else {
      await verzamelIngaand(ouder.source_id, diepte + 1, visited, resultaat, maxDiepte);
    }
  }
}

async function verzamelUitgaand(
  huidigId: string,
  diepte: number,
  visited: Set<string>,
  resultaat: RelatieBoomItem[],
  maxDiepte: number = 5
) {
  if (diepte > maxDiepte) return;

  const kinderen = await haalDirecteUitgaandeRelatiesOp(huidigId);
  const uniekeKinderen = kinderen.filter((k: RelatieBoomItem) => !visited.has(k.target_id));

  for (const kind of uniekeKinderen) {
    resultaat.push({ ...kind, depth: diepte });
    visited.add(kind.target_id);
  }

  const isVertakking = uniekeKinderen.length >= 2;

  for (const kind of uniekeKinderen) {
    if (isVertakking) {
      const subKinderen = await haalDirecteUitgaandeRelatiesOp(kind.target_id);
      const uniekeSubKinderen = subKinderen.filter((sk: RelatieBoomItem) => !visited.has(sk.target_id));

      for (const sub of uniekeSubKinderen) {
        resultaat.push({ ...sub, depth: diepte + 1 });
        visited.add(sub.target_id);
      }
    } else {
      await verzamelUitgaand(kind.target_id, diepte + 1, visited, resultaat, maxDiepte);
    }
  }
}

//
// 7. HAAL RELATIETYPEN OP
//
export async function haalRelatieTypenOp() {
  const targetDb = dbRemote || dbLocal;
  let typen = await targetDb.select().from(relations);

  if (typen.length === 0) {
    const standaardId = uuidv7();
    const nieuwType = {
      id: standaardId,
      label: "gerelateerd aan",
    };
    await maakNieuwItem("relation", nieuwType);
    return [nieuwType];
  }

  return typen;
}