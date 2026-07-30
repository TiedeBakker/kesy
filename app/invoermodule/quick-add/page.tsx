import { haalRelatieTypenOp } from "../../../core/db/repository";
import { QuickAddForm } from "./_components/quick-add-form";

export const dynamic = "force-dynamic";

export default async function QuickAddPage() {
  const relatieTypen = await haalRelatieTypenOp();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">1-op-N Quick-Add</h1>
        <p className="text-sm text-gray-500">
          Voeg snel meerdere gerelateerde kind-objecten toe aan één ouder-object met geautomatiseerde volgnummering.
        </p>
      </div>

      <QuickAddForm relatieTypen={relatieTypen} />
    </div>
  );
}