"use server";

import { dbLocal, dbRemote, isCloudOnly } from "../../../../core/db";
import { parameterSets, parameterSetParameters, parameters } from "../../../../core/db/schema";
import { eq, asc } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid"; // UUIDv7 voor unieke IDs
import { ParameterSet, ParameterSetItem } from "../../../invoermodule/parameter-invoer/_types/parameter-set-types";

// 1. Ophalen van alle Parameter Sets
export async function haalParameterSetsOp(): Promise<ParameterSet[]> {
  try {
    const db = dbRemote || dbLocal;
    if (!db) return [];
    
    return await db.select().from(parameterSets).orderBy(parameterSets.label);
  } catch (err) {
    console.error("Fout bij ophalen parameter sets:", err);
    return [];
  }
}
// 2. Ophalen van items binnen een set (INCLUSIEF Turso join op parameters)
export async function haalParameterSetItemsOp(setId: string): Promise<ParameterSetItem[]> {
  if (!setId) return [];
  
  try {
    // Parameters en Sets zijn publiek/centraal -> lees via Turso / Remote
    const db = dbRemote || dbLocal;
    if (!db) return [];

    const result = await db
      .select({
        id: parameterSetParameters.id,
        parameterSetId: parameterSetParameters.parameterSetId,
        parameterId: parameterSetParameters.parameterId,
        volgnr: parameterSetParameters.volgnr,
        isMeetwaarde: parameterSetParameters.isMeetwaarde,
        // Haal expliciet het label en de code op uit de parameters tabel:
        parameterLabel: parameters.label,
        parameterCode: parameters.code,
        dataType: parameters.dataType,
        unit: parameters.unit,
      })
      .from(parameterSetParameters)
      .leftJoin(parameters, eq(parameterSetParameters.parameterId, parameters.id))
      .where(eq(parameterSetParameters.parameterSetId, setId))
      .orderBy(asc(parameterSetParameters.volgnr));

    return result as ParameterSetItem[];
  } catch (err) {
    console.error("Fout bij ophalen items van parameter set:", err);
    return [];
  }
}

// 3. Aanmaken van een nieuwe Parameter Set
export async function maakParameterSetAan(label: string) {
  try {
    const newId = uuidv7(); // UUIDv7
    const record = { id: newId, label };

    if (!isCloudOnly && dbLocal) {
      await dbLocal.insert(parameterSets).values(record);
    }
    if (dbRemote) {
      await dbRemote.insert(parameterSets).values(record);
    }

    return { success: true, data: record };
  } catch (err: any) {
    return { success: false, error: err?.message || "Maken van parameter set mislukt" };
  }
}

// 4. Parameter toevoegen aan een Set
export async function voegParameterToeAanSet(params: {
  parameterSetId: string;
  parameterId: string;
  volgnr: number;
  isMeetwaarde: boolean;
}) {
  try {
    const newId = uuidv7(); // UUIDv7
    const record = {
      id: newId,
      parameterSetId: params.parameterSetId,
      parameterId: params.parameterId,
      volgnr: params.volgnr,
      isMeetwaarde: params.isMeetwaarde,
    };

    if (!isCloudOnly && dbLocal) {
      await dbLocal.insert(parameterSetParameters).values(record);
    }
    if (dbRemote) {
      await dbRemote.insert(parameterSetParameters).values(record);
    }

    return { success: true, id: newId };
  } catch (err: any) {
    return { success: false, error: err?.message || "Toevoegen van parameter aan set mislukt" };
  }
}

// 5. Parameter verwijderen uit een Set
export async function verwijderParameterUitSet(id: string) {
  try {
    if (!isCloudOnly && dbLocal) {
      await dbLocal.delete(parameterSetParameters).where(eq(parameterSetParameters.id, id));
    }
    if (dbRemote) {
      await dbRemote.delete(parameterSetParameters).where(eq(parameterSetParameters.id, id));
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Verwijderen mislukt" };
  }
}