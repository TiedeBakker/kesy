"use server";

import { dbLocal, dbRemote, isCloudOnly } from "../../../../core/db";
import { relationValues } from "../../../../core/db/schema";
import { eq } from "drizzle-orm";

interface VerplaatsTargetParams {
  relationValueId: string;
  targetId: string;
  relationId: string;
  oudeSourceId: string;
  nieuweSourceId: string;
  bewaarHistorie: boolean;
  isConfidential?: boolean;
}

export async function verplaatsTargetRelatie({
  relationValueId,
  targetId,
  relationId,
  nieuweSourceId,
  bewaarHistorie,
  isConfidential = false,
}: VerplaatsTargetParams) {
  try {
    // ISO string voor SQLite text kolom
    const nuIso = new Date().toISOString(); 

    if (bewaarHistorie) {
      // 1. Oude relatie beëindigen (validTo op ISO-string zetten)
      if (!isCloudOnly && dbLocal) {
        await dbLocal
          .update(relationValues)
          .set({ validTo: nuIso })
          .where(eq(relationValues.id, relationValueId));
      }

      if (dbRemote) {
        await dbRemote
          .update(relationValues)
          .set({ validTo: nuIso })
          .where(eq(relationValues.id, relationValueId));
      }

      // 2. Nieuwe relatie aanmaken naar de nieuwe Source
      const newId = `rel-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newRelationRecord = {
        id: newId,
        relationId: relationId,
        sourceId: nieuweSourceId,
        targetId: targetId,
        isConfidential: isConfidential,
        validFrom: nuIso, // String i.p.v. Date object
        validTo: null,
      };

      if (!isCloudOnly && dbLocal) {
        await dbLocal.insert(relationValues).values(newRelationRecord);
      }
      if (dbRemote && !isConfidential) {
        await dbRemote.insert(relationValues).values(newRelationRecord);
      }
    } else {
      // Direct omhangen: Gewoon sourceId updaten op de bestaande relatie
      if (!isCloudOnly && dbLocal) {
        await dbLocal
          .update(relationValues)
          .set({ sourceId: nieuweSourceId })
          .where(eq(relationValues.id, relationValueId));
      }

      if (dbRemote) {
        await dbRemote
          .update(relationValues)
          .set({ sourceId: nieuweSourceId })
          .where(eq(relationValues.id, relationValueId));
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("Fout bij verplaatsen relatie:", err);
    return { success: false, error: err?.message || "Verplaatsen mislukt." };
  }
}