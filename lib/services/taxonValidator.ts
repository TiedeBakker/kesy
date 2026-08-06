// // kesy/lib/services/taxonValidator.ts

// import {
//   zoekRelevantTaxonOpNaam,
//   voegRelevantTaxonToe,
//   voegParameterWaardeToeMetBeveiliging,
//   vernieuwParameterWaardeMetHistorie,
// } from "@/core/db/repository";
// import { valideerTaxonMetCOL } from "./colService";

// const PARAM_GEGEVEN_TAXON_NAAM_ID = "019fce6b-626f-7609-b67c-17fb251e36e7";
// const PARAM_FORMELE_TAXON_NAAM_ID = "019fd14a-991d-7265-b929-8da2ee294507";

// export async function verwerkSpecimenTaxon(
//   objectId: string,
//   gegevenNaam: string,
//   bestaandeFormeleParamId?: string
// ) {
//   // 1. Controleer via CoL API
//   const colResult = await valideerTaxonMetCOL(gegevenNaam);

//   let formeleWaarde = "niet bekend in COL";
//   let actueleNaam: string | null = null;

//   if (colResult.status === "ACTUEEL" || colResult.status === "SYNONIEM") {
//     actueleNaam = colResult.actueleNaam!;
//     formeleWaarde = actueleNaam;
//   }

//   // 2. Werk de parameter "Formele taxonnaam" bij op het Specimen Object
//   if (bestaandeFormeleParamId) {
//     await vernieuwParameterWaardeMetHistorie(
//       bestaandeFormeleParamId,
//       objectId,
//       PARAM_FORMELE_TAXON_NAAM_ID,
//       formeleWaarde
//     );
//   } else {
//     await voegParameterWaardeToeMetBeveiliging(
//       objectId,
//       PARAM_FORMELE_TAXON_NAAM_ID,
//       formeleWaarde,
//       "object"
//     );
//   }

//   // 3. Indien actuele naam gevonden: controleer en vul "RelevanteTaxa" tabel aan
//   if (actueleNaam) {
//     const bestaandTaxon = await zoekRelevantTaxonOpNaam(actueleNaam);
//     if (!bestaandTaxon) {
//       await voegRelevantTaxonToe({
//         taxonNaam: actueleNaam,
//         taxonLevel: colResult.taxonRank,
//         colIdentifier: colResult.colId,
//       });
//       console.log(`➕ Nieuw taxon toegevoegd aan RelevanteTaxa: ${actueleNaam}`);
//     }
//   }

//   return { status: colResult.status, formeleWaarde };
// }