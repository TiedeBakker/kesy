import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-bold text-white">Digitaal Kennissysteem</h1>
        <p className="text-slate-400 mt-1">
          Welkom. Kies een module uit het menu of start direct in de basismodule.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/basismodule"
          className="p-6 bg-slate-900 border border-slate-800 rounded-lg hover:border-emerald-500/50 transition-colors block group"
        >
          <h2 className="text-xl font-semibold text-emerald-400 group-hover:underline">
            Basismodule &rarr;
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Beheer objecten, relaties en parameters in een recursieve boomstructuur.
          </p>
        </Link>
      </div>
    </div>
  );
}