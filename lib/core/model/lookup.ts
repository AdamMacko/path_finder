import type { Level, Opening, Poi, Profile, Rule, Space, Venue, Vertical, Zone } from "./schema";

export const DEFAULT_FLOOR_HEIGHT = 3.5;
export const DEFAULT_WALL_TOLERANCE = 0.5;
export const DEFAULT_SPEED = 1.3;

/** Indexy entít areálu podľa `id`. Predpokladá, že areál prešiel validáciou (jedinečné `id`). */
export interface VenueIndex {
  venue: Venue;
  levels: Map<string, Level>;
  spaces: Map<string, Space>;
  openings: Map<string, Opening>;
  vertical: Map<string, Vertical>;
  pois: Map<string, Poi>;
  rules: Map<string, Rule>;
  zones: Map<string, Zone>;
  profiles: Map<string, Profile>;
}

const byId = <T extends { id: string }>(items: T[]) => new Map(items.map((x) => [x.id, x] as const));

export function indexVenue(venue: Venue): VenueIndex {
  return {
    venue,
    levels: byId(venue.levels),
    spaces: byId(venue.spaces),
    openings: byId(venue.openings),
    vertical: byId(venue.vertical),
    pois: byId(venue.pois),
    rules: byId(venue.rules),
    zones: byId(venue.zones),
    profiles: byId(venue.profiles),
  };
}

export const isOutdoor = (level: Level) => level.building === undefined;

export const levelElevation = (venue: Venue, level: Level) =>
  level.elevation ?? level.ordinal * (venue.defaults?.floorHeight ?? DEFAULT_FLOOR_HEIGHT);

export const verticalAccessible = (v: Vertical) => v.accessible ?? !(v.type === "stairs" || v.type === "escalator");
