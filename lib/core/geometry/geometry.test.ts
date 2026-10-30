import { describe, expect, it } from "vitest";
import {
  distanceToBoundary,
  pointInPolygon,
  polygonArea,
  polygonProblems,
  representativePoint,
  segmentOnBoundary,
} from "./polygon";
import { applyTransform, invertTransform, transformFromControlPoints, type Transform } from "./transform";
import type { Polygon, Vec2 } from "./types";
import { distancePointSegment } from "./vec";

const square: Polygon = { outer: [[0, 0], [10, 0], [10, 10], [0, 10]] };
const withHole: Polygon = { ...square, holes: [[[4, 4], [6, 4], [6, 6], [4, 6]]] };
// Tvar U: ťažisko leží v „zálive“, mimo polygónu.
const uShape: Polygon = { outer: [[0, 0], [10, 0], [10, 10], [7, 10], [7, 3], [3, 3], [3, 10], [0, 10]] };

const close = (a: Vec2, b: Vec2) => {
  expect(a[0]).toBeCloseTo(b[0], 9);
  expect(a[1]).toBeCloseTo(b[1], 9);
};

describe("polygón", () => {
  it("počíta plochu bez dier", () => {
    expect(polygonArea(square)).toBe(100);
    expect(polygonArea(withHole)).toBe(96);
  });

  it("rozlišuje body v polygóne a v diere", () => {
    expect(pointInPolygon([2, 2], withHole)).toBe(true);
    expect(pointInPolygon([5, 5], withHole)).toBe(false);
    expect(pointInPolygon([11, 5], withHole)).toBe(false);
  });

  it("meria vzdialenosť od hranice vrátane diery", () => {
    expect(distanceToBoundary([5, 1], square)).toBe(1);
    expect(distanceToBoundary([5, 3], withHole)).toBe(1);
    expect(distancePointSegment([5, 5], [[0, 0], [0, 0]])).toBeCloseTo(Math.SQRT2 * 5);
  });

  it("úsečka na hranici áno, priečna úsečka nie", () => {
    expect(segmentOnBoundary([[2, 0], [4, 0]], square, 0)).toBe(true);
    expect(segmentOnBoundary([[2, 0.2], [4, 0.2]], square, 0.3)).toBe(true); // hrúbka steny
    expect(segmentOnBoundary([[2, 0.2], [4, 0.2]], square, 0.1)).toBe(false);
    expect(segmentOnBoundary([[5, -1], [5, 1]], square, 0.3)).toBe(false); // pretína hranicu
  });

  it("odhalí neplatné polygóny", () => {
    expect(polygonProblems(square)).toEqual([]);
    expect(polygonProblems({ outer: [[0, 0], [1, 1]] })).toHaveLength(1);
    expect(polygonProblems({ outer: [[0, 0], [10, 10], [10, 0], [0, 6]] })).toEqual(["hrany polygónu sa pretínajú"]);
  });

  it("reprezentatívny bod leží vnútri aj pri nekonvexnom tvare", () => {
    expect(representativePoint(square)).toEqual([5, 5]);
    expect(pointInPolygon(representativePoint(uShape), uShape)).toBe(true);
  });
});

describe("transformácia", () => {
  const t: Transform = { scale: 0.05, rotation: 12.5, offset: [310, 145] };

  it("inverzia vráti pôvodný bod", () => {
    const p: Vec2 = [123, -45];
    close(applyTransform(invertTransform(t), applyTransform(t, p)), p);
  });

  it("rotácia 90° pri osi y nadol otáča v smere hodinových ručičiek", () => {
    close(applyTransform({ scale: 1, rotation: 90, offset: [0, 0] }, [1, 0]), [0, 1]);
  });

  it("dva kontrolné body určia transformáciu", () => {
    const a: Vec2 = [100, 200];
    const b: Vec2 = [900, 350];
    const r = transformFromControlPoints(a, b, applyTransform(t, a), applyTransform(t, b));
    expect(r.scale).toBeCloseTo(t.scale, 12);
    expect(r.rotation).toBeCloseTo(t.rotation, 9);
    close(r.offset, t.offset);
  });

  it("totožné kontrolné body sú chyba", () => {
    expect(() => transformFromControlPoints([1, 1], [1, 1], [0, 0], [1, 0])).toThrow();
  });
});
