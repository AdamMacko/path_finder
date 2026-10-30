import type { MapData, MapLevel, MapSpace, MapVertical } from "@/lib/api/types";
import type { Polygon } from "@/lib/core/geometry/types";

export const SPACE_FILL: Record<MapSpace["type"], string> = {
  room: "#ffffff",
  office: "#ffffff",
  corridor: "#f1f5f9",
  hall: "#f8fafc",
  lobby: "#e0f2fe",
  stairs: "#fde68a",
  elevator: "#c7d2fe",
  warehouse: "#f5f5f4",
  restroom: "#ecfeff",
  walkway: "#dfe6ed",
  road: "#cbd5e1",
  courtyard: "#ebe7df",
  parking: "#d9e1e8",
  other: "#f8fafc",
};

export const SPACE_TYPE_LABEL: Record<MapSpace["type"], string> = {
  room: "Miestnosť",
  office: "Kancelária",
  corridor: "Chodba",
  hall: "Hala",
  lobby: "Vstupná hala",
  stairs: "Schody",
  elevator: "Výťah",
  warehouse: "Sklad",
  restroom: "WC",
  walkway: "Chodník",
  road: "Cesta",
  courtyard: "Nádvorie",
  parking: "Parkovisko",
  other: "Priestor",
};

export const VERTICAL_TYPE_LABEL: Record<MapVertical["type"], string> = {
  stairs: "schody",
  elevator: "výťah",
  ramp: "rampa",
  escalator: "eskalátor",
};

const POI_CATEGORY_LABEL: Record<string, string> = {
  parking: "Parkovisko",
  reception: "Recepcia",
  canteen: "Jedáleň",
  meeting_room: "Zasadačka",
  server_room: "Serverovňa",
  workplace: "Pracovisko",
  warehouse: "Sklad",
};
export const poiCategoryLabel = (c: string) => POI_CATEGORY_LABEL[c] ?? c;

export const COLORS = {
  primary: "#0075be",
  primaryDark: "#003a70",
  wall: "#64748b",
  wallOutdoor: "#b6c2ce",
  restricted: "#d97706",
  start: "#16a34a",
  target: "#dc2626",
  poi: "#003a70",
  canvas: "#eef2f5",
};

export const ordinalLabel = (o: number) => (o === 0 ? "P" : String(o));
export const levelLabel = (l: MapLevel | undefined) => l?.name ?? l?.id ?? "";

/** Podlažia areálu (ordinal) zostupne, napr. [1, 0, -1]. */
export function ordinals(data: MapData): number[] {
  return [...new Set(data.levels.map((l) => l.ordinal))].sort((a, b) => b - a);
}

/**
 * Ktoré vrstvy sa kreslia pri zvolenom podlaží areálu:
 * - aktívne: exteriér (iba na prízemí) a podlažie každej budovy s týmto ordinalom,
 * - tlmené: exteriér mimo prízemia a pri budovách bez tohto podlažia ich najbližšie podlažie (obrys).
 */
export function visibleLevels(data: MapData, ordinal: number): { active: MapLevel[]; faded: MapLevel[] } {
  const active: MapLevel[] = [];
  const faded: MapLevel[] = [];
  for (const l of data.levels) if (l.building === undefined) (ordinal === 0 ? active : faded).push(l);
  for (const b of data.buildings) {
    const levels = data.levels.filter((l) => l.building === b.id);
    const exact = levels.find((l) => l.ordinal === ordinal);
    if (exact) active.push(exact);
    else if (levels.length) faded.push(levels.reduce((a, c) => (Math.abs(c.ordinal - ordinal) < Math.abs(a.ordinal - ordinal) ? c : a)));
  }
  return { active, faded };
}

export function polygonPath(poly: Polygon): string {
  return [poly.outer, ...(poly.holes ?? [])].map((ring) => `M${ring.map(([x, y]) => `${x} ${y}`).join("L")}Z`).join("");
}

export function polygonBox(poly: Polygon): { w: number; h: number } {
  const xs = poly.outer.map((p) => p[0]);
  const ys = poly.outer.map((p) => p[1]);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}
