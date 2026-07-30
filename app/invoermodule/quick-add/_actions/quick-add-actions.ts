"use server";

import { 
  maakNieuwItem, 
  voegRelatieToeMetBeveiliging,
  updateRelatieVolgorde,
  haalObjectOp
} from "../../../../core/db/repository";
import { QuickAddGeneratedItem } from "../_types";

export interface ProcessQuickAddInput {
  sourceId: string;
  relationId: string;
  items: QuickAddGeneratedItem[];
}

export interface ProcessQuickAddResponse {
  success: boolean;
  createdCount: number;
  errors?: string[];
}

export async function verwerkQuickAddBatch(
  input: ProcessQuickAddInput
): Promise<ProcessQuickAddResponse> {
  const { sourceId, relationId, items } = input;

  if (!sourceId || !relationId || !items || items.length === 0) {
    return {
      success: false,
      createdCount: 0,
      errors: ["Ongeldige invoer: bron, relatietype en minimaal 1 item zijn verplicht."],
    };
  }

  // 1. Haal de bron (source) op om de beveiligingsstatus te bepalen
  const sourceObject = await haalObjectOp(sourceId);
  const isSourceConfidential = Boolean(sourceObject?.isConfidential);

  let createdCount = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      // 2. Kind erft vertrouwelijkheid van de bron als de bron vertrouwelijk is,
      //    OF als de gebruiker het item expliciet als vertrouwelijk heeft gemarkeerd.
      const moetVertrouwelijkZijn = isSourceConfidential || item.isConfidential;

      // 3. Maak het object aan met de JUISTE vertrouwelijkheid (gaat nu wel naar dbLocal!)
      const newObjectId = await maakNieuwItem("object", {
        label: item.label,
        isConfidential: moetVertrouwelijkZijn,
      });

      // 4. Leg de relatie aan
      const relationValueId = await voegRelatieToeMetBeveiliging(
        sourceId,
        newObjectId,
        relationId
      );

      // 5. Update volgorde
      if (relationValueId && typeof item.volgorde === "number") {
        await updateRelatieVolgorde(relationValueId, item.volgorde);
      }

      createdCount++;
    } catch (err: any) {
      console.error(`Fout bij toevoegen van item "${item.label}":`, err);
      errors.push(`Mislukt voor "${item.label}": ${err?.message || "Onbekende fout"}`);
    }
  }

  return {
    success: errors.length === 0,
    createdCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}