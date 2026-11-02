import { describe, expect, it } from "vitest";
import { metersPerPixel, type Point } from "./model";
import { closestOnSegment, nearestPolygonIndex, snapToPolygonEdges } from "./snap";

const square: Point[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

describe("prichytávanie k hranám", () => {
  it("najbližší bod úsečky leží v jej rozsahu", () => {
    expect(closestOnSegment({ x: 50, y: 20 }, { x: 0, y: 0 }, { x: 100, y: 0 })).toEqual({ x: 50, y: 0 });
    expect(closestOnSegment({ x: -30, y: 5 }, { x: 0, y: 0 }, { x: 100, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("prichytí bod blízko hrany a vzdialený nechá na mieste", () => {
    expect(snapToPolygonEdges({ x: 50, y: 6 }, [square], 10)).toEqual({ x: 50, y: 0 });
    expect(snapToPolygonEdges({ x: 50, y: 50 }, [square], 10)).toEqual({ x: 50, y: 50 });
  });

  it("nájde najbližší polygón", () => {
    const other: Point[] = square.map((p) => ({ x: p.x + 300, y: p.y }));
    expect(nearestPolygonIndex({ x: 296, y: 50 }, [square, other], 20)).toBe(1);
    expect(nearestPolygonIndex({ x: 200, y: 50 }, [square, other], 20)).toBe(-1);
  });
});

describe("kalibrácia mierky", () => {
  it("prepočíta pixely na metre", () => {
    expect(metersPerPixel({ a: { x: 0, y: 0 }, b: { x: 300, y: 400 }, meters: 50 })).toBeCloseTo(0.1);
  });

  it("neplatná kalibrácia nedá mierku", () => {
    expect(metersPerPixel(null)).toBeNull();
    expect(metersPerPixel({ a: { x: 5, y: 5 }, b: { x: 5, y: 5 }, meters: 10 })).toBeNull();
    expect(metersPerPixel({ a: { x: 0, y: 0 }, b: { x: 10, y: 0 }, meters: 0 })).toBeNull();
  });
});
