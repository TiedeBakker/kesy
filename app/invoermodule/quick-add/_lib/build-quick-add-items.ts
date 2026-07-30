import { QuickAddConfig, QuickAddGeneratedItem } from "../_types";

/**
 * Genereert een lijst van preview-items op basis van een patroon en nummering.
 *
 * Voorbeeld:
 *   pattern: "Track {n} - Extra"
 *   startNumber: 1, step: 1, count: 3, zeroPadding: 2
 *   -> ["Track 01 - Extra", "Track 02 - Extra", "Track 03 - Extra"]
 */
export function buildQuickAddItems(
  config: QuickAddConfig,
  parentIsConfidential: boolean = false
): QuickAddGeneratedItem[] {
  const items: QuickAddGeneratedItem[] = [];
  const defaultConfidential = config.isConfidentialOverride ?? parentIsConfidential;

  for (let i = 0; i < config.count; i++) {
    const currentNum = config.startNumber + i * config.step;
    
    // Zorg voor leading zeros (bijv. 1 -> "01" bij padding 2)
    const formattedNum = String(currentNum).padStart(config.zeroPadding, "0");
    
    // Vervang {n} in de template; als {n} niet aanwezig is, plakken we het erachter
    let label = config.pattern;
    if (label.includes("{n}")) {
      label = label.replaceAll("{n}", formattedNum);
    } else {
      label = `${label} ${formattedNum}`;
    }

    items.push({
      tempId: `temp-${i}-${Date.now()}`,
      label: label.trim(),
      volgorde: i + 1,
      isConfidential: defaultConfidential,
    });
  }

  return items;
}