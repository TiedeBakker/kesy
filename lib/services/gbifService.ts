// kesy/lib/services/gbifService.ts

export async function haalNederlandseNaamOpViaGBIF(wetenschappelijkeNaam: string): Promise<string | undefined> {
  if (!wetenschappelijkeNaam) return undefined;

  try {
    // 1. Zoek het taxon op in GBIF om de usageKey te krijgen
    const matchUrl = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(wetenschappelijkeNaam)}`;
    const matchRes = await fetch(matchUrl);
    
    if (!matchRes.ok) return undefined;
    const matchData = await matchRes.json();

    const usageKey = matchData.usageKey || matchData.speciesKey;
    if (!usageKey) return undefined;

    // 2. Haal de vernacular names op voor deze usageKey
    const vernUrl = `https://api.gbif.org/v1/species/${usageKey}/vernacularNames`;
    const vernRes = await fetch(vernUrl);

    if (!vernRes.ok) return undefined;
    const vernData = await vernRes.json();

    if (!vernData.results || vernData.results.length === 0) return undefined;

    // 3. Zoek naar de Nederlandse naam ('nl', 'nld', of 'dutch')
    const nlMatch = vernData.results.find((v: any) => {
      const lang = (v.language || "").toLowerCase();
      return lang === "nl" || lang === "nld" || lang === "dutch";
    });

    return nlMatch ? nlMatch.vernacularName : undefined;
  } catch (error) {
    console.error(`Fout bij ophalen NL naam via GBIF voor '${wetenschappelijkeNaam}':`, error);
    return undefined;
  }
}