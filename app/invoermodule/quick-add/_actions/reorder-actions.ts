"use server";

import { 
  haalDirecteUitgaandeRelatiesOp, 
  updateRelatieVolgorde 
} from "../../../../core/db/repository";

export interface ExistingRelationItem {
  relationValueId: string;
  targetId: string;
  targetLabel: string;
  volgorde: number;
}

// 1. Haal de bestaande uitgaande relaties op voor het geselecteerde ouder-object
export async function haalUitgaandeRelatiesLijstOp(
  sourceId: string
): Promise<ExistingRelationItem[]> {
  if (!sourceId) return [];

  const relaties = await haalDirecteUitgaandeRelatiesOp(sourceId);

  return relaties.map((rel: any, index: number) => ({
    relationValueId: rel.relation_value_id,
    targetId: rel.target_id,
    targetLabel: rel.target_label || "Naamloos object",
    volgorde: typeof rel.volgorde === "number" && rel.volgorde > 0 ? rel.volgorde : index + 1,
  }));
}

// 2. Bewaar de bijgewerkte volgordes in de database
export async function bewaarRelatieVolgordes(
  updates: Array<{ relationValueId: string; volgorde: number }>
) {
  try {
    for (const update of updates) {
      await updateRelatieVolgorde(update.relationValueId, update.volgorde);
    }
    return { success: true, count: updates.length };
  } catch (err: any) {
    console.error("Fout bij het bewaren van relatievolgorde:", err);
    return { success: false, error: err?.message || "Opslaan mislukt" };
  }
}