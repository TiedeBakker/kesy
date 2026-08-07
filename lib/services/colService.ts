// kesy/lib/services/colService.ts

export interface ColValidationResult {
  status: "ACTUEEL" | "SYNONIEM" | "NIET_GEVONDEN";
  actueleNaam?: string;
  taxonRank?: string;
  colIdentifier?: string;
  nlNaam?: string; // <-- NIEUW
}

/**
 * Verwijdert subgenus-notaties zoals '(Perileptus)' en extra spaties
 */
function normaliseerNaam(naam: string): string {
  return naam
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Haalt eventuele Nederlandse namen op via het COL Vernaculars endpoint
 */
/**
 * Haalt eventuele Nederlandse namen op via de COL Vernaculars API.
 * Probeert zowel de ISO-codes ('nld', 'nl') als de uitgeschreven naam ('dutch').
 */
export async function haalNederlandseNaamOp(colId: string): Promise<string | undefined> {
  if (!colId) return undefined;

  try {
    // Gebruik dataset/3 (het centrale COL Global Dataset assembly) voor vernaculars
    const url = `https://api.catalogueoflife.org/dataset/3/nameusage/${colId}/vernacular`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });

    if (!response.ok) {
      // Fallback: probeer via de jaar-dataset 3LR
      const urlFallback = `https://api.catalogueoflife.org/dataset/3LR/nameusage/${colId}/vernacular`;
      const resFallback = await fetch(urlFallback, { headers: { Accept: "application/json" } });
      if (!resFallback.ok) return undefined;
      return verwerkVernacularResponse(await resFallback.json());
    }

    return verwerkVernacularResponse(await response.json());
  } catch (error) {
    console.error(`Fout bij ophalen NL naam voor COL ID ${colId}:`, error);
    return undefined;
  }
}

/**
 * Hulpfunctie om door de verschillende JSON structuren van COL vernaculars te zoeken
 */
function verwerkVernacularResponse(data: any): string | undefined {
  // COL kan een directe array teruggeven OF een object met een 'result' array
  const items: any[] = Array.isArray(data) ? data : data?.result || [];

  if (items.length === 0) return undefined;

  // Zoek naar de eerste match die Nederlands is
  const nlItem = items.find((item: any) => {
    const lang = (item.language || "").toLowerCase();
    return lang === "nld" || lang === "nl" || lang === "dutch";
  });

  return nlItem ? (nlItem.name || nlItem.vernacularName) : undefined;
}
export async function valideerTaxonMetCOL(gegevenNaam: string): Promise<ColValidationResult> {
  if (!gegevenNaam || !gegevenNaam.trim()) {
    return { status: "NIET_GEVONDEN" };
  }

  const schoneGegevenNaam = normaliseerNaam(gegevenNaam);

  try {
    const encodedName = encodeURIComponent(gegevenNaam.trim());
    const url = `https://api.catalogueoflife.org/dataset/3LR/nameusage/search?q=${encodedName}&limit=10`;

    const response = await fetch(url, { headers: { Accept: "application/json" } });

    if (!response.ok) {
      return { status: "NIET_GEVONDEN" };
    }

    const data = await response.json();

    if (!data.result || data.result.length === 0) {
      return { status: "NIET_GEVONDEN" };
    }

    for (const item of data.result) {
      const usage = item.usage;
      if (!usage) continue;

      const rawScientificName = usage.name?.scientificName || usage.label || "";
      const rawCanonicalName = usage.name?.canonicalName || rawScientificName;

      const teVergelijkenNaam = normaliseerNaam(rawCanonicalName);

      const isMatch =
        teVergelijkenNaam === schoneGegevenNaam ||
        teVergelijkenNaam.startsWith(schoneGegevenNaam);

      if (isMatch) {
        const isSynonym = usage.status === "synonym" || usage.status === "ambiguous synonym";
        const colId = usage.accepted?.id || usage.id;

        // Haal direct de Nederlandse naam op als er een COL ID is
        const nlNaam = colId ? await haalNederlandseNaamOp(colId) : undefined;

        if (isSynonym && usage.accepted) {
          return {
            status: "SYNONIEM",
            actueleNaam: usage.accepted.name?.scientificName || usage.accepted.label,
            taxonRank: usage.accepted.name?.rank || usage.rank,
            colIdentifier: colId,
            nlNaam,
          };
        } else if (usage.status === "accepted") {
          return {
            status: "ACTUEEL",
            actueleNaam: usage.name?.scientificName || usage.label,
            taxonRank: usage.name?.rank || usage.rank,
            colIdentifier: colId,
            nlNaam,
          };
        }
      }
    }

    return { status: "NIET_GEVONDEN" };
  } catch (error) {
    console.error(`Fout bij CoL validatie voor '${gegevenNaam}':`, error);
    return { status: "NIET_GEVONDEN" };
  }
}