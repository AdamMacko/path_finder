import type { RouteLeg, RouteRequest, RouteResponse } from "../api/types";
import type { Vec2 } from "../core/geometry/types";
import { DEFAULT_SPEED, type VenueIndex } from "../core/model/lookup";

/**
 * Zástupný výpočet trasy, kým nie je hotový graf a A*. Vracia ručne zostavené trasy testovacieho areálu
 * (`lib/core/fixtures`) v presnom tvare `RouteResponse`, takže sa podľa neho dá dokončiť frontend.
 * Súradnice sú v lokálnom metrickom systéme areálu. Odpovede rešpektujú pravidlá fixture:
 * výroba (karta + OOPP + rola + pracovná zmena), serverovňa (iba údržba) a bezbariérová trasa cez výťah.
 *
 * Podporené sú iba štarty z POI `poi-parkovisko` a `poi-recepcia`. Iné požiadavky vrátia `error`.
 * Mock sa nahradí volaním skutočného routingu v `app/api/route/route.ts`.
 */

const STAIRS_PENALTY_S = 12;
const ELEVATOR_PENALTY_S = 20;

type Pt = [number, number];
const pts = (...p: Pt[]): Vec2[] => p;

const length = (p: Vec2[]) => p.slice(1).reduce((sum, c, i) => sum + Math.hypot(c[0] - p[i][0], c[1] - p[i][1]), 0);

/** Trasa v exteriéri od parkoviska po dvere do budovy A, resp. B. */
const OUT_TO_A = pts([10, 23], [10, 16], [11, 14], [11, 12]);
const OUT_TO_B = pts([10, 23], [10, 16], [11, 14], [43, 14], [43, 12]);

type Dest = "recepcia" | "jedalen" | "zasadacka" | "serverovna" | "montaz" | "sklad";
const DEST: Record<string, Dest> = {
  "poi-recepcia": "recepcia",
  "poi-jedalen": "jedalen",
  "poi-zasadacka": "zasadacka",
  "poi-serverovna": "serverovna",
  "poi-montaz": "montaz",
  "poi-sklad": "sklad",
};

const unreachable = (message: string): RouteResponse => ({ status: "unreachable", message });
const error = (message: string): RouteResponse => ({ status: "error", message });

/** Pracovná zmena z fixture: Po–Pi 05:45–22:15 (pravidlo `smena`). */
function inShift(date: Date) {
  const day = date.getDay();
  const minutes = date.getHours() * 60 + date.getMinutes();
  return day >= 1 && day <= 5 && minutes >= 5 * 60 + 45 && minutes <= 22 * 60 + 15;
}

export function mockRoute(req: RouteRequest, index: VenueIndex): RouteResponse {
  const profile = index.profiles.get(req.profile);
  if (!profile) return error("Neznámy profil.");
  if (!("poi" in req.from) || !("poi" in req.to)) {
    return error("Mock trasy podporuje iba body záujmu (štart: Parkovisko alebo Recepcia).");
  }
  const dest = DEST[req.to.poi];
  const fromParking = req.from.poi === "poi-parkovisko";
  if (!dest || !(fromParking || req.from.poi === "poi-recepcia") || req.from.poi === req.to.poi) {
    return error("Mock pozná trasy z Parkoviska alebo Recepcie do ostatných bodov záujmu.");
  }
  if (!fromParking && (dest === "montaz" || dest === "sklad")) {
    return error("Mock pozná trasu do výroby iba z Parkoviska.");
  }

  const roles = new Set(profile.roles);
  const employee = ["employee", "temp_worker", "maintenance"].some((r) => roles.has(r));
  const speed = (index.venue.defaults?.speed ?? DEFAULT_SPEED) * (profile.speed ?? 1);
  const when = req.time ? new Date(req.time) : new Date();

  // Výroba: karta + OOPP + rola (zóna Výroba) + pracovná zmena.
  if (dest === "montaz" || dest === "sklad") {
    if (!employee || !profile.card || !profile.ppe) {
      return unreachable("Cieľ leží v zóne Výroba. Vstup majú iba zamestnanci s prístupovou kartou a OOPP.");
    }
    if (!inShift(when)) return unreachable("Výroba je dostupná iba počas pracovnej zmeny (Po–Pi 05:45–22:15).");
    const inHall = dest === "montaz" ? pts([43, 12], [43, 10], [43, 8], [44, 7], [55, 6]) : pts([43, 12], [43, 10], [43, 8], [44, 7], [65, 6], [65, 4], [65, 2]);
    return ok([{ level: "OUT", points: OUT_TO_B }, { level: "B-0", points: inHall }], speed, 0);
  }

  if (dest === "serverovna" && !roles.has("maintenance")) {
    return unreachable("Serverovňa je prístupná iba pre údržbu s prístupovou kartou.");
  }

  const start: Vec2[] = fromParking ? [[11, 12]] : [[11, 9]];
  const toCorridor: Vec2[] = [...start, [11, 6], [11, 5]];
  const prefix: RouteLeg[] = fromParking ? [{ level: "OUT", points: OUT_TO_A }] : [];

  if (dest === "recepcia") return ok([...prefix, { level: "A-0", points: pts([11, 12], [11, 9]) }], speed, 0);
  if (dest === "jedalen") {
    return ok([...prefix, { level: "A-0", points: [...toCorridor, [16.5, 5], [16.5, 6], [17, 9]] }], speed, 0);
  }

  // Zasadačka a serverovňa sú na 1. poschodí: bezbariérový profil ide výťahom, ostatní schodmi.
  const lift = profile.require?.includes("accessible") ?? false;
  const [vertical, type, hallX, shaft, penalty]: [string, "elevator" | "stairs", number, Pt, number] = lift
    ? ["vytah-A", "elevator", 17.5, [17.5, 2.5], ELEVATOR_PENALTY_S]
    : ["schody-A", "stairs", 2, [2, 2], STAIRS_PENALTY_S];
  const door: Pt = lift ? [17.5, 4] : [2, 4];
  const target: Pt[] = dest === "zasadacka" ? [[12.5, 5], [12.5, 6], [12.5, 9]] : [[5.5, 5], [5.5, 6], [5.5, 9]];
  const upFrom: Pt = [hallX, 5];

  const ground = [...toCorridor, upFrom, door, shaft];
  const upstairs = [shaft, door, upFrom, ...target];
  return ok(
    [
      ...prefix,
      { level: "A-0", points: ground, transition: { type, vertical, toLevel: "A-1" } },
      { level: "A-1", points: upstairs },
    ],
    speed,
    penalty,
  );
}

function ok(legs: RouteLeg[], speed: number, penalty: number): RouteResponse {
  const distance = legs.reduce((sum, l) => sum + length(l.points), 0);
  return { status: "ok", distance: Math.round(distance * 10) / 10, duration: Math.round(distance / speed + penalty), legs };
}
