"use client";

import * as React from "react";
import {
  ChevronDown,
  FileImage,
  FileCode2,
  Globe,
  X,
  FileUp,
  Trash2,
  Plus,
  PanelRightClose,
  PanelRightOpen,
  Eye,
  EyeOff,
} from "lucide-react";
import Dock from "./dock";
import { getDockItems, type Tool } from "./dockConfig";
import { MapCanvas } from "./mapCanvas";
import { FootprintRect, type RectTier } from "./footprintRect";
import type { KindMeta } from "../lib/annotationKinds";
import type { AnnotatedItem, Point, RectShape } from "../lib/model";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export type AnnotationWorkspaceProps<K extends string> = {
  title: string;
  subtitle: string;

  imageUrl: string | null;
  svgContent: string | null;
  imageAlt?: string;
  onImportImage: (dataUrl: string) => void;
  onImportSvg: (svgText: string) => void;
  onImportOsm?: (query: string) => void;

  items: AnnotatedItem<K>[];
  kinds: K[];
  kindMeta: Record<K, KindMeta>;
  /** Prispôsobí znenie textov v nápovediach/tlačidlách ("objekt" / "priestor" / "budova"...). */
  itemNoun?: string;
  itemsHeading?: string;
  emptyListHint?: string;
  emptyCanvasTitle?: string;
  emptyCanvasSubtitle?: string;

  onCreateItem: (kind: K, point: Point) => void;
  onAddPart: (itemId: string, point: Point) => void;
  onRectChange: (itemId: string, rectId: string, next: RectShape) => void;
  onRename: (itemId: string, nazov: string) => void;
  onColorChange: (itemId: string, color: string | null) => void;
  onToggleVisible: (itemId: string) => void;
  onDeletePart: (itemId: string, rectId: string) => void;
  onDeleteItem: (itemId: string) => void;
};

