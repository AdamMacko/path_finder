"use client";

import * as React from "react";
import { DoorClosed, MapPin } from "lucide-react";
import { AnnotationWorkspace } from "./annotationWorkspace";
import {
  createId,
  createLine,
  createPoi,
  createPriestor,
  createRect,
  type Budova,
  type ItemMeta,
  type LineShape,
  type Podlazie,
  type Priestor,
  type RectShape,
  type VerticalKind,
} from "../lib/model";
import { INDOOR_KINDS, INDOOR_KIND_META, type IndoorKind } from "../lib/indoorKinds";
import { POI_CATEGORIES } from "../lib/poiCategories";
import { createEmptyPravidla } from "../lib/rules";
import { VERTICAL_LABEL, describeGroup, verticalGroups } from "../lib/vertical";
import { useLocalStorage, type History } from "../lib/useLocalStorage";

type Props = {
  floor: Podlazie;
  building: Budova;
  /** Vstupy do tejto budovy z outdoor mapy – dvere na prízemí sa k nim dajú priradiť. */
  entrances: LineShape[];
  /** Zmení podlažie tak, že vráti jeho novú podobu. */
  onUpdate: (updater: (f: Podlazie) => Podlazie) => void;
  history?: History;
};

const NEW_GROUP = "__new__";
const selectClass = "w-full border border-line rounded-sm px-2.5 py-1.5 text-sm bg-surface";

