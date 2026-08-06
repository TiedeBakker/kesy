// app/invoermodule/quick-add/_actions/reorder-actions.ts
"use server";

import { 
  haalDirecteUitgaandeRelatiesOp, 
  updateRelatieVolgorde 
} from "../../../../core/db/repository";

export interface ExistingRelationItem {
  relationValueId: string;
  relationId: string;
  targetId: string;
  targetLabel: string;
  volgorde: number;
}

export async function haalUitgaandeRelatiesLijstOp(
  sourceId: string,
  page: number = 1,      // <-- NIEUW
  limit: number = 1000    // <-- NIEUW (standaard 50 stuks)
): Promise<ExistingRelationItem[]> {
  if (!sourceId) return [];

  const offset = (page - 1) * limit;
  const relaties = await haalDirecteUitgaandeRelatiesOp(sourceId, limit, offset);

  return relaties.map((rel: any, index: number) => ({
    relationValueId: rel.relation_value_id,
    relationId: rel.relation_id,
    targetId: rel.target_id,
    targetLabel: rel.target_label || "Naamloos object",
    volgorde: typeof rel.volgorde === "number" && rel.volgorde > 0 ? rel.volgorde : offset + index + 1,
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