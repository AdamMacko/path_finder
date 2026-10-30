import type { RouteRequest, RouteResponse, Waypoint } from "@/lib/api/types";
import { loadVenue } from "@/lib/server/venueStore";

/**
 * POST /api/route – výpočet trasy na serveri (N6).
 * Požiadavka sa už validuje voči areálu a profilu. Samotný výpočet (filter pravidiel, cena, A*)
 * príde v kroku 3 – dovtedy odpoveď 501.
 */
export async function POST(request: Request) {
  const loaded = loadVenue();
  if (!loaded.ok) return json({ status: "error", message: "Dáta areálu nie sú platné – pozri prehľad." }, 500);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ status: "error", message: "Telo požiadavky nie je platný JSON." }, 400);
  }

  const req = body as Partial<RouteRequest>;
  const { index } = loaded;
  const profile = typeof req.profile === "string" ? index.profiles.get(req.profile) : undefined;
  if (!profile) return json({ status: "error", message: "Neznámy profil." }, 400);

  // Interný bod pre profil, ktorý ho nesmie vidieť, sa správa ako neexistujúci – neprezradí sa jeho existencia.
  const known = (w: unknown): w is Waypoint => {
    if (!w || typeof w !== "object") return false;
    const o = w as Record<string, unknown>;
    if (typeof o.poi === "string") {
      const poi = index.pois.get(o.poi);
      return !!poi && (!poi.internal || !!profile.internal);
    }
    if (typeof o.space === "string") return index.spaces.has(o.space);
    return (
      typeof o.level === "string" &&
      index.levels.has(o.level) &&
      Array.isArray(o.point) &&
      o.point.length === 2 &&
      o.point.every((n) => typeof n === "number" && Number.isFinite(n))
    );
  };
  if (!known(req.from)) return json({ status: "error", message: "Neznámy štart." }, 400);
  if (!known(req.to)) return json({ status: "error", message: "Neznámy cieľ." }, 400);
  if (req.time !== undefined && Number.isNaN(Date.parse(req.time))) return json({ status: "error", message: "Neplatný čas." }, 400);

  return json({ status: "error", message: "Výpočet trasy ešte nie je implementovaný (generovanie grafu a routing – kroky 2 a 3)." }, 501);
}

const json = (body: RouteResponse, status: number) => Response.json(body, { status });
