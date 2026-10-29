/** Bod [x, y]. Os y smeruje nadol (rovnako ako v SVG), aj v lokálnom metrickom systéme areálu. */
export type Vec2 = [number, number];

/** Úsečka [začiatok, koniec]. */
export type Segment = [Vec2, Vec2];

/** Jednoduchý polygón s voliteľnými dierami (napr. nádvorie okolo budovy). Body bez opakovania prvého bodu na konci. */
export interface Polygon {
  outer: Vec2[];
  holes?: Vec2[][];
}

/**
 * Geometria jedného podlažia tak, ako vznikne z jeho SVG – v súradniciach SVG (pred transformáciou).
 * Kľúčom je `id` prvku v SVG, ktorý sa zhoduje s `id` v JSON-e (R2).
 */
export interface LevelGeometry {
  /** Priestory: `<polygon>`, `<rect>` alebo `<path>` iba s priamymi úsekmi. */
  polygons: Record<string, Polygon>;
  /** Prechody: `<line>`. */
  segments: Record<string, Segment>;
  /** Voliteľné presné polohy bodov záujmu: `<circle>`. */
  points: Record<string, Vec2>;
}

/** Geometria celého areálu: kľúčom je `id` podlažia (alebo vonkajšej vrstvy). */
export type VenueGeometry = Record<string, LevelGeometry>;
