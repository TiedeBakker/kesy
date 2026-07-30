import { z } from "zod";

// Schema voor de invoer/configuratie van de batch-generator
export const QuickAddConfigSchema = z.object({
  sourceId: z.string().min(1, "Selecteer een bron/ouder-object"),
  relationId: z.string().min(1, "Selecteer een relatietype"),
  pattern: z.string().min(1, "Vul een patroon in (bijv. 'Track {n}')"),
  startNumber: z.number().int().default(1),
  step: z.number().int().min(1).default(1),
  count: z.number().int().min(1).max(500).default(5),
  zeroPadding: z.number().int().min(0).max(5).default(2), // bijv. 2 -> '01', '02'
  isConfidentialOverride: z.boolean().optional(),
});

export type QuickAddConfig = z.infer<typeof QuickAddConfigSchema>;

// Individueel gegenereerd item voor de preview-tabel
export interface QuickAddGeneratedItem {
  tempId: string;           // Unieke client key voor React rendering
  label: string;            // Genereerde naam (bijv. "Track 01")
  volgorde: number;         // Expliciete volgorde voor relationValues
  isConfidential: boolean;  // Vertrouwelijkheid per item
}