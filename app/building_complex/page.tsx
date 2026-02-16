"use client";

import * as React from "react";
import {
  ChevronDown,
  FileImage,
  FileCode2,
  Globe,
  X,
  FileUp,
} from "lucide-react";
import Dock from "../components/dock";
import { dockItems } from "../components/dockConfig";
export default function ImportPage() {
  const [open, setOpen] = React.useState(false);
  const [showOSM, setShowOSM] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);

  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleFileSelect(type: "svg" | "image") {
    setSelected(type);
    setOpen(false);
    fileInputRef.current?.click();
  }

  function handleOSM() {
    setSelected("osm");
    setOpen(false);
    setShowOSM(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("Vybraný súbor:", file);
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Outdoor mapa areálu
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            Nahrajte alebo importujte podklad pre vytvorenie navigačného systému.
          </p>
        </div>

        {/* Import button */}
        <div className="relative w-full sm:w-auto" ref={dropdownRef}>
          <button
          
            onClick={() => setOpen((prev) => !prev)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#0075be] text-white px-4 py-2 text-sm hover:bg-[#003a70] transition"
          >
            <FileUp size= {16} />
            Importovať
            <ChevronDown size={16} />
          </button>

          {open && (
            <div className="absolute sm:right-0 mt-2 w-full sm:w-72 rounded-xl border bg-white shadow-lg z-50 overflow-hidden">
              <button
                onClick={() => handleFileSelect("svg")}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 transition"
              >
                <FileCode2 size={18} />
                <div className="text-left">
                  <div className="font-medium">SVG mapa</div>
                  <div className="text-xs text-gray-500">
                    Automatická detekcia objektov
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleFileSelect("image")}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 transition"
              >
                <FileImage size={18} />
                <div className="text-left">
                  <div className="font-medium">PNG / JPG</div>
                  <div className="text-xs text-gray-500">
                    Použiť ako vizuálny podklad
                  </div>
                </div>
              </button>

              <button
                onClick={handleOSM}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 transition"
              >
                <Globe size={18} />
                <div className="text-left">
                  <div className="font-medium">OpenStreetMap</div>
                  <div className="text-xs text-gray-500">
                    Import verejných mapových dát
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Selected info */}
      {selected && (
        <div className="rounded-xl border p-4 bg-gray-50 text-sm break-words">
          Vybraný typ importu: <b>{selected.toUpperCase()}</b>
        </div>
      )}

      {/* Map canvas placeholder */}
      <div className="h-[450px] sm:h-[500px] lg:h-[650px] border rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm sm:text-base">
        Tu sa zobrazí mapa po importe
      </div>

      {/* OSM Modal */}
      {showOSM && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                Import z OpenStreetMap
              </h2>
              <button onClick={() => setShowOSM(false)}>
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="text-sm text-gray-600">
                Zadajte adresu alebo názov areálu
              </label>
              <input
                type="text"
                placeholder="Napr. Technická univerzita Košice"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <button
              className="w-full bg-black text-white rounded-lg py-2 text-sm hover:bg-gray-800 transition"
              onClick={() => {
                console.log("OSM import potvrdený");
                setShowOSM(false);
              }}
            >
              Importovať dáta
            </button>
          </div>
        </div>
      )}

      <div className="fixed left-0 right-0 bottom-6 z-50 px-4">
        {/* dôležité: relative wrapper kvôli absolute v dock.tsx */}
        <div className="relative h-[120px]">
          <Dock
            items={dockItems}
            panelHeight={64}
            baseItemSize={50}
            magnification={70}
            distance={200}
          />
        </div>
      </div>
    </div>
  );
}
