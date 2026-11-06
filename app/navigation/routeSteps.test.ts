import { describe, expect, it } from "vitest";
import type { MapLevel, RouteLeg } from "@/lib/api/types";
import { routeSteps } from "./routeSteps";

const levels = new Map<string, MapLevel>([
  ["A-0", { id: "A-0", ordinal: 0, name: "Prízemie" }],
  ["A-1", { id: "A-1", ordinal: 1, name: "1. poschodie" }],
]);

describe("routeSteps", () => {
  it("rozdelí trasu v odbočkách a pridá cieľ", () => {
    const legs: RouteLeg[] = [{ level: "A-0", points: [[0, 0], [10, 0], [10, 5]] }];
    const steps = routeSteps(legs, levels, "Recepcia");
    expect(steps.map((s) => s.text)).toEqual(["Vyraz 10 m, potom odbočíš doprava", "Pokračuj 5 m", "Cieľ: Recepcia"]);
  });

  it("rovné body nezalomí", () => {
    const steps = routeSteps([{ level: "A-0", points: [[0, 0], [5, 0], [10, 0]] }], levels, "X");
    expect(steps).toHaveLength(2);
    expect(steps[0].distance).toBe(10);
  });

  it("pri zmene podlažia pridá krok s výťahom", () => {
    const legs: RouteLeg[] = [
      { level: "A-0", points: [[0, 0], [4, 0]], transition: { type: "elevator", vertical: "v", toLevel: "A-1" } },
      { level: "A-1", points: [[4, 0], [4, 6]] },
    ];
    const texts = routeSteps(legs, levels, "Zasadačka").map((s) => s.text);
    expect(texts).toEqual(["Vyraz 4 m", "Použi výťah na podlažie 1. poschodie", "Pokračuj na podlaží 1. poschodie 6 m", "Cieľ: Zasadačka"]);
  });
});
