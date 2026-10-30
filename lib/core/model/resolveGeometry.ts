import { polygonProblems, pointInPolygon, representativePoint, segmentOnBoundary } from "../geometry/polygon";
import { IDENTITY, applyTransform, transformPolygon, transformSegment } from "../geometry/transform";
import type { Polygon, Segment, Vec2, VenueGeometry } from "../geometry/types";
import { distance } from "../geometry/vec";
import { result, type Issue, type Result } from "./issues";
import { DEFAULT_WALL_TOLERANCE } from "./lookup";
import type { Venue } from "./schema";

/** Geometria areálu v lokálnom metrickom systéme, priradená entitám z JSON-u. */
export interface ResolvedGeometry {
  spaces: Record<string, Polygon>;
  openings: Record<string, Segment>;
  /** Poloha každého POI: `<circle>` zo SVG, inak reprezentatívny bod priestoru. */
  pois: Record<string, Vec2>;
}

/**
 * Spojí validovaný areál s geometriou zo SVG: každému priestoru nájde polygón na jeho podlaží,
 * každému prechodu úsečku na podlaží jedného z jeho priestorov, a všetko prevedie transformáciou
 * podlažia do metrov. Zároveň kontroluje, či prechod naozaj leží na hranici oboch priestorov.
 */
export function resolveGeometry(venue: Venue, geometry: VenueGeometry): Result<ResolvedGeometry> {
  const issues: Issue[] = [];
  const err = (code: string, path: string, message: string) => issues.push({ severity: "error", code, path, message });
  const warn = (code: string, path: string, message: string) => issues.push({ severity: "warning", code, path, message });

  const tolerance = venue.defaults?.wallTolerance ?? DEFAULT_WALL_TOLERANCE;
  const transforms = new Map(venue.levels.map((l) => [l.id, l.transform ?? IDENTITY]));
  const spaceLevel = new Map(venue.spaces.map((s) => [s.id, s.level]));
  const used = new Set<string>();
  const out: ResolvedGeometry = { spaces: {}, openings: {}, pois: {} };

  for (const level of venue.levels) {
    if (!geometry[level.id]) warn("geometry.missing-level", level.id, `chýba geometria podlažia „${level.id}“`);
  }

  for (const space of venue.spaces) {
    const raw = geometry[space.level]?.polygons[space.id];
    if (!raw) {
      err("geometry.missing-space", space.id, `v SVG podlažia „${space.level}“ chýba polygón priestoru „${space.id}“`);
      continue;
    }
    used.add(`${space.level}/${space.id}`);
    for (const problem of polygonProblems(raw)) err("geometry.invalid-polygon", space.id, `polygón priestoru „${space.id}“: ${problem}`);
    out.spaces[space.id] = transformPolygon(transforms.get(space.level)!, raw);
  }

  for (const opening of venue.openings) {
    // Úsečka prechodu môže byť v SVG ktoréhokoľvek z dvoch priestorov (napr. vchod budovy je v pôdoryse budovy).
    const candidates = [...new Set(opening.between.map((s) => spaceLevel.get(s)!))]
      .filter((l) => geometry[l]?.segments[opening.id])
      .map((l) => {
        used.add(`${l}/${opening.id}`);
        return transformSegment(transforms.get(l)!, geometry[l].segments[opening.id]);
      });
    if (candidates.length === 0) {
      err("geometry.missing-opening", opening.id, `v SVG chýba úsečka prechodu „${opening.id}“`);
      continue;
    }
    const seg = candidates[0];
    if (candidates.length > 1 && !sameSegment(candidates[0], candidates[1], tolerance))
      warn("geometry.opening-mismatch", opening.id, `prechod „${opening.id}“ je v SVG oboch podlaží na rôznych miestach – použije sa prvý`);
    if (distance(seg[0], seg[1]) === 0) err("geometry.zero-opening", opening.id, `prechod „${opening.id}“ má nulovú dĺžku`);
    for (const spaceId of opening.between) {
      const poly = out.spaces[spaceId];
      if (poly && !segmentOnBoundary(seg, poly, tolerance))
        err(
          "geometry.opening-off-boundary",
          opening.id,
          `prechod „${opening.id}“ neleží na hranici priestoru „${spaceId}“ (tolerancia ${tolerance} m)`
        );
    }
    out.openings[opening.id] = seg;
  }

  for (const poi of venue.pois) {
    const poly = out.spaces[poi.space];
    const level = spaceLevel.get(poi.space)!;
    const raw = geometry[level]?.points[poi.id];
    if (raw) {
      used.add(`${level}/${poi.id}`);
      const p = applyTransform(transforms.get(level)!, raw);
      if (poly && !pointInPolygon(p, poly)) err("geometry.poi-outside", poi.id, `bod záujmu „${poi.id}“ neleží v priestore „${poi.space}“`);
      out.pois[poi.id] = p;
    } else if (poly) {
      out.pois[poi.id] = representativePoint(poly);
    }
  }

  for (const [levelId, g] of Object.entries(geometry)) {
    for (const id of [...Object.keys(g.polygons), ...Object.keys(g.segments), ...Object.keys(g.points)]) {
      if (!used.has(`${levelId}/${id}`))
        warn("geometry.unused", id, `prvok „${id}“ v SVG podlažia „${levelId}“ nemá záznam v JSON-e`);
    }
  }

  return result(out, issues);
}

const sameSegment = ([a, b]: Segment, [c, d]: Segment, tol: number) =>
  (distance(a, c) <= tol && distance(b, d) <= tol) || (distance(a, d) <= tol && distance(b, c) <= tol);
