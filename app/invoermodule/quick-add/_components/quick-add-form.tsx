"use client";

import { useState, useEffect, useRef } from "react";
import { QuickAddConfig, QuickAddGeneratedItem } from "../_types";
import { buildQuickAddItems } from "../_lib/build-quick-add-items";
import { verwerkQuickAddBatch } from "../_actions/quick-add-actions";
import { zoekSourceObjecten, SearchedObject } from "../_actions/search-objects-action";
import { QuickAddPreviewTable } from "./quick-add-preview-table";
import { OutgoingRelationsPanel } from "./outgoing-relations-panel";

interface QuickAddFormProps {
    relatieTypen: Array<{ id: string; label: string }>;
}

export function QuickAddForm({ relatieTypen }: QuickAddFormProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<SearchedObject[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedParent, setSelectedParent] = useState<SearchedObject | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [config, setConfig] = useState<Omit<QuickAddConfig, "sourceId">>({
        relationId: relatieTypen[0]?.id || "",
        pattern: "Item {n}",
        startNumber: 1,
        step: 1,
        count: 5,
        zeroPadding: 2,
        isConfidentialOverride: false,
    });

    const isParentConfidential = Boolean(selectedParent?.isConfidential);
    const [items, setItems] = useState<QuickAddGeneratedItem[]>([]);

    // Sluit de dropdown als er buiten de combobox wordt geklikt
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Zoek-zoekopdrachten uitvoeren bij het typen
    useEffect(() => {
        const timer = setTimeout(async () => {
            setIsSearching(true);
            const res = await zoekSourceObjecten(searchTerm, 50);
            setSearchResults(res);
            setIsSearching(false);

            if (!selectedParent && res.length > 0) {
                handleParentChange(res[0]);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleParentChange = (newParent: SearchedObject | null) => {
        setSelectedParent(newParent);
        if (newParent) {
            const newItems = buildQuickAddItems(
                { ...config, sourceId: newParent.id },
                Boolean(newParent.isConfidential)
            );
            setItems(newItems);
        } else {
            setItems([]);
        }
    };

    const handleGenerate = () => {
        if (!selectedParent) return;
        const newItems = buildQuickAddItems(
            { ...config, sourceId: selectedParent.id },
            isParentConfidential
        );
        setItems(newItems);
    };

    const handleUpdateItem = (index: number, updatedItem: QuickAddGeneratedItem) => {
        const newItems = [...items];
        newItems[index] = updatedItem;
        setItems(newItems);
    };

    const handleDeleteItem = (index: number) => {
        const newItems = items
            .filter((_, i) => i !== index)
            .map((item, i) => ({
                ...item,
                volgorde: config.startNumber + i * config.step,
            }));
        setItems(newItems);
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedParent || items.length === 0) return;

        setIsSubmitting(true);
        setStatusMessage(null);

        const res = await verwerkQuickAddBatch({
            sourceId: selectedParent.id,
            relationId: config.relationId,
            items,
        });

        setIsSubmitting(false);

        if (res.success) {
            setStatusMessage({
                type: "success",
                text: `Succesvol ${res.createdCount} items toegevoegd onder "${selectedParent.label}"!`,
            });
            setItems([]);
            setRefreshTrigger((prev) => prev + 1);
        } else {
            setStatusMessage({
                type: "error",
                text: `Fout bij opslaan: ${res.errors?.join(", ")}`,
            });
        }
    };

    return (
        /* 2-Venster Grid Layout op PC */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LINKER VENSTER: INVOERMODULE (7 van 12 kolommen) */}
            <div className="lg:col-span-7 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Ouder & Relatie Selectie */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-gray-50">
                        {/* Custom Searchable Combobox voor Ouder-object */}
                        <div className="md:col-span-2 space-y-1 relative" ref={dropdownRef}>
                            <label className="block text-xs font-semibold text-gray-700">
                                Ouder-object (Source)
                            </label>

                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Typ om te zoeken..."
                                    value={
                                        isDropdownOpen
                                            ? searchTerm
                                            : selectedParent
                                            ? selectedParent.label
                                            : searchTerm
                                    }
                                    onFocus={() => {
                                        setIsDropdownOpen(true);
                                    }}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        if (!isDropdownOpen) setIsDropdownOpen(true);
                                    }}
                                    className="w-full p-2 pr-7 border rounded bg-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                />
                                <span className="absolute right-2.5 top-2.5 text-[10px] text-gray-400 pointer-events-none">
                                    ▼
                                </span>
                            </div>

                            {/* Direct Uitklappende Dropdown Lijst */}
                            {isDropdownOpen && (
                                <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border rounded-md shadow-lg divide-y text-xs">
                                    {isSearching ? (
                                        <div className="p-2 text-gray-400 text-center">Zoeken...</div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map((obj) => (
                                            <button
                                                key={obj.id}
                                                type="button"
                                                onClick={() => {
                                                    handleParentChange(obj);
                                                    setSearchTerm(obj.label);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full text-left p-2 hover:bg-blue-50 flex justify-between items-center transition-colors ${
                                                    selectedParent?.id === obj.id
                                                        ? "bg-blue-50 font-semibold text-blue-700"
                                                        : "text-gray-700"
                                                }`}
                                            >
                                                <span>{obj.label}</span>
                                                {obj.isConfidential && <span className="text-xs">🔒</span>}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-2 text-gray-400 text-center">
                                            Geen resultaten gevonden
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-700">Relatietype</label>
                            <select
                                value={config.relationId}
                                onChange={(e) => setConfig({ ...config, relationId: e.target.value })}
                                className="w-full p-2 border rounded bg-white text-xs"
                            >
                                {relatieTypen.map((rel) => (
                                    <option key={rel.id} value={rel.id}>
                                        {rel.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Generator Balk */}
                    <div className="p-3 border rounded-lg bg-gray-50 space-y-2">
                        <h3 className="font-semibold text-[11px] uppercase tracking-wider text-gray-600">
                            Nummering Generator
                        </h3>

                        <div className="flex flex-wrap md:flex-nowrap items-end gap-2">
                            <div className="flex-1 min-w-[140px]">
                                <label className="block text-[11px] font-medium mb-1">Patroon</label>
                                <input
                                    type="text"
                                    value={config.pattern}
                                    onChange={(e) => setConfig({ ...config, pattern: e.target.value })}
                                    className="w-full p-1 border rounded bg-white text-xs"
                                    placeholder="bijv. Track {n}"
                                />
                            </div>

                            <div className="w-16">
                                <label className="block text-[11px] font-medium mb-1">Aantal</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="500"
                                    value={config.count}
                                    onChange={(e) => setConfig({ ...config, count: Number(e.target.value) })}
                                    className="w-full p-1 border rounded bg-white text-xs text-center"
                                />
                            </div>

                            <div className="w-16">
                                <label className="block text-[11px] font-medium mb-1">Start</label>
                                <input
                                    type="number"
                                    value={config.startNumber}
                                    onChange={(e) => setConfig({ ...config, startNumber: Number(e.target.value) })}
                                    className="w-full p-1 border rounded bg-white text-xs text-center"
                                />
                            </div>

                            <div className="w-16">
                                <label className="block text-[11px] font-medium mb-1">Stap</label>
                                <input
                                    type="number"
                                    value={config.step}
                                    onChange={(e) => setConfig({ ...config, step: Number(e.target.value) })}
                                    className="w-full p-1 border rounded bg-white text-xs text-center"
                                />
                            </div>

                            <div className="w-16">
                                <label className="block text-[11px] font-medium mb-1">Padding</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    value={config.zeroPadding}
                                    onChange={(e) => setConfig({ ...config, zeroPadding: Number(e.target.value) })}
                                    className="w-full p-1 border rounded bg-white text-xs text-center"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleGenerate}
                                className="bg-gray-200 hover:bg-gray-300 font-medium py-1 px-2.5 rounded text-xs text-gray-800 whitespace-nowrap"
                            >
                                ⚡ Genereer
                            </button>
                        </div>
                    </div>

                    {/* Inline Preview Table */}
                    <QuickAddPreviewTable
                        items={items}
                        onUpdateItem={handleUpdateItem}
                        onDeleteItem={handleDeleteItem}
                        isParentConfidential={isParentConfidential}
                    />

                    {statusMessage && (
                        <div
                            className={`p-2.5 rounded text-xs ${
                                statusMessage.type === "success"
                                    ? "bg-green-100 text-green-800 border border-green-300"
                                    : "bg-red-100 text-red-800 border border-red-300"
                            }`}
                        >
                            {statusMessage.text}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={Boolean(isSubmitting || items.length === 0 || !selectedParent)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded text-xs disabled:opacity-50"
                        >
                            Opslaan ({items.length} items)
                        </button>
                    </div>
                </form>
            </div>

            {/* RECHTER VENSTER: IN-MEMORY HERORDENEN TABEL (5 van 12 kolommen) */}
            <div className="lg:col-span-5">
                <OutgoingRelationsPanel
                    sourceId={selectedParent?.id || null}
                    sourceLabel={selectedParent?.label}
                    refreshTrigger={refreshTrigger}
                />
            </div>
        </div>
    );
}