"use client";

import { useState, useEffect } from "react";
import { ParameterSet, ParameterSetItem } from "@/app/invoermodule/parameter-invoer/_types/parameter-set-types";
import {
  haalParameterSetsOp,
  haalParameterSetItemsOp,
  maakParameterSetAan,
  voegParameterToeAanSet,
  verwijderParameterUitSet,
} from "../_actions/parameter-set-actions";

interface ParameterSetManagerProps {
  beschikbareParameters: Array<{
    id: string;
    label: string;
    code: string;
    dataType: string;
    unit?: string | null;
  }>;
}

export function ParameterSetManager({ beschikbareParameters }: ParameterSetManagerProps) {
  const [sets, setSets] = useState<ParameterSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [setItems, setSetItems] = useState<ParameterSetItem[]>([]);
  
  const [nieuwSetLabel, setNieuwSetLabel] = useState("");
  const [selectedParameterToAdd, setSelectedParameterToAdd] = useState("");
  const [isMeetwaarde, setIsMeetwaarde] = useState(false);
  
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Load sets op startup
  useEffect(() => {
    verversSets();
  }, []);

  // Load items zodra er een set geselecteerd is
  useEffect(() => {
    if (selectedSetId) {
      verversSetItems(selectedSetId);
    } else {
      setSetItems([]);
    }
  }, [selectedSetId]);

  const verversSets = async () => {
    const data = await haalParameterSetsOp();
    setSets(data);
    if (data.length > 0 && !selectedSetId) {
      setSelectedSetId(data[0].id);
    }
  };

  const verversSetItems = async (setId: string) => {
    const items = await haalParameterSetItemsOp(setId);
    setSetItems(items);
  };

  const handleMaakNieuweSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nieuwSetLabel.trim()) return;

    const res = await maakParameterSetAan(nieuwSetLabel.trim());
    if (res.success && res.data) {
      setNieuwSetLabel("");
      await verversSets();
      setSelectedSetId(res.data.id);
      setStatusMsg("✓ Parameter Set aangemaakt!");
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleVoegParameterToe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSetId || !selectedParameterToAdd) return;

    const volgnr = setItems.length + 1;

    const res = await voegParameterToeAanSet({
      parameterSetId: selectedSetId,
      parameterId: selectedParameterToAdd,
      volgnr,
      isMeetwaarde,
    });

    if (res.success) {
      setSelectedParameterToAdd("");
      setIsMeetwaarde(false);
      verversSetItems(selectedSetId);
    }
  };

  const handleVerwijderItem = async (id: string) => {
    const res = await verwijderParameterUitSet(id);
    if (res.success) {
      verversSetItems(selectedSetId);
    }
  };

  // Gefilterde opties voor de toevoeg-dropdown (voorkomt dubbel toevoegen van parameters)
  const nogNietGekoppeldeParameters = beschikbareParameters.filter(
    (p) => !setItems.some((item) => item.parameterId === p.id)
  );

  return (
    <div className="bg-white border rounded-lg p-5 space-y-6 shadow-sm max-w-4xl mx-auto">
      <div className="border-b pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-gray-800">Parameter Sets Beheer</h2>
          <p className="text-xs text-gray-500">
            Definieer templates en sjablonen met vaste parameters voor objecttypen.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LINKER KOLOM: Sets Aanmaken & Kiezen */}
        <div className="space-y-4">
          <form onSubmit={handleMaakNieuweSet} className="space-y-2 bg-gray-50 p-3 rounded border">
            <label className="block text-xs font-semibold text-gray-700">Nieuwe Parameter Set</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="bijv. Boek Eigenschappen"
                value={nieuwSetLabel}
                onChange={(e) => setNieuwSetLabel(e.target.value)}
                className="w-full p-1.5 border rounded text-xs"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap"
              >
                +
              </button>
            </div>
          </form>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">Selecteer Set</label>
            <select
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="w-full p-2 border rounded text-xs font-medium bg-white"
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
              {sets.length === 0 && <option value="">Geen sets aanwezig</option>}
            </select>
          </div>
        </div>

        {/* RECHTER KOLOM: Parameter Koppelen & Inhoud Bekijken */}
        <div className="md:col-span-2 space-y-4">
          {selectedSetId ? (
            <>
              {/* Toevoegen aan gekozen Set */}
              <form onSubmit={handleVoegParameterToe} className="p-3 bg-blue-50/50 border border-blue-100 rounded space-y-3">
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Parameter Toevoegen aan Set
                    </label>
                    <select
                      value={selectedParameterToAdd}
                      onChange={(e) => setSelectedParameterToAdd(e.target.value)}
                      className="w-full p-1.5 border rounded text-xs bg-white"
                    >
                      <option value="">-- Kies parameter --</option>
                      {nogNietGekoppeldeParameters.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-1.5 pb-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMeetwaarde}
                      onChange={(e) => setIsMeetwaarde(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    Meetwaarde?
                  </label>

                  <button
                    type="submit"
                    disabled={!selectedParameterToAdd}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                  >
                    Toevoegen
                  </button>
                </div>
              </form>

              {/* Tabel van gekoppelde parameters */}
              <div className="border rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="p-2 w-12 text-center">#</th>
                      <th className="p-2">Parameter</th>
                      <th className="p-2">Code</th>
                      <th className="p-2 text-center">Meetwaarde</th>
                      <th className="p-2 text-right">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {setItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-2 text-center font-mono text-gray-400">{idx + 1}</td>
                        <td className="p-2 font-medium text-gray-800">{item.parameterLabel}</td>
                        <td className="p-2 font-mono text-gray-500">{item.parameterCode}</td>
                        <td className="p-2 text-center">
                          {item.isMeetwaarde ? (
                            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-semibold">
                              Ja
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleVerwijderItem(item.id)}
                            className="text-red-500 hover:text-red-700 font-bold px-1"
                            title="Verwijder uit set"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {setItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-400">
                          Nog geen parameters toegevoegd aan deze set.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-400 text-xs border rounded bg-gray-50">
              Selecteer of maak eerst een Parameter Set.
            </div>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className="p-2 text-xs text-center bg-green-50 text-green-700 border border-green-200 rounded font-medium">
          {statusMsg}
        </div>
      )}
    </div>
  );
}