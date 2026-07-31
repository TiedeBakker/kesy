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
    // 1. Bereken de nummering voor de titel/het label
    const currentNum = config.startNumber + i * config.step;
    const formattedNum = String(currentNum).padStart(config.zeroPadding, "0");
    
    let label = config.pattern;
    if (label.includes("{n}")) {
      label = label.replaceAll("{n}", formattedNum);
    } else {
      label = `${label} ${formattedNum}`;
    }

    // 2. Volgorde start nu ook bij startNumber i.p.v. altijd bij 1
    const berekendeVolgorde = config.startNumber + i * config.step;

    items.push({
      tempId: `temp-${i}-${Date.now()}`,
      label: label.trim(),
      volgorde: berekendeVolgorde, // <-- Aangepast!
      isConfidential: defaultConfidential,
    });
  }

  return items;
}