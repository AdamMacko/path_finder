"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Building2, ChevronRight, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { KIND_META } from "../lib/annotationKinds";
import type { Budova } from "../lib/model";

type Props = {
  buildings: Budova[];
  selectedBuildingId: string | null;
  selectedFloorId: string | null;
  onSelectBuilding: (id: string | null) => void;
  onSelectFloor: (id: string) => void;
  /** Bez názvu sa použije predvolený („Podlažie N“). */
  onAddFloor: (nazov?: string) => void;
  onRenameFloor: (id: string, nazov: string) => void;
  onChangeOrder: (id: string, poradie: number) => void;
  onDeleteFloor: (id: string) => void;
  onLoadSeed: () => void;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

const plural = (n: number, one: string, few: string, many: string) => `${n} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;

// Zoznam budov sa pri výbere budovy posunie doľava a nahradí ho zoznam podlaží (a naopak).
const SLIDE = {
  initial: (dir: number) => ({ opacity: 0, x: 28 * dir }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: -28 * dir }),
};
const SLIDE_TRANSITION = { duration: 0.18, ease: "easeOut" } as const;

/** Pravý panel: zoznam budov, po kliknutí na budovu sa plynulo prepne na jej podlažia. */
export function BuildingsPanel({
  buildings,
  selectedBuildingId,
  selectedFloorId,
  onSelectBuilding,
  onSelectFloor,
  onAddFloor,
  onRenameFloor,
  onChangeOrder,
  onDeleteFloor,
  onLoadSeed,
}: Props) {
  const building = buildings.find((b) => b.id === selectedBuildingId) ?? null;
  const dir = building ? 1 : -1;

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-line bg-surface">
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        {building ? (
          <motion.section
            key={`floors-${building.id}`}
            custom={dir}
            variants={SLIDE}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={SLIDE_TRANSITION}
            className="flex min-h-0 flex-1 flex-col"
          >
            <FloorsView
              building={building}
              selectedFloorId={selectedFloorId}
              onBack={() => onSelectBuilding(null)}
              onSelectFloor={onSelectFloor}
              onAddFloor={onAddFloor}
              onRenameFloor={onRenameFloor}
              onChangeOrder={onChangeOrder}
              onDeleteFloor={onDeleteFloor}
            />
          </motion.section>
        ) : (
          <motion.section
            key="buildings"
            custom={dir}
            variants={SLIDE}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={SLIDE_TRANSITION}
            className="flex min-h-0 flex-1 flex-col"
          >
            <BuildingsView buildings={buildings} onSelect={onSelectBuilding} onLoadSeed={onLoadSeed} />
          </motion.section>
        )}
      </AnimatePresence>
    </aside>
  );
}

function BuildingsView({
  buildings,
  onSelect,
  onLoadSeed,
}: {
  buildings: Budova[];
  onSelect: (id: string) => void;
  onLoadSeed: () => void;
}) {
  return (
    <>
      <header className="border-b border-line px-4 py-4">
        <h2 className="text-sm font-semibold text-ink">Budovy</h2>
        <p className="mt-0.5 text-xs text-ink-soft">Vyberte budovu a pracujte s jej podlažiami.</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {buildings.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Building2 size={26} className="mx-auto mb-3 text-ink-soft" />
            <p className="text-sm font-medium text-ink">Zatiaľ žiadne budovy</p>
            <p className="mx-auto mt-1 max-w-[16rem] text-xs text-ink-soft">
              Označte budovy na outdoor mape areálu, odtiaľ sa tu objavia.
            </p>
            <Link
              href="/building_complex"
              className="mt-4 inline-flex rounded-sm bg-route px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-route/90"
            >
              Prejsť na outdoor mapu
            </Link>
          </div>
        ) : (
          <ul className="space-y-1">
            {buildings.map((b) => {
              const color = b.customColor ?? KIND_META[b.kind].hex;
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(b.id)}
                    className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-route-soft/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm" style={{ backgroundColor: color }}>
                      <Building2 size={16} className="text-white" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{b.nazov}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft">
                        <Layers size={12} />
                        {b.podlazia.length === 0 ? "Zatiaľ bez podlaží" : plural(b.podlazia.length, "podlažie", "podlažia", "podlaží")}
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-ink-soft transition-colors group-hover:text-route" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="border-t border-line p-3">
        <button
          type="button"
          onClick={onLoadSeed}
          className="w-full rounded-sm border border-line px-3 py-2 text-xs text-ink-soft transition-colors hover:border-route hover:text-route"
        >
          Načítať ukážkové dáta
        </button>
      </footer>
    </>
  );
}

function FloorsView({
  building,
  selectedFloorId,
  onBack,
  onSelectFloor,
  onAddFloor,
  onRenameFloor,
  onChangeOrder,
  onDeleteFloor,
}: {
  building: Budova;
  selectedFloorId: string | null;
  onBack: () => void;
  onSelectFloor: (id: string) => void;
  onAddFloor: (nazov?: string) => void;
  onRenameFloor: (id: string, nazov: string) => void;
  onChangeOrder: (id: string, poradie: number) => void;
  onDeleteFloor: (id: string) => void;
}) {
  const floors = [...building.podlazia].sort((a, b) => a.poradie - b.poradie);
  const duplicateOrders = new Set(floors.filter((f, i) => floors.some((g, j) => j !== i && g.poradie === f.poradie)).map((f) => f.poradie));
  const [newName, setNewName] = React.useState("");
  /** Podlažie, ktorého názov sa práve upravuje. */
  const [editing, setEditing] = React.useState<string | null>(null);

  // Enter pridá podlažie a nechá kurzor v poli, takže sa dá rýchlo naklikať a pomenovať ich viac za sebou.
  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    onAddFloor(newName.trim() || undefined);
    setNewName("");
  }

  function confirmDelete(id: string, nazov: string, rooms: number) {
    if (rooms === 0 || window.confirm(`Odstrániť podlažie „${nazov}“ aj s ${plural(rooms, "priestorom", "priestormi", "priestormi")}?`)) {
      onDeleteFloor(id);
    }
  }

  return (
    <>
      <header className="border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="mb-2 flex items-center gap-1.5 text-xs text-ink-soft transition-colors hover:text-route"
        >
          <ArrowLeft size={13} />
          Budovy
        </button>
        <h2 className="truncate text-sm font-semibold text-ink">{building.nazov}</h2>
        <p className="mt-0.5 text-xs text-ink-soft">
          {floors.length === 0 ? "Zatiaľ bez podlaží" : plural(floors.length, "podlažie", "podlažia", "podlaží")}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {floors.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Layers size={26} className="mx-auto mb-3 text-ink-soft" />
            <p className="text-sm font-medium text-ink">Zatiaľ žiadne podlažia</p>
            <p className="mt-1 text-xs text-ink-soft">Pridajte prvé podlažie a nahrajte jeho pôdorys.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {floors.map((f) => {
              const active = f.id === selectedFloorId;
              return (
                <li
                  key={f.id}
                  // Celý riadok prepína podlažie; ovládacie prvky v ňom klik nezachytávajú (stopPropagation).
                  onClick={() => onSelectFloor(f.id)}
                  className={cx(
                    "group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition-colors",
                    active ? "border-route/40 bg-route-soft" : "border-transparent hover:bg-paper"
                  )}
                >
                  <input
                    type="number"
                    step={1}
                    value={f.poradie}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      if (Number.isFinite(n)) onChangeOrder(f.id, n);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() => onSelectFloor(f.id)}
                    aria-label={`Poradie podlažia ${f.nazov} (0 prízemie, záporné suterén)`}
                    title={
                      duplicateOrders.has(f.poradie)
                        ? "Poradie sa opakuje – podlažia musia mať rôzne poradie."
                        : "Poradie: 0 prízemie, 1 prvé poschodie, záporné číslo suterén."
                    }
                    className={cx(
                      "h-7 w-11 shrink-0 rounded-sm border text-center font-mono text-xs focus:outline-none focus:ring-2 focus:ring-route/30",
                      duplicateOrders.has(f.poradie)
                        ? "border-flag bg-flag-soft text-ink"
                        : active
                        ? "border-route bg-route text-white"
                        : "border-transparent bg-paper text-ink-soft"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    {editing === f.id ? (
                      // Názov je bežný text; upravuje sa až po kliknutí na ceruzku alebo dvojkliku.
                      <input
                        autoFocus
                        value={f.nazov}
                        onChange={(e) => onRenameFloor(f.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => setEditing(null)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape") && setEditing(null)}
                        aria-label="Názov podlažia"
                        className="w-full rounded-sm border border-route bg-white px-1.5 py-0.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-route/30"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectFloor(f.id)}
                        onDoubleClick={() => setEditing(f.id)}
                        title="Kliknutím otvoríte podlažie, dvojklikom ho premenujete"
                        className="block w-full select-none truncate text-left text-sm text-ink"
                      >
                        {f.nazov || "Bez názvu"}
                      </button>
                    )}
                    <span className="block truncate text-xs text-ink-soft">
                      {f.priestory.length === 0
                        ? f.podkladObrazokUrl || f.svgContent
                          ? "Pôdorys bez priestorov"
                          : "Bez pôdorysu"
                        : plural(f.priestory.length, "priestor", "priestory", "priestorov")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(f.id);
                    }}
                    aria-label="Premenovať podlažie"
                    title="Premenovať"
                    className="shrink-0 p-1.5 text-ink-soft opacity-0 transition hover:text-route focus:opacity-100 group-hover:opacity-100"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(f.id, f.nazov, f.priestory.length);
                    }}
                    aria-label="Odstrániť podlažie"
                    className="shrink-0 p-1.5 text-ink-soft opacity-0 transition hover:text-alarm focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="border-t border-line p-3">
        <form onSubmit={submitNew} className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Názov nového podlažia"
            aria-label="Názov nového podlažia"
            className="min-w-0 flex-1 rounded-sm border border-line bg-paper px-2.5 py-2 text-sm focus:border-route focus:outline-none focus:ring-2 focus:ring-route/30"
          />
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1.5 rounded-sm bg-route px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-route/90"
          >
            <Plus size={15} />
            Pridať
          </button>
        </form>
        <p className="mt-2 text-xs text-ink-soft">Enter pridá podlažie. Bez názvu sa pomenuje „Podlažie N“.</p>
      </footer>
    </>
  );
}
