import { pointInPolygon, segmentOnBoundary } from "@/lib/core/geometry/polygon";
import { applyTransform, transformFromControlPoints, transformPolygon, type Transform } from "@/lib/core/geometry/transform";
import type { LevelGeometry, Polygon, Segment, Vec2, VenueGeometry } from "@/lib/core/geometry/types";
import { hasErrors, type Issue } from "@/lib/core/model/issues";
import { DEFAULT_WALL_TOLERANCE } from "@/lib/core/model/lookup";
import { resolveGeometry } from "@/lib/core/model/resolveGeometry";
import { SCHEMA_VERSION, type Opening, type Poi, type Space, type SpaceType, type Venue, type Vertical } from "@/lib/core/model/schema";
import { validateVenue } from "@/lib/core/model/validate";
import { metersPerPixel, rectToPolygon, type Areal, type Budova, type Podlazie, type Point, type Priestor } from "./model";
import type { Pravidla } from "./rules";
import { verticalGroups } from "./vertical";
import { buildingHoles } from "./walkable";

/**
 * Prevod anotácií z editora (pixely podkladu, obdĺžniky) na dátový model servera (`Venue`) a geometriu
 * podlaží (kap. 2.2). Geometria ostáva v pixeloch podkladu a každé podlažie nesie transformáciu do metrov,
 * presne ako to očakáva `resolveGeometry`.
 */

export type VenueBundle = { venue: Venue; geometry: VenueGeometry };
export type ExportResult = { bundle: VenueBundle; issues: Issue[]; ok: boolean };

export const OUTDOOR_LEVEL = "OUT";
export const OUTDOOR_SPACE = "OUT-plocha";

const vec = (p: Point): Vec2 => [p.x, p.y];
const safeId = (id: string) => id.replace(/[^A-Za-z0-9_.:-]/g, "_");

const SPACE_TYPE: Record<Priestor["kind"], SpaceType> = {
  miestnosť: "room",
  chodba: "corridor",
  vertikála: "stairs",
  dvere: "other",
  ine: "other",
};

function spaceType(p: Priestor): SpaceType {
  if (p.kind !== "vertikála") return SPACE_TYPE[p.kind];
  const t = p.meta?.vertikala?.typ;
  return t === "elevator" ? "elevator" : t === "stairs" || t === "escalator" ? "stairs" : "other";
}

const bbox = (polys: Vec2[][]) => {
  const pts = polys.flat();
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2 };
};

const mid = ([a, b]: Segment): Vec2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const rotate = (t: Pick<Transform, "scale" | "rotation">, p: Vec2) => applyTransform({ ...t, offset: [0, 0] }, p);

