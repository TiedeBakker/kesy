"use server";

import { dbLocal, dbRemote, isCloudOnly } from "../../../../core/db";
import { objects } from "../../../../core/db/schema";
import { sql, like, and, isNull } from "drizzle-orm";

export interface SearchedObject {
  id: string;
  label: string;
  isConfidential: boolean;
}

export async function zoekSourceObjecten(
  zoekTerm: string = "",
  limit: number = 50
): Promise<SearchedObject[]> {
  // Als de gebruiker zelf geen '%' meestuurt, plakken we er een % achter
  const queryPattern = zoekTerm.includes("%") ?  `${zoekTerm}%`: `${zoekTerm}%`;

  // Filter: alleen actieve objecten (validTo IS NULL) en matching label
  const whereClause = and(
    isNull(objects.validTo),
    like(objects.label, queryPattern)
  );

  const [lokaleObjecten, remoteObjecten] = await Promise.all([
    !isCloudOnly && dbLocal
      ? dbLocal.select().from(objects).where(whereClause).limit(limit)
      : Promise.resolve([]),
    dbRemote
      ? dbRemote.select().from(objects).where(whereClause).limit(limit)
      : Promise.resolve([]),
  ]);

  // Ontdubbelen op ID (geeft voorkeur aan het lokale object qua confidential status)
  const objectenMap = new Map<string, SearchedObject>();

  [...remoteObjecten, ...lokaleObjecten].forEach((obj) => {
    objectenMap.set(obj.id, {
      id: obj.id,
      label: obj.label,
      isConfidential: Boolean(obj.isConfidential),
    });
  });

  return Array.from(objectenMap.values()).slice(0, limit);
}