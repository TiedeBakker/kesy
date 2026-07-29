"use client";

import React, { useState } from "react";
import { RelatieBoomItem } from "@/core/db/repository";
import { voegParameterWaardeToeAction } from "../actions";

interface RelatieParamModalProps {
    relatie: RelatieBoomItem | null;
    parameterDefinities: any[];
    onClose: () => void;
    onSuccess: () => Promise<void>;
}

export default function RelatieParamModal({
    relatie,
    parameterDefinities,
    onClose,
    onSuccess,
}: RelatieParamModalProps) {
    const [selectedParamId, setSelectedParamId] = useState("");
    const [paramValue, setParamValue] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!relatie) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedParamId || !paramValue) return;

        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("targetId", relatie.relation_value_id);
        formData.append("targetType", "relation_value");
        formData.append("parameterId", selectedParamId);
        formData.append("value", paramValue);

        // Expliciet typen als { success: boolean; error?: string } om TS 'never' fouten te voorkomen
        // Cast via 'unknown' om de TypeScript 'void' conversiefout op te lossen
        const res = (await voegParameterWaardeToeAction(formData)) as unknown as {
            success: boolean;
            error?: string;
        };
        setIsSubmitting(false);
        if (res?.success) {
            setSelectedParamId("");
            setParamValue("");
            await onSuccess();
        } else {
            alert("Fout bij toevoegen parameter: " + (res?.error || "Onbekend"));
        }
    };

    const selectedDef = parameterDefinities.find((d) => d.id === selectedParamId);

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-500 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden space-y-4 p-5">

                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            Relatie Parameters
                        </span>
                        <h3 className="text-base font-bold text-white">
                            ➔ {relatie.relation_id} ({relatie.target_label || relatie.target_id})
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        type="button"
                        className="text-slate-400 hover:text-white text-sm p-1 rounded hover:bg-slate-800"
                    >
                        ✕
                    </button>
                </div>

                {/* Bestaande Relatie Parameters */}
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400">Gekoppelde Parameters</h4>
                    {!relatie.parameters || relatie.parameters.length === 0 ? (
                        <p className="text-xs text-slate-500 italic bg-slate-950 p-2.5 rounded border border-slate-800/80">
                            Nog geen parameters gekoppeld aan deze relatie.
                        </p>
                    ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {relatie.parameters.map((p) => (
                                <div
                                    key={p.id}
                                    className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800 text-xs"
                                >
                                    <span className="text-slate-300 font-medium">{p.parameterLabel || p.parameterId}:</span>
                                    <span className="font-mono text-emerald-400 font-bold">{p.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Formulier: Nieuwe Relatie Parameter Koppelen */}
                <form onSubmit={handleSubmit} className="pt-2 border-t border-slate-800 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-300">+ Parameter Koppelen</h4>

                    <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Parameter Definitie</label>
                        <select
                            value={selectedParamId}
                            onChange={(e) => setSelectedParamId(e.target.value)}
                            required
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                        >
                            <option value="">-- Kies uit stamgegevens --</option>
                            {parameterDefinities.map((def) => (
                                <option key={def.id} value={def.id}>
                                    {def.label} {def.unit ? `(${def.unit})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedParamId && (
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">
                                Waarde {selectedDef?.unit ? `(${selectedDef.unit})` : ""}
                            </label>
                            <input
                                type="text"
                                placeholder="bijv. 500 l/s"
                                value={paramValue}
                                onChange={(e) => setParamValue(e.target.value)}
                                required
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                        >
                            Sluiten
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedParamId}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold rounded text-xs"
                        >
                            {isSubmitting ? "Opslaan..." : "Toevoegen"}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}