import type { Polygon, Segment, Vec2 } from "./types";
import { distance, sub } from "./vec";

/**
 * Podobnostná transformácia zo súradníc SVG podlažia do lokálneho metrického systému areálu (R5):
 * `local = R(rotation) · (scale · svg) + offset`.
 * Rotácia je v stupňoch. Keďže os y smeruje nadol, kladný uhol otáča v smere hodinových ručičiek.
 */
export interface Transform {
  scale: number;
  rotation: number;
  offset: Vec2;
}

export const IDENTITY: Transform = { scale: 1, rotation: 0, offset: [0, 0] };

const DEG = Math.PI / 180;

export function applyTransform(t: Transform, [x, y]: Vec2): Vec2 {
  const c = Math.cos(t.rotation * DEG);
  const s = Math.sin(t.rotation * DEG);
  return [t.scale * (c * x - s * y) + t.offset[0], t.scale * (s * x + c * y) + t.offset[1]];
}

export function invertTransform(t: Transform): Transform {
  const inv: Transform = { scale: 1 / t.scale, rotation: -t.rotation, offset: [0, 0] };
  const o = applyTransform(inv, t.offset);
  return { ...inv, offset: [-o[0], -o[1]] };
}

export const transformSegment = (t: Transform, [a, b]: Segment): Segment => [applyTransform(t, a), applyTransform(t, b)];

export const transformPolygon = (t: Transform, poly: Polygon): Polygon => ({
  outer: poly.outer.map((p) => applyTransform(t, p)),
  ...(poly.holes ? { holes: poly.holes.map((h) => h.map((p) => applyTransform(t, p))) } : {}),
});

/**
 * Určí transformáciu z dvoch kontrolných bodov. Každý bod je známy v SVG podlažia aj v lokálnom systéme
 * areálu, napr. dva rohy budovy odčítané z ortofotomapy.
 */
export function transformFromControlPoints(svgA: Vec2, svgB: Vec2, localA: Vec2, localB: Vec2): Transform {
  const ds = distance(svgA, svgB);
  if (ds === 0) throw new Error("Kontrolné body v SVG sú totožné.");
  const vs = sub(svgB, svgA);
  const vl = sub(localB, localA);
  const scale = distance(localA, localB) / ds;
  const rotation = (Math.atan2(vl[1], vl[0]) - Math.atan2(vs[1], vs[0])) / DEG;
  const rotated = applyTransform({ scale, rotation, offset: [0, 0] }, svgA);
  return { scale, rotation, offset: [localA[0] - rotated[0], localA[1] - rotated[1]] };
}
