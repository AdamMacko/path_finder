import { describe, expect, it } from "vitest";
import venueJson from "../core/fixtures/test-venue.json";
import { testGeometry } from "../core/fixtures/testGeometry";
import { resolveGeometry } from "../core/model/resolveGeometry";
import { validateVenue } from "../core/model/validate";
import { buildMapData } from "./mapData";

function load() {
  const v = validateVenue(venueJson);
  if (!v.ok) throw new Error("fixture neprešla validáciou");
  const g = resolveGeometry(v.value, testGeometry);
  if (!g.ok) throw new Error("geometria neprešla");
  const profile = (id: string) => v.value.profiles.find((p) => p.id === id)!;
  return { venue: v.value, geometry: g.value, profile };
}

describe("dáta mapy pre klienta", () => {
  it("návštevník nevidí interné POI, údržbár áno", () => {
    const { venue, geometry, profile } = load();
    const visitor = buildMapData(venue, geometry, profile("visitor")).pois.map((p) => p.id);
    const maintenance = buildMapData(venue, geometry, profile("maintenance")).pois.map((p) => p.id);
    expect(visitor).not.toContain("poi-serverovna");
    expect(visitor).not.toContain("poi-sklad");
    expect(maintenance).toContain("poi-serverovna");
  });

  it("neobsahuje pravidlá, zóny ani roly", () => {
    const { venue, geometry, profile } = load();
    const json = JSON.stringify(buildMapData(venue, geometry, profile("visitor")));
    expect(json).not.toMatch(/"rules"|"zone"|"roles"|zamestnanci|udrzba/);
  });

  it("hranice pokrývajú celý areál a prechod vchodu sa kreslí na oboch vrstvách", () => {
    const { venue, geometry, profile } = load();
    const data = buildMapData(venue, geometry, profile("visitor"));
    expect(data.bounds).toEqual([-5, 0, 75, 30]);
    expect(data.openings.find((o) => o.id === "d-A-vstup")!.levels.sort()).toEqual(["A-0", "OUT"]);
    expect(data.spaces.find((s) => s.id === "B-0-hala")!.restricted).toBe(true);
  });
});
