// kesy/app/beheer/taxonomie/page.tsx
"use client";

import React, { useState, useEffect } from "react";

interface SpecimenTaxonItem {
  objectId: string;
  objectLabel: string;
  gegevenTaxonNaam: string;
  formeleTaxonNaam?: string;
  laatsteControle?: string;
}

export default function TaxonomieBeheerPage() {
  const [specimenLijst, setSpecimenLijst] = useState<SpecimenTaxonItem[]>([]);
  const [isLaden, setIsLaden] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Batch progress status
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [batchStats, setBatchStats] = useState({
    actueel: 0,
    synoniem: 0,
    nietGevonden: 0,
  });

  // Filteropties
  const [filter, setFilter] = useState<"ALLES" | "NIET_GEVALIDEERD" | "NIET_GEVONDEN">("ALLES");

  // Haal de initiële lijst op
  const laadData = async () => {
    setIsLaden(true);
    try {
      const res = await fetch("/api/beheer/validate-taxa");
      const data = await res.json();
      if (data.specimen) {
        setSpecimenLijst(data.specimen);
      }
    } catch (err) {
      console.error("Fout bij ophalen specimen:", err);
    } finally {
      setIsLaden(false);
    }
  };

  useEffect(() => {
    laadData();
  }, []);

  // De batch loop
  const startValidation = async (forceRevalidation: boolean) => {
    setIsProcessing(true);
    setProcessedCount(0);
    setBatchStats({ actueel: 0, synoniem: 0, nietGevonden: 0 });

    let isDone = false;
    let total = 0;
    let currentProcessed = 0;

    while (!isDone) {
      try {
        const res = await fetch("/api/beheer/validate-taxa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchSize: 15, // Aantal items per batch (aanpasbaar)
            forceRevalidation,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          alert("Er is een fout opgetreden tijdens de verwerking.");
          break;
        }

        if (total === 0) {
          total = data.totaalTeVerwerken;
          setTotalToProcess(total);
        }

        if (total === 0) {
          // Niks te verwerken
          isDone = true;
          break;
        }

        currentProcessed += data.verwerktInDezeBatch;
        setProcessedCount(currentProcessed);

        setBatchStats((prev) => ({
          actueel: prev.actueel + data.stats.actueel,
          synoniem: prev.synoniem + data.stats.synoniem,
          nietGevonden: prev.nietGevonden + data.stats.nietGevonden,
        }));

        if (data.resterend === 0) {
          isDone = true;
        }
      } catch (error) {
        console.error("Batch verwerkingsfout:", error);
        break;
      }
    }

    setIsProcessing(false);
    await laadData(); // Ververs het overzicht
  };

  // Gefilterde lijst voor de tabel
  const gefilterdeLijst = specimenLijst.filter((item) => {
    if (filter === "NIET_GEVALIDEERD") {
      return !item.formeleTaxonNaam || item.formeleTaxonNaam === "niet bekend in COL";
    }
    if (filter === "NIET_GEVONDEN") {
      return item.formeleTaxonNaam === "niet bekend in COL";
    }
    return true;
  });

  const progressPercentage =
    totalToProcess > 0 ? Math.round((processedCount / totalToProcess) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Taxonomie Validatie (COL)</h1>
          <p className="text-slate-500 text-sm">
            Controleer gegeven taxon-namen tegen de Catalogue of Life en beheer formele benamingen.
          </p>
        </div>

        {/* Actieknoppen */}
        <div className="flex gap-3">
          <button
            onClick={() => startValidation(false)}
            disabled={isProcessing || isLaden}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {isProcessing ? "Bezig..." : "Valideer Ongecontroleerd"}
          </button>
          <button
            onClick={() => startValidation(true)}
            disabled={isProcessing || isLaden}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {isProcessing ? "Bezig..." : "Her-valideer ALLES"}
          </button>
        </div>
      </div>

      {/* Progress Bar Component */}
      {isProcessing && (
        <div className="p-4 bg-white border rounded-xl shadow-sm space-y-3">
          <div className="flex justify-between text-sm font-medium text-slate-700">
            <span>Voortgang Validatie</span>
            <span>
              {processedCount} / {totalToProcess} ({progressPercentage}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="flex gap-4 text-xs text-slate-500">
            <span className="text-emerald-600 font-semibold">✓ Actueel: {batchStats.actueel}</span>
            <span className="text-blue-600 font-semibold">↔ Synoniem: {batchStats.synoniem}</span>
            <span className="text-amber-600 font-semibold">? Niet gevonden: {batchStats.nietGevonden}</span>
          </div>
        </div>
      )}

      {/* Stats Kaarten */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase">Totaal Specimen</div>
          <div className="text-2xl font-bold text-slate-800">{specimenLijst.length}</div>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase">Ongecontroleerd / Niet bekend</div>
          <div className="text-2xl font-bold text-amber-600">
            {specimenLijst.filter((s) => !s.formeleTaxonNaam || s.formeleTaxonNaam === "niet bekend in COL").length}
          </div>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase">Geaccepteerde Taxa</div>
          <div className="text-2xl font-bold text-emerald-600">
            {specimenLijst.filter((s) => s.formeleTaxonNaam && s.formeleTaxonNaam !== "niet bekend in COL").length}
          </div>
        </div>
      </div>

      {/* Tabel met Filters */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h2 className="font-semibold text-slate-700">Specimen Overzicht</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("ALLES")}
              className={`px-3 py-1 rounded-md text-xs font-medium ${
                filter === "ALLES" ? "bg-slate-800 text-white" : "bg-white border text-slate-600"
              }`}
            >
              Alles
            </button>
            <button
              onClick={() => setFilter("NIET_GEVALIDEERD")}
              className={`px-3 py-1 rounded-md text-xs font-medium ${
                filter === "NIET_GEVALIDEERD" ? "bg-slate-800 text-white" : "bg-white border text-slate-600"
              }`}
            >
              Nog te valideren
            </button>
          </div>
        </div>

        {isLaden ? (
          <div className="p-8 text-center text-slate-400">Specimen laden...</div>
        ) : gefilterdeLijst.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Geen specimen gevonden voor dit filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-100 text-slate-600 text-xs uppercase">
                  <th className="p-3">Specimen</th>
                  <th className="p-3">Gegeven Taxon Naam</th>
                  <th className="p-3">Formele Taxon Naam (COL)</th>
                  <th className="p-3">Laatste Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {gefilterdeLijst.map((item) => (
                  <tr key={item.objectId} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-medium text-slate-800">{item.objectLabel}</td>
                    <td className="p-3 text-slate-600 italic">{item.gegevenTaxonNaam}</td>
                    <td className="p-3">
                      {item.formeleTaxonNaam === "niet bekend in COL" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                          niet bekend in COL
                        </span>
                      ) : item.formeleTaxonNaam ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 italic">
                          {item.formeleTaxonNaam}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Nog niet gecontroleerd</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400 text-xs">
                      {item.laatsteControle ? new Date(item.laatsteControle).toLocaleDateString("nl-NL") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}