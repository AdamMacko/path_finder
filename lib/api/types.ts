import type { Polygon, Segment, Vec2 } from "../core/geometry/types";
import type { OpeningType, SpaceType, VerticalType } from "../core/model/schema";
import type { Static } from "@sinclair/typebox";

/**
 * Kontrakt medzi serverom a prehliadačom. Klient nikdy nedostane celý `Venue` ani graf –
 * iba to, čo potrebuje na vykreslenie mapy pre zvolený profil (N6).
 * Všetky súradnice sú v lokálnom metrickom systéme areálu (os y nadol).
 */

export interface MapLevel {
  id: string;
  building?: string;
  ordinal: number;
  name?: string;
}

export interface MapSpace {
  id: string;
  level: string;
  type: Static<typeof SpaceType>;
  name?: string;
  polygon: Polygon;
  /** Bod vnútri priestoru na umiestnenie popisu. */
  labelPoint: Vec2;
  /** Priestor patrí do zóny s pravidlami (napr. výroba). Názov zóny sa neposiela. */
  restricted: boolean;
}

export interface MapOpening {
  id: string;
  /** Podlažia, na ktorých sa prechod kreslí (podlažia oboch priestorov). */
  levels: string[];
  segment: Segment;
  type?: Static<typeof OpeningType>;
  oneWay: boolean;
  /** Prechod má vlastné pravidlá (karta, rola…). */
  restricted: boolean;
}

export interface MapVertical {
  id: string;
  type: Static<typeof VerticalType>;
  /** Priestory, ktoré spojenie prepája. */
  spaces: string[];
}

export interface MapPoi {
  id: string;
  space: string;
  level: string;
  category: string;
  name?: string;
  point: Vec2;
}

export interface MapProfile {
  id: string;
  name?: string;
}

export interface MapData {
  venue: { id: string; name: string };
  /** [minX, minY, maxX, maxY] všetkých priestorov. */
  bounds: [number, number, number, number];
  buildings: { id: string; name?: string }[];
  levels: MapLevel[];
  spaces: MapSpace[];
  openings: MapOpening[];
  vertical: MapVertical[];
  pois: MapPoi[];
  profiles: MapProfile[];
  /** Profil, pre ktorý sú dáta pripravené (určuje viditeľnosť interných POI). */
  profile: string;
}

/* ---------- Trasa ---------- */

/** Štart alebo cieľ: bod záujmu, priestor, alebo ľubovoľný bod na podlaží (N3 – štart sa zadáva ručne). */
export type Waypoint = { poi: string } | { space: string } | { level: string; point: Vec2 };

export interface RouteRequest {
  profile: string;
  from: Waypoint;
  to: Waypoint;
  /** Čas odchodu v ISO 8601; predvolene teraz. Rozhoduje o časových pravidlách (R7). */
  time?: string;
}

/** Úsek trasy na jednom podlaží. Medzi úsekmi je zmena podlažia alebo prechod medzi budovou a exteriérom. */
export interface RouteLeg {
  level: string;
  points: Vec2[];
  /** Ako úsek končí, ak nasleduje zmena podlažia. */
  transition?: { type: Static<typeof VerticalType>; vertical: string; toLevel: string };
}

export type RouteResponse =
  | { status: "ok"; distance: number; duration: number; legs: RouteLeg[] }
  /** Cieľ je pre profil a čas nedostupný (R7) – nejde o chybu systému. */
  | { status: "unreachable"; message: string }
  | { status: "error"; message: string };
