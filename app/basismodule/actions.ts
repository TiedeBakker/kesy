// app\basismodule\actions.ts
"use server";

import { maakNieuwItem, maakItemOngeldig } from "@/core/db/repository";
import { revalidatePath } from "next/cache";
import { voegRelatieToeMetBeveiliging } from "@/core/db/repository";

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
// //
// // ZOEKEN IN OBJECTEN MET LIMIT 20 (Voor grote datasets)
// //
// export async function zoekObjectenAction(zoekterm: string) {
//   const schoneZoekterm = zoekterm.trim();
  
//   if (!schoneZoekterm) {
//     // Geef de eerste 20 objecten terug als zoekterm leeg is
//     const alle = await haalAlleObjectenOp();
//     return alle.slice(0, 20);
//   }

//   // Gebruik de bestaande ophaalfunctie en filter op de client of pas SQL LIKE toe
//   const alleObjecten = await haalAlleObjectenOp();
  
//   return alleObjecten
//     .filter((obj) => obj.label.toLowerCase().includes(schoneZoekterm.toLowerCase()))
//     .slice(0, 20); // Beperk strikt tot 20 items voor de DOM
// }