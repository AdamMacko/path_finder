import "server-only";
import venueJson from "../core/fixtures/test-venue.json";
import { testGeometry } from "../core/fixtures/testGeometry";
import type { Issue } from "../core/model/issues";
import { indexVenue, type VenueIndex } from "../core/model/lookup";
import { resolveGeometry, type ResolvedGeometry } from "../core/model/resolveGeometry";
import { validateVenue } from "../core/model/validate";

/**
 * Zdroj dát areálu na serveri. Zatiaľ vymyslený testovací areál z `lib/core/fixtures`;
 * neskôr ho nahradí úložisko, do ktorého zapisuje administrácia (krok 5).
 * Modul je `server-only`, takže sa interné dáta nedostanú do klientského balíka (N6).
 */

export type LoadedVenue =
  | { ok: true; index: VenueIndex; geometry: ResolvedGeometry; issues: Issue[] }
  | { ok: false; issues: Issue[] };

let cached: LoadedVenue | undefined;

export function loadVenue(): LoadedVenue {
  if (cached && process.env.NODE_ENV === "production") return cached;
  const validated = validateVenue(venueJson);
  if (!validated.ok) return (cached = { ok: false, issues: validated.issues });
  const geometry = resolveGeometry(validated.value, testGeometry);
  const issues = [...validated.issues, ...geometry.issues];
  cached = geometry.ok ? { ok: true, index: indexVenue(validated.value), geometry: geometry.value, issues } : { ok: false, issues };
  return cached;
}
