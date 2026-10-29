import type { LevelGeometry, Polygon, Segment, Vec2, VenueGeometry } from "../geometry/types";

/**
 * Geometria testovacieho areálu tak, ako by vznikla zo SVG jednotlivých podlaží (v súradniciach SVG).
 * Lokálny metrický systém areálu (os y nadol):
 *
 *        x: 0        20         40               70
 *   y: 0  ┌─ A ──────┐ nádvorie ┌─ B (hala L) ───┬sklad┐
 *         │          │  (avoid) │                └─────┤
 *         │          │          ├─vstup┐               │
 *   12    └──────────┴──────────┴──────┴───────────────┘
 *         chodník (preferred), x −5 … 75
 *   16    ┌parkovisko┐
 *   30    └──────────┘
 *
 * - A-0, A-1: SVG v decimetroch (scale 0.1).
 * - B-0: SVG je otočené – kreslené „na výšku“ (rotation 90°, offset [70, 0]), aby sa testovala transformácia.
 * - OUT: SVG v metroch, identita.
 */

const rect = (x1: number, y1: number, x2: number, y2: number): Polygon => ({
  outer: [
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2],
  ],
});
const poly = (...outer: Vec2[]): Polygon => ({ outer });
const line = (x1: number, y1: number, x2: number, y2: number): Segment => [
  [x1, y1],
  [x2, y2],
];

const OUT: LevelGeometry = {
  polygons: {
    "OUT-chodnik": rect(-5, 12, 75, 16),
    "OUT-nadvorie": rect(20, 0, 40, 12),
    "OUT-parkovisko": rect(0, 16, 20, 30),
  },
  segments: {
    "v-nadvorie-chodnik": line(20, 12, 40, 12),
    "v-parkovisko-chodnik": line(0, 16, 20, 16),
  },
  points: {},
};

const A0: LevelGeometry = {
  polygons: {
    "A-0-schody": rect(0, 0, 40, 40),
    "A-0-vytah": rect(160, 10, 190, 40),
    "A-0-chodba": rect(0, 40, 200, 60),
    "A-0-kancelaria": rect(0, 60, 80, 120),
    "A-0-vstup": rect(80, 60, 140, 120),
    "A-0-jedalen": rect(140, 60, 200, 120),
  },
  segments: {
    "d-A0-schody": line(10, 40, 30, 40),
    "d-A0-vytah": line(170, 40, 180, 40),
    "d-A0-kancelaria": line(30, 60, 40, 60),
    "d-A0-vstup-chodba": line(100, 60, 120, 60),
    "d-A0-jedalen": line(160, 60, 170, 60),
    "d-A-vstup": line(100, 120, 120, 120),
    "d-A-bocne": line(200, 40, 200, 60),
  },
  points: {
    "poi-recepcia": [110, 90],
  },
};

const A1: LevelGeometry = {
  polygons: {
    "A-1-schody": rect(0, 0, 40, 40),
    "A-1-vytah": rect(160, 10, 190, 40),
    "A-1-chodba": rect(0, 40, 200, 60),
    "A-1-serverovna": rect(0, 60, 80, 120),
    "A-1-zasadacka": rect(80, 60, 200, 120),
  },
  segments: {
    "d-A1-schody": line(10, 40, 30, 40),
    "d-A1-vytah": line(170, 40, 180, 40),
    "d-A1-serverovna": line(50, 60, 60, 60),
    "d-A1-zasadacka": line(120, 60, 130, 60),
  },
  points: {},
};

// B-0: lokálne (x, y) = (70 − y_svg, x_svg), teda x_svg = y, y_svg = 70 − x.
const B0: LevelGeometry = {
  polygons: {
    "B-0-vstup": poly([8, 30], [8, 24], [12, 24], [12, 30]),
    "B-0-hala": poly([0, 30], [0, 8], [4, 8], [4, 0], [12, 0], [12, 24], [8, 24], [8, 30]),
    "B-0-sklad": poly([0, 8], [0, 0], [4, 0], [4, 8]),
  },
  segments: {
    "d-B-vstup": line(12, 28, 12, 26),
    "d-B-turniket": line(8, 28, 8, 26),
    "d-B-vrata": line(2, 30, 6, 30),
    "d-B-sklad": line(4, 6, 4, 4),
  },
  points: {
    "poi-montaz": [6, 15],
  },
};

export const testGeometry: VenueGeometry = { OUT, "A-0": A0, "A-1": A1, "B-0": B0 };
