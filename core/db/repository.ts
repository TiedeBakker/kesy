// kesy/core/db/repository.ts
import { eq, sql, asc } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { dbLocal, dbRemote, isCloudOnly } from "./index";
import {
    objects,
    relations,
    relationValues,
    parameters,
    parameterValues,
    units,
    relevanteTaxa
} from "./schema";

export type EntityType =
    | "object"
    | "relation"
    | "relation_value"
    | "parameter"
    | "parameter_value"
    | "unit"
    | "relevante_taxon";

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

    // 🔴 NIEUW: Stamgegevens (parameters, units, relation definities) 
    // Schrijven we EXCLUSIEF naar Turso (dbRemote) als die beschikbaar is, 
    // anders als fallback lokaal (bijv. tijdens offline development).
    if (type === "relation" || type === "parameter" || type === "unit") {
        const stamDb = dbRemote || dbLocal;
        if (stamDb) {
            await insertIntoTable(stamDb, type, baseData);
        }
        return newId;
    }

    // Waarden sturen naar de juiste DB
    const targetDb = isConfidential || !dbRemote ? dbLocal : dbRemote;

    const dataWithTime = {
        ...baseData,
        validFrom: data.validFrom || timestamp,
        isConfidential,
    };

    if (targetDb) {
        await insertIntoTable(targetDb, type, dataWithTime);
    }
    return newId;
}

