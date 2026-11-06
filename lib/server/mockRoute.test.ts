import { describe, expect, it } from "vitest";
import venueJson from "../core/fixtures/test-venue.json";
import { indexVenue } from "../core/model/lookup";
import type { Venue } from "../core/model/schema";
import { mockRoute } from "./mockRoute";

const index = indexVenue(venueJson as unknown as Venue);
const monday10 = "2026-11-02T10:00:00";
const route = (profile: string, to: string, time = monday10, from = "poi-parkovisko") =>
  mockRoute({ profile, from: { poi: from }, to: { poi: to }, time }, index);

describe("mockRoute", () => {
  it("návštevník ide na zasadačku schodmi", () => {
    const r = route("visitor", "poi-zasadacka");
    expect(r.status).toBe("ok");
    if (r.status === "ok") {
      expect(r.legs.map((l) => l.level)).toEqual(["OUT", "A-0", "A-1"]);
      expect(r.legs[1].transition).toEqual({ type: "stairs", vertical: "schody-A", toLevel: "A-1" });
    }
  });

  it("bezbariérový profil ide výťahom", () => {
    const r = route("accessible", "poi-zasadacka");
    expect(r.status === "ok" && r.legs[1].transition?.type).toBe("elevator");
  });

  it("výroba je pre návštevníka nedostupná, pre zamestnanca iba počas zmeny", () => {
    expect(route("visitor", "poi-montaz").status).toBe("unreachable");
    expect(route("employee", "poi-montaz").status).toBe("ok");
    expect(route("employee", "poi-montaz", "2026-11-07T10:00:00").status).toBe("unreachable");
  });

  it("trasy majú nadväzujúce úseky", () => {
    const r = route("employee", "poi-montaz");
    if (r.status !== "ok") throw new Error("očakávaná trasa");
    expect(r.legs[0].points.at(-1)).toEqual(r.legs[1].points[0]);
    expect(r.distance).toBeGreaterThan(0);
    expect(r.duration).toBeGreaterThan(0);
  });
});
