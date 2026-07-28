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
// 2. RELATIE AANMAKEN MET AUTOMATISCHE BEVEILIGINGSREGEL:
// Relatie is PAS publiek als BEIDE gekoppelde objecten publiek zijn!
//
// RELATIE AANMAKEN MET WATERDICHTE BEVEILIGINGSREGEL
//
//
// RELATIE AANMAKEN MET DEBUG LOGGING EN WATERDICHTE BEVEILIGINGSCHECK
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
export async function haalObjectenBoomOp(rootObjectId: string) {
  const queryUitgaand = sql`
    WITH RECURSIVE tree AS (
      SELECT 
        rv.id AS relation_value_id,
        rv.source_id,
        rv.target_id,
        rv.relation_id,
        1 AS depth
      FROM relation_values rv
      WHERE rv.source_id = ${rootObjectId} AND rv.valid_to IS NULL

      UNION ALL

      SELECT 
        rv.id AS relation_value_id,
        rv.source_id,
        rv.target_id,
        rv.relation_id,
        t.depth + 1
      FROM relation_values rv
      INNER JOIN tree t ON rv.source_id = t.target_id
      WHERE rv.valid_to IS NULL AND t.depth < 5
    )
    SELECT 
      t.*, 
      o.label AS target_label 
    FROM tree t
    LEFT JOIN objects o ON t.target_id = o.id;
  `;

  const queryIngaand = sql`
    WITH RECURSIVE tree AS (
      SELECT 
        rv.id AS relation_value_id,
        rv.source_id,
        rv.target_id,
        rv.relation_id,
        1 AS depth
      FROM relation_values rv
      WHERE rv.target_id = ${rootObjectId} AND rv.valid_to IS NULL

      UNION ALL

      SELECT 
        rv.id AS relation_value_id,
        rv.source_id,
        rv.target_id,
        rv.relation_id,
        t.depth + 1
      FROM relation_values rv
      INNER JOIN tree t ON rv.target_id = t.source_id
      WHERE rv.valid_to IS NULL AND t.depth < 5
    )
    SELECT 
      t.*, 
      o.label AS source_label 
    FROM tree t
    LEFT JOIN objects o ON t.source_id = o.id;
  `;

  const [uitgaandLocal, ingaandLocal] = await Promise.all([
    dbLocal.run(queryUitgaand),
    dbLocal.run(queryIngaand),
  ]);

  let uitgaandRemoteRows: any[] = [];
  let ingaandRemoteRows: any[] = [];

  if (dbRemote) {
    const [uitgaandRemote, ingaandRemote] = await Promise.all([
      dbRemote.run(queryUitgaand),
      dbRemote.run(queryIngaand),
    ]);
    uitgaandRemoteRows = uitgaandRemote.rows || [];
    ingaandRemoteRows = ingaandRemote.rows || [];
  }

  const uitgaandMap = new Map();
  [...(uitgaandLocal.rows || []), ...uitgaandRemoteRows].forEach((r: any) =>
    uitgaandMap.set(r.relation_value_id, r)
  );

  const ingaandMap = new Map();
  [...(ingaandLocal.rows || []), ...ingaandRemoteRows].forEach((r: any) =>
    ingaandMap.set(r.relation_value_id, r)
  );

  return {
    uitgaand: Array.from(uitgaandMap.values()),
    ingaand: Array.from(ingaandMap.values()),
  };
}

//
// 7. HAAL RELATIETYPEN OP (Automatische seeding van standaard 'gerelateerd aan')
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