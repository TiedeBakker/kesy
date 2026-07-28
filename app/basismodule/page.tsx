// app/basismodule/page.tsx

import {
  haalObjectOp,
  haalObjectenBoomOp,
  haalAlleObjectenOp,
  haalRelatieTypenOp
} from "@/core/db/repository";
import { voegObjectToeAction, voegRelatieToe } from "./actions";
import { ObjectZoeker } from "./ObjectZoeker";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ selectedId?: string }>;
}

export default async function BasismodulePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedId = params.selectedId;

  // Databepalingen
  const alleObjecten = await haalAlleObjectenOp();
  const relatieTypen = await haalRelatieTypenOp();
  const centraalObject = selectedId ? await haalObjectOp(selectedId) : null;
  const boomData = selectedId ? await haalObjectenBoomOp(selectedId) : { ingaand: [], uitgaand: [] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white">Basismodule</h1>
        <p className="text-sm text-slate-400">
          Selecteer een object, beheer eigenschappen en wandel door de relaties-boom.
        </p>
      </div>

      {/* 1. SELECTIE & INVOER BALK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kies bestaand object met ZOEKER */}
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            1. Kies Centraal Object (Zoeken):
          </label>
          <ObjectZoeker
            initieleObjecten={alleObjecten}
            geselecteerdId={selectedId}
            mode="navigate"
            placeholder="Typ om centraal object te zoeken..."
          />
        </div>

        {/* Nieuw object maken */}
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            2. Nieuw Object Aanmaken:
          </label>
          <form action={voegObjectToeAction} className="flex flex-col gap-3">
            <div>
              <input
                type="text"
                id="label"
                name="label"
                required
                placeholder="bijv. Server A of Geheim Dossier"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="isConfidential" className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  id="isConfidential"
                  name="isConfidential"
                  className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
                />
                Vertrouwelijk (lokaal)
              </label>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                + Toevoegen
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. DRIE-KOLOMS GRAAF / BOOM WEERGAVE */}
      {centraalObject ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* KOLOM 1: INGAANDE BOOM */}
          <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              &larr; Ingaande Objecten (Bron)
            </h3>
            {boomData.ingaand.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Geen ingaande relaties.</p>
            ) : (
              <ul className="space-y-2">
                {boomData.ingaand.map((item: any) => (
                  <li key={item.relation_value_id}>
                    <Link
                      href={`/basismodule?selectedId=${item.source_id}`}
                      className="block p-2.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-200 transition-colors"
                    >
                      <span className="text-[10px] text-slate-400 block">Niveau -{item.depth}</span>
                      <span className="font-semibold text-emerald-300">
                        {item.source_label || "Onbekend Object"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* KOLOM 2: CENTRAAL OBJECT */}
          <div className="p-4 bg-slate-900 rounded-lg border-2 border-emerald-500/50 space-y-4 shadow-lg">
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                Centraal Geselecteerd
              </span>
              <h2 className="text-xl font-bold text-white mt-1">{centraalObject.label}</h2>
            </div>

            {/* FORMULIER: KOPPEL AAN ANDER OBJECT */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300">Nieuwe Uitgaande Relatie Leggen:</h4>
              <form action={voegRelatieToe} className="space-y-2">
                <input type="hidden" name="sourceId" value={centraalObject.id} />

                {/* Selecteer Relatietype */}
                <select
                  name="relationId"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                >
                  {relatieTypen.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      Type: {r.label}
                    </option>
                  ))}
                </select>

                {/* SELECTEER DOEL OBJECT MET ZOEKER (In plaats van zware select-box) */}
                <ObjectZoeker
                  initieleObjecten={alleObjecten}
                  excludeId={centraalObject.id}
                  mode="select"
                  inputName="targetId"
                  placeholder="Zoek doel (target) object..."
                />

                <button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs py-1.5 rounded font-medium transition-colors"
                >
                  + Koppel Relatie
                </button>
              </form>
            </div>
          </div>

          {/* KOLOM 3: UITGAANDE BOOM */}
          <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Uitgaande Objecten (Doel) &rarr;
            </h3>
            {boomData.uitgaand.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Geen uitgaande relaties.</p>
            ) : (
              <ul className="space-y-2">
                {boomData.uitgaand.map((item: any) => (
                  <li key={item.relation_value_id}>
                    <Link
                      href={`/basismodule?selectedId=${item.target_id}`}
                      className="block p-2.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-200 transition-colors"
                    >
                      <span className="text-[10px] text-slate-400 block">Niveau +{item.depth}</span>
                      <span className="font-semibold text-emerald-300">
                        {item.target_label || "Onbekend Object"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-900/40 rounded-lg border border-dashed border-slate-800 text-slate-500">
          <p>Kies hierboven een object om het centraal te stellen en door de boom te navigeren.</p>
        </div>
      )}
    </div>
  );
}