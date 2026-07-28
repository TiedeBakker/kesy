// app/basismodule/components/ObjectDetailPanel.tsx

"use client";

import React, { useState, useEffect } from "react";
import { ObjectDetails } from "@/core/db/repository";
import {
  voegParameterWaardeToeAction,
  updateParameterWaardeAction,
  updateObjectBasisAction,
} from "../actions";

interface ObjectDetailPanelProps {
  details: ObjectDetails | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function ObjectDetailPanel({
  details,
  isLoading,
  onClose,
}: ObjectDetailPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isEditingBasis, setIsEditingBasis] = useState(false);
  
  const [label, setLabel] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");

  const [isAddingParam, setIsAddingParam] = useState(false);
  const [editingParamId, setEditingParamId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (details?.object) {
      setLabel(details.object.label || "");
      
      if (details.object.validFrom) {
        setValidFrom(new Date(details.object.validFrom).toISOString().slice(0, 16));
      } else {
        setValidFrom("");
      }

      // @ts-ignore
      if (details.object.validTo) {
        // @ts-ignore
        setValidTo(new Date(details.object.validTo).toISOString().slice(0, 16));
      } else {
        setValidTo("");
      }
    }
    setIsEditingBasis(false);
    setIsMinimized(false); // Reset minimiseren bij nieuw object
  }, [details]);

  if (!details && !isLoading) return null;

  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSaveBasis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details?.object?.id) return;

    const res = await updateObjectBasisAction(
      details.object.id,
      label,
      validFrom,
      validTo || null
    );

    if (res.success) {
      setIsEditingBasis(false);
    } else {
      alert("Fout bij opslaan: " + res.error);
    }
  };

  const handleAddParameterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await voegParameterWaardeToeAction(formData);
    setIsAddingParam(false);
  };

  const handleUpdateParameterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateParameterWaardeAction(formData);
    setEditingParamId(null);
  };

  // @ts-ignore
  const objectValidTo = details?.object?.validTo;

  // ALS DE PANEL GEMINIMISEERD IS
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg shadow-xl z-50 flex items-center gap-3">
        <span className="text-xs font-bold text-emerald-400">
          {details?.object?.label || "Object"}
        </span>
        <button
          onClick={() => setIsMinimized(false)}
          className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
          title="Uitklappen"
        >
          📖 Uitklappen
        </button>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs px-1"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-100 border-l border-slate-800 shadow-2xl z-50 flex flex-col transition-all">
      {/* HEADER */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-start bg-slate-950">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            {details?.object?.type || "Object Details"}
          </span>
          <h2 className="text-xl font-bold text-white">
            {isLoading ? "Laden..." : details?.object?.label || "Onbekend Object"}
          </h2>
        </div>

        {/* BEDIENINGSKNOPPEN (MINIMISEER + SLUITEN) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 text-sm"
            title="Klap in / Minimiseer"
          >
            🗕
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 text-sm"
            title="Sluiten"
          >
            ✕
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-32 text-slate-500">
            Details ophalen...
          </div>
        ) : details ? (
          <>
            {/* STAMGEGEVENS / BASISGEGEVENS */}
            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Basisgegevens
                </h3>
                <button
                  onClick={() => setIsEditingBasis(!isEditingBasis)}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  {isEditingBasis ? "Annuleren" : "✏️ Bewerken"}
                </button>
              </div>

              {isEditingBasis ? (
                <form onSubmit={handleSaveBasis} className="space-y-3 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Label</label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Geldig vanaf
                      </label>
                      <input
                        type="datetime-local"
                        value={validFrom}
                        onChange={(e) => setValidFrom(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Geldig tot (optioneel)
                      </label>
                      <input
                        type="datetime-local"
                        value={validTo}
                        onChange={(e) => setValidTo(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingBasis(false)}
                      className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700"
                    >
                      Annuleren
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-500"
                    >
                      Opslaan
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Vertrouwelijk:</span>
                    <span className="text-slate-300 font-medium">
                      {details.object.isConfidential ? "Ja 🔒" : "Nee"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Geldig vanaf:</span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {formatDate(details.object.validFrom)}
                    </span>
                  </div>
                  {objectValidTo && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Geldig tot:</span>
                      <span className="text-amber-300 font-mono text-[11px]">
                        {formatDate(objectValidTo)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTIE 1: INGAANDE RELATIES (READ-ONLY) */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ingaande Relaties ({details.ingaandeRelaties?.length || 0})
              </h3>
              {!details.ingaandeRelaties || details.ingaandeRelaties.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Geen ingaande relaties.</p>
              ) : (
                <div className="space-y-1.5">
                  {details.ingaandeRelaties.map((rel) => (
                    <div
                      key={rel.relation_value_id}
                      className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-200 font-medium">
                        {rel.source_label || rel.source_id}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                        {rel.relation_id} ➔
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTIE 2: UITGAANDE RELATIES (READ-ONLY) */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Uitgaande Relaties ({details.uitgaandeRelaties?.length || 0})
              </h3>
              {!details.uitgaandeRelaties || details.uitgaandeRelaties.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Geen uitgaande relaties.</p>
              ) : (
                <div className="space-y-1.5">
                  {details.uitgaandeRelaties.map((rel) => (
                    <div
                      key={rel.relation_value_id}
                      className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                        ➔ {rel.relation_id}
                      </span>
                      <span className="text-slate-200 font-medium">
                        {rel.target_label || rel.target_id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTIE 3: PARAMETERWAARDEN VAN HET OBJECT */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Parameterwaarden ({details.parameterWaarden?.length || 0})
                </h3>
                <button
                  onClick={() => setIsAddingParam(!isAddingParam)}
                  className="text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded hover:bg-emerald-600/30 transition"
                >
                  {isAddingParam ? "Annuleren" : "+ Parameter Koppelen"}
                </button>
              </div>

              {/* FORMULIER: NIEUWE PARAMETER TOEVOEGEN */}
              {isAddingParam && (
                <form
                  onSubmit={handleAddParameterSubmit}
                  className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2"
                >
                  <input type="hidden" name="objectId" value={details.object.id} />
                  <div>
                    <label className="text-[10px] text-slate-400">Parameter ID</label>
                    <input
                      type="text"
                      name="parameterId"
                      required
                      placeholder="bijv. gewicht, status..."
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Waarde</label>
                    <input
                      type="text"
                      name="value"
                      required
                      placeholder="Vul waarde in..."
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 text-white text-xs py-1 rounded font-semibold hover:bg-emerald-500"
                  >
                    Opslaan
                  </button>
                </form>
              )}

              {/* LIJST MET PARAMETER WAARDEN */}
              {!details.parameterWaarden || details.parameterWaarden.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Geen parameters gekoppeld.</p>
              ) : (
                <div className="space-y-2">
                  {details.parameterWaarden.map((param: any) => (
                    <div
                      key={param.id}
                      className="p-3 bg-slate-950 rounded border border-slate-800 flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-200 block">
                          {param.parameterLabel || param.parameterId}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Vanaf: {formatDate(param.validFrom)}
                        </span>
                      </div>

                      {editingParamId === param.id ? (
                        <form
                          onSubmit={handleUpdateParameterSubmit}
                          className="flex gap-2"
                        >
                          <input type="hidden" name="valueId" value={param.id} />
                          <input
                            type="text"
                            name="newValue"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-xs text-slate-200"
                          />
                          <button
                            type="submit"
                            className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px]"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingParamId(null)}
                            className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]"
                          >
                            ✕
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-mono bg-slate-900 px-2 py-1 rounded text-emerald-400 border border-slate-800">
                            {param.value}
                          </span>
                          <button
                            onClick={() => {
                              setEditingParamId(param.id);
                              setEditValue(param.value);
                            }}
                            className="text-slate-500 hover:text-slate-300"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}