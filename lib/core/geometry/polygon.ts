import type { Polygon, Segment, Vec2 } from "./types";
import { distancePointSegment, lerp, segmentsCrossProperly } from "./vec";

/** Hrany jedného kruhu (obrysu alebo diery) vrátane uzatváracej hrany. */
export function ringEdges(ring: Vec2[]): Segment[] {
  return ring.map((p, i) => [p, ring[(i + 1) % ring.length]] as Segment);
}

/** Všetky hrany polygónu (obrys aj diery). */
export function polygonEdges(poly: Polygon): Segment[] {
  return [poly.outer, ...(poly.holes ?? [])].flatMap(ringEdges);
}

/** Orientovaná plocha kruhu (shoelace). Znamienko závisí od smeru obehu. */
export function signedRingArea(ring: Vec2[]): number {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

/** Plocha polygónu bez dier. */
export function polygonArea(poly: Polygon): number {
  const holes = (poly.holes ?? []).reduce((s, h) => s + Math.abs(signedRingArea(h)), 0);
  return Math.abs(signedRingArea(poly.outer)) - holes;
}

/** Ťažisko obrysu (diery sa ignorujú). Pri nekonvexnom polygóne nemusí ležať vnútri – pozri `representativePoint`. */
export function ringCentroid(ring: Vec2[]): Vec2 {
  const a = signedRingArea(ring);
  if (a === 0) {
    const n = ring.length;
    return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n];
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    const f = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  return [cx / (6 * a), cy / (6 * a)];
}

function pointInRing(p: Vec2, ring: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Či bod leží vnútri polygónu (v obryse a mimo dier). Body presne na hranici môžu vyjsť oboma spôsobmi. */
export function pointInPolygon(p: Vec2, poly: Polygon): boolean {
  return pointInRing(p, poly.outer) && !(poly.holes ?? []).some((h) => pointInRing(p, h));
}

/** Vzdialenosť bodu od hranice polygónu (obrysu alebo ktorejkoľvek diery). */
export function distanceToBoundary(p: Vec2, poly: Polygon): number {
  return Math.min(...polygonEdges(poly).map((e) => distancePointSegment(p, e)));
}

/**
 * Či úsečka leží (s toleranciou) na hranici polygónu. Testuje sa niekoľko bodov pozdĺž úsečky,
 * takže prechod, ktorý hranicu iba pretína alebo sa jej dotýka jedným koncom, neprejde.
 * Tolerancia pokrýva hrúbku steny: pôdorysy kreslia miestnosti po vnútorných líciach stien.
 */
export function segmentOnBoundary(seg: Segment, poly: Polygon, tolerance: number): boolean {
  const samples = [0, 0.25, 0.5, 0.75, 1].map((t) => lerp(seg[0], seg[1], t));
  return samples.every((p) => distanceToBoundary(p, poly) <= tolerance);
}

/** Či je polygón jednoduchý: aspoň 3 body, nenulová plocha a žiadne vlastné pretínanie hrán. */
export function polygonProblems(poly: Polygon): string[] {
  const problems: string[] = [];
  for (const ring of [poly.outer, ...(poly.holes ?? [])]) {
    if (ring.length < 3) problems.push("kruh má menej ako 3 body");
    else if (signedRingArea(ring) === 0) problems.push("kruh má nulovú plochu");
  }
  if (problems.length) return problems;
  const edges = polygonEdges(poly);
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      if (segmentsCrossProperly(edges[i], edges[j])) {
        problems.push("hrany polygónu sa pretínajú");
        return problems;
      }
    }
  }
  return problems;
}

/**
 * Bod, ktorý určite leží vnútri polygónu. Použije sa ťažisko, ak je vnútri. Inak sa zvolí stred
 * najdlhšieho vnútorného úseku vodorovnej priamky cez ťažisko. Slúži ako poloha POI bez explicitného bodu.
 */
export function representativePoint(poly: Polygon): Vec2 {
  const c = ringCentroid(poly.outer);
  if (pointInPolygon(c, poly)) return c;
  const y = c[1];
  const xs: number[] = [];
  for (const [[x1, y1], [x2, y2]] of polygonEdges(poly)) {
    if (y1 > y !== y2 > y) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
  }
  xs.sort((a, b) => a - b);
  let best: Vec2 = poly.outer[0];
  let bestLen = -1;
  for (let i = 0; i + 1 < xs.length; i += 2) {
    if (xs[i + 1] - xs[i] > bestLen) {
      bestLen = xs[i + 1] - xs[i];
      best = [(xs[i] + xs[i + 1]) / 2, y];
    }
  }
  return best;
}
