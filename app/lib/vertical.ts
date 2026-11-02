import type { Budova, VerticalKind } from "./model";

export type VerticalMember = { floorId: string; floorName: string; floorOrder: number; itemId: string; itemName: string };

export type VerticalGroup = {
  skupina: string;
  typ: VerticalKind;
  members: VerticalMember[];
};

export const VERTICAL_LABEL: Record<VerticalKind, string> = {
  stairs: "Schody",
  elevator: "Výťah",
  ramp: "Rampa",
  escalator: "Eskalátor",
};

/** Vertikálne spojenia budovy: priestory (schodiská, výťahy) zo všetkých podlaží zoskupené podľa spoločného `skupina`. */
export function verticalGroups(building: Budova): VerticalGroup[] {
  const groups = new Map<string, VerticalGroup>();
  for (const floor of building.podlazia) {
    for (const item of floor.priestory) {
      const v = item.meta?.vertikala;
      if (!v) continue;
      const g = groups.get(v.skupina) ?? { skupina: v.skupina, typ: v.typ, members: [] };
      g.members.push({ floorId: floor.id, floorName: floor.nazov, floorOrder: floor.poradie, itemId: item.id, itemName: item.nazov });
      groups.set(v.skupina, g);
    }
  }
  for (const g of groups.values()) g.members.sort((a, b) => a.floorOrder - b.floorOrder);
  return [...groups.values()];
}

/** Popis spojenia do výberu, napr. „Schody: Prízemie, 1. poschodie“. */
export const describeGroup = (g: VerticalGroup) => `${VERTICAL_LABEL[g.typ]}: ${g.members.map((m) => m.floorName).join(", ")}`;

/** Spojenie, ktoré spája iba jedno podlažie (alebo má dva priestory na tom istom podlaží), nikam nevedie. */
export function incompleteGroups(building: Budova): VerticalGroup[] {
  return verticalGroups(building).filter((g) => new Set(g.members.map((m) => m.floorId)).size < 2);
}
