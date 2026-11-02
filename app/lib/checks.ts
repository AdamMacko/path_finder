import { metersPerPixel, type Areal, type Budova } from "./model";
import { pravidlaProblems, type Pravidla } from "./rules";
import { incompleteGroups, verticalGroups } from "./vertical";

export type CheckSeverity = "error" | "warning";

export type Check = {
  id: string;
  severity: CheckSeverity;
  /** Skupina v prehľade. */
  section: "Outdoor mapa" | "Budovy" | "Pravidlá";
  title: string;
  detail?: string;
  /** Stránka, kde sa to dá opraviť. */
  href: string;
};

export type Readiness = {
  checks: Check[];
  /** Podiel splnených kontrol (0–1). */
  score: number;
  stats: { budovy: number; podlazia: number; priestory: number; dvere: number; vstupy: number; poi: number; pravidla: number; profily: number };
};

const FIXED_TOTAL = 12;

/**
 * Čo ešte chýba, aby sa z anotácií dal odvodiť použiteľný navigačný graf: plocha, vstupy, dvere, spojenie podlaží, mierky.
 * Chyba = trasa sa nedá vypočítať, upozornenie = trasa vznikne, ale bude nepresná alebo neúplná.
 */
export function checkReadiness(areal: Areal, pravidla: Pravidla): Readiness {
  const checks: Check[] = [];
  const add = (c: Omit<Check, "id"> & { id?: string }) => checks.push({ ...c, id: c.id ?? `${c.section}:${c.title}` });

  const buildings = areal.budovy.filter((b) => b.kind === "budova");
  const vstupy = areal.vstupy ?? [];
  const OUT = "/building_complex";
  const BUILDINGS = "/buildings";

  if (!areal.podkladObrazokUrl) add({ severity: "error", section: "Outdoor mapa", title: "Chýba podklad outdoor mapy", detail: "Nahrajte fotku alebo SVG areálu.", href: OUT });
  if (!areal.hranica || areal.hranica.length < 3)
    add({ severity: "error", section: "Outdoor mapa", title: "Chýba pochôdzna plocha", detail: "Bez nej sa nedá odvodiť trasa medzi budovami.", href: OUT });
  if (!metersPerPixel(areal.mierka)) add({ severity: "warning", section: "Outdoor mapa", title: "Outdoor mapa nie je kalibrovaná", detail: "Vzdialenosti by neboli v metroch.", href: OUT });
  if (buildings.length === 0) add({ severity: "error", section: "Outdoor mapa", title: "Žiadne budovy", detail: "Označte budovy na outdoor mape.", href: OUT });
  if (vstupy.some((v) => v.ref === null))
    add({ severity: "warning", section: "Outdoor mapa", title: "Vstup bez budovy", detail: `${vstupy.filter((v) => v.ref === null).length} vstup(ov) nie je priradených k budove.`, href: OUT });

  for (const b of buildings) {
    const entrances = vstupy.filter((v) => v.ref === b.id);
    if (entrances.length === 0)
      add({ severity: "error", section: "Outdoor mapa", title: `Budova „${b.nazov}“ nemá vstup`, detail: "Nedá sa do nej vojsť z vonkajšej plochy.", href: OUT });
    checkBuilding(b, entrances.map((e) => e.id));
  }

  function checkBuilding(b: Budova, entranceIds: string[]) {
    const where = `Budova „${b.nazov}“`;
    if (b.podlazia.length === 0) {
      add({ severity: "error", section: "Budovy", title: `${where} nemá podlažia`, detail: "Pridajte podlažia a nahrajte pôdorysy.", href: BUILDINGS });
      return;
    }
    const orders = b.podlazia.map((f) => f.poradie);
    if (new Set(orders).size !== orders.length)
      add({ severity: "error", section: "Budovy", title: `${where}: opakuje sa poradie podlaží`, detail: "Každé podlažie musí mať iné číslo poradia.", href: BUILDINGS });

    for (const f of b.podlazia) {
      const name = `${where}, ${f.nazov}`;
      if (!f.podkladObrazokUrl && !f.svgContent)
        add({ severity: "error", section: "Budovy", title: `${name}: chýba pôdorys`, href: BUILDINGS });
      if (f.priestory.length === 0) add({ severity: "error", section: "Budovy", title: `${name}: žiadne priestory`, href: BUILDINGS });
      else if (f.priestory.length > 1 && (f.dvere ?? []).length === 0)
        add({ severity: "error", section: "Budovy", title: `${name}: žiadne dvere`, detail: "Priestory nie sú medzi sebou prepojené.", href: BUILDINGS });
      if (!metersPerPixel(f.mierka)) add({ severity: "warning", section: "Budovy", title: `${name}: pôdorys nie je kalibrovaný`, href: BUILDINGS });
    }

    if (b.podlazia.length > 1) {
      if (verticalGroups(b).length === 0)
        add({ severity: "error", section: "Budovy", title: `${where}: podlažia nie sú prepojené`, detail: "Označte schodisko alebo výťah a spojte ho na každom podlaží.", href: BUILDINGS });
      for (const g of incompleteGroups(b))
        add({ severity: "warning", section: "Budovy", title: `${where}: spojenie „${g.members[0]?.itemName}“ vedie iba na jedno podlažie`, href: BUILDINGS });
    }

    // Každý vstup z outdoor mapy musí mať na niektorom podlaží zodpovedajúce dvere, inak sa nedá vojsť do vnútra.
    const linked = new Set(b.podlazia.flatMap((f) => (f.dvere ?? []).map((d) => d.ref).filter((r): r is string => r !== null)));
    for (const id of entranceIds) {
      if (!linked.has(id))
        add({ severity: "error", section: "Budovy", title: `${where}: vstup z exteriéru nie je napojený na vnútro`, detail: "Na prízemí priraďte dverám vstup z outdoor mapy.", href: BUILDINGS });
    }
  }

  const poiCount = (areal.poi ?? []).length + buildings.flatMap((b) => b.podlazia).reduce((n, f) => n + (f.poi ?? []).length, 0);
  if (poiCount === 0) add({ severity: "warning", section: "Budovy", title: "Žiadne body záujmu", detail: "Nebude čo vyhľadávať v navigácii.", href: BUILDINGS });

  if (pravidla.profiles.length === 0)
    add({ severity: "error", section: "Pravidlá", title: "Žiadny profil používateľa", detail: "Trasu sa počíta pre profil.", href: "/rules" });
  for (const p of pravidlaProblems(pravidla)) add({ severity: "warning", section: "Pravidlá", title: p, href: "/rules" });
  const zoneIds = new Set(pravidla.zones.map((z) => z.id));
  const unknown = buildings.flatMap((b) => b.podlazia).flatMap((f) => f.priestory).filter((p) => p.meta?.zona && !zoneIds.has(p.meta.zona));
  if (unknown.length > 0)
    add({ severity: "warning", section: "Pravidlá", title: `${unknown.length} priestor(ov) odkazuje na neexistujúcu zónu`, detail: "Načítajte alebo vytvorte zóny.", href: "/rules" });

  const floors = buildings.flatMap((b) => b.podlazia);
  const stats = {
    budovy: buildings.length,
    podlazia: floors.length,
    priestory: floors.reduce((n, f) => n + f.priestory.length, 0),
    dvere: floors.reduce((n, f) => n + (f.dvere ?? []).length, 0),
    vstupy: vstupy.length,
    poi: poiCount,
    pravidla: pravidla.rules.length,
    profily: pravidla.profiles.length,
  };

  // Skóre: pevný počet kontrol, z ktorých sa odpočítava váha problémov (chyba 1, upozornenie 0,5).
  const penalty = checks.reduce((s, c) => s + (c.severity === "error" ? 1 : 0.5), 0);
  const score = Math.max(0, 1 - penalty / Math.max(FIXED_TOTAL, buildings.length * 4 + FIXED_TOTAL / 2));

  return { checks, score, stats };
}
