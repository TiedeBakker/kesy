
import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { v7 as uuidv7 } from "uuid";

import { dbRemote, dbLocal } from "../core/db";
import { objects, relationValues, parameterValues } from "../core/db/schema";

// Selecteer de actieve DB (dbRemote voor Turso, of dbLocal als fallback)
const activeDb = dbRemote || dbLocal;

const TEST_MODE = false;
const TEST_LIMIT = 5;

const OBJECT_TYPE_RELATION_ID = "019fcdd3-721a-7512-b755-cddd67f43eb6";
const TYPE_INSECTENDOOS_ID = "019fcd20-b442-755f-af50-9cdf9716990d";
const TYPE_SPECIMENGROEP_ID = "019fcd20-b56f-76ae-9bf0-f98a0354b7ca";
const RELATIE_ZIT_IN_OF_OP_ID = "019fad01-ca30-769d-8c9c-6fc70fa9db0a";

const PARAM_TOELICHTING_ID = "019fc74c-cf8c-74ff-a3b6-b6d21c651a19";
const PARAM_AANTAL_ID = "019fad6f-c149-7795-b3e5-751c8b2b7949";
const PARAM_GEGEVEN_TAXON_NAAM_ID = "019fce6b-626f-7609-b67c-17fb251e36e7";

interface CsvRow {
    Insectendoos_label: string;
    Insectendoos_toelichting: string;
    AangegevenTaxon: string;
    aantal: string;
}

// Helperfunctie om een array op te delen in kleinere stukjes (chunks)
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

async function runImport() {
    if (!activeDb) {
        console.error("❌ Geen actieve databaseverbinding gevonden!");
        return;
    }

    console.log(`🚀 Start import via transactie op: ${dbRemote ? "TURSO REMOTE" : "LOKAAL"}`);

    const csvFilePath = path.join(__dirname, "insekten.csv");
    if (!fs.existsSync(csvFilePath)) {
        console.error(`❌ CSV bestand niet gevonden op pad: ${csvFilePath}`);
        return;
    }

    const fileContent = fs.readFileSync(csvFilePath, "utf-8");
    let records: CsvRow[] = parse(fileContent, {
        delimiter: "|",
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    if (TEST_MODE) {
        records = records.slice(0, TEST_LIMIT);
    }

    const insectendozenMap = new Map<string, string>();
    const volgnummerMap = new Map<string, number>();
    const now = new Date().toISOString();

    // 1. Arrays om alle records in het geheugen te verzamelen
    const objectsToInsert: (typeof objects.$inferInsert)[] = [];
    const relationValuesToInsert: (typeof relationValues.$inferInsert)[] = [];
    const parameterValuesToInsert: (typeof parameterValues.$inferInsert)[] = [];

    for (const row of records) {
        const doosLabel = row.Insectendoos_label;
        let doosId = insectendozenMap.get(doosLabel);

        // A. Insectendoos Object
        if (!doosId) {
            doosId = uuidv7();
            insectendozenMap.set(doosLabel, doosId);
            volgnummerMap.set(doosId, 1);

            objectsToInsert.push({
                id: doosId,
                label: `Insectendoos: ${doosLabel}`,
                isConfidential: false,
                validFrom: now,
            });

            relationValuesToInsert.push({
                id: uuidv7(),
                relationId: OBJECT_TYPE_RELATION_ID,
                sourceId: doosId,
                targetId: TYPE_INSECTENDOOS_ID,
                volgorde: 0,
                isConfidential: false,
                validFrom: now,
            });

            if (row.Insectendoos_toelichting) {
                parameterValuesToInsert.push({
                    id: uuidv7(),
                    parameterId: PARAM_TOELICHTING_ID,
                    targetId: doosId,
                    targetType: "object",
                    value: row.Insectendoos_toelichting,
                    isConfidential: false,
                    validFrom: now,
                });
            }
        }

        // B. Specimengroep Object
        const specimenGroupId = uuidv7();

        objectsToInsert.push({
            id: specimenGroupId,
            label: `Specimen groep: ${row.AangegevenTaxon}`,
            isConfidential: false,
            validFrom: now,
        });

        relationValuesToInsert.push({
            id: uuidv7(),
            relationId: OBJECT_TYPE_RELATION_ID,
            sourceId: specimenGroupId,
            targetId: TYPE_SPECIMENGROEP_ID,
            volgorde: 0,
            isConfidential: false,
            validFrom: now,
        });

        const huidigVolgnummer = volgnummerMap.get(doosId) || 1;
        relationValuesToInsert.push({
            id: uuidv7(),
            relationId: RELATIE_ZIT_IN_OF_OP_ID,
            sourceId: doosId,
            targetId: specimenGroupId,
            volgorde: huidigVolgnummer,
            isConfidential: false,
            validFrom: now,
        });
        volgnummerMap.set(doosId, huidigVolgnummer + 1);

        parameterValuesToInsert.push({
            id: uuidv7(),
            parameterId: PARAM_AANTAL_ID,
            targetId: specimenGroupId,
            targetType: "object",
            value: String(row.aantal),
            isConfidential: false,
            validFrom: now,
        });

        parameterValuesToInsert.push({
            id: uuidv7(),
            parameterId: PARAM_GEGEVEN_TAXON_NAAM_ID,
            targetId: specimenGroupId,
            targetType: "object",
            value: row.AangegevenTaxon,
            isConfidential: false,
            validFrom: now,
        });
    }

    // 2. UITVOEREN IN ÉÉN TRANSACTIE
    console.log(`📦 Data klaargezet. Bezig met schrijven van ${objectsToInsert.length} objecten, ${relationValuesToInsert.length} relaties en ${parameterValuesToInsert.length} parameters...`);

    try {
        console.log(`📦 Data klaargezet. Bezig met schrijven in chunks...`);

        // Kies een veilige batchgrootte (bijv. 200 tot 500 items per query)
        const BATCH_SIZE = 300;

        try {
            await activeDb.transaction(async (tx) => {
                // 1. Schrijf objecten in batches
                for (const chunk of chunkArray(objectsToInsert, BATCH_SIZE)) {
                    await tx.insert(objects).values(chunk);
                }

                // 2. Schrijf relaties in batches
                for (const chunk of chunkArray(relationValuesToInsert, BATCH_SIZE)) {
                    await tx.insert(relationValues).values(chunk);
                }

                // 3. Schrijf parameters in batches
                for (const chunk of chunkArray(parameterValuesToInsert, BATCH_SIZE)) {
                    await tx.insert(parameterValues).values(chunk);
                }
            });

            console.log("✅ Transactie succesvol afgerond! Alle data staat in de database.");
        } catch (error) {
            console.error("❌ Transactie mislukt! Alle wijzigingen zijn teruggedraaid.", error);
        }

        console.log("✅ Transactie succesvol afgerond! Alle data staat in de database.");
    } catch (error) {
        console.error("❌ Transactie mislukt! Alle wijzigingen zijn automatisch teruggedraaid (rollback).", error);
    }
}

runImport();