"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Layers, Plus, Trash2, ChevronRight } from "lucide-react";
import { AnnotationWorkspace } from "../../components/annotationWorkspace";
import { useLocalStorage } from "../../lib/useLocalStorage";
import {
  createEmptyAreal,
  createPodlazie,
  createPriestor,
  createRect,
  type Podlazie,
  type RectShape,
} from "../../lib/model";
import { INDOOR_KINDS, INDOOR_KIND_META, type IndoorKind } from "../../lib/indoorKinds";

export default function BuildingDetailPage() {
  const params = useParams();
  const buildingId = String(params.buildingId ?? "");

  const [areal, setAreal] = useLocalStorage("path-finder/areal", createEmptyAreal());
  const [selectedFloorId, setSelectedFloorId] = React.useState<string | null>(null);

  const building = areal.budovy.find((b) => b.id === buildingId) ?? null;
  const floor = building?.podlazia.find((f) => f.id === selectedFloorId) ?? null;

  function updateFloor(floorId: string, updater: (f: Podlazie) => Podlazie) {
    setAreal((a) => ({
      ...a,
      budovy: a.budovy.map((b) =>
        b.id !== buildingId ? b : { ...b, podlazia: b.podlazia.map((f) => (f.id === floorId ? updater(f) : f)) }
      ),
    }));
  }

  function addFloor() {
    const poradie = (building?.podlazia.length ?? 0) + 1;
    const novePodlazie = createPodlazie(`Podlažie ${poradie}`, poradie);
    setAreal((a) => ({
      ...a,
      budovy: a.budovy.map((b) => (b.id === buildingId ? { ...b, podlazia: [...b.podlazia, novePodlazie] } : b)),
    }));
    setSelectedFloorId(novePodlazie.id);
  }

  function renameFloor(floorId: string, nazov: string) {
    updateFloor(floorId, (f) => ({ ...f, nazov }));
  }

  function deleteFloor(floorId: string) {
    setAreal((a) => ({
      ...a,
      budovy: a.budovy.map((b) =>
        b.id !== buildingId ? b : { ...b, podlazia: b.podlazia.filter((f) => f.id !== floorId) }
      ),
    }));
    if (selectedFloorId === floorId) setSelectedFloorId(null);
  }

  if (!building) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
        <p className="text-sm text-ink-soft">Budova sa nenašla.</p>
        <Link href="/buildings" className="text-sm text-route hover:underline mt-2 inline-block">
          ← Späť na zoznam budov
        </Link>
      </div>
    );
  }

  if (floor) {
    return (
      <div>
        <div className="px-4 sm:px-6 lg:px-8 pt-6 max-w-[1800px] mx-auto">
          <button
            onClick={() => setSelectedFloorId(null)}
            className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-route transition-colors"
          >
            <ArrowLeft size={14} />
            Späť na podlažia — {building.nazov}
          </button>
        </div>

        <AnnotationWorkspace<IndoorKind>
          title={floor.nazov}
          subtitle={`Pôdorys podlažia budovy „${building.nazov}“.`}
          imageUrl={floor.podkladObrazokUrl}
          svgContent={floor.svgContent}
          imageAlt={`Pôdorys — ${floor.nazov}`}
          onImportImage={(dataUrl) => updateFloor(floor.id, (f) => ({ ...f, podkladObrazokUrl: dataUrl }))}
          onImportSvg={(text) => updateFloor(floor.id, (f) => ({ ...f, svgContent: text }))}
          items={floor.priestory}
          kinds={INDOOR_KINDS}
          kindMeta={INDOOR_KIND_META}
          itemNoun="priestor"
          itemsHeading="Priestory na podlaží"
          emptyListHint="Zatiaľ nič. V docku dole vyberte typ priestoru (miestnosť, chodba, schodisko/výťah, dvere, iné) a kliknite na pôdorys."
          emptyCanvasTitle="Zatiaľ bez pôdorysu"
          emptyCanvasSubtitle="Importujte SVG alebo obrázok pôdorysu tohto podlažia."
          onCreateItem={(kind, point) =>
            updateFloor(floor.id, (f) => {
              const meta = INDOOR_KIND_META[kind];
              const count = f.priestory.filter((p) => p.kind === kind).length;
              const priestor = createPriestor(point, `${meta.label} ${count + 1}`, kind, meta.defaultSize);
              return { ...f, priestory: [...f.priestory, priestor] };
            })
          }
          onAddPart={(itemId, point) =>
            updateFloor(floor.id, (f) => ({
              ...f,
              priestory: f.priestory.map((p) =>
                p.id === itemId ? { ...p, footprint: [...p.footprint, createRect(point)] } : p
              ),
            }))
          }
          onRectChange={(itemId, rectId, next: RectShape) =>
            updateFloor(floor.id, (f) => ({
              ...f,
              priestory: f.priestory.map((p) =>
                p.id !== itemId ? p : { ...p, footprint: p.footprint.map((r) => (r.id === rectId ? next : r)) }
              ),
            }))
          }
          onRename={(id, nazov) =>
            updateFloor(floor.id, (f) => ({ ...f, priestory: f.priestory.map((p) => (p.id === id ? { ...p, nazov } : p)) }))
          }
          onColorChange={(id, color) =>
            updateFloor(floor.id, (f) => ({
              ...f,
              priestory: f.priestory.map((p) => (p.id === id ? { ...p, customColor: color } : p)),
            }))
          }
          onToggleVisible={(id) =>
            updateFloor(floor.id, (f) => ({
              ...f,
              priestory: f.priestory.map((p) => (p.id === id ? { ...p, visible: p.visible === false } : p)),
            }))
          }
          onDeletePart={(itemId, rectId) =>
            updateFloor(floor.id, (f) => ({
              ...f,
              priestory: f.priestory
                .map((p) => (p.id !== itemId ? p : { ...p, footprint: p.footprint.filter((r) => r.id !== rectId) }))
                .filter((p) => p.footprint.length > 0),
            }))
          }
          onDeleteItem={(id) =>
            updateFloor(floor.id, (f) => ({ ...f, priestory: f.priestory.filter((p) => p.id !== id) }))
          }
        />
      </div>
    );
  }

  const podlaziaSorted = [...building.podlazia].sort((a, b) => a.poradie - b.poradie);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-3xl mx-auto">
      <div className="pb-6 border-b border-line">
        <Link href="/buildings" className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-route transition-colors mb-3">
          <ArrowLeft size={14} />
          Budovy
        </Link>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink">{building.nazov}</h1>
        <p className="text-sm text-ink-soft mt-1.5">Podlažia a ich pôdorysy.</p>
      </div>

      {podlaziaSorted.length === 0 ? (
        <div className="border border-line rounded-md bg-surface p-8 text-center">
          <Layers size={28} className="mx-auto text-ink-soft mb-3" />
          <p className="text-sm font-medium text-ink">Zatiaľ žiadne podlažia</p>
          <p className="text-sm text-ink-soft mt-1">Pridajte prvé podlažie a nahrajte jeho pôdorys.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {podlaziaSorted.map((f) => (
            <li key={f.id} className="flex items-center gap-3 border border-line rounded-md bg-surface px-4 py-3">
              <span className="font-mono text-xs text-ink-soft w-6 text-center shrink-0">{f.poradie}</span>
              <input
                value={f.nazov}
                onChange={(e) => renameFloor(f.id, e.target.value)}
                className="flex-1 min-w-0 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-ink"
              />
              <span className="text-xs text-ink-soft shrink-0">
                {f.priestory.length} {f.priestory.length === 1 ? "priestor" : "priestorov"}
              </span>
              <button
                onClick={() => deleteFloor(f.id)}
                aria-label="Odstrániť podlažie"
                className="shrink-0 p-1.5 text-ink-soft hover:text-alarm transition-colors"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setSelectedFloorId(f.id)}
                className="shrink-0 flex items-center gap-1 text-xs font-medium text-route hover:underline"
              >
                Otvoriť <ChevronRight size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={addFloor}
        className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed border-line py-3 text-sm text-ink-soft hover:text-route hover:border-route transition-colors"
      >
        <Plus size={15} />
        Pridať podlažie
      </button>
    </div>
  );
}
