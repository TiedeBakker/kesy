"use client";

import { useState, useEffect } from "react";
import { QuickAddConfig, QuickAddGeneratedItem } from "../_types";
import { buildQuickAddItems } from "../_lib/build-quick-add-items";
import { verwerkQuickAddBatch } from "../_actions/quick-add-actions";
import { zoekSourceObjecten, SearchedObject } from "../_actions/search-objects-action";
import { QuickAddPreviewTable } from "./quick-add-preview-table";

interface QuickAddFormProps {
  relatieTypen: Array<{ id: string; label: string }>;
}

export function QuickAddForm({ relatieTypen }: QuickAddFormProps) {
  // 1. Zoekfunctionaliteit voor Source-objecten
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedObject[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedParent, setSelectedParent] = useState<SearchedObject | null>(null);

  // 2. Configuratie Status
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

  // Zoeken met debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await zoekSourceObjecten(searchTerm, 50);
      setSearchResults(res);
      setIsSearching(false);

      // Kies alleen het 1e object als er NOG NIETS was geselecteerd
      if (!selectedParent && res.length > 0) {
        handleParentChange(res[0]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handler: Wanneer het gekozen ouder-object wijzigt
  const handleParentChange = (newParent: SearchedObject | null) => {
    setSelectedParent(newParent);
    if (newParent) {
      // Hergenereer de items direct voor het nieuwe ouder-object
      const newItems = buildQuickAddItems(
        { ...config, sourceId: newParent.id },
        Boolean(newParent.isConfidential)
      );
      setItems(newItems);
    } else {
      setItems([]);
    }
  };

  // Handler: Hergenereren op basis van nieuwe patronen/nummers
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
      .map((item, i) => ({ ...item, volgorde: i + 1 }));
    setItems(newItems);
  };

  // 3. Submit Handler
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
    } else {
      setStatusMessage({
        type: "error",
        text: `Fout bij opslaan: ${res.errors?.join(", ")}`,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTIE 1: Source Object Zoeken & Selectie + Relatietype */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-gray-50">
          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium">
              Ouder-object (Source){" "}
              <span className="text-xs font-normal text-gray-500">
                (filter op beginletter of gebruik % als wildcard)
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Zoek label (bijv. 'De' of '%Museum%')..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-1/3 p-2 border rounded bg-white text-sm"
              />
              <select
                value={selectedParent?.id || ""}
                onChange={(e) => {
                  const found = searchResults.find((o) => o.id === e.target.value);
                  if (found) {
                    handleParentChange(found);
                  }
                }}
                className="w-2/3 p-2 border rounded bg-white text-sm font-medium"
              >
                {/* Zorg dat de huidige selectie altijd zichtbaar is in de dropdown, ook als het zoekresultaat verandert */}
                {selectedParent && !searchResults.some((o) => o.id === selectedParent.id) && (
                  <option value={selectedParent.id}>
                    {selectedParent.label} {selectedParent.isConfidential ? "🔒 (Vertrouwelijk)" : ""}
                  </option>
                )}
                {searchResults.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.label} {obj.isConfidential ? "🔒 (Vertrouwelijk)" : ""}
                  </option>
                ))}
                {searchResults.length === 0 && !selectedParent && (
                  <option value="" disabled>
                    {isSearching ? "Zoeken..." : "Geen objecten gevonden"}
                  </option>
                )}
              </select>
            </div>
            {selectedParent && (
              <p className="text-xs text-blue-700 font-medium">
                Geselecteerd: <span className="font-bold">{selectedParent.label}</span>
                {selectedParent.isConfidential ? " 🔒 (Vertrouwelijk)" : ""}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Relatietype</label>
            <select
              value={config.relationId}
              onChange={(e) => setConfig({ ...config, relationId: e.target.value })}
              className="w-full p-2 border rounded bg-white text-sm"
            >
              {relatieTypen.map((rel) => (
                <option key={rel.id} value={rel.id}>
                  {rel.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTIE 2: Nummering Generator */}
        <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-600">
            Nummering Generator
          </h3>

          <div className="flex flex-wrap md:flex-nowrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium mb-1">
                Naampatroon <span className="text-gray-400">(&#123;n&#125;)</span>
              </label>
              <input
                type="text"
                value={config.pattern}
                onChange={(e) => setConfig({ ...config, pattern: e.target.value })}
                className="w-full p-1.5 border rounded bg-white text-sm"
                placeholder="bijv. Track {n}"
              />
            </div>

            <div className="w-20">
              <label className="block text-xs font-medium mb-1">Aantal</label>
              <input
                type="number"
                min="1"
                max="500"
                value={config.count}
                onChange={(e) => setConfig({ ...config, count: Number(e.target.value) })}
                className="w-full p-1.5 border rounded bg-white text-sm text-center"
              />
            </div>

            <div className="w-20">
              <label className="block text-xs font-medium mb-1">Start</label>
              <input
                type="number"
                value={config.startNumber}
                onChange={(e) => setConfig({ ...config, startNumber: Number(e.target.value) })}
                className="w-full p-1.5 border rounded bg-white text-sm text-center"
              />
            </div>

            <div className="w-20">
              <label className="block text-xs font-medium mb-1">Stap</label>
              <input
                type="number"
                value={config.step}
                onChange={(e) => setConfig({ ...config, step: Number(e.target.value) })}
                className="w-full p-1.5 border rounded bg-white text-sm text-center"
              />
            </div>

            <div className="w-24">
              <label className="block text-xs font-medium mb-1">Padding</label>
              <input
                type="number"
                min="0"
                max="5"
                value={config.zeroPadding}
                onChange={(e) => setConfig({ ...config, zeroPadding: Number(e.target.value) })}
                className="w-full p-1.5 border rounded bg-white text-sm text-center"
                title="Aantal cijfers met voorloopnullen"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              className="bg-gray-200 hover:bg-gray-300 font-medium py-1.5 px-3 rounded text-sm text-gray-800 whitespace-nowrap"
            >
              ⚡ Genereer
            </button>
          </div>
        </div>

        {/* SECTIE 3: Verticaal Scrollbare Preview tabel */}
        <QuickAddPreviewTable
          items={items}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          isParentConfidential={isParentConfidential}
        />

        {/* Status Melding */}
        {statusMessage && (
          <div
            className={`p-3 rounded-md text-sm ${
              statusMessage.type === "success"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Indienen knop */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || items.length === 0 || !selectedParent}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded text-sm disabled:opacity-50"
          >
            {isSubmitting ? "Opslaan..." : `Opslaan (${items.length} items)`}
          </button>
        </div>
      </form>
    </div>
  );
}