export function AnnotationWorkspace<K extends string>({
  title,
  subtitle,
  imageUrl,
  svgContent,
  imageAlt,
  onImportImage,
  onImportSvg,
  onImportOsm,
  items,
  kinds,
  kindMeta,
  itemNoun = "objekt",
  itemsHeading = "Objekty",
  emptyListHint,
  emptyCanvasTitle = "Zatiaľ bez podkladu",
  emptyCanvasSubtitle = "Importujte podklad, z ktorého sa budú anotovať objekty.",
  onCreateItem,
  onAddPart,
  onRectChange,
  onRename,
  onColorChange,
  onToggleVisible,
  onDeletePart,
  onDeleteItem,
}: AnnotationWorkspaceProps<K>) {
  const [open, setOpen] = React.useState(false);
  const [showOSM, setShowOSM] = React.useState(false);
  const [selected, setSelected] = React.useState<"svg" | "image" | "osm" | null>(null);

  const [tool, setTool] = React.useState<Tool<K>>("select");
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [selectedRectId, setSelectedRectId] = React.useState<string | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [allVisible, setAllVisible] = React.useState(true);

  const [scale, setScale] = React.useState(1);
  const [position, setPosition] = React.useState<Point>({ x: 0, y: 0 });

  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null;
  const hasPodklad = Boolean(imageUrl || svgContent);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

    if (selected === "svg") {
      const reader = new FileReader();
      reader.onload = () => onImportSvg(String(reader.result ?? ""));
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onImportImage(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  function toolHint(): { text: string; dotClass: string } {
    if (tool === "select") {
      return {
        text: "Kliknutím na obdĺžnik objekt vyberiete, ťahaním za roh zmeníte jeho tvar, za horný úchyt ho natočíte.",
        dotClass: "bg-ink",
      };
    }
    if (tool === "add-part") {
      return {
        text: selectedItem
          ? `Kliknite na podklad, kam patrí ďalšia časť „${selectedItem.nazov}“.`
          : `Najprv v zozname vyberte ${itemNoun}, ku ktorému chcete pridať ďalšiu časť.`,
        dotClass: "bg-ink",
      };
    }
    const kind = (tool as string).slice(4) as K;
    return { text: kindMeta[kind].placeHint, dotClass: kindMeta[kind].dotClass };
  }

  function toolLabel(): string {
    if (tool === "select") return "Ukazovateľ";
    if (tool === "add-part") return "Pridať časť";
    const kind = (tool as string).slice(4) as K;
    return kindMeta[kind].addLabel;
  }

  function handleBackgroundClick(point: Point) {
    if (tool === "add-part") {
      if (selectedItemId) onAddPart(selectedItemId, point);
      setTool("select");
      return;
    }
    if (tool !== "select") {
      const kind = (tool as string).slice(4) as K;
      onCreateItem(kind, point);
      setTool("select");
      return;
    }
    setSelectedItemId(null);
    setSelectedRectId(null);
  }

  function selectRect(itemId: string, rectId: string) {
    setSelectedItemId(itemId);
    setSelectedRectId(rectId);
  }

  function handleDeletePart(itemId: string, rectId: string) {
    onDeletePart(itemId, rectId);
    if (selectedRectId === rectId) setSelectedRectId(null);
  }

  function handleDeleteItem(itemId: string) {
    onDeleteItem(itemId);
    if (selectedItemId === itemId) {
      setSelectedItemId(null);
      setSelectedRectId(null);
    }
  }

  function handleToggleVisible(itemId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    onToggleVisible(itemId);
  }

  const hint = toolHint();
  const dockItems = getDockItems<K>({ tool, setTool, kinds, kindMeta });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-line">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink">{title}</h1>
          <p className="text-sm text-ink-soft mt-1.5 max-w-xl">{subtitle}</p>
        </div>

        <div className="relative w-full sm:w-auto" ref={dropdownRef}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-sm bg-route text-white px-4 py-2.5 text-sm font-medium hover:bg-route/90 transition-colors"
          >
            <FileUp size={16} />
            Importovať podklad
            <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute sm:right-0 mt-2 w-full sm:w-80 rounded-md border border-line bg-surface shadow-[0_12px_32px_-8px_rgba(17,22,29,0.2)] z-50 overflow-hidden divide-y divide-line">
              <button
                onClick={() => handleFileSelect("svg")}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-paper transition-colors"
              >
                <FileCode2 size={17} className="text-route shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-ink">SVG mapa</div>
                  <div className="text-xs text-ink-soft">Objekty sa rozpoznajú podľa ID v súbore</div>
                </div>
              </button>

              <button
                onClick={() => handleFileSelect("image")}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-paper transition-colors"
              >
                <FileImage size={17} className="text-route shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-ink">PNG / JPG</div>
                  <div className="text-xs text-ink-soft">Objekty sa anotujú ručne</div>
                </div>
              </button>

              {onImportOsm && (
                <button
                  onClick={handleOSM}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-paper transition-colors"
                >
                  <Globe size={17} className="text-route shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-ink">OpenStreetMap</div>
                    <div className="text-xs text-ink-soft">Stiahne verejné mapové dáta pre zadaný areál</div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        className="hidden"
      />

      {hasPodklad && (
        <div
          className={cx(
            "flex items-center gap-2.5 rounded-md border px-4 py-2.5 text-sm transition-colors",
            tool === "select" ? "border-line bg-surface text-ink-soft" : "border-route/40 bg-route-soft text-route"
          )}
        >
          <span className={cx("w-2 h-2 rounded-full shrink-0", hint.dotClass)} />
          {hint.text}
        </div>
      )}

      <div className={cx("relative grid grid-cols-1 gap-4", hasPodklad && panelOpen && "xl:grid-cols-[1fr_320px]")}>
        {/* Plátno */}
        {hasPodklad ? (
          <div className="relative h-[75vh] min-h-[480px]">
            {!panelOpen && (
              <button
                type="button"
                onClick={() => setPanelOpen(true)}
                className="absolute top-3 right-3 z-10 flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-soft shadow-sm hover:text-route hover:border-route transition-colors"
              >
                <PanelRightOpen size={14} />
                {itemsHeading} ({items.length})
              </button>
            )}
            <MapCanvas
              imageUrl={imageUrl ?? undefined}
              svgContent={svgContent ?? undefined}
              imageAlt={imageAlt}
              scale={scale}
              position={position}
              onScaleChange={setScale}
              onPositionChange={setPosition}
              onBackgroundClick={handleBackgroundClick}
              panZoomDisabled={tool !== "select"}
              annotationsVisible={allVisible}
              onToggleAnnotationsVisible={() => setAllVisible((v) => !v)}
            >
              {items
                .filter((i) => allVisible && i.visible !== false)
                .flatMap((item) =>
                  item.footprint.map((rect) => {
                    const color = item.customColor ?? kindMeta[item.kind].hex;
                    const tier: RectTier =
                      rect.id === selectedRectId ? "active" : item.id === selectedItemId ? "sibling" : "rest";
                    return (
                      <FootprintRect
                        key={rect.id}
                        rect={rect}
                        scale={scale}
                        editable={tool === "select"}
                        active={rect.id === selectedRectId}
                        color={color}
                        tier={tier}
                        onSelect={() => selectRect(item.id, rect.id)}
                        onChange={(next) => onRectChange(item.id, rect.id, next)}
                      />
                    );
                  })
                )}
            </MapCanvas>
          </div>
        ) : (
          <div className="relative h-[75vh] min-h-[480px] border border-line rounded-md bg-blueprint-grid bg-paper flex items-center justify-center overflow-hidden">
            {[
              "top-3 left-3",
              "top-3 right-3 rotate-90",
              "bottom-3 left-3 -rotate-90",
              "bottom-3 right-3 rotate-180",
            ].map((pos) => (
              <svg
                key={pos}
                className={cx("absolute w-4 h-4 text-ink-soft/50", pos)}
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path d="M8 0v6M8 16v-6M0 8h6M16 8h-6" stroke="currentColor" strokeWidth="1.25" />
              </svg>
            ))}

            <div className="text-center px-6">
              <p className="text-sm font-medium text-ink">{emptyCanvasTitle}</p>
              <p className="text-sm text-ink-soft mt-1 max-w-xs mx-auto">{emptyCanvasSubtitle}</p>
            </div>
          </div>
        )}

        {/* Bočný panel */}
        {hasPodklad && panelOpen && (
          <aside className="border border-line rounded-md bg-surface p-4 flex flex-col gap-4 max-h-[400px] xl:max-h-[75vh] overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-ink-soft">
                  {itemsHeading} <span className="font-mono text-xs">({items.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  aria-label="Skryť panel a zväčšiť plátno"
                  title="Skryť panel a zväčšiť plátno"
                  className="text-ink-soft hover:text-route transition-colors"
                >
                  <PanelRightClose size={16} />
                </button>
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-ink-soft leading-relaxed">
                  {emptyListHint ?? `Zatiaľ nič. V docku dole vyberte typ a kliknite na podklad.`}
                </p>
              ) : (
                <ul className="space-y-1">
                  {items.map((item) => {
                    const meta = kindMeta[item.kind];
                    const hidden = item.visible === false;
                    const color = item.customColor ?? meta.hex;
                    return (
                      <li key={item.id} className="group flex items-center">
                        <button
                          onClick={() => {
                            setSelectedItemId(item.id);
                            setSelectedRectId(item.footprint[0]?.id ?? null);
                          }}
                          className={cx(
                            "flex-1 min-w-0 text-left px-2.5 py-2 rounded-sm text-sm flex items-center gap-2.5 transition-colors",
                            hidden && "opacity-50",
                            item.id === selectedItemId ? "bg-route-soft text-route" : "text-ink hover:bg-paper"
                          )}
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate flex-1">{item.nazov}</span>
                          {item.footprint.length > 1 && (
                            <span className="font-mono text-xs text-ink-soft shrink-0">{item.footprint.length}×</span>
                          )}
                        </button>
                        <button
                          onClick={(e) => handleToggleVisible(item.id, e)}
                          aria-label={hidden ? "Zobraziť na mape" : "Skryť z mapy"}
                          title={hidden ? "Zobraziť na mape" : "Skryť z mapy"}
                          className="shrink-0 p-1.5 text-ink-soft hover:text-route transition-colors"
                        >
                          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {selectedItem && (
              <div className="border-t border-line pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs text-ink-soft">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: selectedItem.customColor ?? kindMeta[selectedItem.kind].hex }}
                    />
                    {kindMeta[selectedItem.kind].label}
                  </div>
                  <button
                    onClick={() => handleToggleVisible(selectedItem.id)}
                    className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-route transition-colors"
                  >
                    {selectedItem.visible === false ? (
                      <>
                        <EyeOff size={13} /> Skrytý
                      </>
                    ) : (
                      <>
                        <Eye size={13} /> Viditeľný
                      </>
                    )}
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-ink-soft">Názov</label>
                    <input
                      value={selectedItem.nazov}
                      onChange={(e) => onRename(selectedItem.id, e.target.value)}
                      className="mt-1 w-full border border-line rounded-sm px-2.5 py-1.5 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-route/30 focus:border-route"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-soft">Farba</label>
                    <input
                      type="color"
                      value={selectedItem.customColor ?? kindMeta[selectedItem.kind].hex}
                      onChange={(e) => onColorChange(selectedItem.id, e.target.value)}
                      className="mt-1 block w-9 h-9 rounded-sm border border-line bg-paper cursor-pointer p-0.5"
                    />
                  </div>
                </div>

                {selectedItem.customColor && (
                  <button
                    onClick={() => onColorChange(selectedItem.id, null)}
                    className="mt-1.5 text-xs text-route hover:underline"
                  >
                    Vrátiť predvolenú farbu
                  </button>
                )}

                {selectedItem.footprint.length > 1 && (
                  <div className="mt-3">
                    <p className="text-xs text-ink-soft mb-1.5">
                      Zložený tvar — {selectedItem.footprint.length} časti (napr. pôdorys v tvare L):
                    </p>
                    <div className="space-y-1">
                      {selectedItem.footprint.map((r, i) => (
                        <div
                          key={r.id}
                          className={cx(
                            "flex items-center justify-between px-2.5 py-1.5 rounded-sm text-xs",
                            r.id === selectedRectId ? "bg-route-soft text-route" : "text-ink-soft"
                          )}
                        >
                          <button onClick={() => setSelectedRectId(r.id)} className="font-mono">
                            časť {i + 1}
                          </button>
                          <button
                            onClick={() => handleDeletePart(selectedItem.id, r.id)}
                            aria-label="Odstrániť časť"
                            className="hover:text-alarm transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setTool("add-part")}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-route border border-route/30 rounded-sm py-1.5 hover:bg-route-soft transition-colors"
                >
                  <Plus size={13} />
                  Pridať ďalšiu časť{selectedItem.footprint.length === 1 ? " (napr. krídlo v tvare L)" : ""}
                </button>

                <button
                  onClick={() => handleDeleteItem(selectedItem.id)}
                  className="mt-2 w-full text-xs text-alarm border border-alarm/30 rounded-sm py-1.5 hover:bg-alarm-soft transition-colors"
                >
                  Odstrániť {itemNoun}
                </button>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* OSM Modal */}
      {showOSM && onImportOsm && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
          <div className="bg-surface rounded-md w-full max-w-md p-6 space-y-4 border border-line">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold text-ink">Import z OpenStreetMap</h2>
              <button
                onClick={() => setShowOSM(false)}
                aria-label="Zavrieť"
                className="text-ink-soft hover:text-ink transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="text-sm text-ink-soft">Adresa alebo názov areálu</label>
              <input
                id="osm-query"
                type="text"
                placeholder="Napr. Technická univerzita Košice"
                className="mt-1.5 w-full border border-line rounded-sm px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-route/30 focus:border-route"
              />
            </div>

            <button
              className="w-full bg-route text-white rounded-sm py-2.5 text-sm font-medium hover:bg-route/90 transition-colors"
              onClick={() => {
                const input = document.getElementById("osm-query") as HTMLInputElement | null;
                onImportOsm(input?.value ?? "");
                setShowOSM(false);
              }}
            >
              Importovať dáta z OpenStreetMap
            </button>
          </div>
        </div>
      )}

      <div className="fixed left-0 right-0 bottom-6 z-50 px-4 flex flex-col items-center gap-2">
        <div className="rounded-full border border-line bg-surface/95 backdrop-blur-sm px-4 py-1.5 shadow-sm flex items-center gap-2">
          <span className={cx("w-2 h-2 rounded-full", hint.dotClass)} />
          <span className="text-xs font-medium text-ink">Režim: {toolLabel()}</span>
        </div>

        <div className="relative h-[120px] w-full">
          <Dock items={dockItems} panelHeight={64} baseItemSize={50} magnification={70} distance={200} />
        </div>
      </div>
    </div>
  );
}
