"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { zoekObjectenAction } from "./actions";

interface ObjectItem {
  id: string;
  label: string;
  isConfidential?: boolean;
}

interface ObjectZoekerProps {
  initieleObjecten: ObjectItem[];
  geselecteerdId?: string;
  placeholder?: string;
  /** 'navigate' verandert de URL, 'select' vult een hidden input voor formulieren */
  mode?: "navigate" | "select";
  inputName?: string;
  excludeId?: string;
}

export function ObjectZoeker({
  initieleObjecten,
  geselecteerdId,
  placeholder = "Typ om te zoeken...",
  mode = "navigate",
  inputName = "targetId",
  excludeId,
}: ObjectZoekerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [zoekterm, setZoekterm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [gekozenId, setGekozenId] = useState(geselecteerdId || "");
  const [gekozenLabel, setGekozenLabel] = useState("");
  
  // Filter initiële lijst
  const gefilterdeInitieel = initieleObjecten
    .filter((o) => o.id !== excludeId)
    .slice(0, 20);

  const [resultaten, setResultaten] = useState<ObjectItem[]>(gefilterdeInitieel);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sluit de dropdown als er buiten geklikt wordt
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleZoeken = (term: string) => {
    setZoekterm(term);
    setIsOpen(true);

    startTransition(async () => {
      const data = await zoekObjectenAction(term);
      const gefilterd = data.filter((o: ObjectItem) => o.id !== excludeId).slice(0, 20);
      setResultaten(gefilterd);
    });
  };

  const handleSelecteer = (item: ObjectItem) => {
    setGekozenId(item.id);
    setGekozenLabel(item.label);
    setZoekterm("");
    setIsOpen(false);

    if (mode === "navigate") {
      router.push(`/basismodule?selectedId=${item.id}`);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Hidden input voor gebruik in <form> */}
      {mode === "select" && (
        <input type="hidden" name={inputName} value={gekozenId} required />
      )}

      <div className="relative">
        <input
          type="text"
          value={isOpen ? zoekterm : gekozenLabel || zoekterm}
          onChange={(e) => handleZoeken(e.target.value)}
          onFocus={() => {
            setIsOpen(true);
            setZoekterm("");
          }}
          placeholder={gekozenLabel ? `Geselecteerd: ${gekozenLabel}` : placeholder}
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
        />
        {isPending && (
          <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">
            Zoeken...
          </span>
        )}
      </div>

      {/* Dropdown Resultatenlijst */}
      {isOpen && (
        <ul className="absolute z-50 w-full bg-slate-900 border border-slate-700 rounded-md shadow-xl max-h-60 overflow-y-auto mt-1 text-xs divide-y divide-slate-800">
          {resultaten.length > 0 ? (
            resultaten.map((obj) => (
              <li
                key={obj.id}
                onClick={() => handleSelecteer(obj)}
                className={`px-3 py-2 cursor-pointer hover:bg-slate-800 flex items-center justify-between text-slate-200 ${
                  obj.id === gekozenId ? "bg-slate-800 font-bold text-emerald-400" : ""
                }`}
              >
                <span>{obj.label}</span>
                {obj.isConfidential && (
                  <span className="text-[9px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-800/50">
                    🔒 Lokaal
                  </span>
                )}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-slate-500 italic">
              {isPending ? "Laden..." : "Geen resultaten gevonden"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}