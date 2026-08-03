"use client";

import { useState, useEffect, useRef } from "react";
import { zoekSourceObjecten, SearchedObject } from "../../quick-add/_actions/search-objects-action";
import { ParameterSet, ParameterInvoerItem } from "../_types/parameter-set-types";
import { bereidParameterInvoerVoor, slaParameterWaardenOp } from "../_actions/parameter-invoer-actions";
import { MarkdownEditorModal } from "./markdown-editor-modal";

interface ParameterInvoerFormProps {
    parameterSets: ParameterSet[];
    alleParameters: Array<{
        id: string;
        label: string;
        code: string;
        dataType: string;
        unit?: string | null;
    }>;
}

export function ParameterInvoerForm({ parameterSets, alleParameters }: ParameterInvoerFormProps) {
    // 1. Object Zoek / Selectie State
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<SearchedObject[]>([]);
    const [selectedObject, setSelectedObject] = useState<SearchedObject | null>(null);
    const [isObjectDropdownOpen, setIsObjectDropdownOpen] = useState(false);
    const objectDropdownRef = useRef<HTMLDivElement>(null);

    // 2. Set & Datum State
    const [selectedSetId, setSelectedSetId] = useState<string>(parameterSets[0]?.id || "");
    // Default datum/tijd is HEDEN in datetime-local formaat (YYYY-MM-DDTHH:mm)
    const [peildatum, setPeildatum] = useState<string>(
        new Date().toISOString().slice(0, 16)
    );

    // 3. Invul-items State
    const [invoerItems, setInvoerItems] = useState<ParameterInvoerItem[]>([]);
    const [selectedExtraParameterId, setSelectedExtraParameterId] = useState<string>("");

    // 4. Status Message
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Sluit object dropdown bij klik buiten
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (objectDropdownRef.current && !objectDropdownRef.current.contains(event.target as Node)) {
                setIsObjectDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Zoeken naar objecten bij typen
    useEffect(() => {
        const timer = setTimeout(async () => {
            const res = await zoekSourceObjecten(searchTerm, 50);
            setSearchResults(res);
            if (!selectedObject && res.length > 0) {
                setSelectedObject(res[0]);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Invullijst verversen zodra Object, Set of Peildatum verandert
    useEffect(() => {
        async function laadItems() {
            if (!selectedSetId) return;
            const isoDatum = peildatum ? new Date(peildatum).toISOString() : new Date().toISOString();
            const items = await bereidParameterInvoerVoor({
                targetId: selectedObject?.id || "",
                setId: selectedSetId,
                peildatumIso: isoDatum,
                isConfidential: selectedObject?.isConfidential, // <-- Doorgeven!
            });
            setInvoerItems(items);
        }
        laadItems();
    }, [selectedObject, selectedSetId, peildatum]);

    // Extra losse parameter toevoegen onder de lijst
    const handleVoegExtraParameterToe = () => {
        if (!selectedExtraParameterId) return;
        const paramDef = alleParameters.find((p) => p.id === selectedExtraParameterId);
        if (!paramDef) return;

        const nieuwItem: ParameterInvoerItem = {
            parameterId: paramDef.id,
            parameterLabel: paramDef.label,
            parameterCode: paramDef.code,
            dataType: paramDef.dataType,
            unit: paramDef.unit,
            volgnr: invoerItems.length + 1,
            isMeetwaarde: false,
            ingevoerdeWaarde: "",
            laatstBekendeWaarde: null,
            laatstBekendeDatum: null,
            isExtraParameter: true,
        };

        setInvoerItems((prev) => [...prev, nieuwItem]);
        setSelectedExtraParameterId("");
    };

    // Waarde bijwerken in de lijst
    const handleWaardeChange = (index: number, waarde: string) => {
        setInvoerItems((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], ingevoerdeWaarde: waarde };
            return copy;
        });
    };

    // Meetwaarde toggle bijwerken in de lijst
    const handleMeetwaardeToggle = (index: number, isMeetwaarde: boolean) => {
        setInvoerItems((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], isMeetwaarde };
            return copy;
        });
    };
    // Handler voor het wijzigen van actieType (Historie vs Correctie)
    const handleActieTypeChange = (index: number, actieType: "historie" | "correctie") => {
        setInvoerItems((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], actieType };
            return copy;
        });
    };
    // Opslaan
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedObject) {
            setStatusMsg({ type: "error", text: "Selecteer eerst een object." });
            return;
        }

        setIsSubmitting(true);
        setStatusMsg(null);

        const isoDatum = peildatum ? new Date(peildatum).toISOString() : new Date().toISOString();

        const res = await slaParameterWaardenOp({
            targetId: selectedObject.id,
            targetType: "object",
            datumIso: isoDatum,
            items: invoerItems,
            isConfidential: selectedObject.isConfidential,
        });

        setIsSubmitting(false);

        if (res.success) {
            setStatusMsg({
                type: "success",
                text: `Succesvol ${res.count} parameter-waarde(n) opgeslagen voor "${selectedObject.label}"!`,
            });

            // Herlaad de lijst om de nieuw ingevoerde waarden direct als 'laatst bekend' te zien
            const items = await bereidParameterInvoerVoor({
                targetId: selectedObject.id,
                setId: selectedSetId,
                peildatumIso: isoDatum,
            });
            setInvoerItems(items);
        } else {
            setStatusMsg({ type: "error", text: res.error || "Opslaan mislukt." });
        }
    };

    // Gefilterde lijst voor extra parameters (nog niet in het formulier aanwezig)
    const nogNietGetoondeParameters = alleParameters.filter(
        (p) => !invoerItems.some((item) => item.parameterId === p.id)
    );
    
    const [activeModalIdx, setActiveModalIdx] = useState<number | null>(null);
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LINKER KOLOM: SELECTION & CONTROLS (5 van 12 kolommen) */}
            <div className="lg:col-span-5 space-y-4 bg-gray-50 border rounded-lg p-4">
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Invoer Configuratie
                </h2>

                {/* 1. Object Selector */}
                <div className="space-y-1 relative" ref={objectDropdownRef}>
                    <label className="block text-xs font-semibold text-gray-700">Selecteer Object</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Zoek object..."
                            value={isObjectDropdownOpen ? searchTerm : selectedObject?.label || searchTerm}
                            onFocus={() => setIsObjectDropdownOpen(true)}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if (!isObjectDropdownOpen) setIsObjectDropdownOpen(true);
                            }}
                            className="w-full p-2 pr-7 border rounded bg-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                        <span className="absolute right-2.5 top-2.5 text-[10px] text-gray-400 pointer-events-none">
                            ▼
                        </span>
                    </div>

                    {isObjectDropdownOpen && (
                        <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border rounded-md shadow-lg divide-y text-xs">
                            {searchResults.length > 0 ? (
                                searchResults.map((obj) => (
                                    <button
                                        key={obj.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedObject(obj);
                                            setSearchTerm(obj.label);
                                            setIsObjectDropdownOpen(false);
                                        }}
                                        className={`w-full text-left p-2 hover:bg-blue-50 flex justify-between items-center transition-colors ${selectedObject?.id === obj.id ? "bg-blue-50 font-semibold text-blue-700" : "text-gray-700"
                                            }`}
                                    >
                                        <span>{obj.label}</span>
                                        {obj.isConfidential && <span className="text-xs">🔒</span>}
                                    </button>
                                ))
                            ) : (
                                <div className="p-2 text-gray-400 text-center">Geen objecten gevonden</div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Parameter Set Selector */}
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700">Parameter Set</label>
                    <select
                        value={selectedSetId}
                        onChange={(e) => setSelectedSetId(e.target.value)}
                        className="w-full p-2 border rounded bg-white text-xs font-medium"
                    >
                        {parameterSets.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 3. Extra Parameter Toevoegen */}
                <div className="pt-2 border-t space-y-2">
                    <label className="block text-xs font-semibold text-gray-700">
                        Extra Parameter Toevoegen
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={selectedExtraParameterId}
                            onChange={(e) => setSelectedExtraParameterId(e.target.value)}
                            className="w-full p-1.5 border rounded bg-white text-xs"
                        >
                            <option value="">-- Kies extra parameter --</option>
                            {nogNietGetoondeParameters.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.label} ({p.code})
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleVoegExtraParameterToe}
                            disabled={!selectedExtraParameterId}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-3 py-1.5 rounded text-xs whitespace-nowrap disabled:opacity-50"
                        >
                            + Voeg toe
                        </button>
                    </div>
                </div>
            </div>

            {/* RECHTER KOLOM: INVULLIJST (7 van 12 kolommen) */}
            <div className="lg:col-span-7 space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Datum Picker Header */}
                    <div className="flex flex-wrap items-center justify-between p-3 border rounded-lg bg-white gap-2 shadow-sm">
                        <div>
                            <h3 className="text-xs font-bold text-gray-800">
                                {selectedObject ? `Waarden voor: ${selectedObject.label}` : "Selecteer een object"}
                            </h3>
                            <p className="text-[11px] text-gray-500">Vul de geldige gegevens of metingen in.</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-gray-600">Peildatum / Meting:</label>
                            <input
                                type="datetime-local"
                                value={peildatum}
                                onChange={(e) => setPeildatum(e.target.value)}
                                className="p-1 border rounded text-xs bg-gray-50 font-mono"
                            />
                        </div>
                    </div>

                    {/* Invullijst Tabel */}
                    <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-100 text-gray-600 border-b">
                                <tr>
                                    <th className="p-2.5">Parameter</th>
                                    <th className="p-2.5 w-1/3">Nieuwe Waarde</th>
                                    <th className="p-2.5">Laatst Bekend</th>
                                    <th className="p-2.5 text-center w-20">Meting?</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {invoerItems.map((item, idx) => {
                                    const heeftHistorie = Boolean(item.laatstBekendeWaarde);
                                    const toonActieKeuze =
                                        heeftHistorie &&
                                        !item.isMeetwaarde &&
                                        item.ingevoerdeWaarde.trim() !== "";

                                    const isMarkdownType =
                                        item.dataType === "markdown" ||
                                        item.dataType === "formatted_text" ||
                                        item.dataType === "textarea";

                                    return (
                                        <tr
                                            key={item.parameterId}
                                            className={item.isExtraParameter ? "bg-amber-50/40" : ""}
                                        >
                                            {/* 1. Parameter Info */}
                                            <td className="p-2.5">
                                                <div className="font-semibold text-gray-800">
                                                    {item.parameterLabel}
                                                    {item.isExtraParameter && (
                                                        <span className="ml-1 text-[10px] text-amber-700 font-normal">
                                                            (extra)
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-mono">
                                                    {item.parameterCode} {item.unit ? `(${item.unit})` : ""}
                                                </div>
                                            </td>

                                            {/* 2. Invoerveld (Standaard Input vs. Markdown Modal Knop) */}
                                            <td className="p-2.5">
                                                {isMarkdownType ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveModalIdx(idx)}
                                                            className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                                                        >
                                                            <span>✏️</span>
                                                            <span>
                                                                {item.ingevoerdeWaarde ? "Toelichting bewerken" : "Toelichting invullen..."}
                                                            </span>
                                                        </button>
                                                        {item.ingevoerdeWaarde && (
                                                            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                                ✓ Ingevuld
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <input
                                                        type={item.dataType === "number" ? "number" : "text"}
                                                        placeholder="Voer waarde in..."
                                                        value={item.ingevoerdeWaarde}
                                                        onChange={(e) => handleWaardeChange(idx, e.target.value)}
                                                        className="w-full p-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                    />
                                                )}

                                                {/* Keuzeknop als er al een eerdere waarde is en de gebruiker iets intypt */}
                                                {toonActieKeuze && (
                                                    <div className="mt-1.5 flex items-center gap-2 text-[10px] bg-slate-100 p-1 rounded border border-slate-200">
                                                        <span className="font-semibold text-gray-600">Opslaan als:</span>
                                                        <label className="flex items-center gap-1 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name={`actie-${item.parameterId}`}
                                                                checked={(item.actieType || "historie") === "historie"}
                                                                onChange={() => handleActieTypeChange(idx, "historie")}
                                                                className="text-blue-600 focus:ring-0"
                                                            />
                                                            <span className="text-gray-700">Nieuwe historie</span>
                                                        </label>
                                                        <label className="flex items-center gap-1 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name={`actie-${item.parameterId}`}
                                                                checked={item.actieType === "correctie"}
                                                                onChange={() => handleActieTypeChange(idx, "correctie")}
                                                                className="text-blue-600 focus:ring-0"
                                                            />
                                                            <span className="text-gray-700">Correctie</span>
                                                        </label>
                                                    </div>
                                                )}
                                            </td>

                                            {/* 3. Laatst Bekend */}
                                            <td className="p-2.5">
                                                {item.laatstBekendeWaarde ? (
                                                    <div>
                                                        <span className="font-medium text-gray-700 line-clamp-2">
                                                            {item.laatstBekendeWaarde}
                                                        </span>
                                                        {item.laatstBekendeDatum && (
                                                            <div className="text-[9px] text-gray-400 font-mono">
                                                                {new Date(item.laatstBekendeDatum).toLocaleDateString("nl-NL")}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 italic text-[11px]">Geen historie</span>
                                                )}
                                            </td>

                                            {/* 4. Meetwaarde Checkbox */}
                                            <td className="p-2.5 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={item.isMeetwaarde}
                                                    onChange={(e) => handleMeetwaardeToggle(idx, e.target.checked)}
                                                    className="rounded text-blue-600 focus:ring-0"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Modal renderen wanneer een rij aangeklikt is */}
                        {activeModalIdx !== null && (
                            <MarkdownEditorModal
                                isOpen={activeModalIdx !== null}
                                title={invoerItems[activeModalIdx].parameterLabel}
                                initialValue={invoerItems[activeModalIdx].ingevoerdeWaarde}
                                onClose={() => setActiveModalIdx(null)}
                                onSave={(newValue) => {
                                    handleWaardeChange(activeModalIdx, newValue);
                                }}
                            />
                        )}
                    </div>

                    {statusMsg && (
                        <div
                            className={`p-2.5 rounded text-xs ${statusMsg.type === "success"
                                ? "bg-green-100 text-green-800 border border-green-300"
                                : "bg-red-100 text-red-800 border border-red-300"
                                }`}
                        >
                            {statusMsg.text}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={Boolean(isSubmitting || !selectedObject || invoerItems.length === 0)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded text-xs disabled:opacity-50 transition-colors shadow-sm"
                        >
                            Opslaan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}