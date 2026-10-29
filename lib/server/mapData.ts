import type { MapData } from "../api/types";
import { representativePoint } from "../core/geometry/polygon";
import type { ResolvedGeometry } from "../core/model/resolveGeometry";
import type { Profile, Venue } from "../core/model/schema";

/**
 * Pripraví dáta mapy pre jeden profil. Interné POI vidí iba profil s `internal: true` (N6).
 * Pravidlá, zóny ani roly sa klientovi neposielajú – iba príznak `restricted` na vykreslenie.
 */
export function buildMapData(venue: Venue, geometry: ResolvedGeometry, profile: Profile): MapData {
  const spaceLevel = new Map(venue.spaces.map((s) => [s.id, s.level]));
  const restrictedZones = new Set(venue.zones.filter((z) => z.rules.length > 0).map((z) => z.id));

  const xs: number[] = [];
  const ys: number[] = [];
  for (const poly of Object.values(geometry.spaces)) {
    for (const [x, y] of poly.outer) {
      xs.push(x);
      ys.push(y);
    }
  }

  return {
    venue: { id: venue.id, name: venue.name },
    bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
    buildings: venue.buildings.map(({ id, name }) => ({ id, name })),
    levels: venue.levels.map(({ id, building, ordinal, name }) => ({ id, building, ordinal, name })),
    spaces: venue.spaces.map((s) => ({
      id: s.id,
      level: s.level,
      type: s.type,
      name: s.name,
      polygon: geometry.spaces[s.id],
      labelPoint: representativePoint(geometry.spaces[s.id]),
      restricted: s.zone !== undefined && restrictedZones.has(s.zone),
    })),
    openings: venue.openings.map((o) => ({
      id: o.id,
      levels: [...new Set(o.between.map((s) => spaceLevel.get(s)!))],
      segment: geometry.openings[o.id],
      type: o.type,
      oneWay: o.oneWay ?? false,
      restricted: (o.rules?.length ?? 0) > 0,
    })),
    vertical: venue.vertical.map((v) => ({ id: v.id, type: v.type, spaces: Object.values(v.spaces) })),
    pois: venue.pois
      .filter((p) => !p.internal || profile.internal)
      .map((p) => ({
        id: p.id,
        space: p.space,
        level: spaceLevel.get(p.space)!,
        category: p.category,
        name: p.name,
        point: geometry.pois[p.id],
      })),
    profiles: venue.profiles.map(({ id, name }) => ({ id, name })),
    profile: profile.id,
  };
}
