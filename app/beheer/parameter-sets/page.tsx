import { dbLocal, dbRemote } from "../../../core/db";
import { parameters } from "../../../core/db/schema";
import { ParameterSetManager } from "./_components/parameter-set-manager";

export default async function ParameterSetsPage() {
  // Lees primair van dbRemote (Turso) voor publieke parameters, fallback op dbLocal
  const db = dbRemote || dbLocal;
  
  const beschikbareParameters = db
    ? await db.select().from(parameters).orderBy(parameters.label)
    : [];

  return (
    <div className="p-6">
      <ParameterSetManager beschikbareParameters={beschikbareParameters} />
    </div>
  );
}