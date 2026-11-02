"use client";

import * as React from "react";
import { DoorOpen, MapPin } from "lucide-react";
import { AnnotationWorkspace } from "../components/annotationWorkspace";
import { useLocalStorage } from "../lib/useLocalStorage";
import { ANNOTATION_KINDS, KIND_META, type AnnotationKind } from "../lib/annotationKinds";
import { type RectShape, createEmptyAreal, createBudova, createLine, createPoi, createRect, rectToPolygon } from "../lib/model";
import { nearestPolygonIndex } from "../lib/snap";
import { POI_CATEGORIES } from "../lib/poiCategories";
import { buildingHoles } from "../lib/walkable";

const WALKABLE_COLOR = "#2f9e5f";
const FORBIDDEN_COLOR = "#bd3a2f";
/** Najväčšia vzdialenosť (px podkladu) od budovy, pri ktorej sa vstup k nej automaticky priradí. */
const ENTRANCE_BUILDING_RADIUS = 80;

export default function ImportPage() {
  const [svgContent, setSvgContent] = React.useState<string | null>(null);
  const [areal, setAreal, , history] = useLocalStorage("path-finder/areal", createEmptyAreal());

  const buildings = areal.budovy.filter((b) => b.kind === "budova");
  const vstupy = areal.vstupy ?? [];
  const zakazane = areal.zakazane ?? [];
  const poi = areal.poi ?? [];

  function countOfKind(kind: AnnotationKind): number {
    return areal.budovy.filter((b) => b.kind === kind).length;
  }

  /** Budova, ktorej obrys je najbližšie k úsečke (vstup), alebo `null`. */
  function nearestBuilding(a: { x: number; y: number }, b: { x: number; y: number }): string | null {
    const owners = buildings.flatMap((bd) => bd.footprint.map(() => bd.id));
    const polys = buildings.flatMap((bd) => bd.footprint.map(rectToPolygon));
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const idx = nearestPolygonIndex(mid, polys, ENTRANCE_BUILDING_RADIUS);
    return idx >= 0 ? owners[idx] : null;
  }

  return (
    <AnnotationWorkspace<AnnotationKind>
      title="Outdoor mapa areálu"
      subtitle="Nahrajte podklad, z ktorého sa vytvorí navigačná sieť areálu."
      imageUrl={areal.podkladObrazokUrl}
      svgContent={svgContent}
      imageAlt="Outdoor mapa areálu"
      onImportImage={(dataUrl) => setAreal((a) => ({ ...a, podkladObrazokUrl: dataUrl }))}
      onImportSvg={(text) => setSvgContent(text)}
      onImportOsm={(query) => console.log("OSM import potvrdený:", query)}
      items={areal.budovy}
      kinds={ANNOTATION_KINDS}
      kindMeta={KIND_META}
      itemNoun="objekt"
      itemsHeading="Objekty v areáli"
      emptyListHint="Zatiaľ nič. V docku vyberte budovu alebo parkovisko a kliknite na fotku."
      emptyCanvasTitle="Zatiaľ bez podkladu"
      emptyCanvasSubtitle="Importujte SVG pôdorys, obrázok alebo načítajte dáta z OpenStreetMap."
      history={history}
      onCreateItem={(kind, point) => {
        const meta = KIND_META[kind];
        const budova = createBudova(point, `${meta.label} ${countOfKind(kind) + 1}`, kind, meta.defaultSize);
        setAreal((a) => ({ ...a, budovy: [...a.budovy, budova] }));
      }}
      onAddPart={(buildingId, point) => {
        const rect = createRect(point);
        setAreal((a) => ({
          ...a,
          budovy: a.budovy.map((b) => (b.id === buildingId ? { ...b, footprint: [...b.footprint, rect] } : b)),
        }));
      }}
      onRectChange={(buildingId, rectId, next: RectShape) => {
        setAreal((a) => ({
          ...a,
          budovy: a.budovy.map((b) =>
            b.id !== buildingId ? b : { ...b, footprint: b.footprint.map((r) => (r.id === rectId ? next : r)) }
          ),
        }));
      }}
      onRename={(id, nazov) => {
        setAreal((a) => ({ ...a, budovy: a.budovy.map((b) => (b.id === id ? { ...b, nazov } : b)) }));
      }}
      onColorChange={(id, color) => {
        setAreal((a) => ({ ...a, budovy: a.budovy.map((b) => (b.id === id ? { ...b, customColor: color } : b)) }));
      }}
      onToggleVisible={(id) => {
        setAreal((a) => ({
          ...a,
          budovy: a.budovy.map((b) => (b.id === id ? { ...b, visible: b.visible === false } : b)),
        }));
      }}
      onDeletePart={(buildingId, rectId) => {
        setAreal((a) => ({
          ...a,
          budovy: a.budovy
            .map((b) => (b.id !== buildingId ? b : { ...b, footprint: b.footprint.filter((r) => r.id !== rectId) }))
            .filter((b) => b.footprint.length > 0),
        }));
      }}
      onDeleteItem={(id) => {
        setAreal((a) => ({
          ...a,
          budovy: a.budovy.filter((b) => b.id !== id),
          // Vstupy zmazanej budovy strácajú priradenie.
          vstupy: (a.vstupy ?? []).map((v) => (v.ref === id ? { ...v, ref: null } : v)),
        }));
      }}
      area={{
        polygon: areal.hranica ?? null,
        holes: buildingHoles(areal),
        color: WALKABLE_COLOR,
        onChange: (hranica) => setAreal((a) => ({ ...a, hranica })),
        forbidden: {
          polygons: zakazane,
          color: FORBIDDEN_COLOR,
          onAdd: (polygon) => setAreal((a) => ({ ...a, zakazane: [...(a.zakazane ?? []), polygon] })),
          onChange: (index, polygon) =>
            setAreal((a) => ({
              ...a,
              zakazane: (a.zakazane ?? []).flatMap((p, i) => (i !== index ? [p] : polygon ? [polygon] : [])),
            })),
        },
      }}
      lines={{
        label: "Vstupy do budov",
        addLabel: "Pridať vstup",
        hint: "Kliknite na dva body na obryse budovy, kde sa do nej vchádza. Konce sa prichytávajú k hrane.",
        color: "#003a70",
        icon: <DoorOpen size={18} />,
        dockBgClass: "bg-route-dark",
        dotClass: "bg-route-dark",
        items: vstupy,
        emptyHint: "Zatiaľ žiadne. Bez vstupu sa do budovy nedá vojsť.",
        onCreate: (a, b) => {
          const line = createLine(a, b, `Vstup ${vstupy.length + 1}`, nearestBuilding(a, b));
          setAreal((s) => ({ ...s, vstupy: [...(s.vstupy ?? []), line] }));
          return line.id;
        },
        onChange: (id, patch) =>
          setAreal((s) => ({ ...s, vstupy: (s.vstupy ?? []).map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
        onDelete: (id) => setAreal((s) => ({ ...s, vstupy: (s.vstupy ?? []).filter((l) => l.id !== id) })),
        renderExtra: (line) => (
          <>
            <label className="text-xs text-ink-soft">Patrí k budove</label>
            <select
              value={line.ref ?? ""}
              onChange={(e) =>
                setAreal((s) => ({
                  ...s,
                  vstupy: (s.vstupy ?? []).map((l) => (l.id === line.id ? { ...l, ref: e.target.value || null } : l)),
                }))
              }
              className="w-full border border-line rounded-sm px-2.5 py-1.5 text-sm bg-surface"
            >
              <option value="">— nepriradené —</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nazov}
                </option>
              ))}
            </select>
          </>
        ),
      }}
      points={{
        label: "Body záujmu",
        addLabel: "Pridať bod záujmu",
        hint: "Kliknite na miesto, ktoré má byť cieľom navigácie (napr. parkovisko pre návštevy).",
        color: "#0d9488",
        icon: <MapPin size={18} />,
        dockBgClass: "bg-teal-600",
        dotClass: "bg-teal-600",
        items: poi,
        categories: POI_CATEGORIES,
        onCreate: (point) => {
          const item = createPoi(point, `Bod záujmu ${poi.length + 1}`);
          setAreal((s) => ({ ...s, poi: [...(s.poi ?? []), item] }));
          return item.id;
        },
        onChange: (id, patch) =>
          setAreal((s) => ({ ...s, poi: (s.poi ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
        onDelete: (id) => setAreal((s) => ({ ...s, poi: (s.poi ?? []).filter((p) => p.id !== id) })),
      }}
      calibration={{
        value: areal.mierka ?? null,
        onChange: (mierka) => setAreal((a) => ({ ...a, mierka })),
        hint: "napr. dĺžka budovy alebo vzdialenosť medzi dvoma bránami",
      }}
    />
  );
}
