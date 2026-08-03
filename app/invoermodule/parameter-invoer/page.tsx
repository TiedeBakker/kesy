import { dbRemote, dbLocal } from "../../../core/db";
import { parameterSets, parameters } from "../../../core/db/schema";
import { ParameterInvoerForm } from "./_components/parameter-invoer-form";

export default async function ParameterInvoerPage() {
  const db = dbRemote || dbLocal;

  // Haal publieke stamdata op
  const [sets, alleParams] = db
    ? await Promise.all([
        db.select().from(parameterSets).orderBy(parameterSets.label),
        db.select().from(parameters).orderBy(parameters.label),
      ])
    : [[], []];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-800">Parameter-Waarden Invoeren</h1>
        <p className="text-xs text-gray-500">
          Koppel snel en gestructureerd parameter-waarden of metingen aan objecten.
        </p>
      </div>

      <ParameterInvoerForm parameterSets={sets} alleParameters={alleParams} />
    </div>
  );
}