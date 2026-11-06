import { describe, expect, it } from "vitest";
import { checkBundle, exportVenue } from "./exportVenue";
import { createSeedPravidla } from "./rules";
import { createSeedAreal } from "./seedData";

describe("exportVenue", () => {
  const result = exportVenue(createSeedAreal(), createSeedPravidla());

  it("ukážkový areál sa exportuje bez chýb", () => {
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("zachová budovy, podlažia, priestory a spojenie podlaží", () => {
    const { venue } = result.bundle;
    expect(venue.buildings.map((b) => b.name)).toContain("Hlavná budova");
    expect(venue.levels.length).toBeGreaterThan(2);
    expect(venue.vertical.length).toBeGreaterThan(0);
    expect(venue.openings.some((o) => o.between.includes("OUT-plocha"))).toBe(true);
  });

  it("výsledný súbor prejde kontrolou importu", () => {
    const reloaded = JSON.parse(JSON.stringify(result.bundle));
    expect(checkBundle(reloaded).ok).toBe(true);
    expect(checkBundle({}).ok).toBe(false);
  });
});
