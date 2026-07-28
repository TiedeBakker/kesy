// app/basismodule/components/ObjectDetailPanel.tsx

"use client";

import React, { useState, useEffect } from "react";
import { ObjectDetails } from "@/core/db/repository";
import {
  voegParameterWaardeToeAction,
  corrigeerParameterWaardeAction,
  vernieuwParameterWaardeAction,
  deactiveerParameterWaardeAction,
  getParameterDefinitiesAction,
  maakNieuweParameterDefinitieAction,
  updateObjectBasisAction,
} from "../actions";

interface ObjectDetailPanelProps {
  details: ObjectDetails | null;
  isLoading: boolean;
  onClose: () => void;
}

const DATA_TYPES = [
  { value: "tekst", label: "Tekst (kort)" },
  { value: "tekstarea", label: "Tekst (meerdere regels)" },
  { value: "datumtijd", label: "Datum & Tijd" },
  { value: "getal", label: "Getal" },
];

export default function ObjectDetailPanel({
  details,
  isLoading,
  onClose,
}: ObjectDetailPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isEditingBasis, setIsEditingBasis] = useState(false);

  // Parameter stamgegevens & dropdown state
  const [parameterDefinities, setParameterDefinities] = useState<any[]>([]);
  const [isAddingParam, setIsAddingParam] = useState(false);
  const [isCreatingNewDef, setIsCreatingNewDef] = useState(false);

  // Selected parameter for new value creation
  const [selectedParamId, setSelectedParamId] = useState("");

  // Form states voor nieuwe definitie
  const [newDefLabel, setNewDefLabel] = useState("");
  const [newDefCode, setNewDefCode] = useState("");
  const [newDefDataType, setNewDefDataType] = useState("tekst");
  const [newDefUnit, setNewDefUnit] = useState("");

  // Edit states voor parameterwaarden
  const [editingParamId, setEditingParamId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editMode, setEditMode] = useState<"correctie" | "historie">("correctie");

  // Basisobject state
  const [label, setLabel] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");

  useEffect(() => {
    async function loadDefinities() {
      const res = await getParameterDefinitiesAction();
      if (res.success) {
        setParameterDefinities(res.data);
      }
    }
    loadDefinities();
  }, []);

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
    setIsMinimized(false);
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

  // Dynamic Input Renderer Component
  const renderValueInput = (
    dataType: string = "tekst",
    value: string,
    onChange: (val: string) => void,
    name?: string
  ) => {
    switch (dataType) {
      case "tekstarea":
        return (
          <textarea
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
            rows={3}
            placeholder="Vul tekst in..."
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-y"
          />
        );
      case "datumtijd":
        return (
          <input
            type="datetime-local"
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        );
      case "getal":
        return (
          <input
            type="number"
            step="any"
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
            placeholder="0"
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          />
        );
      case "tekst":
      default:
        return (
          <input
            type="text"
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
            placeholder="Vul waarde in..."
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        );
    }
  };

  // HANDLERS
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

  const handleCreateParameterDefinitie = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await maakNieuweParameterDefinitieAction({
      label: newDefLabel,
      code: newDefCode,
      dataType: newDefDataType,
      unit: newDefUnit,
    });

    if (res.success) {
      const updated = await getParameterDefinitiesAction();
      if (updated.success) {
        setParameterDefinities(updated.data);
        if (res.id) setSelectedParamId(res.id);
      }
      setIsCreatingNewDef(false);
      setNewDefLabel("");
      setNewDefCode("");
      setNewDefUnit("");
      setNewDefDataType("tekst");
    } else {
      alert("Fout bij aanmaken parameterdefinitie: " + res.error);
    }
  };

  const handleAddParameterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await voegParameterWaardeToeAction(formData);
    setIsAddingParam(false);
    setSelectedParamId("");
  };

  const handleSaveParameterValue = async (param: any) => {
    if (editMode === "correctie") {
      await corrigeerParameterWaardeAction(param.id, editValue);
    } else {
      await vernieuwParameterWaardeAction(
        param.id,
        details!.object.id,
        param.parameterId,
        editValue
      );
    }
    setEditingParamId(null);
  };

  const handleDeactiveerParameter = async (valueId: string) => {
    if (confirm("Weet je zeker dat je deze parameterwaarde wilt uitschakelen?")) {
      await deactiveerParameterWaardeAction(valueId);
    }
  };

  // Geselecteerde parameter definitie object opsporen
  const selectedDef = parameterDefinities.find((d) => d.id === selectedParamId);

  // @ts-ignore
  const objectValidTo = details?.object?.validTo;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg shadow-xl z-50 flex items-center gap-3">
        <span className="text-xs font-bold text-emerald-400">
          {details?.object?.label || "Object"}
        </span>
        <button
          onClick={() => setIsMinimized(false)}
          className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
        >
          📖 Uitklappen
        </button>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xs px-1">
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col transition-all">
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

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 text-sm"
            title="Klap in"
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
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Geldig vanaf</label>
                      <input
                        type="datetime-local"
                        value={validFrom}
                        onChange={(e) => setValidFrom(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Geldig tot</label>
                      <input
                        type="datetime-local"
                        value={validTo}
                        onChange={(e) => setValidTo(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingBasis(false)}
                      className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs"
                    >
                      Annuleren
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-semibold"
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
                </div>
              )}
            </div>

            {/* SECTIE 1: INGAANDE RELATIES */}
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

            {/* SECTIE 2: UITGAANDE RELATIES */}
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

            {/* SECTIE 3: PARAMETERWAARDEN */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Parameterwaarden ({details.parameterWaarden?.length || 0})
                </h3>
                <button
                  onClick={() => {
                    setIsAddingParam(!isAddingParam);
                    setIsCreatingNewDef(false);
                    setSelectedParamId("");
                  }}
                  className="text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded hover:bg-emerald-600/30"
                >
                  {isAddingParam ? "Annuleren" : "+ Parameter Koppelen"}
                </button>
              </div>

              {/* FORMULIER: NIEUWE PARAMETER KOPPELEN / DEFINIEER */}
              {isAddingParam && (
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-300">
                      {isCreatingNewDef ? "Nieuwe Definitie Aanmaken" : "Parameter Selecteren"}
                    </span>
                    <button
                      onClick={() => setIsCreatingNewDef(!isCreatingNewDef)}
                      className="text-[11px] text-emerald-400 underline"
                    >
                      {isCreatingNewDef ? "Kies bestaande" : "+ Nieuwe Definitie"}
                    </button>
                  </div>

                  {/* FORMULIER A: NIEUWE STAMGEGEVEN DEFINITIE */}
                  {isCreatingNewDef ? (
                    <form onSubmit={handleCreateParameterDefinitie} className="space-y-2.5">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Label</label>
                        <input
                          type="text"
                          placeholder="bijv. Gewicht"
                          value={newDefLabel}
                          onChange={(e) => setNewDefLabel(e.target.value)}
                          required
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Code</label>
                          <input
                            type="text"
                            placeholder="gewicht_kg"
                            value={newDefCode}
                            onChange={(e) => setNewDefCode(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Eenheid</label>
                          <input
                            type="text"
                            placeholder="kg"
                            value={newDefUnit}
                            onChange={(e) => setNewDefUnit(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Datatype</label>
                        <select
                          value={newDefDataType}
                          onChange={(e) => setNewDefDataType(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                        >
                          {DATA_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-emerald-700 text-white text-xs py-1.5 rounded font-semibold hover:bg-emerald-600"
                      >
                        Definitie Opslaan & Selecteren
                      </button>
                    </form>
                  ) : (
                    /* FORMULIER B: KOPPEL BESTAANDE PARAMETER WAARDE */
                    <form onSubmit={handleAddParameterSubmit} className="space-y-3">
                      <input type="hidden" name="objectId" value={details.object.id} />
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          Selecteer Parameter
                        </label>
                        <select
                          name="parameterId"
                          value={selectedParamId}
                          onChange={(e) => setSelectedParamId(e.target.value)}
                          required
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                        >
                          <option value="">-- Kies uit stamgegevens --</option>
                          {parameterDefinities.map((def) => (
                            <option key={def.id} value={def.id}>
                              {def.label} {def.unit ? `(${def.unit})` : ""} [{def.dataType || "tekst"}]
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedParamId && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] text-slate-400">Waarde</label>
                            <span className="text-[10px] text-emerald-400 uppercase font-mono">
                              Type: {selectedDef?.dataType || "tekst"}
                            </span>
                          </div>
                          {renderValueInput(
                            selectedDef?.dataType,
                            "",
                            () => {}, // FormData vangt de submit op via 'name'
                            "value"
                          )}
                        </div>
                      )}

                      {selectedParamId && (
                        <button
                          type="submit"
                          className="w-full bg-emerald-600 text-white text-xs py-1.5 rounded font-semibold hover:bg-emerald-500"
                        >
                          Koppelen aan Object
                        </button>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* LIJST MET ACTIEVE PARAMETERWAARDEN */}
              {!details.parameterWaarden || details.parameterWaarden.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Geen parameters gekoppeld.</p>
              ) : (
                <div className="space-y-2">
                  {details.parameterWaarden.map((param: any) => (
                    <div
                      key={param.id}
                      className="p-3 bg-slate-950 rounded border border-slate-800 text-xs space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-200 block">
                            {param.parameterLabel || param.parameterId}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Actief vanaf: {formatDate(param.validFrom)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {editingParamId !== param.id && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingParamId(param.id);
                                  setEditValue(param.value);
                                  setEditMode("correctie");
                                }}
                                className="text-slate-400 hover:text-emerald-400 px-1"
                                title="Bewerken / Corrigeren"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeactiveerParameter(param.id)}
                                className="text-slate-400 hover:text-red-400 px-1"
                                title="Uitschakelen / Ongeldig maken"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* BEWERKMODUS WITH DYNAMIC INPUT */}
                      {editingParamId === param.id ? (
                        <div className="space-y-2 pt-1 border-t border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-1">
                              Invoer (Type: {param.dataType || "tekst"})
                            </span>
                            {renderValueInput(
                              param.dataType,
                              editValue,
                              (val) => setEditValue(val)
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] bg-slate-900/80 p-1.5 rounded">
                            <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
                              <input
                                type="radio"
                                name={`mode-${param.id}`}
                                checked={editMode === "correctie"}
                                onChange={() => setEditMode("correctie")}
                                className="accent-emerald-500"
                              />
                              Corrigeren
                            </label>
                            <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
                              <input
                                type="radio"
                                name={`mode-${param.id}`}
                                checked={editMode === "historie"}
                                onChange={() => setEditMode("historie")}
                                className="accent-emerald-500"
                              />
                              Historisch Vernieuwen
                            </label>
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingParamId(null)}
                              className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[11px]"
                            >
                              Annuleren
                            </button>
                            <button
                              onClick={() => handleSaveParameterValue(param)}
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-semibold"
                            >
                              Opslaan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-800/60">
                          <span className="text-slate-400 text-[11px]">Waarde:</span>
                          <span className="font-mono text-emerald-400 font-bold whitespace-pre-wrap">
                            {param.dataType === "datumtijd"
                              ? formatDate(param.value)
                              : param.value}
                          </span>
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