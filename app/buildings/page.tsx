"use client";

import * as React from "react";
import { Layers } from "lucide-react";
import { BuildingsPanel } from "../components/buildingsPanel";
import { FloorWorkspace } from "../components/floorWorkspace";
import { useLocalStorage } from "../lib/useLocalStorage";
import { createEmptyAreal, createPodlazie, type Podlazie } from "../lib/model";
import { createSeedAreal } from "../lib/seedData";
import { createEmptyPravidla, createSeedPravidla } from "../lib/rules";

const byOrder = (a: Podlazie, b: Podlazie) => a.poradie - b.poradie;

export default function BuildingsPage() {
  const [areal, setAreal, hydrated, history] = useLocalStorage("path-finder/areal", createEmptyAreal());
  const [, setPravidla] = useLocalStorage("path-finder/pravidla", createEmptyPravidla());
  const [buildingId, setBuildingId] = React.useState<string | null>(null);
  const [floorId, setFloorId] = React.useState<string | null>(null);

  const buildings = areal.budovy.filter((b) => b.kind === "budova");
  // Výber, ktorý v dátach už nie je (napr. po načítaní ukážkových dát), sa ignoruje.
  const building = buildings.find((b) => b.id === buildingId) ?? null;
  const floor = building?.podlazia.find((f) => f.id === floorId) ?? null;

  function selectBuilding(id: string | null) {
    setBuildingId(id);
    // Pracovné okno nech nie je prázdne: otvorí sa najnižšie podlažie vybranej budovy.
    const first = id ? [...(buildings.find((b) => b.id === id)?.podlazia ?? [])].sort(byOrder)[0] : undefined;
    setFloorId(first?.id ?? null);
  }

  function updateFloor(id: string, updater: (f: Podlazie) => Podlazie) {
    if (!building) return;
    setAreal((a) => ({
      ...a,
      budovy: a.budovy.map((b) =>
        b.id !== building.id ? b : { ...b, podlazia: b.podlazia.map((f) => (f.id === id ? updater(f) : f)) }
      ),
    }));
  }

  function addFloor(nazov?: string) {
    if (!building) return;
    // 0 = prízemie, 1 = prvé poschodie, záporné = suterén (rovnako ako `ordinal` v dátovom modeli).
    const poradie = building.podlazia.length === 0 ? 0 : Math.max(...building.podlazia.map((f) => f.poradie)) + 1;
    const defaultName = poradie === 0 ? "Prízemie" : poradie < 0 ? `Suterén ${-poradie}` : `${poradie}. poschodie`;
    const created = createPodlazie(nazov ?? defaultName, poradie);
    setAreal((a) => ({
      ...a,
      budovy: a.budovy.map((b) => (b.id === building.id ? { ...b, podlazia: [...b.podlazia, created] } : b)),
    }));
    setFloorId(created.id);
  }

  function deleteFloor(id: string) {
    if (!building) return;
    setAreal((a) => ({
      ...a,
      budovy: a.budovy.map((b) => (b.id === building.id ? { ...b, podlazia: b.podlazia.filter((f) => f.id !== id) } : b)),
    }));
    if (floorId === id) setFloorId(null);
  }

  function loadSeed() {
    setAreal(createSeedAreal());
    // Ukážkové priestory odkazujú na zónu „výroba“, preto sa načítajú aj ukážkové pravidlá.
    setPravidla(createSeedPravidla());
    setBuildingId(null);
    setFloorId(null);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      <div className="min-w-0 flex-1">
        {!hydrated ? null : building && floor ? (
          // `key` zaručí, že sa pri zmene podlažia vynuluje výber, priblíženie aj nástroj.
          <FloorWorkspace
            key={floor.id}
            floor={floor}
            building={building}
            entrances={(areal.vstupy ?? []).filter((v) => v.ref === building.id)}
            onUpdate={(updater) => updateFloor(floor.id, updater)}
            history={history}
          />
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center px-6 py-16">
            <div className="max-w-sm text-center">
              <Layers size={30} className="mx-auto mb-3 text-ink-soft" />
              <p className="text-sm font-medium text-ink">
                {building ? "Vyberte podlažie" : "Vyberte budovu"}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {building
                  ? "V paneli vpravo vyberte podlažie alebo pridajte nové, a pracovné okno sa otvorí tu."
                  : "V paneli vpravo vyberte budovu a potom jej podlažie. Pracovné okno s pôdorysom sa otvorí tu."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="h-[55dvh] shrink-0 border-t border-line lg:sticky lg:top-0 lg:h-[100dvh] lg:w-[320px] lg:border-l lg:border-t-0">
        <BuildingsPanel
          buildings={buildings}
          selectedBuildingId={building?.id ?? null}
          selectedFloorId={floor?.id ?? null}
          onSelectBuilding={selectBuilding}
          onSelectFloor={setFloorId}
          onAddFloor={addFloor}
          onRenameFloor={(id, nazov) => updateFloor(id, (f) => ({ ...f, nazov }))}
          onChangeOrder={(id, poradie) => updateFloor(id, (f) => ({ ...f, poradie }))}
          onDeleteFloor={deleteFloor}
          onLoadSeed={loadSeed}
        />
      </div>
    </div>
  );
}
