// kesy/app/api/beheer/validate-taxa/route.ts
import { NextResponse } from "next/server";
import {
  haalAlleSpecimenTaxaOp,
  zoekRelevantTaxonOpNaam,
  voegRelevantTaxonToe,
  voegParameterWaardeToeMetBeveiliging,
  vernieuwParameterWaardeMetHistorie,
} from "@/core/db/repository";
import { valideerTaxonMetCOL } from "@/lib/services/colService";

const PARAM_FORMELE_TAXON_NAAM_ID = "019fd14a-991d-7265-b929-8da2ee294507";

// 1. GET HANDLER (voor het laden van de pagina)
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
    const batchSize = body.batchSize || 20; // Standaard 20 items per call om API limits te respecteren
    const forceRevalidation = Boolean(body.forceRevalidation); // True = her-valideer ALLES

    // 1. Haal alle specimen met een gegeven taxonnaam op uit de database
    const alleSpecimen = await haalAlleSpecimenTaxaOp();

    // 2. Filter de specimen die verwerkt moeten worden
    const teVerwerken = alleSpecimen.filter((item) => {
      if (forceRevalidation) return true; // Bij her-controle pakken we alles
      // Anders alleen degene die nog GEEN formele naam hebben óf die op 'niet bekend' staan
      return !item.formeleTaxonNaam || item.formeleTaxonNaam === "niet bekend in COL";
    });

    // Pak enkel het aantal items voor deze specifieke batch
    const huidigeBatch = teVerwerken.slice(0, batchSize);

    let verwerktCount = 0;
    let actueelCount = 0;
    let synoniemCount = 0;
    let nietGevondenCount = 0;

    // Cache in-memory voor deze batch om dubbele API calls te voorkomen
    const colCache = new Map<string, Awaited<ReturnType<typeof valideerTaxonMetCOL>>>();

    for (const item of huidigeBatch) {
      const gegevenNaam = item.gegevenTaxonNaam;
      let colResult;

      // Controleer eerst de lokale batch-cache
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
      } else {
        nietGevondenCount++;
      }

      // 3. Update of voeg de parameter 'Formele taxonnaam' toe op het specimen object
      if (item.formeleParamValueId) {
        // Alleen vernieuwen als de waarde daadwerkelijk veranderd is (voorkomt onnodige historie)
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

      // 4. Werk de RelevanteTaxa tabel bij als er een actuele naam is gevonden
      if (actueleNaam) {
        const bestaandTaxon = await zoekRelevantTaxonOpNaam(actueleNaam);
        if (!bestaandTaxon) {
          await voegRelevantTaxonToe({
            taxonNaam: actueleNaam,
            taxonLevel: colResult.taxonRank,
            colIdentifier: colResult.colIdentifier,
          });
        }
      }

      verwerktCount++;
    }

    const resterend = teVerwerken.length - verwerktCount;

    return NextResponse.json({
      success: true,
      verwerktInDezeBatch: verwerktCount,
      totaalTeVerwerken: teVerwerken.length,
      resterend,
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