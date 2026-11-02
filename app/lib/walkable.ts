import { rectToPolygon, type Areal, type Point } from "./model";

/**
 * Obrysy budov, ktoré sa odčítajú od pochôdznej plochy (diery). Parkoviská, vstupy a ostatné objekty
 * ostávajú pochôdzne. Budova z viacerých častí (napr. L) dá jednu dieru na každú časť.
 */
export function buildingHoles(areal: Areal): Point[][] {
  return areal.budovy.filter((b) => b.kind === "budova").flatMap((b) => b.footprint.map(rectToPolygon));
}

/** Zápis bodov do atribútu `points` prvku SVG. */
export const pointsAttr = (points: Point[]) => points.map((p) => `${p.x},${p.y}`).join(" ");