async function insertIntoTable(targetDb: any, type: EntityType, baseData: any) {
    if (!targetDb) return;
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
        case "unit": // <-- 2. Deze case is toegevoegd!
            await targetDb.insert(units).values(baseData as any);
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
    // 1. Haal de objecten expliciet op uit de LOKALE database (indien aanwezig)
    const sourceLocal = dbLocal
        ? (await dbLocal.select().from(objects).where(eq(objects.id, sourceId)))[0]
        : null;
    const targetLocal = dbLocal
        ? (await dbLocal.select().from(objects).where(eq(objects.id, targetId)))[0]
        : null;

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
    let obj = null;
    if (dbLocal) {
        [obj] = await dbLocal.select().from(objects).where(eq(objects.id, objectId));
    }

    if (!obj && dbRemote) {
        [obj] = await dbRemote.select().from(objects).where(eq(objects.id, objectId));
    }

    if (!obj) return null;

    const [paramsLocal, paramsRemote] = await Promise.all([
        dbLocal
            ? dbLocal
                .select()
                .from(parameterValues)
                .where(
                    sql`${parameterValues.targetId} = ${objectId} AND ${parameterValues.targetType} = 'object'`
                )
            : Promise.resolve([]),
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
        dbLocal
            ? dbLocal.select().from(objects).where(sql`${objects.validTo} IS NULL`)
            : Promise.resolve([]),
        dbRemote
            ? dbRemote.select().from(objects).where(sql`${objects.validTo} IS NULL`)
            : Promise.resolve([]),
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
    childCount?: number;
    parameters?: {             // <-- NIEUW VOOR STAP 4
        id: string;
        parameterId: string;
        parameterLabel?: string;
        value: string;
        validFrom?: string;
        isConfidential?: boolean;
    }[];
}

//
// HELPERFUNCTIES: DIRECTE RELATIES OPHALEN
//
//
// HELPERFUNCTIES: DIRECTE RELATIES OPHALEN (MET PAGINERING EN GEBUNDELDE PARAMS)
//
export async function haalDirecteIngaandeRelatiesOp(
    targetId: string,
    limit: number = 50,
    offset: number = 0
): Promise<RelatieBoomItem[]> {
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
    LIMIT ${limit} OFFSET ${offset}
  `;

    const localPromise = dbLocal ? dbLocal.all<RelatieBoomItem>(query) : Promise.resolve([]);
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

export async function haalDirecteUitgaandeRelatiesOp(
    sourceId: string,
    limit: number = 50,
    offset: number = 0
): Promise<RelatieBoomItem[]> {
    const query = sql`
    SELECT 
      rv.id as relation_value_id,
      rv.source_id,
      rv.target_id,
      rv.relation_id,
      t.label as target_label,
      rv.volgorde,
      rv.is_confidential as isConfidential
    FROM ${relationValues} rv
    LEFT JOIN ${objects} t ON rv.target_id = t.id
    WHERE rv.source_id = ${sourceId} AND rv.valid_to IS NULL
    ORDER BY rv.volgorde ASC, rv.id ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

    const localPromise = dbLocal ? dbLocal.all<any>(query) : Promise.resolve([]);
    const remotePromise = dbRemote ? dbRemote.all<any>(query) : Promise.resolve([]);

    const [localRows, remoteRows] = await Promise.all([localPromise, remotePromise]);
    const gecombineerd = [...remoteRows, ...localRows];

    const uniekMap = new Map<string, RelatieBoomItem>();
    for (const item of gecombineerd) {
        if (!uniekMap.has(item.relation_value_id)) {
            uniekMap.set(item.relation_value_id, item);
        }
    }

    const relaties = Array.from(uniekMap.values());
    if (relaties.length === 0) return [];

    // Oplossing N+1 query: Haal in ÉÉN query de parameters op voor de getoonde relaties
    const relatieIds = relaties.map((r) => r.relation_value_id);
    const inClause = sql.raw(relatieIds.map((id) => `'${id}'`).join(","));

    const paramQuery = sql`
        SELECT 
          pv.id,
          pv.target_id as relationValueId,
          pv.parameter_id as parameterId,
          p.label as parameterLabel,
          pv.value,
          pv.valid_from as validFrom,
          pv.is_confidential as isConfidential
        FROM ${parameterValues} pv
        LEFT JOIN ${parameters} p ON pv.parameter_id = p.id
        WHERE pv.target_id IN (${inClause})
          AND pv.target_type = 'relation_value'
          AND pv.valid_to IS NULL
    `;

    const [localParams, remoteParams] = await Promise.all([
        dbLocal ? dbLocal.all<any>(paramQuery) : Promise.resolve([]),
        dbRemote ? dbRemote.all<any>(paramQuery) : Promise.resolve([]),
    ]);

    const paramsPerRelatie = new Map<string, any[]>();
    [...remoteParams, ...localParams].forEach((p) => {
        if (!paramsPerRelatie.has(p.relationValueId)) {
            paramsPerRelatie.set(p.relationValueId, []);
        }
        const bestaand = paramsPerRelatie.get(p.relationValueId)!;
        if (!bestaand.some((item) => item.id === p.id)) {
            bestaand.push(p);
        }
    });

    return relaties.map((rel) => ({
        ...rel,
        parameters: paramsPerRelatie.get(rel.relation_value_id) || [],
    }));
}
// NIEUWE FUNCTIE: Werkt de volgorde bij in alle relevante databases
export async function updateRelatieVolgorde(relationValueId: string, nieuweVolgorde: number) {
    const dbs = [dbLocal, dbRemote].filter(
        (db): db is NonNullable<typeof db> => db !== null
    );

    for (const dbClient of dbs) {
        await dbClient
            .update(relationValues)
            .set({ volgorde: nieuweVolgorde })
            .where(eq(relationValues.id, relationValueId));
    }
}
//
// RECURSIEVE BOOM OPHALEN MET VERTAKKINGS-STOP EN CIRKEL-DETECTIE
//
// core/db/repository.ts

export async function haalObjectenBoomOp(
    startId: string,
    pageIngaand: number = 1,
    pageUitgaand: number = 1,
    pageSize: number = 50
) {
    const visitedIngaand = new Set<string>([startId]);
    const visitedUitgaand = new Set<string>([startId]);

    const ingaandResultaat: RelatieBoomItem[] = [];
    await verzamelIngaand(startId, 1, visitedIngaand, ingaandResultaat, 5, pageIngaand, pageSize);

    const uitgaandResultaat: RelatieBoomItem[] = [];
    await verzamelUitgaand(startId, 1, visitedUitgaand, uitgaandResultaat, 5, pageUitgaand, pageSize);

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
    maxDiepte: number = 5,
    page: number = 1,
    pageSize: number = 50
) {
    if (diepte > maxDiepte) return;

    // Pas de offset toe voor het eerste niveau (diepte 1)
    const offset = diepte === 1 ? (page - 1) * pageSize : 0;
    const limit = diepte === 1 ? pageSize : 50;

    const ouders = await haalDirecteIngaandeRelatiesOp(huidigId, limit, offset);
    const uniekeOuders = ouders.filter((o: RelatieBoomItem) => !visited.has(o.source_id));

    if (uniekeOuders.length === 0) return;

    const isVertakking = uniekeOuders.length > 1;

    if (isVertakking) {
        for (const ouder of uniekeOuders) {
            visited.add(ouder.source_id);
            const subOuders = await haalDirecteIngaandeRelatiesOp(ouder.source_id, 50, 0);
            const uniekeSubCount = subOuders.filter((so) => !visited.has(so.source_id)).length;

            resultaat.push({
                ...ouder,
                depth: diepte,
                childCount: uniekeSubCount
            });
        }
    } else {
        const enkelvoudigeOuder = uniekeOuders[0];
        visited.add(enkelvoudigeOuder.source_id);
        resultaat.push({ ...enkelvoudigeOuder, depth: diepte });

        await verzamelIngaand(enkelvoudigeOuder.source_id, diepte + 1, visited, resultaat, maxDiepte, 1, pageSize);
    }
}

async function verzamelUitgaand(
    huidigId: string,
    diepte: number,
    visited: Set<string>,
    resultaat: RelatieBoomItem[],
    maxDiepte: number = 5,
    page: number = 1,
    pageSize: number = 50
) {
    if (diepte > maxDiepte) return;

    const offset = diepte === 1 ? (page - 1) * pageSize : 0;
    const limit = diepte === 1 ? pageSize : 50;

    const kinderen = await haalDirecteUitgaandeRelatiesOp(huidigId, limit, offset);
    const uniekeKinderen = kinderen.filter((k: RelatieBoomItem) => !visited.has(k.target_id));

    if (uniekeKinderen.length === 0) return;

    const isVertakking = uniekeKinderen.length > 1;

    if (isVertakking) {
        for (const kind of uniekeKinderen) {
            visited.add(kind.target_id);
            const subKinderen = await haalDirecteUitgaandeRelatiesOp(kind.target_id, 50, 0);
            const uniekeSubCount = subKinderen.filter((sk) => !visited.has(sk.target_id)).length;

            resultaat.push({
                ...kind,
                depth: diepte,
                childCount: uniekeSubCount
            });
        }
    } else {
        const enkelvoudigKind = uniekeKinderen[0];
        visited.add(enkelvoudigKind.target_id);
        resultaat.push({ ...enkelvoudigKind, depth: diepte });

        await verzamelUitgaand(enkelvoudigKind.target_id, diepte + 1, visited, resultaat, maxDiepte, 1, pageSize);
    }
}
//
// 7. HAAL RELATIETYPEN OP
//
export async function haalRelatieTypenOp() {
    const targetDb = dbRemote || dbLocal;
    if (!targetDb) return [];

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

export interface ObjectDetails {
    object: {
        id: string;
        label: string;
        type?: string;
        isConfidential?: boolean;
        validFrom?: string;
    };
    ingaandeRelaties: RelatieBoomItem[];
    uitgaandeRelaties: RelatieBoomItem[];
    parameterWaarden: {
        id: string;
        parameterId: string;
        parameterLabel?: string;
        value: string;
        validFrom?: string;
        isConfidential?: boolean;
    }[];
}

export async function haalObjectDetailsOp(objectId: string): Promise<ObjectDetails | null> {
    // 1. Haal basis object op
    const obj = await haalObjectOp(objectId);
    if (!obj) return null;

    // 2. Haal ingaande en uitgaande relaties op
    const [ingaand, uitgaand] = await Promise.all([
        haalDirecteIngaandeRelatiesOp(objectId),
        haalDirecteUitgaandeRelatiesOp(objectId),
    ]);

    // 3. Haal actieve parameterwaarden op inclusief de parameternamen
    const paramQuery = sql`
    SELECT 
      pv.id,
      pv.parameter_id as parameterId,
      p.label as parameterLabel,
      pv.value,
      pv.valid_from as validFrom,
      pv.is_confidential as isConfidential
    FROM ${parameterValues} pv
    LEFT JOIN ${parameters} p ON pv.parameter_id = p.id
    WHERE pv.target_id = ${objectId} 
      AND pv.target_type = 'object'
      AND pv.valid_to IS NULL
  `;

    const localParams = dbLocal ? await dbLocal.all<any>(paramQuery) : [];
    const remoteParams = dbRemote ? await dbRemote.all<any>(paramQuery) : [];

    // Samenvoegen en ontdubbelen op id
    const paramMap = new Map();
    [...remoteParams, ...localParams].forEach((p) => paramMap.set(p.id, p));

    return {
        object: obj,
        ingaandeRelaties: ingaand,
        uitgaandeRelaties: uitgaand,
        parameterWaarden: Array.from(paramMap.values()),
    };
}
//
// 8. PARAMETER DEFINITIES (STAMGEGEVENS) OPHALEN & AANMAKEN
//
export async function haalAlleParameterDefinitiesOp() {
    const [lokaleParams, remoteParams] = await Promise.all([
        dbLocal ? dbLocal.select().from(parameters) : Promise.resolve([]),
        dbRemote ? dbRemote.select().from(parameters) : Promise.resolve([]),
    ]);

    const paramMap = new Map();
    [...remoteParams, ...lokaleParams].forEach((p) => paramMap.set(p.id, p));

    return Array.from(paramMap.values());
}

//
// 9. PARAMETERWAARDE VERNIEUWEN MET HISTORIE
//
export async function vernieuwParameterWaardeMetHistorie(
    oudeValueId: string,
    objectId: string,
    parameterId: string,
    nieuweWaarde: string,
    isConfidential: boolean = false
) {
    // 1. Sluit het oude record af (validTo = nu)
    await maakItemOngeldig("parameter_value", oudeValueId);

    // 2. Maak een nieuw record aan (validFrom = nu)
    return await maakNieuwItem("parameter_value", {
        targetId: objectId,
        targetType: "object",
        parameterId,
        value: nieuweWaarde,
        isConfidential,
    });
}

export async function haalAlleEenhedenOp() {
    const [lokaleUnits, remoteUnits] = await Promise.all([
        dbLocal ? dbLocal.select().from(units) : Promise.resolve([]),
        dbRemote ? dbRemote.select().from(units) : Promise.resolve([]),
    ]);

    const unitMap = new Map();
    [...remoteUnits, ...lokaleUnits].forEach((u) => unitMap.set(u.id, u));

    return Array.from(unitMap.values());
}

export async function maakNieuweEenheid(label: string, symbol: string) {
    return await maakNieuwItem("unit", { label, symbol });
}

export async function voegParameterWaardeToeMetBeveiliging(
    targetId: string,
    parameterId: string,
    value: string,
    targetType: 'object' | 'relation_value' = 'object', // <-- Uitgebreid
    isConfidentialOverride?: boolean
) {
    let isConfidential = isConfidentialOverride ?? false;

    // Als er geen expliciete override is meegegeven, bepalen we de vertrouwelijkheid op basis van de target
    if (isConfidentialOverride === undefined) {
        if (targetType === 'object') {
            const targetObject = await haalObjectOp(targetId);
            isConfidential = targetObject?.isConfidential ?? false;
        }
    }

    return await maakNieuwItem("parameter_value", {
        targetId,
        targetType,
        parameterId,
        value,
        isConfidential,
    });
}
//
// 10. RELEVANTE TAXA BEHEER
//

/**
 * Zoekt een taxon op basis van de exacte naam in de RelevanteTaxa tabel
 */
export async function zoekRelevantTaxonOpNaam(naam: string) {
    const targetDb = dbRemote || dbLocal;
    if (!targetDb) return null;

    const results = await targetDb
        .select()
        .from(relevanteTaxa)
        .where(eq(relevanteTaxa.taxonNaam, naam));

    return results[0] || null;
}

/**
 * Voegt een nieuw gecachet taxon toe aan RelevanteTaxa (geschreven naar dbRemote/Turso)
 */

export async function voegRelevantTaxonToe(data: {
  taxonNaam: string;
  taxonLevel?: string;
  colIdentifier?: string;
  nlNaam?: string; // <-- Toegevoegd
}) {
  const targetDb = dbRemote || dbLocal;
  if (!targetDb) return null;

  const id = uuidv7();
  await targetDb.insert(relevanteTaxa).values({
    id,
    ...data,
  });
  return id;
}
/**
 * Haalt alle specimen op die beschikken over de parameter 'Gegeven Taxon Naam'
 * inclusief hun eventuele huidige 'Formele taxonnaam' parameter
 */
export async function haalAlleSpecimenTaxaOp() {
    const PARAM_GEGEVEN_TAXON_NAAM_ID = "019fce6b-626f-7609-b67c-17fb251e36e7";
    const PARAM_FORMELE_TAXON_NAAM_ID = "019fd14a-991d-7265-b929-8da2ee294507";

    const targetDb = dbRemote || dbLocal;
    if (!targetDb) return [];

    const query = sql`
    SELECT 
      o.id as objectId,
      o.label as objectLabel,
      pv_gegeven.id as gegevenParamValueId,
      pv_gegeven.value as gegevenTaxonNaam,
      pv_formeel.id as formeleParamValueId,
      pv_formeel.value as formeleTaxonNaam,
      pv_formeel.valid_from as laatsteControle
    FROM ${objects} o
    INNER JOIN ${parameterValues} pv_gegeven 
      ON o.id = pv_gegeven.target_id 
      AND pv_gegeven.parameter_id = ${PARAM_GEGEVEN_TAXON_NAAM_ID}
      AND pv_gegeven.valid_to IS NULL
    LEFT JOIN ${parameterValues} pv_formeel 
      ON o.id = pv_formeel.target_id 
      AND pv_formeel.parameter_id = ${PARAM_FORMELE_TAXON_NAAM_ID}
      AND pv_formeel.valid_to IS NULL
    WHERE o.valid_to IS NULL
  `;

    return await targetDb.all<{
        objectId: string;
        objectLabel: string;
        gegevenParamValueId: string;
        gegevenTaxonNaam: string;
        formeleParamValueId?: string;
        formeleTaxonNaam?: string;
        laatsteControle?: string;
    }>(query);
}

export async function updateRelevantTaxonNlNaam(id: string, nlNaam: string) {
  const targetDb = dbRemote || dbLocal;
  if (!targetDb) return;

  await targetDb
    .update(relevanteTaxa)
    .set({ nlNaam })
    .where(eq(relevanteTaxa.id, id));
}
export { objects, relations, relationValues, parameters, parameterValues, units, relevanteTaxa } from "./schema";