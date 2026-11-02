import { describe, expect, it } from "vitest";
import { createBudova, createPodlazie, createPriestor, type Budova } from "./model";
import { describeGroup, incompleteGroups, verticalGroups } from "./vertical";

function building(): Budova {
  const b = createBudova({ x: 0, y: 0 }, "A", "budova");
  const f0 = createPodlazie("Prízemie", 1);
  const f1 = createPodlazie("1. poschodie", 2);
  const stairs0 = createPriestor({ x: 0, y: 0 }, "Schodisko", "vertikála");
  const stairs1 = createPriestor({ x: 0, y: 0 }, "Schodisko", "vertikála");
  const lift0 = createPriestor({ x: 50, y: 0 }, "Výťah", "vertikála");
  stairs0.meta = { vertikala: { skupina: "s", typ: "stairs" } };
  stairs1.meta = { vertikala: { skupina: "s", typ: "stairs" } };
  lift0.meta = { vertikala: { skupina: "l", typ: "elevator" } };
  f0.priestory = [stairs0, lift0, createPriestor({ x: 100, y: 0 }, "Kancelária", "miestnosť")];
  f1.priestory = [stairs1];
  b.podlazia = [f1, f0];
  return b;
}

describe("vertikálne spojenia", () => {
  it("zoskupí priestory podľa spojenia a zoradí podlažia", () => {
    const groups = verticalGroups(building());
    expect(groups.map((g) => g.skupina).sort()).toEqual(["l", "s"]);
    const stairs = groups.find((g) => g.skupina === "s")!;
    expect(stairs.members.map((m) => m.floorName)).toEqual(["Prízemie", "1. poschodie"]);
    expect(describeGroup(stairs)).toBe("Schody: Prízemie, 1. poschodie");
  });

  it("nájde spojenie, ktoré spája iba jedno podlažie", () => {
    expect(incompleteGroups(building()).map((g) => g.skupina)).toEqual(["l"]);
  });
});
