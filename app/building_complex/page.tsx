"use client";

import * as React from "react";
import { AnnotationWorkspace } from "../components/annotationWorkspace";
import { useLocalStorage } from "../lib/useLocalStorage";
import { ANNOTATION_KINDS, KIND_META, type AnnotationKind } from "../lib/annotationKinds";
import { type RectShape, createEmptyAreal, createBudova, createRect } from "../lib/model";

export default function ImportPage() {
  const [svgContent, setSvgContent] = React.useState<string | null>(null);
  const [areal, setAreal] = useLocalStorage("path-finder/areal", createEmptyAreal());

  function countOfKind(kind: AnnotationKind): number {
    return areal.budovy.filter((b) => b.kind === kind).length;
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
      emptyListHint="Zatiaľ nič. V docku dole vyberte typ objektu (budova, parkovisko, vstup, iné) a kliknite na fotku."
      emptyCanvasTitle="Zatiaľ bez podkladu"
      emptyCanvasSubtitle="Importujte SVG pôdorys, obrázok alebo načítajte dáta z OpenStreetMap."
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
        setAreal((a) => ({ ...a, budovy: a.budovy.filter((b) => b.id !== id) }));
      }}
    />
  );
}
