"use client";

import { useState, useEffect } from "react";
import { 
  haalUitgaandeRelatiesLijstOp, 
  bewaarRelatieVolgordes,
  ExistingRelationItem 
} from "../_actions/reorder-actions";

interface OutgoingRelationsPanelProps {
  sourceId: string | null;
  sourceLabel?: string;
  refreshTrigger?: number;
}

export function OutgoingRelationsPanel({
  sourceId,
  sourceLabel,
  refreshTrigger = 0,
}: OutgoingRelationsPanelProps) {
  const [items, setItems] = useState<ExistingRelationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceId) {
      setItems([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setStatusMsg(null);

    haalUitgaandeRelatiesLijstOp(sourceId).then((data) => {
      if (isMounted) {
        setItems(data);
        setIsLoading(false);
        setHasChanges(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [sourceId, refreshTrigger]);

  // ON-THE-FLY SWAP BIJ SPINNER (OF INVOER)
  const handleOrderChange = (index: number, newNum: number) => {
    const currentNum = items[index].volgorde;
    if (newNum === currentNum) return;

    const updated = [...items];

    // Situatie 1: Waarde verlaagd (klik op spinner omlaag of lager getal getypt) -> Swap met bovenbuur
    if (newNum < currentNum && index > 0) {
      const targetIndex = index - 1;
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
    } 
    // Situatie 2: Waarde verhoogd (klik op spinner omhoog of hoger getal getypt) -> Swap met onderbuur
    else if (newNum > currentNum && index < updated.length - 1) {
      const targetIndex = index + 1;
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
    }

    // Herstel/hernummer de volgordes strak opeenvolgend (1, 2, 3...)
    const hernummerd = updated.map((item, idx) => ({
      ...item,
      volgorde: idx + 1,
    }));

    setItems(hernummerd);
    setHasChanges(true);
  };

  // Knop: [ ⚡ Herordenen ] -> Herschrijft de lijst strak naar 1, 2, 3...
  const handleReorder = () => {
    const hernummerd = items.map((item, index) => ({
      ...item,
      volgorde: index + 1,
    }));
    setItems(hernummerd);
    setHasChanges(true);
  };

  // Knop: [ 💾 Bewaar ] -> Batch update naar DB
  const handleSave = async () => {
    if (!hasChanges || items.length === 0) return;

    setIsSaving(true);
    setStatusMsg(null);

    const payload = items.map((item) => ({
      relationValueId: item.relationValueId,
      volgorde: item.volgorde,
    }));

    const res = await bewaarRelatieVolgordes(payload);
    setIsSaving(false);

    if (res.success) {
      setHasChanges(false);
      setStatusMsg("✓ Volgorde succesvol opgeslagen!");
      setTimeout(() => setStatusMsg(null), 3000);
    } else {
      setStatusMsg(`❌ Error: ${res.error}`);
    }
  };

  if (!sourceId) {
    return (
      <div className="h-full p-6 border rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
        Selecteer links een Ouder-object om de uitgaande relaties te bekijken.
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-sm text-gray-800">
            Uitgaande Relaties ({items.length})
          </h3>
          <p className="text-xs text-gray-500 truncate max-w-[280px]">
            Van: <span className="font-medium text-gray-700">{sourceLabel}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReorder}
            disabled={items.length === 0}
            className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-1.5 px-3 rounded transition"
            title="Herstel volgnummering strak naar 1, 2, 3..."
          >
            ⚡ Hernummer
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving || items.length === 0}
            className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-3 rounded disabled:opacity-40 transition"
          >
            {isSaving ? "Opslaan..." : "💾 Bewaar"}
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="flex-1 overflow-y-auto max-h-[520px] p-2">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Laden...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Dit object heeft nog geen uitgaande relaties.
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10 text-xs text-gray-600">
              <tr>
                <th className="p-2 w-20 text-center">Volgorde</th>
                <th className="p-2">Target Label</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => (
                <tr key={item.relationValueId} className="hover:bg-blue-50/50 transition-colors">
                  <td className="p-1.5 text-center">
                    <input
                      type="number"
                      value={item.volgorde}
                      onChange={(e) =>
                        handleOrderChange(index, parseInt(e.target.value) || item.volgorde)
                      }
                      className="w-14 p-1 text-center border rounded font-mono text-sm focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-1.5 font-medium text-gray-700 truncate max-w-[200px]">
                    {item.targetLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer / Status */}
      {statusMsg && (
        <div className="p-2 text-xs text-center border-t bg-gray-50 font-medium">
          {statusMsg}
        </div>
      )}
    </div>
  );
}