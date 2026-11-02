"use client";

import * as React from "react";
import {
  Ban,
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
  Pentagon,
  Redo2,
  Ruler,
  Undo2,
} from "lucide-react";
import Dock from "./dock";
import { getDockItems, type DockExtra, type DrawTool, type Tool } from "./dockConfig";
import { MapCanvas } from "./mapCanvas";
import { FootprintRect, type RectTier } from "./footprintRect";
import { AreaPolygon, MIN_VERTICES } from "./areaPolygon";
import { CalibrationOverlay, LinesOverlay, PointsOverlay } from "./annotationLayers";
import type { KindMeta } from "../lib/annotationKinds";
import { metersPerPixel, rectToPolygon, type AnnotatedItem, type Calibration, type LineShape, type Point, type PointItem, type RectShape } from "../lib/model";
import { snapToPolygonEdges } from "../lib/snap";
import type { History } from "../lib/useLocalStorage";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

/** Pochôdzna plocha: jeden polygón, od ktorého sa odčítajú `holes` (napr. budovy) a zakázané plochy. */
export type WalkableArea = {
  polygon: Point[] | null;
  holes: Point[][];
  /** Hex farba plochy. */
  color: string;
  onChange: (polygon: Point[] | null) => void;
  /** Zakázané plochy (cesta pre autá, trávnik…) – ďalšie diery. */
  forbidden?: {
    polygons: Point[][];
    color: string;
    onAdd: (polygon: Point[]) => void;
    /** `null` plochu odstráni. */
    onChange: (index: number, polygon: Point[] | null) => void;
  };
};

type LayerBase = {
  label: string;
  addLabel: string;
  hint: string;
  /** Hex farba vrstvy. */
  color: string;
  icon: React.ReactNode;
  /** Doslovné tailwind triedy (nesmú sa skladať za behu). */
  dockBgClass: string;
  dotClass: string;
};

/** Úsečky na hranici priestorov: vstupy do budov (outdoor) a dvere (pôdorys). */
export type LineLayer = LayerBase & {
  items: LineShape[];
  /** Vráti `id` vytvorenej úsečky, aby sa vybrala. */
  onCreate: (a: Point, b: Point) => string;
  onChange: (id: string, patch: Partial<Pick<LineShape, "a" | "b" | "nazov" | "ref" | "visible">>) => void;
  onDelete: (id: string) => void;
  /** Doplnkové ovládanie pre vybranú úsečku (napr. výber budovy). */
  renderExtra?: (line: LineShape) => React.ReactNode;
  emptyHint?: string;
};

/** Body záujmu. */
export type PointLayer = LayerBase & {
  items: PointItem[];
  categories: { value: string; label: string }[];
  onCreate: (p: Point) => string;
  onChange: (id: string, patch: Partial<Pick<PointItem, "point" | "nazov" | "kategoria" | "interny">>) => void;
  onDelete: (id: string) => void;
  emptyHint?: string;
};

export type CalibrationLayer = {
  value: Calibration | null;
  onChange: (c: Calibration | null) => void;
  /** Čo sa kalibruje (napr. „outdoor mapa“, „pôdorys“) – do nápovede. */
  hint: string;
};

const AREA_TOOL_LABEL = "Pochôdzna plocha";
const FORBIDDEN_TOOL_LABEL = "Zakázaná plocha";
const CALIBRATE_TOOL_LABEL = "Kalibrovať mierku";
/** Polomer prichytávania k hranám priestorov v pixeloch obrazovky. */
const SNAP_RADIUS = 14;
const MIN_LINE_LENGTH = 4;
const FORBIDDEN_COLOR = "#bd3a2f";
const CALIBRATION_COLOR = "#7c3aed";

type SectionId = "area" | "calibration" | "lines" | "points" | "items";

