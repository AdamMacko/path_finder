import { describe, expect, it } from "vitest";
import venueJson from "../fixtures/test-venue.json";
import { testGeometry } from "../fixtures/testGeometry";
import type { VenueGeometry } from "../geometry/types";
import { pointerToPath, type Issue } from "./issues";
import { resolveGeometry } from "./resolveGeometry";
import type { Venue } from "./schema";
import { validateVenue } from "./validate";

const fixture = () => structuredClone(venueJson) as unknown as Venue;
const geometry = () => structuredClone(testGeometry) as VenueGeometry;
const codes = (issues: Issue[]) => issues.map((i) => i.code);
const errorsOf = (data: unknown) => validateVenue(data).issues.filter((i) => i.severity === "error");

function validVenue(): Venue {
  const r = validateVenue(fixture());
  if (!r.ok) throw new Error(JSON.stringify(r.issues, null, 2));
  return r.value;
}

describe("testovací areál", () => {
  it("prejde validáciou bez chýb aj varovaní", () => {
    expect(validateVenue(fixture()).issues).toEqual([]);
  });

  it("geometria sedí s JSON-om bez chýb aj varovaní", () => {
    expect(resolveGeometry(validVenue(), geometry()).issues).toEqual([]);
  });
});

describe("JSON Schéma", () => {
  it("hlási chýbajúcu povinnú vlastnosť s cestou", () => {
    const v = fixture() as unknown as { spaces: Record<string, unknown>[] };
    delete v.spaces[3].level;
    expect(errorsOf(v)).toEqual([expect.objectContaining({ code: "schema.required", path: "spaces[3]", message: expect.stringContaining("level") })]);
  });

  it("odhalí preklep v názve vlastnosti", () => {
    const v = fixture() as unknown as { openings: Record<string, unknown>[] };
    v.openings[0].oneway = true;
    expect(errorsOf(v)).toEqual([expect.objectContaining({ code: "schema.additionalProperties", path: "openings[0]" })]);
  });

  it("pri pravidle hlási chybu iba zo zodpovedajúceho typu", () => {
    const v = fixture();
    v.rules[3] = { id: "smena", type: "time", from: "25:00", to: "22:15" };
    expect(errorsOf(v)).toEqual([expect.objectContaining({ code: "schema.pattern", path: "rules[3].from" })]);
  });

  it("neznámy typ pravidla je jedna zrozumiteľná chyba", () => {
    const v = fixture() as unknown as { rules: unknown[] };
    v.rules[0] = { id: "karta", type: "badge" };
    expect(errorsOf(v)).toEqual([expect.objectContaining({ code: "schema.anyOf", path: "rules[0]" })]);
  });

  it("vertikálne spojenie potrebuje aspoň dve podlažia", () => {
    const v = fixture();
    v.vertical[0].spaces = { "A-0": "A-0-schody" };
    expect(codes(errorsOf(v))).toEqual(["schema.minProperties"]);
  });
});

describe("väzby", () => {
  it("odhalí duplicitné id naprieč priestormi a prechodmi", () => {
    const v = fixture();
    v.openings[0].id = "OUT-chodnik";
    expect(errorsOf(v)).toEqual([expect.objectContaining({ code: "id.duplicate", path: "openings[0].id" })]);
  });

  it("odhalí odkaz na neexistujúci priestor, zónu a pravidlo", () => {
    const v = fixture();
    v.openings[0].between = ["OUT-nadvorie", "neexistuje"];
    v.spaces[0].zone = "neexistuje";
    v.zones[0].rules = ["zamestnanci", "neexistuje"];
    expect(codes(errorsOf(v)).sort()).toEqual(["ref.unknown-rule", "ref.unknown-space", "ref.unknown-zone"]);
  });

  it("prechod medzi podlažiami tej istej budovy nie je povolený", () => {
    const v = fixture();
    v.openings.push({ id: "d-zle", between: ["A-0-chodba", "A-1-chodba"] });
    expect(codes(errorsOf(v))).toEqual(["opening.cross-level"]);
  });

  it("vertikálne spojenie musí ukazovať na priestor na danom podlaží", () => {
    const v = fixture();
    v.vertical[0].spaces = { "A-0": "A-0-schody", "A-1": "A-0-vytah" };
    expect(codes(errorsOf(v))).toEqual(["vertical.level-mismatch"]);
  });

  it("izolovaný priestor je varovanie, nie chyba", () => {
    const v = fixture();
    v.spaces.push({ id: "A-1-sklad", level: "A-1", type: "room" });
    const r = validateVenue(v);
    expect(r.ok).toBe(true);
    expect(codes(r.issues)).toEqual(["space.isolated"]);
  });
});

describe("geometria", () => {
  it("prevedie otočenú halu B do metrov areálu", () => {
    const r = resolveGeometry(validVenue(), geometry());
    if (!r.ok) throw new Error("geometria neprešla");
    const xs = r.value.spaces["B-0-hala"].outer.map((p) => p[0]);
    const ys = r.value.spaces["B-0-hala"].outer.map((p) => p[1]);
    expect(Math.min(...xs)).toBeCloseTo(40);
    expect(Math.max(...xs)).toBeCloseTo(70);
    expect(Math.min(...ys)).toBeCloseTo(0);
    expect(Math.max(...ys)).toBeCloseTo(12);
    const [a, b] = r.value.openings["d-B-vstup"];
    expect(a[1]).toBeCloseTo(12);
    expect(b[1]).toBeCloseTo(12);
  });

  it("POI bez bodu v SVG dostane bod vnútri priestoru", () => {
    const r = resolveGeometry(validVenue(), geometry());
    if (!r.ok) throw new Error("geometria neprešla");
    expect(r.value.pois["poi-recepcia"]).toEqual([11, 9]);
    const [x, y] = r.value.pois["poi-sklad"];
    expect(x).toBeGreaterThan(62);
    expect(y).toBeLessThan(4);
  });

  it("posunuté dvere neležia na hranici", () => {
    const g = geometry();
    g["A-0"].segments["d-A0-jedalen"] = [[160, 65], [170, 65]];
    const r = resolveGeometry(validVenue(), g);
    expect(r.ok).toBe(false);
    expect(r.issues).toHaveLength(2); // mimo chodby aj mimo jedálne
    expect(new Set(codes(r.issues))).toEqual(new Set(["geometry.opening-off-boundary"]));
  });

  it("toleruje hrúbku steny do wallTolerance", () => {
    const g = geometry();
    g["A-0"].segments["d-A0-jedalen"] = [[160, 62], [170, 62]]; // 0.2 m od chodby
    expect(resolveGeometry(validVenue(), g).ok).toBe(true);
  });

  it("chýbajúci polygón, POI mimo priestoru a nepoužitý prvok SVG", () => {
    const g = geometry();
    delete g["A-1"].polygons["A-1-zasadacka"];
    g["A-0"].points["poi-recepcia"] = [10, 10];
    g["OUT"].polygons["OUT-nieco"] = { outer: [[0, 0], [1, 0], [1, 1]] };
    const r = resolveGeometry(validVenue(), g);
    expect(codes(r.issues).sort()).toEqual(["geometry.missing-space", "geometry.poi-outside", "geometry.unused"]);
  });
});

describe("pomocné", () => {
  it("JSON Pointer → čitateľná cesta", () => {
    expect(pointerToPath("/spaces/3/level")).toBe("spaces[3].level");
    expect(pointerToPath("/vertical/0/spaces/A~10")).toBe("vertical[0].spaces.A/0");
    expect(pointerToPath("")).toBe("");
  });
});