/** Pracovné okno na anotovanie priestorov jedného podlažia (pôdorys + priestory + dvere + body záujmu). */
export function FloorWorkspace({ floor, building, entrances, onUpdate, history }: Props) {
  const [pravidla] = useLocalStorage("path-finder/pravidla", createEmptyPravidla());
  const dvere = floor.dvere ?? [];
  const poi = floor.poi ?? [];
  const groups = verticalGroups(building);

  const setPriestory = (map: (p: Podlazie["priestory"]) => Podlazie["priestory"]) =>
    onUpdate((f) => ({ ...f, priestory: map(f.priestory) }));
  const setDvere = (map: (d: LineShape[]) => LineShape[]) => onUpdate((f) => ({ ...f, dvere: map(f.dvere ?? []) }));

  const updateMeta = (id: string, patch: Partial<ItemMeta>) =>
    setPriestory((ps) => ps.map((p) => (p.id === id ? { ...p, meta: { ...p.meta, ...patch } } : p)));

  function setVertical(item: Priestor, skupina: string, typ: VerticalKind) {
    if (skupina === "") {
      setPriestory((ps) =>
        ps.map((p) => {
          if (p.id !== item.id) return p;
          const meta = { ...p.meta };
          delete meta.vertikala;
          return { ...p, meta };
        })
      );
      return;
    }
    updateMeta(item.id, { vertikala: { skupina: skupina === NEW_GROUP ? createId("vert") : skupina, typ } });
  }

  function renderItemExtra(item: Priestor) {
    const vertical = item.meta?.vertikala;
    // Spojenia, do ktorých sa dá priestor zaradiť: ešte bez člena na tomto podlaží (okrem toho, v ktorom už je).
    const options = groups.filter(
      (g) => g.skupina === vertical?.skupina || !g.members.some((m) => m.floorId === floor.id)
    );
    return (
      <>
        <div>
          <label className="text-xs text-ink-soft">Zóna</label>
          <select
            value={item.meta?.zona ?? ""}
            onChange={(e) => updateMeta(item.id, { zona: e.target.value || null })}
            className={selectClass}
          >
            <option value="">— bez zóny —</option>
            {pravidla.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name ?? z.id}
              </option>
            ))}
          </select>
          {pravidla.zones.length === 0 && (
            <p className="mt-1 text-xs text-ink-soft">Zóny definujete na stránke Pravidlá a profily.</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={item.meta?.bezbarierovy !== false}
            onChange={(e) => updateMeta(item.id, { bezbarierovy: e.target.checked })}
          />
          Bezbariérový priestor
        </label>

        {item.kind === "vertikála" && (
          <div className="rounded-sm bg-paper p-2.5 space-y-2">
            <div>
              <label className="text-xs text-ink-soft">Druh</label>
              <select
                value={vertical?.typ ?? "stairs"}
                onChange={(e) => setVertical(item, vertical?.skupina ?? NEW_GROUP, e.target.value as VerticalKind)}
                className={selectClass}
              >
                {(Object.keys(VERTICAL_LABEL) as VerticalKind[]).map((k) => (
                  <option key={k} value={k}>
                    {VERTICAL_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-soft">Spojenie s ďalšími podlažiami</label>
              <select
                value={vertical?.skupina ?? ""}
                onChange={(e) => setVertical(item, e.target.value, vertical?.typ ?? "stairs")}
                className={selectClass}
              >
                <option value="">— nespojené —</option>
                <option value={NEW_GROUP}>Nové spojenie</option>
                {options.map((g) => (
                  <option key={g.skupina} value={g.skupina}>
                    {describeGroup(g)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-soft">
                Rovnaké spojenie vyberte pri schodisku alebo výťahu na každom podlaží, ktoré spája.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <AnnotationWorkspace<IndoorKind>
      title={floor.nazov}
      subtitle={`Pôdorys podlažia budovy „${building.nazov}“.`}
      imageUrl={floor.podkladObrazokUrl}
      svgContent={floor.svgContent}
      imageAlt={`Pôdorys — ${floor.nazov}`}
      onImportImage={(dataUrl) => onUpdate((f) => ({ ...f, podkladObrazokUrl: dataUrl }))}
      onImportSvg={(text) => onUpdate((f) => ({ ...f, svgContent: text }))}
      items={floor.priestory}
      kinds={INDOOR_KINDS}
      kindMeta={INDOOR_KIND_META}
      itemNoun="priestor"
      itemsHeading="Priestory na podlaží"
      emptyListHint="Zatiaľ nič. V docku vyberte typ priestoru a kliknite na pôdorys."
      emptyCanvasTitle="Zatiaľ bez pôdorysu"
      emptyCanvasSubtitle="Importujte SVG alebo obrázok pôdorysu tohto podlažia."
      history={history}
      renderItemExtra={renderItemExtra}
      onCreateItem={(kind, point) =>
        onUpdate((f) => {
          const meta = INDOOR_KIND_META[kind];
          const count = f.priestory.filter((p) => p.kind === kind).length;
          const priestor = createPriestor(point, `${meta.label} ${count + 1}`, kind, meta.defaultSize);
          return { ...f, priestory: [...f.priestory, priestor] };
        })
      }
      onAddPart={(itemId, point) =>
        setPriestory((ps) => ps.map((p) => (p.id === itemId ? { ...p, footprint: [...p.footprint, createRect(point)] } : p)))
      }
      onRectChange={(itemId, rectId, next: RectShape) =>
        setPriestory((ps) =>
          ps.map((p) => (p.id !== itemId ? p : { ...p, footprint: p.footprint.map((r) => (r.id === rectId ? next : r)) }))
        )
      }
      onRename={(id, nazov) => setPriestory((ps) => ps.map((p) => (p.id === id ? { ...p, nazov } : p)))}
      onColorChange={(id, color) => setPriestory((ps) => ps.map((p) => (p.id === id ? { ...p, customColor: color } : p)))}
      onToggleVisible={(id) => setPriestory((ps) => ps.map((p) => (p.id === id ? { ...p, visible: p.visible === false } : p)))}
      onDeletePart={(itemId, rectId) =>
        setPriestory((ps) =>
          ps
            .map((p) => (p.id !== itemId ? p : { ...p, footprint: p.footprint.filter((r) => r.id !== rectId) }))
            .filter((p) => p.footprint.length > 0)
        )
      }
      onDeleteItem={(id) => setPriestory((ps) => ps.filter((p) => p.id !== id))}
      lines={{
        label: "Dvere",
        addLabel: "Pridať dvere",
        hint: "Kliknite na dva body na hrane medzi dvoma priestormi, kde sú dvere. Konce sa prichytávajú k hrane.",
        color: "#f07e3b",
        icon: <DoorClosed size={18} />,
        dockBgClass: "bg-flag",
        dotClass: "bg-flag",
        items: dvere,
        emptyHint: "Zatiaľ žiadne. Bez dverí sú priestory neprepojené.",
        onCreate: (a, b) => {
          const line = createLine(a, b, `Dvere ${dvere.length + 1}`);
          setDvere((d) => [...d, line]);
          return line.id;
        },
        onChange: (id, patch) => setDvere((d) => d.map((l) => (l.id === id ? { ...l, ...patch } : l))),
        onDelete: (id) => setDvere((d) => d.filter((l) => l.id !== id)),
        renderExtra: (line) =>
          entrances.length === 0 ? null : (
            <>
              <label className="text-xs text-ink-soft">Vstup z exteriéru</label>
              <select
                value={line.ref ?? ""}
                onChange={(e) => setDvere((d) => d.map((l) => (l.id === line.id ? { ...l, ref: e.target.value || null } : l)))}
                className={selectClass}
              >
                <option value="">— vnútorné dvere —</option>
                {entrances.map((en) => (
                  <option key={en.id} value={en.id}>
                    {en.nazov}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-soft">Dvere na prízemí, ktoré vedú von, priraďte k vstupu z outdoor mapy.</p>
            </>
          ),
      }}
      points={{
        label: "Body záujmu",
        addLabel: "Pridať bod záujmu",
        hint: "Kliknite na miesto v priestore, ktoré má byť cieľom navigácie (napr. recepcia, zasadačka).",
        color: "#0d9488",
        icon: <MapPin size={18} />,
        dockBgClass: "bg-teal-600",
        dotClass: "bg-teal-600",
        items: poi,
        categories: POI_CATEGORIES,
        onCreate: (point) => {
          const item = createPoi(point, `Bod záujmu ${poi.length + 1}`);
          onUpdate((f) => ({ ...f, poi: [...(f.poi ?? []), item] }));
          return item.id;
        },
        onChange: (id, patch) => onUpdate((f) => ({ ...f, poi: (f.poi ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
        onDelete: (id) => onUpdate((f) => ({ ...f, poi: (f.poi ?? []).filter((p) => p.id !== id) })),
      }}
      calibration={{
        value: floor.mierka ?? null,
        onChange: (mierka) => onUpdate((f) => ({ ...f, mierka })),
        hint: "napr. šírka chodby alebo dĺžka miestnosti zo skutočného plánu",
      }}
    />
  );
}