export function exportVenue(areal: Areal, pravidla: Pravidla): ExportResult {
  const issues: Issue[] = [];
  const warn = (code: string, path: string, message: string) => issues.push({ severity: "warning", code, path, message });
  const fail = (code: string, path: string, message: string) => issues.push({ severity: "error", code, path, message });

  const outScale = metersPerPixel(areal.mierka);
  if (!outScale) warn("export.no-calibration", "areal", "Outdoor mapa nie je kalibrovaná, použije sa 1 px = 1 m.");
  const outT: Transform = { scale: outScale ?? 1, rotation: 0, offset: [0, 0] };

  const geometry: VenueGeometry = {};
  const venue: Venue = {
    schemaVersion: SCHEMA_VERSION,
    id: safeId(areal.id),
    name: areal.nazov,
    buildings: [],
    levels: [],
    spaces: [],
    openings: [],
    vertical: [],
    pois: [],
    rules: structuredClone(pravidla.rules),
    zones: structuredClone(pravidla.zones),
    profiles: structuredClone(pravidla.profiles),
  };

  /* ---------- Exteriér ---------- */

  const outGeom: LevelGeometry = { polygons: {}, segments: {}, points: {} };
  geometry[OUTDOOR_LEVEL] = outGeom;
  venue.levels.push({ id: OUTDOOR_LEVEL, ordinal: 0, name: "Exteriér", transform: outT });

  const hasOutdoor = !!areal.hranica && areal.hranica.length >= 3;
  if (hasOutdoor) {
    const holes = [...buildingHoles(areal), ...(areal.zakazane ?? [])].map((h) => h.map(vec));
    outGeom.polygons[OUTDOOR_SPACE] = { outer: areal.hranica!.map(vec), ...(holes.length ? { holes } : {}) };
    venue.spaces.push({ id: OUTDOOR_SPACE, level: OUTDOOR_LEVEL, type: "walkway", name: "Pochôdzna plocha" });
  } else {
    fail("export.no-walkable", "areal.hranica", "Chýba pochôdzna plocha areálu.");
  }

  const entrances = new Map((areal.vstupy ?? []).map((v) => [v.id, v]));
  const outPolygon = hasOutdoor ? transformPolygon(outT, outGeom.polygons[OUTDOOR_SPACE]) : null;

  for (const p of areal.poi ?? []) {
    if (!outPolygon || !pointInPolygon(applyTransform(outT, vec(p.point)), outPolygon)) {
      warn("export.poi-outside", p.id, `Bod záujmu „${p.nazov}“ neleží na pochôdznej ploche, preskočený.`);
      continue;
    }
    outGeom.points[p.id] = vec(p.point);
    venue.pois.push(poiOf(p.id, OUTDOOR_SPACE, p.nazov, p.kategoria, p.interny));
  }

  /* ---------- Budovy ---------- */

  for (const b of areal.budovy.filter((x) => x.kind === "budova")) {
    venue.buildings.push({ id: safeId(b.id), name: b.nazov });
    exportBuilding(b);
  }

  function exportBuilding(b: Budova) {
    const buildingId = safeId(b.id);
    const floors = [...b.podlazia].sort((x, y) => x.poradie - y.poradie);
    const rects = floors.map((f) => f.priestory.filter((p) => p.kind !== "dvere").map((p) => p.footprint[0] && rectToPolygon(p.footprint[0]).map(vec)).filter(Boolean) as Vec2[][]);
    const centres = rects.map(bbox);
    const footprint = b.footprint[0];
    const footprintCentre: Vec2 = footprint ? [footprint.cx * outT.scale, footprint.cy * outT.scale] : [0, 0];

    const scaleOf = (f: Podlazie) => {
      const s = metersPerPixel(f.mierka);
      if (!s) warn("export.no-calibration", f.id, `Pôdorys „${b.nazov} – ${f.nazov}“ nie je kalibrovaný, použije sa mierka outdoor mapy.`);
      return s ?? outT.scale;
    };

    // Ukotvenie na outdoor mapu: dvere podlažia prepojené so vstupom dávajú otočenie a polohu.
    const anchorIndex = floors.findIndex((f) => (f.dvere ?? []).some((d) => d.ref && entrances.has(d.ref)));
    const transforms: Transform[] = [];
    const place = (i: number, rotation: number, target: Vec2, source: Vec2): Transform => {
      const scale = scaleOf(floors[i]);
      const r = rotate({ scale, rotation }, source);
      return { scale, rotation, offset: [target[0] - r[0], target[1] - r[1]] };
    };

    if (anchorIndex >= 0) {
      const f = floors[anchorIndex];
      const door = f.dvere!.find((d) => d.ref && entrances.has(d.ref))!;
      const ent = entrances.get(door.ref!)!;
      const dSeg: Segment = [vec(door.a), vec(door.b)];
      const eSeg: Segment = [applyTransform(outT, vec(ent.a)), applyTransform(outT, vec(ent.b))];
      // Smer úsečky vstupu voči dverám je dvojznačný (o 180°); platí variant, pri ktorom pôdorys sedí do obrysu budovy.
      const c = centres[anchorIndex] ?? { cx: 0, cy: 0 };
      const candidates = [eSeg, [eSeg[1], eSeg[0]] as Segment].map((e) => {
        const rot = transformFromControlPoints(dSeg[0], dSeg[1], e[0], e[1]).rotation;
        const t = place(anchorIndex, rot, mid(eSeg), mid(dSeg));
        const centre = applyTransform(t, [c.cx, c.cy]);
        return { t, off: Math.hypot(centre[0] - footprintCentre[0], centre[1] - footprintCentre[1]) };
      });
      transforms[anchorIndex] = candidates.sort((x, y) => x.off - y.off)[0].t;
    }

    const anchor = anchorIndex >= 0 ? transforms[anchorIndex] : null;
    const groups = verticalGroups(b);
    const itemCentre = (f: Podlazie, itemId: string): Vec2 | null => {
      const item = f.priestory.find((p) => p.id === itemId);
      return item?.footprint[0] ? [item.footprint[0].cx, item.footprint[0].cy] : null;
    };
    floors.forEach((f, i) => {
      if (transforms[i]) return;
      if (!anchor) {
        const c = centres[i] ?? { cx: 0, cy: 0 };
        transforms[i] = place(i, footprint?.rotation ?? 0, footprintCentre, [c.cx, c.cy]);
        return;
      }
      // Ostatné podlažia sa zarovnajú podľa spoločného schodiska/výťahu s ukotveným podlažím, inak podľa stredu.
      const anchorFloor = floors[anchorIndex];
      for (const g of groups) {
        const a = g.members.find((m) => m.floorId === anchorFloor.id);
        const m = g.members.find((x) => x.floorId === f.id);
        const ac = a && itemCentre(anchorFloor, a.itemId);
        const mc = m && itemCentre(f, m.itemId);
        if (ac && mc) {
          transforms[i] = place(i, anchor.rotation, applyTransform(anchor, ac), mc);
          return;
        }
      }
      warn("export.unaligned-floor", f.id, `Podlažie „${b.nazov} – ${f.nazov}“ nemá spoločné schodisko s ukotveným podlažím, zarovná sa podľa stredu.`);
      const c = centres[i] ?? { cx: 0, cy: 0 };
      const ac = centres[anchorIndex] ?? { cx: 0, cy: 0 };
      transforms[i] = place(i, anchor.rotation, applyTransform(anchor, [ac.cx, ac.cy]), [c.cx, c.cy]);
    });
    if (!anchor && floors.length > 0)
      warn("export.unanchored-building", b.id, `Budova „${b.nazov}“ nemá dvere prepojené so vstupom, pôdorysy sa umiestnia podľa obrysu budovy.`);

    floors.forEach((f, i) => exportFloor(b, buildingId, f, transforms[i]));

    // Vertikálne spojenia: jeden objekt pre viac podlaží.
    for (const g of groups) {
      const spaces: Record<string, string> = {};
      for (const m of g.members) spaces[safeId(m.floorId)] ??= safeId(m.itemId);
      if (Object.keys(spaces).length < 2) {
        warn("export.vertical-incomplete", g.skupina, `Spojenie „${g.skupina}“ v budove „${b.nazov}“ vedie iba na jedno podlažie, preskočené.`);
        continue;
      }
      const v: Vertical = { id: `${buildingId}.${safeId(g.skupina)}`, type: g.typ, spaces };
      venue.vertical.push(v);
    }
  }

  function exportFloor(b: Budova, buildingId: string, f: Podlazie, transform: Transform) {
    const levelId = safeId(f.id);
    const geom: LevelGeometry = { polygons: {}, segments: {}, points: {} };
    geometry[levelId] = geom;
    venue.levels.push({ id: levelId, building: buildingId, ordinal: f.poradie, name: f.nazov, transform });

    const local: Record<string, Polygon> = {};
    for (const p of f.priestory) {
      if (p.kind === "dvere") {
        warn("export.legacy-door", p.id, `Priestor „${p.nazov}“ je starý obdĺžnikový typ dverí, preskočený (použite úsečku dverí).`);
        continue;
      }
      const rect = p.footprint[0];
      if (!rect) {
        warn("export.empty-footprint", p.id, `Priestor „${p.nazov}“ nemá tvar, preskočený.`);
        continue;
      }
      if (p.footprint.length > 1)
        warn("export.multipart", p.id, `Priestor „${p.nazov}“ má viac častí; exportuje sa iba prvá. Rozdeľte ho na samostatné priestory.`);
      const id = safeId(p.id);
      const outer = rectToPolygon(rect).map(vec);
      geom.polygons[id] = { outer };
      local[id] = transformPolygon(transform, { outer });
      const space: Space = { id, level: levelId, type: spaceType(p), name: p.nazov };
      if (p.meta?.zona) space.zone = safeId(p.meta.zona);
      if (p.meta?.bezbarierovy === false) space.accessible = false;
      venue.spaces.push(space);
    }

    const touching = (seg: Segment) =>
      Object.entries(local)
        .filter(([, poly]) => segmentOnBoundary(seg, poly, DEFAULT_WALL_TOLERANCE))
        .map(([id]) => id);

    for (const d of f.dvere ?? []) {
      const id = safeId(d.id);
      const seg: Segment = [vec(d.a), vec(d.b)];
      const near = touching([applyTransform(transform, seg[0]), applyTransform(transform, seg[1])]);
      let between: [string, string] | null = null;
      if (d.ref) {
        if (!entrances.has(d.ref) || !hasOutdoor) warn("export.door-no-entrance", d.id, `Dvere „${d.nazov}“ odkazujú na neexistujúci vstup, preskočené.`);
        else if (near.length === 0) warn("export.door-no-space", d.id, `Dvere „${d.nazov}“ neležia na hranici žiadneho priestoru, preskočené.`);
        else between = [OUTDOOR_SPACE, near[0]];
      } else if (near.length < 2) {
        warn("export.door-one-side", d.id, `Dvere „${d.nazov}“ (${b.nazov}, ${f.nazov}) neprepájajú dva priestory, preskočené.`);
      } else {
        between = [near[0], near[1]];
      }
      if (!between) continue;
      geom.segments[id] = seg;
      const opening: Opening = { id, between, type: "door" };
      venue.openings.push(opening);
    }

    for (const p of f.poi ?? []) {
      const at = applyTransform(transform, vec(p.point));
      const space = Object.entries(local).find(([, poly]) => pointInPolygon(at, poly))?.[0];
      if (!space) {
        warn("export.poi-outside", p.id, `Bod záujmu „${p.nazov}“ (${b.nazov}, ${f.nazov}) neleží v žiadnom priestore, preskočený.`);
        continue;
      }
      geom.points[safeId(p.id)] = vec(p.point);
      venue.pois.push(poiOf(safeId(p.id), space, p.nazov, p.kategoria, p.interny));
    }
  }

  /* ---------- Validácia výsledku ---------- */

  const validated = validateVenue(venue);
  issues.push(...validated.issues);
  if (validated.ok) issues.push(...resolveGeometry(validated.value, geometry).issues);

  return { bundle: { venue, geometry }, issues, ok: !hasErrors(issues) };
}

function poiOf(id: string, space: string, name: string, category: string, internal: boolean): Poi {
  return { id: safeId(id), space, category: category || "other", name, ...(internal ? { internal: true } : {}) };
}

/** Skontroluje súbor so spojeným areálom a geometriou (napr. nahratý z disku) rovnako ako export. */
export function checkBundle(data: unknown): { issues: Issue[]; ok: boolean } {
  const bundle = data as Partial<VenueBundle> | null;
  if (!bundle || typeof bundle !== "object" || !bundle.venue || !bundle.geometry) {
    return { ok: false, issues: [{ severity: "error", code: "bundle.shape", path: "", message: "Súbor musí obsahovať vlastnosti „venue“ a „geometry“." }] };
  }
  const validated = validateVenue(bundle.venue);
  const issues = [...validated.issues];
  if (validated.ok) issues.push(...resolveGeometry(validated.value, bundle.geometry).issues);
  return { issues, ok: !hasErrors(issues) };
}
