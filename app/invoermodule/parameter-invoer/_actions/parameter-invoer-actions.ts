"use server";

import { dbLocal, dbRemote, isCloudOnly } from "../../../../core/db";
import {
  parameters,
  parameterValues,
  parameterSetParameters,
} from "../../../../core/db/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import {
  ParameterInvoerItem,
  ParameterSetItem,
} from "../_types/parameter-set-types";

// 1. Ophalen van de invullijst voor een Object + ParameterSet + Datum
export async function bereidParameterInvoerVoor(params: {
  targetId: string;
  setId: string;
  peildatumIso: string;
  isConfidential?: boolean; // <-- Toegevoegd!
}): Promise<ParameterInvoerItem[]> {
  // Voor Vertrouwelijk: ALTIJD lokaal lezen. Anders remote met fallback op lokaal.
  const db = params.isConfidential
    ? (dbLocal || dbRemote)
    : (dbRemote || dbLocal);

  if (!db || !params.setId) return [];

  try {
    // 1. Haal alle parameters uit de geselecteerde Parameter Set op (stamdata uit Turso/Remote)
    const dbStamdata = dbRemote || dbLocal;
    const setItems = await dbStamdata
      .select({
        parameterId: parameterSetParameters.parameterId,
        volgnr: parameterSetParameters.volgnr,
        isMeetwaarde: parameterSetParameters.isMeetwaarde,
        parameterLabel: parameters.label,
        parameterCode: parameters.code,
        dataType: parameters.dataType,
        unit: parameters.unit,
      })
      .from(parameterSetParameters)
      .leftJoin(
        parameters,
        eq(parameterSetParameters.parameterId, parameters.id)
      )
      .where(eq(parameterSetParameters.parameterSetId, params.setId));

    // 2. Zoek voor elke parameter de laatst bekende waarde (Lokaal óf Remote, afhankelijk van isConfidential)
    const result: ParameterInvoerItem[] = await Promise.all(
      setItems.map(async (item) => {
        let laatstBekendeWaarde: string | null = null;
        let laatstBekendeDatum: string | null = null;

        if (params.targetId) {
          const historie = await db
            .select({
              value: parameterValues.value,
              validFrom: parameterValues.validFrom,
            })
            .from(parameterValues)
            .where(
              and(
                eq(parameterValues.targetId, params.targetId),
                eq(parameterValues.parameterId, item.parameterId),
                lte(parameterValues.validFrom, params.peildatumIso)
              )
            )
            .orderBy(desc(parameterValues.validFrom))
            .limit(1);

          if (historie.length > 0) {
            laatstBekendeWaarde = historie[0].value;
            laatstBekendeDatum = historie[0].validFrom;
          }
        }

        return {
          parameterId: item.parameterId,
          parameterLabel: item.parameterLabel || "Onbekend",
          parameterCode: item.parameterCode || "",
          dataType: item.dataType || "string",
          unit: item.unit,
          volgnr: item.volgnr,
          isMeetwaarde: Boolean(item.isMeetwaarde),
          ingevoerdeWaarde: "",
          laatstBekendeWaarde,
          laatstBekendeDatum,
          isExtraParameter: false,
        };
      })
    );

    return result.sort((a, b) => a.volgnr - b.volgnr);
  } catch (err) {
    console.error("Fout bij voorbereiden parameter invoer:", err);
    return [];
  }
}
// 2. Opslaan van alle ingevoerde parameter-waarden
export async function slaParameterWaardenOp(params: {
  targetId: string;
  targetType: "object" | "relation_value";
  datumIso: string;
  items: ParameterInvoerItem[];
  isConfidential?: boolean;
}) {
  try {
    // Filter alleen de items waarin daadwerkelijk een waarde is ingevuld
    const teVerwerkenItems = params.items.filter(
      (item) => item.ingevoerdeWaarde.trim() !== ""
    );

    if (teVerwerkenItems.length === 0) {
      return { success: false, error: "Geen waarden ingevuld om op te slaan." };
    }

    const records = teVerwerkenItems.map((item) => {
      const newId = uuidv7(); // UUIDv7
      return {
        id: newId,
        parameterId: item.parameterId,
        targetId: params.targetId,
        targetType: params.targetType,
        value: item.ingevoerdeWaarde,
        isConfidential: Boolean(params.isConfidential),
        validFrom: params.datumIso,
        // ALS HET EEN MEETWAARDE IS: validTo = validFrom (punt in de tijd event)
        // ANDERS: validTo = null (geldig vanaf nu tot nader order)
        validTo: item.isMeetwaarde ? params.datumIso : null,
      };
    });

    if (!isCloudOnly && dbLocal) {
      await dbLocal.insert(parameterValues).values(records);
    }
    if (dbRemote && !params.isConfidential) {
      await dbRemote.insert(parameterValues).values(records);
    }

    return { success: true, count: records.length };
  } catch (err: any) {
    console.error("Fout bij opslaan parameter waarden:", err);
    return { success: false, error: err?.message || "Opslaan mislukt" };
  }
}