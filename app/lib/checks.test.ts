import { describe, expect, it } from "vitest";
import { checkReadiness } from "./checks";
import { createEmptyAreal } from "./model";
import { createEmptyPravidla, createSeedPravidla } from "./rules";
import { createSeedAreal } from "./seedData";

describe("pripravenosť areálu", () => {
  it("prázdny areál hlási chýbajúce základy", () => {
    const { checks, score } = checkReadiness(createEmptyAreal(), createEmptyPravidla());
    const titles = checks.map((c) => c.title);
    expect(titles).toContain("Chýba podklad outdoor mapy");
    expect(titles).toContain("Chýba pochôdzna plocha");
    expect(titles).toContain("Žiadne budovy");
    expect(score).toBeLessThan(0.7);
  });

  it("ukážkový areál nemá chyby okrem zámerne prázdneho skladu", () => {
    const { checks, stats } = checkReadiness(createSeedAreal(), createSeedPravidla());
    const errors = checks.filter((c) => c.severity === "error").map((c) => c.title);
    // Sklad je v ukážke zámerne bez vstupu aj podlaží, ale neposudzuje sa ako budova s podlažiami, ak nemá vstup.
    expect(errors.every((t) => t.includes("Sklad"))).toBe(true);
    expect(stats).toMatchObject({ budovy: 3, podlazia: 3, vstupy: 2 });
  });

  it("vstup bez napojených dverí je chyba", () => {
    const areal = createSeedAreal();
    for (const b of areal.budovy) for (const f of b.podlazia) f.dvere = (f.dvere ?? []).map((d) => ({ ...d, ref: null }));
    const titles = checkReadiness(areal, createSeedPravidla()).checks.map((c) => c.title);
    expect(titles.filter((t) => t.includes("nie je napojený na vnútro"))).toHaveLength(2);
  });

  it("budova s dvoma podlažiami bez schodiska nie je prepojená", () => {
    const areal = createSeedAreal();
    for (const f of areal.budovy[0].podlazia) for (const p of f.priestory) delete p.meta;
    const titles = checkReadiness(areal, createSeedPravidla()).checks.map((c) => c.title);
    expect(titles).toContain("Budova „Hlavná budova“: podlažia nie sú prepojené");
  });
});
