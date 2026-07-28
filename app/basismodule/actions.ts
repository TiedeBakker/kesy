// app\basismodule\actions.ts
"use server";

import { maakNieuwItem, maakItemOngeldig } from "@/core/db/repository";
import { revalidatePath } from "next/cache";
import { voegRelatieToeMetBeveiliging } from "@/core/db/repository";
import { haalObjectDetailsOp } from "@/core/db/repository";
import { eq } from "drizzle-orm";
import { dbLocal, dbRemote } from "@/core/db";
import { objects, parameterValues } from "@/core/db/schema";

export async function voegObjectToe(formData: FormData) {
  const label = formData.get("label") as string;
  if (!label) return;

  await maakNieuwItem("object", {
    label,
    isConfidential: false,
  });

  revalidatePath("/basismodule");
}
export async function voegObjectToeAction(formData: FormData) {
  const label = formData.get("label") as string;
  // Een checkbox stuur "on" als hij is aangevinkt, anders is hij null
  const isConfidential = formData.get("isConfidential") === "on" || formData.get("isConfidential") === "true";

  if (!label || label.trim() === "") {
    return;
  }

  await maakNieuwItem("object", {
    label: label.trim(),
    isConfidential,
  });

  revalidatePath("/basismodule");
}

// ✅ NIEUWE CODE IN ACTIONS.TS:
export async function voegRelatieToe(formData: FormData) {
  const sourceId = formData.get("sourceId") as string;
  const targetId = formData.get("targetId") as string;
  const relationId = formData.get("relationId") as string;

  if (!sourceId || !targetId || !relationId) {
    throw new Error("Bron, doel en relatietype zijn verplicht.");
  }

  // Gebruik de beveiligingscheck die automatisch controleert of de relatie lokaal moet!
  await voegRelatieToeMetBeveiliging(sourceId, targetId, relationId);

  revalidatePath("/basismodule");
}


// app/basismodule/actions.ts
import { haalAlleObjectenOp } from "@/core/db/repository";

export async function zoekObjectenAction(zoekterm: string) {
  const alleObjecten = await haalAlleObjectenOp();
  const schoneTerm = zoekterm.trim().toLowerCase();

  if (!schoneTerm) {
    return alleObjecten.slice(0, 20);
  }

  return alleObjecten
    .filter((obj) => obj.label.toLowerCase().includes(schoneTerm))
    .slice(0, 20); // Beperk strikt tot 20 items voor de DOM
}

export async function getObjectDetailsAction(objectId: string) {
  try {
    const details = await haalObjectDetailsOp(objectId);
    return { success: true, data: details };
  } catch (error: any) {
    console.error("Fout bij ophalen objectdetails:", error);
    return { success: false, error: error.message };
  }
}

// 1. Basisgegevens van een object updaten
export async function updateObjectBasisAction(
  objectId: string,
  label: string,
  validFrom: string,
  validTo?: string | null
) {
  try {
    const dbs = [dbLocal, dbRemote].filter(
      (db): db is NonNullable<typeof db> => db !== null
    );

    for (const dbClient of dbs) {
      await dbClient
        .update(objects)
        .set({
          label,
          validFrom: validFrom ? new Date(validFrom).toISOString() : undefined,
          validTo: validTo ? new Date(validTo).toISOString() : null,
        })
        .where(eq(objects.id, objectId));
    }

    revalidatePath("/basismodule");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. Parameterwaarde toevoegen aan een object (accepteert FormData)
export async function voegParameterWaardeToeAction(formData: FormData): Promise<void> {
  const objectId = formData.get("objectId") as string;
  const parameterId = formData.get("parameterId") as string;
  const value = formData.get("value") as string;

  if (!objectId || !parameterId || !value) return;

  await maakNieuwItem("parameter_value", {
    targetId: objectId,
    targetType: "object",
    parameterId,
    value,
  });

  revalidatePath("/basismodule");
}

// 3. Bestaande parameterwaarde bewerken (accepteert FormData)
export async function updateParameterWaardeAction(formData: FormData): Promise<void> {
  const valueId = formData.get("valueId") as string;
  const newValue = formData.get("newValue") as string;

  if (!valueId) return;

  const dbs = [dbLocal, dbRemote].filter(
    (db): db is NonNullable<typeof db> => db !== null
  );

  for (const dbClient of dbs) {
    await dbClient
      .update(parameterValues)
      .set({ value: newValue })
      .where(eq(parameterValues.id, valueId));
  }

  revalidatePath("/basismodule");
}