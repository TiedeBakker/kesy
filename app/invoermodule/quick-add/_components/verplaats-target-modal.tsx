"use client";

import { useState, useEffect } from "react";
import { zoekSourceObjecten, SearchedObject } from "../_actions/search-objects-action";
import { verplaatsTargetRelatie } from "../_actions/relatie-omhangen-action";
import { ExistingRelationItem } from "../_actions/reorder-actions";

interface VerplaatsTargetModalProps {
  item: ExistingRelationItem;
  huidigeSourceId: string;
  huidigeSourceLabel?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function VerplaatsTargetModal({
  item,
  huidigeSourceId,
  huidigeSourceLabel,
  onClose,
  onSuccess,
}: VerplaatsTargetModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedObject[]>([]);
  const [selectedNewSource, setSelectedNewSource] = useState<SearchedObject | null>(null);
  const [bewaarHistorie, setBewaarHistorie] = useState(false); // Standaard uit (geen historie bij fysieke boeken/planken)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Zoeken naar nieuwe Source
  useEffect(() => {
    const timer = setTimeout(async () => {
      const res = await zoekSourceObjecten(searchTerm, 50);
      // Filter de huidige source eruit
      const gefilterd = res.filter((o) => o.id !== huidigeSourceId);
      setSearchResults(gefilterd);

      if (!selectedNewSource && gefilterd.length > 0) {
        setSelectedNewSource(gefilterd[0]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm, huidigeSourceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNewSource) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await verplaatsTargetRelatie({
      relationValueId: item.relationValueId,
      targetId: item.targetId,
      relationId: (item as any).relationId, // Wordt doorgegeven uit het panel
      oudeSourceId: huidigeSourceId,
      nieuweSourceId: selectedNewSource.id,
      bewaarHistorie: bewaarHistorie,
    });

    setIsSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || "Fout bij omhangen");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-3">
          <div>
            <h3 className="font-bold text-gray-800 text-base">Target Verplaatsen</h3>
            <p className="text-xs text-gray-500">
              Verplaats <span className="font-semibold text-blue-700">"{item.targetLabel}"</span> naar een ander ouder-object.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-sm px-2"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Huidige vs Nieuwe Locatie */}
          <div className="text-xs bg-gray-50 p-2.5 rounded border space-y-1">
            <div className="text-gray-500">
              Huidige Ouder: <span className="font-medium text-gray-800">{huidigeSourceLabel}</span>
            </div>
          </div>

          {/* Zoek en Kies Nieuwe Source */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              Nieuw Ouder-object (Nieuwe Source)
            </label>
            <input
              type="text"
              placeholder="Zoek nieuw label (bijv. Plank B)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded text-xs mb-1.5"
            />
            <select
              value={selectedNewSource?.id || ""}
              onChange={(e) => {
                const found = searchResults.find((o) => o.id === e.target.value);
                if (found) setSelectedNewSource(found);
              }}
              className="w-full p-2 border rounded text-xs font-medium"
            >
              {searchResults.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.label} {obj.isConfidential ? "🔒" : ""}
                </option>
              ))}
              {searchResults.length === 0 && (
                <option value="" disabled>
                  Geen geschikte objecten gevonden
                </option>
              )}
            </select>
          </div>

          {/* Optie: Historie bewaren */}
          <div className="p-3 border rounded bg-amber-50/50 border-amber-200">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={bewaarHistorie}
                onChange={(e) => setBewaarHistorie(e.target.checked)}
                className="mt-0.5 rounded text-blue-600"
              />
              <div className="text-xs">
                <span className="font-semibold text-gray-800">Historie bewaren</span>
                <p className="text-gray-500 leading-tight mt-0.5">
                  Vink aan als je de oude relatie wilt beëindigen met een einddatum en een nieuwe relatie wilt starten. Unchecked = rechtstreeks omhangen (bijv. fysieke verplaatsing).
                </p>
              </div>
            </label>
          </div>

          {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}

          {/* Actie knoppen */}
          <div className="flex justify-end gap-2 border-t pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border rounded text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedNewSource}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium disabled:opacity-50"
            >
              {isSubmitting ? "Verplaatsen..." : "🚚 Verplaatsen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}