/** Sekcia bočného panela: hlavička so stavom je vždy vidieť, obsah len keď je otvorená. */
function PanelSection({
  title,
  color,
  status,
  warn = false,
  open,
  onToggle,
  children,
}: {
  title: string;
  color: string;
  /** Krátky stav v hlavičke (napr. „11 vrcholov“, „nastavená“). */
  status: string;
  /** Stav vyžaduje pozornosť (chýba plocha alebo mierka). */
  warn?: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-paper"
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium text-ink">{title}</span>
        <span className={cx("ml-auto truncate text-xs", warn ? "text-flag" : "text-ink-soft")}>{status}</span>
        <ChevronDown size={14} className={cx("shrink-0 text-ink-soft transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </section>
  );
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

  /** Ak je zadaná, v docku pribudne nástroj na kreslenie pochôdznej plochy (outdoor mapa). */
  area?: WalkableArea;
  lines?: LineLayer;
  points?: PointLayer;
  calibration?: CalibrationLayer;
  /** Späť/znova (tlačidlá aj Ctrl+Z / Ctrl+Y). */
  history?: History;
  /** Doplnkové ovládanie vybraného objektu (napr. zóna a bezbariérovosť priestoru). */
  renderItemExtra?: (item: AnnotatedItem<K>) => React.ReactNode;
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
  area,
  lines,
  points,
  calibration,
  history,
  renderItemExtra,
}: AnnotationWorkspaceProps<K>) {
  const [open, setOpen] = React.useState(false);
  const [showOSM, setShowOSM] = React.useState(false);
  const [selected, setSelected] = React.useState<"svg" | "image" | "osm" | null>(null);

  const [tool, setTool] = React.useState<Tool<K>>("select");
  /** Body plochy, ktoré admin práve kladie (kým ju neuzavrie). */
  const [draft, setDraft] = React.useState<Point[]>([]);
  /** Prvý bod úsečky, ktorú admin práve kreslí. */
  const [lineStart, setLineStart] = React.useState<Point | null>(null);
  /** Body kalibrácie (0 až 2), kým nie je zadaná vzdialenosť. */
  const [calDraft, setCalDraft] = React.useState<Point[]>([]);
  const [calMeters, setCalMeters] = React.useState("");

  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [selectedRectId, setSelectedRectId] = React.useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = React.useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = React.useState<string | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(true);
  /** Otvorená sekcia panela; pri prázdnej outdoor mape sa začína plochou, inak zoznamom objektov. */
  const [section, setSection] = React.useState<SectionId | null>(area && !area.polygon ? "area" : "items");
  const toggleSection = (id: SectionId) => setSection((s) => (s === id ? null : id));
  const [allVisible, setAllVisible] = React.useState(true);

  const [scale, setScale] = React.useState(1);
  const [position, setPosition] = React.useState<Point>({ x: 0, y: 0 });

  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null;
  const selectedLine = lines?.items.find((l) => l.id === selectedLineId) ?? null;
  const selectedPoint = points?.items.find((p) => p.id === selectedPointId) ?? null;
  const hasPodklad = Boolean(imageUrl || svgContent);

  const snapTargets = React.useMemo(
    () => items.filter((i) => i.visible !== false).flatMap((i) => i.footprint.map(rectToPolygon)),
    [items]
  );
  const snap = (p: Point) => snapToPolygonEdges(p, snapTargets, SNAP_RADIUS / scale);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function clearSelection() {
    setSelectedItemId(null);
    setSelectedRectId(null);
    setSelectedLineId(null);
    setSelectedPointId(null);
  }

  function selectLine(id: string) {
    clearSelection();
    setSelectedLineId(id);
    setSection("lines");
    setPanelOpen(true);
  }

  function selectPoint(id: string) {
    clearSelection();
    setSelectedPointId(id);
    setSection("points");
    setPanelOpen(true);
  }

  function chooseTool(next: Tool<K>) {
    setDraft([]);
    setLineStart(null);
    setCalDraft([]);
    setTool(next);
    // Panel ukáže sekciu, ktorej nástroj sa práve používa.
    if (next === "draw-area" || next === "draw-forbidden") setSection("area");
    else if (next === "draw-line") setSection("lines");
    else if (next === "draw-point") setSection("points");
    else if (next === "calibrate") setSection("calibration");
  }

  const finishDraft = React.useCallback(() => {
    if (draft.length >= MIN_VERTICES) {
      if (tool === "draw-forbidden") area?.forbidden?.onAdd(draft);
      else area?.onChange(draft);
    }
    setDraft([]);
    setTool("select");
  }, [draft, tool, area]);

  // Klávesnica: Enter dokončí plochu, Esc zruší rozpracované kreslenie, Backspace vráti posledný bod.
  React.useEffect(() => {
    const drawing = tool === "draw-area" || tool === "draw-forbidden";
    if (!drawing && tool !== "draw-line" && tool !== "calibrate") return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        setDraft([]);
        setLineStart(null);
        setCalDraft([]);
        setTool("select");
      } else if (drawing && e.key === "Enter") finishDraft();
      else if (drawing && e.key === "Backspace") setDraft((d) => d.slice(0, -1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, finishDraft]);

  // Späť/znova z klávesnice (nie počas písania do poľa).
  React.useEffect(() => {
    if (!history) return;
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        history?.undo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        history?.redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history]);

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

  const kindOf = (t: Tool<K>) => (t as string).slice(4) as K;

  function toolHint(): { text: string; dotClass: string } {
    switch (tool as Tool<K>) {
      case "draw-area":
        return {
          text:
            draft.length === 0
              ? "Klikajte po obvode areálu, po ktorom sa dá chodiť. Budovy kresliť netreba, odčítajú sa automaticky."
              : draft.length < MIN_VERTICES
              ? "Pridávajte ďalšie vrcholy (aspoň 3). Backspace vráti posledný, Esc zruší kreslenie."
              : "Plochu uzavriete kliknutím na prvý (plný) bod alebo klávesom Enter. Backspace vráti posledný bod.",
          dotClass: "bg-stake",
        };
      case "draw-forbidden":
        return {
          text:
            draft.length < MIN_VERTICES
              ? "Obkreslite plochu, po ktorej sa nemá viesť trasa (cesta pre autá, trávnik). Odčíta sa od pochôdznej plochy."
              : "Uzavriete kliknutím na prvý (plný) bod alebo klávesom Enter.",
          dotClass: "bg-alarm",
        };
      case "draw-line":
        return { text: lineStart ? "Kliknite na druhý koniec úsečky. Prichytáva sa k hranám." : (lines?.hint ?? ""), dotClass: lines?.dotClass ?? "bg-ink" };
      case "draw-point":
        return { text: points?.hint ?? "", dotClass: points?.dotClass ?? "bg-ink" };
      case "calibrate":
        return {
          text:
            calDraft.length === 0
              ? `Kliknite na prvý bod vzdialenosti, ktorú poznáte (${calibration?.hint ?? "napr. dĺžka budovy"}).`
              : calDraft.length === 1
              ? "Kliknite na druhý bod."
              : "Zadajte skutočnú vzdialenosť v metroch v paneli vpravo.",
          dotClass: "bg-route-dark",
        };
      case "select":
        return {
          text: "Kliknutím na objekt ho vyberiete, ťahaním za roh zmeníte jeho tvar, za horný úchyt ho natočíte.",
          dotClass: "bg-ink",
        };
      case "add-part":
        return {
          text: selectedItem
            ? `Kliknite na podklad, kam patrí ďalšia časť „${selectedItem.nazov}“.`
            : `Najprv v zozname vyberte ${itemNoun}, ku ktorému chcete pridať ďalšiu časť.`,
          dotClass: "bg-ink",
        };
      default: {
        const kind = kindOf(tool);
        return { text: kindMeta[kind].placeHint, dotClass: kindMeta[kind].dotClass };
      }
    }
  }

  function toolLabel(): string {
    switch (tool as Tool<K>) {
      case "draw-area":
        return AREA_TOOL_LABEL;
      case "draw-forbidden":
        return FORBIDDEN_TOOL_LABEL;
      case "draw-line":
        return lines?.addLabel ?? "Úsečka";
      case "draw-point":
        return points?.addLabel ?? "Bod";
      case "calibrate":
        return CALIBRATE_TOOL_LABEL;
      case "select":
        return "Ukazovateľ";
      case "add-part":
        return "Pridať časť";
      default:
        return kindMeta[kindOf(tool)].addLabel;
    }
  }

  function handleBackgroundClick(point: Point) {
    switch (tool as Tool<K>) {
      case "draw-area":
      case "draw-forbidden":
        setDraft((d) => [...d, point]);
        return;
      case "draw-line": {
        if (!lines) return;
        const p = snap(point);
        if (!lineStart) {
          setLineStart(p);
          return;
        }
        if (Math.hypot(p.x - lineStart.x, p.y - lineStart.y) * scale < MIN_LINE_LENGTH) return;
        const id = lines.onCreate(lineStart, p);
        setLineStart(null);
        setTool("select");
        selectLine(id);
        return;
      }
      case "draw-point": {
        if (!points) return;
        const id = points.onCreate(point);
        setTool("select");
        selectPoint(id);
        return;
      }
      case "calibrate":
        setCalDraft((d) => (d.length >= 2 ? [point] : [...d, point]));
        setPanelOpen(true);
        return;
      case "add-part":
        if (selectedItemId) onAddPart(selectedItemId, point);
        setTool("select");
        return;
      case "select":
        clearSelection();
        return;
      default:
        onCreateItem(kindOf(tool), point);
        setTool("select");
    }
  }

  function selectRect(itemId: string, rectId: string) {
    clearSelection();
    setSelectedItemId(itemId);
    setSelectedRectId(rectId);
    setSection("items");
    setPanelOpen(true);
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

  function confirmCalibration() {
    const meters = Number(calMeters.replace(",", "."));
    if (calDraft.length === 2 && meters > 0 && calibration) {
      calibration.onChange({ a: calDraft[0], b: calDraft[1], meters });
    }
    setCalDraft([]);
    setCalMeters("");
    setTool("select");
  }

  const hint = toolHint();
  const mpp = metersPerPixel(calibration?.value);

  const extras: DockExtra[] = [];
  if (area) extras.push({ tool: "draw-area", label: AREA_TOOL_LABEL, icon: <Pentagon size={18} />, dockBgClass: "bg-stake" });
  if (area?.forbidden) extras.push({ tool: "draw-forbidden", label: FORBIDDEN_TOOL_LABEL, icon: <Ban size={18} />, dockBgClass: "bg-alarm" });
  if (lines) extras.push({ tool: "draw-line", label: lines.addLabel, icon: lines.icon, dockBgClass: lines.dockBgClass });
  if (points) extras.push({ tool: "draw-point", label: points.addLabel, icon: points.icon, dockBgClass: points.dockBgClass });
  if (calibration) extras.push({ tool: "calibrate", label: CALIBRATE_TOOL_LABEL, icon: <Ruler size={18} />, dockBgClass: "bg-violet-600" });
  const dockItems = getDockItems<K>({ tool, setTool: chooseTool, kinds, kindMeta, extras });

  const panelButton =
    "text-xs rounded-sm py-1.5 border transition-colors";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-line">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink">{title}</h1>
          <p className="text-sm text-ink-soft mt-1.5 max-w-xl">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {history && (
            <div className="flex shrink-0 rounded-sm border border-line bg-surface">
              <button
                type="button"
                onClick={history.undo}
                disabled={!history.canUndo}
                aria-label="Späť (Ctrl+Z)"
                title="Späť (Ctrl+Z)"
                className="p-2.5 text-ink-soft transition-colors hover:text-route disabled:opacity-30 disabled:pointer-events-none"
              >
                <Undo2 size={16} />
              </button>
              <button
                type="button"
                onClick={history.redo}
                disabled={!history.canRedo}
                aria-label="Znova (Ctrl+Y)"
                title="Znova (Ctrl+Y)"
                className="border-l border-line p-2.5 text-ink-soft transition-colors hover:text-route disabled:opacity-30 disabled:pointer-events-none"
              >
                <Redo2 size={16} />
              </button>
            </div>
          )}

          <div className="relative flex-1 sm:flex-none" ref={dropdownRef}>
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
              {area && allVisible && (
                <AreaPolygon
                  polygon={area.polygon}
                  forbidden={area.forbidden?.polygons ?? []}
                  draft={draft}
                  draftColor={tool === "draw-forbidden" ? FORBIDDEN_COLOR : area.color}
                  holes={area.holes}
                  color={area.color}
                  forbiddenColor={area.forbidden?.color ?? FORBIDDEN_COLOR}
                  scale={scale}
                  editable={tool === "select"}
                  onChange={area.onChange}
                  onChangeForbidden={(i, next) => area.forbidden?.onChange(i, next)}
                  onCloseDraft={finishDraft}
                />
              )}
              {/* Pri kreslení nesmú obdĺžniky zachytávať kliky, inak sa bod nedá položiť na budovu. */}
              <div style={{ display: "contents", pointerEvents: tool === "select" ? undefined : "none" }}>
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
              </div>
              {lines && allVisible && (
                <LinesOverlay
                  lines={lines.items}
                  color={lines.color}
                  scale={scale}
                  interactive={tool === "select"}
                  selectedId={selectedLineId}
                  onSelect={selectLine}
                  pending={tool === "draw-line" ? lineStart : null}
                  snap={snap}
                  onMove={(id, a, b) => lines.onChange(id, { a, b })}
                />
              )}
              {points && allVisible && (
                <PointsOverlay
                  points={points.items}
                  color={points.color}
                  scale={scale}
                  interactive={tool === "select"}
                  selectedId={selectedPointId}
                  onSelect={selectPoint}
                  onMove={(id, p) => points.onChange(id, { point: p })}
                />
              )}
              {calibration && allVisible && <CalibrationOverlay value={calibration.value} draft={calDraft} scale={scale} />}
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

        {/* Bočný panel: sekcie sa skladajú a naraz je otvorená jedna, aby panel nebol preplnený. */}
        {hasPodklad && panelOpen && (
          <aside className="flex max-h-[400px] flex-col overflow-y-auto rounded-md border border-line bg-surface xl:max-h-[75vh]">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Vrstvy</span>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Skryť panel a zväčšiť plátno"
                title="Skryť panel a zväčšiť plátno"
                className="text-ink-soft transition-colors hover:text-route"
              >
                <PanelRightClose size={16} />
              </button>
            </div>

            {area && (
              <PanelSection
                title={AREA_TOOL_LABEL}
                color={area.color}
                open={section === "area"}
                onToggle={() => toggleSection("area")}
                status={area.polygon ? `${area.polygon.length} vrcholov` : "nenakreslená"}
                warn={!area.polygon}
              >
                {area.polygon ? (
                  <>
                    <p className="text-xs text-ink-soft">
                      Odčítané: {area.holes.length} obrysov budov
                      {area.forbidden ? `, ${area.forbidden.polygons.length} zakázaných plôch` : ""}.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => chooseTool("draw-area")} className={cx(panelButton, "flex-1 border-route/30 text-route hover:bg-route-soft")}>
                        Nakresliť znova
                      </button>
                      <button onClick={() => area.onChange(null)} className={cx(panelButton, "flex-1 border-alarm/30 text-alarm hover:bg-alarm-soft")}>
                        Odstrániť
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-ink-soft">Obkreslite územie, po ktorom sa dá chodiť.</p>
                    <button onClick={() => chooseTool("draw-area")} className={cx(panelButton, "w-full border-route bg-route text-white hover:bg-route/90")}>
                      Nakresliť plochu
                    </button>
                  </>
                )}
                {area.forbidden && (
                  <div className="border-t border-line pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-ink">
                        Zakázané plochy <span className="font-mono text-ink-soft">({area.forbidden.polygons.length})</span>
                      </span>
                      <button onClick={() => chooseTool("draw-forbidden")} className="text-xs text-route hover:underline">
                        + Pridať
                      </button>
                    </div>
                    {area.forbidden.polygons.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {area.forbidden.polygons.map((_, i) => (
                          <li key={i} className="flex items-center justify-between rounded-sm px-2 py-1 text-xs text-ink-soft hover:bg-paper">
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: area.forbidden?.color ?? FORBIDDEN_COLOR }} />
                              Zakázaná plocha {i + 1}
                            </span>
                            <button
                              onClick={() => area.forbidden?.onChange(i, null)}
                              aria-label="Odstrániť zakázanú plochu"
                              className="transition-colors hover:text-alarm"
                            >
                              <Trash2 size={13} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </PanelSection>
            )}

            {calibration && (
              <PanelSection
                title="Mierka"
                color={CALIBRATION_COLOR}
                open={section === "calibration"}
                onToggle={() => toggleSection("calibration")}
                status={calDraft.length === 2 ? "zadajte vzdialenosť" : mpp ? `${calibration.value?.meters} m` : "nenastavená"}
                warn={!mpp && calDraft.length !== 2}
              >
                {calDraft.length === 2 ? (
                  <div>
                    <label className="text-xs text-ink-soft" htmlFor="cal-meters">
                      Skutočná vzdialenosť medzi bodmi (m)
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        id="cal-meters"
                        autoFocus
                        inputMode="decimal"
                        value={calMeters}
                        onChange={(e) => setCalMeters(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && confirmCalibration()}
                        placeholder="napr. 42,5"
                        className="min-w-0 flex-1 rounded-sm border border-line bg-paper px-2.5 py-1.5 text-sm focus:border-route focus:outline-none focus:ring-2 focus:ring-route/30"
                      />
                      <button
                        onClick={confirmCalibration}
                        disabled={!(Number(calMeters.replace(",", ".")) > 0)}
                        className="rounded-sm bg-route px-3 text-sm font-medium text-white hover:bg-route/90 disabled:opacity-40"
                      >
                        Uložiť
                      </button>
                    </div>
                    <button onClick={() => chooseTool("select")} className="mt-1.5 text-xs text-ink-soft hover:underline">
                      Zrušiť
                    </button>
                  </div>
                ) : mpp ? (
                  <>
                    <p className="text-xs text-ink-soft">
                      1 px ≈ <span className="font-mono">{mpp.toFixed(3)} m</span>
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => chooseTool("calibrate")} className={cx(panelButton, "flex-1 border-route/30 text-route hover:bg-route-soft")}>
                        Kalibrovať znova
                      </button>
                      <button onClick={() => calibration.onChange(null)} className={cx(panelButton, "flex-1 border-alarm/30 text-alarm hover:bg-alarm-soft")}>
                        Odstrániť
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-ink-soft">Označte dva body so známou vzdialenosťou ({calibration.hint}).</p>
                    <button onClick={() => chooseTool("calibrate")} className={cx(panelButton, "w-full border-route bg-route text-white hover:bg-route/90")}>
                      Kalibrovať mierku
                    </button>
                  </>
                )}
              </PanelSection>
            )}

            {lines && (
              <PanelSection
                title={lines.label}
                color={lines.color}
                open={section === "lines"}
                onToggle={() => toggleSection("lines")}
                status={String(lines.items.length)}
              >
                {lines.items.length === 0 ? (
                  <p className="text-xs text-ink-soft">{lines.emptyHint ?? "Zatiaľ nič."}</p>
                ) : (
                  <ul className="space-y-0.5">
                    {lines.items.map((l) => (
                      <li key={l.id} className="flex items-center">
                        <button
                          onClick={() => selectLine(l.id)}
                          className={cx(
                            "min-w-0 flex-1 truncate rounded-sm px-2.5 py-1.5 text-left text-sm transition-colors",
                            l.visible === false && "opacity-50",
                            l.id === selectedLineId ? "bg-route-soft text-route" : "text-ink hover:bg-paper"
                          )}
                        >
                          {l.nazov}
                        </button>
                        <button
                          onClick={() => lines.onChange(l.id, { visible: l.visible === false })}
                          aria-label={l.visible === false ? "Zobraziť na mape" : "Skryť z mapy"}
                          className="shrink-0 p-1.5 text-ink-soft transition-colors hover:text-route"
                        >
                          {l.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button onClick={() => chooseTool("draw-line")} className={cx(panelButton, "w-full border-route/30 text-route hover:bg-route-soft")}>
                  + {lines.addLabel}
                </button>

                {selectedLine && (
                  <div className="space-y-2 rounded-sm bg-paper p-3">
                    <label className="text-xs text-ink-soft">Názov</label>
                    <input
                      value={selectedLine.nazov}
                      onChange={(e) => lines.onChange(selectedLine.id, { nazov: e.target.value })}
                      className="w-full rounded-sm border border-line bg-surface px-2.5 py-1.5 text-sm focus:border-route focus:outline-none focus:ring-2 focus:ring-route/30"
                    />
                    {lines.renderExtra?.(selectedLine)}
                    <button
                      onClick={() => {
                        lines.onDelete(selectedLine.id);
                        setSelectedLineId(null);
                      }}
                      className={cx(panelButton, "w-full border-alarm/30 text-alarm hover:bg-alarm-soft")}
                    >
                      Odstrániť
                    </button>
                  </div>
                )}
              </PanelSection>
            )}

            {points && (
              <PanelSection
                title={points.label}
                color={points.color}
                open={section === "points"}
                onToggle={() => toggleSection("points")}
                status={String(points.items.length)}
              >
                {points.items.length === 0 ? (
                  <p className="text-xs text-ink-soft">{points.emptyHint ?? "Zatiaľ nič."}</p>
                ) : (
                  <ul className="space-y-0.5">
                    {points.items.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => selectPoint(p.id)}
                          className={cx(
                            "w-full truncate rounded-sm px-2.5 py-1.5 text-left text-sm transition-colors",
                            p.id === selectedPointId ? "bg-route-soft text-route" : "text-ink hover:bg-paper"
                          )}
                        >
                          {p.nazov}
                          {p.interny && <span className="ml-1.5 text-xs text-alarm">interný</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button onClick={() => chooseTool("draw-point")} className={cx(panelButton, "w-full border-route/30 text-route hover:bg-route-soft")}>
                  + {points.addLabel}
                </button>

                {selectedPoint && (
                  <div className="space-y-2 rounded-sm bg-paper p-3">
                    <label className="text-xs text-ink-soft">Názov</label>
                    <input
                      value={selectedPoint.nazov}
                      onChange={(e) => points.onChange(selectedPoint.id, { nazov: e.target.value })}
                      className="w-full rounded-sm border border-line bg-surface px-2.5 py-1.5 text-sm focus:border-route focus:outline-none focus:ring-2 focus:ring-route/30"
                    />
                    <label className="text-xs text-ink-soft">Kategória</label>
                    <select
                      value={selectedPoint.kategoria}
                      onChange={(e) => points.onChange(selectedPoint.id, { kategoria: e.target.value })}
                      className="w-full rounded-sm border border-line bg-surface px-2.5 py-1.5 text-sm"
                    >
                      {points.categories.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={selectedPoint.interny}
                        onChange={(e) => points.onChange(selectedPoint.id, { interny: e.target.checked })}
                      />
                      Interný bod (návštevník ho nevidí)
                    </label>
                    <button
                      onClick={() => {
                        points.onDelete(selectedPoint.id);
                        setSelectedPointId(null);
                      }}
                      className={cx(panelButton, "w-full border-alarm/30 text-alarm hover:bg-alarm-soft")}
                    >
                      Odstrániť
                    </button>
                  </div>
                )}
              </PanelSection>
            )}

            <PanelSection
              title={itemsHeading}
              color="#5b6472"
              open={section === "items"}
              onToggle={() => toggleSection("items")}
              status={String(items.length)}
            >
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
                            clearSelection();
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

                {renderItemExtra && <div className="mt-3 space-y-2">{renderItemExtra(selectedItem)}</div>}

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
            </PanelSection>
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

      {/* Kontajner je na celú šírku obrazovky, preto nesmie zachytávať kliky – inak by blokoval prvky pod ním (napr. spodok pravého panelu). Klikateľný je iba dock. */}
      <div className="pointer-events-none fixed left-0 right-0 bottom-6 z-50 px-4 flex flex-col items-center gap-2">
        <div className="rounded-full border border-line bg-surface/95 backdrop-blur-sm px-4 py-1.5 shadow-sm flex items-center gap-2">
          <span className={cx("w-2 h-2 rounded-full", hint.dotClass)} />
          <span className="text-xs font-medium text-ink">Režim: {toolLabel()}</span>
        </div>

        <div className="relative h-[120px] w-full">
          <Dock
            items={dockItems}
            className="pointer-events-auto"
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

export type { DrawTool };
