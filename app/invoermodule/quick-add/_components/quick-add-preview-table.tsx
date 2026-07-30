"use client";

import { QuickAddGeneratedItem } from "../_types";

interface QuickAddPreviewTableProps {
  items: QuickAddGeneratedItem[];
  onUpdateItem: (index: number, updatedItem: QuickAddGeneratedItem) => void;
  onDeleteItem: (index: number) => void;
  isParentConfidential: boolean;
}

export function QuickAddPreviewTable({
  items,
  onUpdateItem,
  onDeleteItem,
  isParentConfidential,
}: QuickAddPreviewTableProps) {
  if (items.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed rounded-md text-gray-500 text-sm">
        Geen items gegenereerd. Selecteer een bron-object en klik op ⚡ Genereer.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm text-gray-700">
          Preview & Aanpassen ({items.length} items)
        </h3>
        {isParentConfidential && (
          <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded">
            🔒 Ouder is vertrouwelijk (alle items worden lokaal)
          </span>
        )}
      </div>

      {/* Vaste maximale hoogte met overstroom scrollbar + sticky header */}
      <div className="border rounded-lg overflow-y-auto max-h-[300px] relative bg-white">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-100 border-b sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-2 text-center w-12 text-xs font-semibold text-gray-600">#</th>
              <th className="p-2 text-xs font-semibold text-gray-600">Titel / Label</th>
              <th className="p-2 text-center w-32 text-xs font-semibold text-gray-600">
                Vertrouwelijk
              </th>
              <th className="p-2 text-right w-20 text-xs font-semibold text-gray-600">Actie</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item, index) => (
              <tr key={item.tempId} className="hover:bg-blue-50/40">
                <td className="p-2 text-center font-mono text-xs text-gray-500">
                  {item.volgorde}
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) =>
                      onUpdateItem(index, { ...item, label: e.target.value })
                    }
                    className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={item.isConfidential}
                    disabled={isParentConfidential}
                    onChange={(e) =>
                      onUpdateItem(index, {
                        ...item,
                        isConfidential: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 rounded cursor-pointer disabled:cursor-not-allowed"
                  />
                </td>
                <td className="p-2 text-right">
                  <button
                    type="button"
                    onClick={() => onDeleteItem(index)}
                    className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded border border-gray-200 hover:bg-red-50"
                  >
                    Wis
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}