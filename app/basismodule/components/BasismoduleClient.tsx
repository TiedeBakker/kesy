// app/basismodule/BasismoduleClient.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ObjectZoeker } from "../ObjectZoeker";
import ObjectDetailPanel from "./ObjectDetailPanel";
import { 
  voegObjectToeAction, 
  voegRelatieToe, 
  getObjectDetailsAction,
  maakNieuwRelatieTypeAction 
} from "../actions";
import { ObjectDetails } from "@/core/db/repository";

interface BasismoduleClientProps {
  alleObjecten: any[];
  relatieTypen: any[];
  centraalObject: any;
  boomData: { ingaand: any[]; uitgaand: any[] };
  selectedId?: string;
}

export default function BasismoduleClient({
  alleObjecten,
  relatieTypen,
  centraalObject,
  boomData,
  selectedId,
}: BasismoduleClientProps) {
  const [selectedDetails, setSelectedDetails] = useState<ObjectDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // State voor nieuw relatietype inline formulier
  const [isCreatingRelType, setIsCreatingRelType] = useState(false);
  const [nieuwTypeLabel, setNieuwTypeLabel] = useState("");
  const [selectedRelTypeId, setSelectedRelTypeId] = useState<string>("");

  // State voor vertrouwelijk vinkje (onthoudt de instelling tussen toevoegingen)
  const [isConfidential, setIsConfidential] = useState(false);
  const [nieuwObjectLabel, setNieuwObjectLabel] = useState("");

  // Functie om details in het zijpaneel te openen
  const handleSelectObject = async (objectId: string) => {
    setIsLoadingDetails(true);
    const result = await getObjectDetailsAction(objectId);
    if (result.success && result.data) {
      setSelectedDetails(result.data);
    } else {
      console.error(result.error);
    }
    setIsLoadingDetails(false);
  };

  // Handler voor het aanmaken van een nieuw RelatieType
  const handleCreateRelatieType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nieuwTypeLabel.trim()) return;

    const res = await maakNieuwRelatieTypeAction(nieuwTypeLabel);
    if (res.success && res.id) {
      setSelectedRelTypeId(res.id);
      setNieuwTypeLabel("");
      setIsCreatingRelType(false);
    } else {
      alert("Fout bij aanmaken relatietype: " + res.error);
    }
  };

  // Handler voor het aanmaken van een nieuw Object
  const handleCreateObject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nieuwObjectLabel.trim()) return;

    const formData = new FormData();
    formData.append("label", nieuwObjectLabel);
    if (isConfidential) {
      formData.append("isConfidential", "on");
    }

    await voegObjectToeAction(formData);
    setNieuwObjectLabel(""); // Alleen de tekstinvoer leegmaken, isConfidential blijft behouden!
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Basismodule</h1>
          <p className="text-sm text-slate-400">
            Selecteer een object, beheer eigenschappen en wandel door de relaties-boom.
          </p>
        </div>
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
          <form onSubmit={handleCreateObject} className="flex flex-col gap-3">
            <div>
              <input
                type="text"
                id="label"
                name="label"
                required
                placeholder="bijv. Server A of Geheim Dossier"
                value={nieuwObjectLabel}
                onChange={(e) => setNieuwObjectLabel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="isConfidential" className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  id="isConfidential"
                  name="isConfidential"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
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
                  <li key={item.relation_value_id} className="flex items-center gap-1">
                    <Link
                      href={`/basismodule?selectedId=${item.source_id}`}
                      className="flex-1 p-2.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-200 transition-colors"
                    >
                      <span className="text-[10px] text-slate-400 block">Niveau -{item.depth}</span>
                      <span className="font-semibold text-emerald-300">
                        {item.source_label || "Onbekend Object"}
                      </span>
                    </Link>
                    <button
                      onClick={() => handleSelectObject(item.source_id)}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 rounded border border-slate-700"
                      title="Bekijk details"
                    >
                      👁
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* KOLOM 2: CENTRAAL OBJECT */}
          <div className="p-4 bg-slate-900 rounded-lg border-2 border-emerald-500/50 space-y-4 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                  Centraal Geselecteerd
                </span>
                <h2 className="text-xl font-bold text-white mt-1">{centraalObject.label}</h2>
              </div>
              <button
                onClick={() => handleSelectObject(centraalObject.id)}
                className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded text-xs flex items-center gap-1 transition"
              >
                ⚙ Details & Parameters
              </button>
            </div>

            {/* FORMULIER: KOPPEL AAN ANDER OBJECT */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-slate-300">Nieuwe Uitgaande Relatie Leggen:</h4>
                <button
                  type="button"
                  onClick={() => setIsCreatingRelType(!isCreatingRelType)}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  {isCreatingRelType ? "Kies bestaand type" : "+ Nieuw Type"}
                </button>
              </div>

              {/* INLINE FORMULIER: NIEUW RELATIETYPE AANMAKEN */}
              {isCreatingRelType ? (
                <form onSubmit={handleCreateRelatieType} className="p-2 bg-slate-950 border border-slate-800 rounded space-y-2">
                  <label className="text-[10px] text-slate-400 block">Nieuw Relatietype Label</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="bijv. stuurt aan, is onderdeel van"
                      value={nieuwTypeLabel}
                      onChange={(e) => setNieuwTypeLabel(e.target.value)}
                      required
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1 rounded font-semibold"
                    >
                      Opslaan
                    </button>
                  </div>
                </form>
              ) : (
                /* REGULIER RELATIE FORMULIER */
                <form action={voegRelatieToe} className="space-y-2">
                  <input type="hidden" name="sourceId" value={centraalObject.id} />

                  <select
                    name="relationId"
                    value={selectedRelTypeId}
                    onChange={(e) => setSelectedRelTypeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="">-- Kies Relatietype --</option>
                    {relatieTypen.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        Type: {r.label}
                      </option>
                    ))}
                  </select>

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
              )}
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
                  <li key={item.relation_value_id} className="flex items-center gap-1">
                    <Link
                      href={`/basismodule?selectedId=${item.target_id}`}
                      className="flex-1 p-2.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-200 transition-colors"
                    >
                      <span className="text-[10px] text-slate-400 block">Niveau +{item.depth}</span>
                      <span className="font-semibold text-emerald-300">
                        {item.target_label || "Onbekend Object"}
                      </span>
                    </Link>
                    <button
                      onClick={() => handleSelectObject(item.target_id)}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 rounded border border-slate-700"
                      title="Bekijk details"
                    >
                      👁
                    </button>
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

      {/* 3. SLIDE-OVER ZIJPANEEL */}
      <ObjectDetailPanel
        details={selectedDetails}
        isLoading={isLoadingDetails}
        onClose={() => setSelectedDetails(null)}
      />
    </div>
  );
}