import type { Point } from "./model";

/** Najbližší bod úsečky `a`–`b` k bodu `p`. */
export function closestOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/**
 * Prichytí bod na najbližšiu hranu niektorého z polygónov, ak je bližšie než `radius`.
 * Vstupy a dvere ležia na hranici priestoru, takže sa pri kreslení prichytávajú k obrysom.
 */
export function snapToPolygonEdges(p: Point, polygons: Point[][], radius: number): Point {
  let best: Point = p;
  let bestDist = radius;
  for (const poly of polygons) {
    for (let i = 0; i < poly.length; i++) {
      const c = closestOnSegment(p, poly[i], poly[(i + 1) % poly.length]);
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d <= bestDist) {
        bestDist = d;
        best = c;
      }
    }
  }
  return best;
}

/** Index polygónu, ktorého hrana je najbližšie k bodu (do vzdialenosti `radius`), alebo -1. */
export function nearestPolygonIndex(p: Point, polygons: Point[][], radius: number): number {
  let best = -1;
  let bestDist = radius;
  polygons.forEach((poly, idx) => {
    for (let i = 0; i < poly.length; i++) {
      const c = closestOnSegment(p, poly[i], poly[(i + 1) % poly.length]);
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d <= bestDist) {
        bestDist = d;
        best = idx;
      }
    }
  });
  return best;
}
