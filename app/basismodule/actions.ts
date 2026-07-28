// app\basismodule\actions.ts
"use server";

import { maakNieuwItem, maakItemOngeldig } from "@/core/db/repository";
import { revalidatePath } from "next/cache";
import { voegRelatieToeMetBeveiliging } from "@/core/db/repository";
import { haalObjectDetailsOp } from "@/core/db/repository";
import { eq } from "drizzle-orm";
import { dbLocal, dbRemote } from "@/core/db";
import { objects, parameterValues } from "@/core/db/schema";

import {
  haalAlleParameterDefinitiesOp,
  vernieuwParameterWaardeMetHistorie,
} from "@/core/db/repository";


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

// 1. Haal alle parameterdefinities op voor de dropdown
export async function getParameterDefinitiesAction() {
  try {
    const definities = await haalAlleParameterDefinitiesOp();
    return { success: true, data: definities };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

// 2. Nieuwe parameterdefinitie (stamgegeven) aanmaken
export async function maakNieuweParameterDefinitieAction(data: {
  label: string;
  code: string;
  dataType: string;
  unit?: string;
}) {
  try {
    const newId = await maakNieuwItem("parameter", {
      label: data.label,
      code: data.code || data.label.toLowerCase().replace(/\s+/g, "_"),
      dataType: data.dataType || "string",
      unit: data.unit || null,
    });

    revalidatePath("/basismodule");
    return { success: true, id: newId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 3. Parameterwaarde toevoegen aan een object
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

// 4. Parameterwaarde corrigeren (Rechtstreekse mutatie zonder historie-record)
export async function corrigeerParameterWaardeAction(
  valueId: string,
  newValue: string
) {
  try {
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
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 5. Parameterwaarde vernieuwen (Met historisch opvolg-record)
export async function vernieuwParameterWaardeAction(
  oudeValueId: string,
  objectId: string,
  parameterId: string,
  nieuweWaarde: string
) {
  try {
    await vernieuwParameterWaardeMetHistorie(
      oudeValueId,
      objectId,
      parameterId,
      nieuweWaarde
    );

    revalidatePath("/basismodule");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 6. Parameterwaarde uitschakelen / ongeldig maken
export async function deactiveerParameterWaardeAction(valueId: string) {
  try {
    await maakItemOngeldig("parameter_value", valueId);
    revalidatePath("/basismodule");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 7. Basisgegevens van het object updaten
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

export async function maakNieuwRelatieTypeAction(label: string) {
  try {
    if (!label || label.trim() === "") {
      return { success: false, error: "Label mag niet leeg zijn." };
    }

    const newId = await maakNieuwItem("relation", {
      label: label.trim(),
    });

    revalidatePath("/basismodule");
    return { success: true, id: newId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}