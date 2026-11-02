import type { Profile, Rule, Zone } from "@/lib/core/model/schema";
import venueJson from "../../lib/core/fixtures/test-venue.json";
import { createId } from "./model";

/**
 * Pravidlá prístupu, zóny a profily používateľov (kap. 1.7, 2.2). Majú rovnaký tvar ako v dátovom modeli
 * (`lib/core/model/schema`), takže sa dajú neskôr vložiť do exportovaného areálu bez prevodu.
 */
export type Pravidla = { rules: Rule[]; zones: Zone[]; profiles: Profile[] };

export const createEmptyPravidla = (): Pravidla => ({ rules: [], zones: [], profiles: [] });

/** Ukážkové pravidlá, zóny a profily z testovacieho areálu. */
export function createSeedPravidla(): Pravidla {
  const v = venueJson as unknown as Pravidla;
  return structuredClone({ rules: v.rules, zones: v.zones, profiles: v.profiles });
}

export type RuleType = Rule["type"];

export const RULE_TYPE_LABEL: Record<RuleType, string> = {
  card: "Prístupová karta",
  role: "Rola",
  time: "Časové okno",
  ppe: "OOPP",
};

export const RULE_TYPE_HINT: Record<RuleType, string> = {
  card: "Vyžaduje, aby mal používateľ prístupovú kartu.",
  role: "Vstup majú iba používatelia aspoň s jednou z uvedených rolí.",
  time: "Prechod je možný iba v danom čase. Ak je „do“ skôr než „od“, okno prechádza cez polnoc (nočná zmena).",
  ppe: "Vyžaduje osobné ochranné pracovné prostriedky.",
};

export const DAYS = [
  { value: "Mo", label: "Po" },
  { value: "Tu", label: "Ut" },
  { value: "We", label: "St" },
  { value: "Th", label: "Št" },
  { value: "Fr", label: "Pi" },
  { value: "Sa", label: "So" },
  { value: "Su", label: "Ne" },
] as const;

export function createRule(type: RuleType): Rule {
  const id = createId("pravidlo");
  switch (type) {
    case "card":
      return { id, type, name: "Prístupová karta" };
    case "ppe":
      return { id, type, name: "OOPP povinné" };
    case "role":
      return { id, type, name: "Iba vybrané roly", roles: ["employee"] };
    case "time":
      return { id, type, name: "Pracovná zmena", days: ["Mo", "Tu", "We", "Th", "Fr"], from: "06:00", to: "18:00" };
  }
}

export const createZone = (): Zone => ({ id: createId("zona"), name: "Nová zóna", rules: [] });

export const createProfile = (): Profile => ({
  id: createId("profil"),
  name: "Nový profil",
  roles: [],
  weights: { distance: 1 },
});

/** Čitateľný popis pravidla do zoznamov. */
export function describeRule(rule: Rule): string {
  switch (rule.type) {
    case "card":
      return "vyžaduje kartu";
    case "ppe":
      return "vyžaduje OOPP";
    case "role":
      return `roly: ${rule.roles.join(", ") || "žiadne"}`;
    case "time": {
      const days = rule.days ? rule.days.map((d) => DAYS.find((x) => x.value === d)?.label ?? d).join(" ") : "denne";
      return `${days} ${rule.from}–${rule.to}`;
    }
  }
}

/** Odstráni odkazy na zmazané pravidlo zo zón. */
export function withoutRule(p: Pravidla, ruleId: string): Pravidla {
  return {
    ...p,
    rules: p.rules.filter((r) => r.id !== ruleId),
    zones: p.zones.map((z) => ({ ...z, rules: z.rules.filter((id) => id !== ruleId) })),
  };
}

/** Problémy v nastavení, ktoré by znemožnili trasu alebo dali nezmyselný výsledok. */
export function pravidlaProblems(p: Pravidla): string[] {
  const out: string[] = [];
  const ruleIds = new Set(p.rules.map((r) => r.id));
  for (const z of p.zones) {
    if (z.rules.length === 0) out.push(`Zóna „${z.name ?? z.id}“ nemá žiadne pravidlo, takže nikoho neobmedzuje.`);
    if (z.rules.some((id) => !ruleIds.has(id))) out.push(`Zóna „${z.name ?? z.id}“ odkazuje na neexistujúce pravidlo.`);
  }
  for (const pr of p.profiles) {
    if (!Object.values(pr.weights).some((w) => (w ?? 0) > 0))
      out.push(`Profil „${pr.name ?? pr.id}“ nemá žiadnu kladnú váhu, všetky trasy by mali nulovú cenu.`);
  }
  for (const r of p.rules) {
    if (r.type === "role" && r.roles.length === 0) out.push(`Pravidlo „${r.name ?? r.id}“ nemá žiadnu rolu, nikto by ním neprešiel.`);
  }
  return out;
}
