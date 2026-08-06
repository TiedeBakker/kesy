// kesy/lib/services/colService.ts

export interface ColValidationResult {
  status: "ACTUEEL" | "SYNONIEM" | "NIET_GEVONDEN";
  actueleNaam?: string;
  taxonRank?: string;
  colIdentifier?: string;
}

/**
 * Valideert een gegeven taxon-naam tegen de Catalogue of Life (COL) API.
 */
export async function valideerTaxonMetCOL(gegevenNaam: string): Promise<ColValidationResult> {
  if (!gegevenNaam || !gegevenNaam.trim()) {
    return { status: "NIET_GEVONDEN" };
  }

  try {
    const schoneNaam = gegevenNaam.trim();
    const encodedName = encodeURIComponent(schoneNaam);

    // Zoek via de nieuwste COL Checklist API
    const response = await fetch(
      `https://api.catalogueoflife.org/dataset/3LR/nameusage/search?q=${encodedName}&fuzzy=false`,
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
      return { status: "NIET_GEVONDEN" };
    }

    const data = await response.json();

    if (!data.result || data.result.length === 0) {
      return { status: "NIET_GEVONDEN" };
    }

    // Pak het best matchende zoekresultaat
    const usage = data.result[0].usage;
    const isSynonym = usage.status === "synonym" || usage.status === "ambiguous synonym";

    if (isSynonym && usage.accepted) {
      // Optie B: Synoniem gevonden -> Geef de actuele naam terug
      return {
        status: "SYNONIEM",
        actueleNaam: usage.accepted.name.scientificName,
        taxonRank: usage.accepted.name.rank,
        colIdentifier: usage.accepted.id,
      };
    } else if (usage.status === "accepted") {
      // Optie A: Direct een actuele naam
      return {
        status: "ACTUEEL",
        actueleNaam: usage.name.scientificName,
        taxonRank: usage.name.rank,
        colIdentifier: usage.id,
      };
    }

    // Optie C: Geen geldige/bekende status
    return { status: "NIET_GEVONDEN" };
  } catch (error) {
    console.error(`Fout bij CoL validatie voor '${gegevenNaam}':`, error);
    return { status: "NIET_GEVONDEN" };
  }
}