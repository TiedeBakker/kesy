// kesy/app/api/beheer/validate-taxa/route.ts
import { NextResponse } from "next/server";
import {
    haalAlleSpecimenTaxaOp,
    zoekRelevantTaxonOpNaam,
    voegRelevantTaxonToe,
    voegParameterWaardeToeMetBeveiliging,
    vernieuwParameterWaardeMetHistorie,
    updateRelevantTaxonNlNaam,
} from "@/core/db/repository";
import { valideerTaxonMetCOL } from "@/lib/services/colService";
import { haalNederlandseNaamOpViaGBIF } from "@/lib/services/gbifService"; // <-- NIEUW

const PARAM_FORMELE_TAXON_NAAM_ID = "019fd14a-991d-7265-b929-8da2ee294507";

export async function GET() {
    try {
        const specimen = await haalAlleSpecimenTaxaOp();
        return NextResponse.json({ success: true, specimen });
    } catch (error) {
        console.error("Fout bij ophalen van specimen taxa:", error);
        return NextResponse.json(
            { success: false, error: "Fout bij ophalen specimen" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const batchSize = body.batchSize || 15;
        const forceRevalidation = Boolean(body.forceRevalidation);
        const processedIds: string[] = body.processedIds || []; // IDs die in eerdere batches al zijn geweest

        // 1. Haal alle specimen op
        const alleSpecimen = await haalAlleSpecimenTaxaOp();

        // 2. Filter: negeer al verwerkte IDs in deze huidige sessie
        const teVerwerken = alleSpecimen.filter((item) => {
            if (processedIds.includes(item.objectId)) return false;

            if (forceRevalidation) return true;
            // Alleen verwerken als er nog helemaal geen controle is geweest
            return !item.formeleTaxonNaam;
        });

        const huidigeBatch = teVerwerken.slice(0, batchSize);

        let verwerktCount = 0;
        let actueelCount = 0;
        let synoniemCount = 0;
        let nietGevondenCount = 0;
        const zojuistVerwerktIds: string[] = [];

        const colCache = new Map<string, Awaited<ReturnType<typeof valideerTaxonMetCOL>>>();

        for (const item of huidigeBatch) {
            const gegevenNaam = item.gegevenTaxonNaam;
            let colResult;

            if (colCache.has(gegevenNaam)) {
                colResult = colCache.get(gegevenNaam)!;
            } else {
                colResult = await valideerTaxonMetCOL(gegevenNaam);
                colCache.set(gegevenNaam, colResult);
            }

            let formeleWaarde = "niet bekend in COL";
            let actueleNaam: string | null = null;

            if (colResult.status === "ACTUEEL" || colResult.status === "SYNONIEM") {
                actueleNaam = colResult.actueleNaam!;
                formeleWaarde = actueleNaam;

                if (colResult.status === "ACTUEEL") actueelCount++;
                if (colResult.status === "SYNONIEM") synoniemCount++;

                // 💡 Haal de Nederlandse naam op via GBIF op basis van de geaccepteerde wetenschappelijke naam!
                const nlNaam = await haalNederlandseNaamOpViaGBIF(actueleNaam);

                // Opslaan of bijwerken in RelevanteTaxa
                const bestaandTaxon = await zoekRelevantTaxonOpNaam(actueleNaam);
                if (!bestaandTaxon) {
                    await voegRelevantTaxonToe({
                        taxonNaam: actueleNaam,
                        taxonLevel: colResult.taxonRank,
                        colIdentifier: colResult.colIdentifier,
                        nlNaam: nlNaam, // <-- Wordt nu gevuld vanuit GBIF!
                    });
                } else if (nlNaam && !bestaandTaxon.nlNaam) {
                    await updateRelevantTaxonNlNaam(bestaandTaxon.id, nlNaam);
                }
            }

            // Parameter opslaan
            if (item.formeleParamValueId) {
                if (item.formeleTaxonNaam !== formeleWaarde) {
                    await vernieuwParameterWaardeMetHistorie(
                        item.formeleParamValueId,
                        item.objectId,
                        PARAM_FORMELE_TAXON_NAAM_ID,
                        formeleWaarde
                    );
                }
            } else {
                await voegParameterWaardeToeMetBeveiliging(
                    item.objectId,
                    PARAM_FORMELE_TAXON_NAAM_ID,
                    formeleWaarde,
                    "object"
                );
            }

            // RelevanteTaxa bijwerken
            if (actueleNaam) {
                const bestaandTaxon = await zoekRelevantTaxonOpNaam(actueleNaam);

                if (!bestaandTaxon) {
                    // Nieuw record invoegen
                    await voegRelevantTaxonToe({
                        taxonNaam: actueleNaam,
                        taxonLevel: colResult.taxonRank,
                        colIdentifier: colResult.colIdentifier,
                        nlNaam: colResult.nlNaam,
                    });
                } else if (colResult.nlNaam && !bestaandTaxon.nlNaam) {
                    // 💡 Bestaand record zonder NL-naam alsnog verrijken!
                    await updateRelevantTaxonNlNaam(bestaandTaxon.id, colResult.nlNaam);
                }
            }
            zojuistVerwerktIds.push(item.objectId);
            verwerktCount++;
        }

        const resterend = teVerwerken.length - verwerktCount;

        return NextResponse.json({
            success: true,
            verwerktInDezeBatch: verwerktCount,
            totaalTeVerwerken: teVerwerken.length,
            resterend,
            verwerkteIds: zojuistVerwerktIds,
            stats: {
                actueel: actueelCount,
                synoniem: synoniemCount,
                nietGevonden: nietGevondenCount,
            },
        });
    } catch (error) {
        console.error("Fout tijdens taxa validatie batch:", error);
        return NextResponse.json(
            { success: false, error: "Interne serverfout bij valideren van taxa" },
            { status: 500 }
        );
    }
}