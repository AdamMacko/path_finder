import { Ajv, type ErrorObject } from "ajv";
import { pointerToPath, result, type Issue, type Result } from "./issues";
import { Venue } from "./schema";
import { isOutdoor } from "./lookup";

const ajv = new Ajv({ allErrors: true, strict: true });
const checkSchema = ajv.compile<Venue>(Venue);

/**
 * Validácia areálu v dvoch vrstvách:
 * 1. JSON Schéma – tvar, typy, povinné polia, neznáme vlastnosti (preklepy).
 * 2. Väzby – jedinečné `id`, odkazy medzi entitami, prechody medzi podlažiami tej istej budovy, …
 * Geometriu kontroluje `resolveGeometry`, lebo pochádza zo SVG.
 */
export function validateVenue(data: unknown): Result<Venue> {
  if (!checkSchema(data)) return { ok: false, issues: schemaIssues(checkSchema.errors ?? []) };
  return result(data, referenceIssues(data));
}

/* ---------- 1. JSON Schéma ---------- */

function schemaIssues(errors: ErrorObject[]): Issue[] {
  return pruneUnionErrors(errors).map((e) => ({
    severity: "error",
    code: `schema.${e.keyword}`,
    path: pointerToPath(e.instancePath),
    message: schemaMessage(e),
  }));
}

/**
 * Pri únii (napr. typy pravidiel) Ajv hlási chyby zo všetkých vetiev. Ponecháme iba vetvy, ktorých
 * `type` sedí. Ak nesedí žiadna, ostane jediná chyba „neznámy typ“.
 */
function pruneUnionErrors(errors: ErrorObject[]): ErrorObject[] {
  const unions = errors.filter((e) => e.keyword === "anyOf");
  let kept = errors;
  for (const u of unions) {
    const prefix = `${u.schemaPath}/`;
    const inBranch = (e: ErrorObject) => e.schemaPath.startsWith(prefix);
    const branchOf = (e: ErrorObject) => e.schemaPath.slice(prefix.length).split("/")[0];
    const wrongType = new Set(
      kept.filter((e) => inBranch(e) && e.instancePath === `${u.instancePath}/type` && e.keyword === "const").map(branchOf)
    );
    const matching = kept.filter((e) => inBranch(e) && !wrongType.has(branchOf(e)));
    kept = kept.filter((e) => !inBranch(e) && e !== u);
    kept.push(...(matching.length ? matching : [u]));
  }
  return kept;
}

function schemaMessage(e: ErrorObject): string {
  const p = e.params as Record<string, unknown>;
  switch (e.keyword) {
    case "required":
      return `chýba povinná vlastnosť „${p.missingProperty}“`;
    case "additionalProperties":
      return `neznáma vlastnosť „${p.additionalProperty}“`;
    case "type":
      return `očakáva sa typ ${p.type}`;
    case "const":
      return `očakáva sa hodnota ${JSON.stringify(p.allowedValue)}`;
    case "anyOf":
      return "hodnota nezodpovedá žiadnemu povolenému tvaru (skontroluj „type“)";
    case "pattern":
      return `hodnota nemá požadovaný formát (${p.pattern})`;
    case "minItems":
      return `očakáva sa aspoň ${p.limit} položiek`;
    case "minProperties":
      return `očakáva sa aspoň ${p.limit} položiek`;
    case "uniqueItems":
      return "položky sa opakujú";
    default:
      return e.message ?? e.keyword;
  }
}

/* ---------- 2. Väzby ---------- */

function referenceIssues(v: Venue): Issue[] {
  const issues: Issue[] = [];
  const err = (code: string, path: string, message: string) => issues.push({ severity: "error", code, path, message });
  const warn = (code: string, path: string, message: string) => issues.push({ severity: "warning", code, path, message });

  // Jedinečnosť id. Priestory, prechody, vertikálne spojenia a POI zdieľajú menný priestor, lebo
  // všetky odkazujú na prvky SVG.
  const unique = (groups: [string, { id: string }[]][]) => {
    const seen = new Map<string, string>();
    for (const [name, items] of groups) {
      items.forEach((x, i) => {
        const path = `${name}[${i}].id`;
        const prev = seen.get(x.id);
        if (prev) err("id.duplicate", path, `id „${x.id}“ už používa ${prev}`);
        else seen.set(x.id, path);
      });
    }
  };
  unique([["buildings", v.buildings]]);
  unique([["levels", v.levels]]);
  unique([["spaces", v.spaces], ["openings", v.openings], ["vertical", v.vertical], ["pois", v.pois]]);
  unique([["rules", v.rules]]);
  unique([["zones", v.zones]]);
  unique([["profiles", v.profiles]]);

  const buildings = new Set(v.buildings.map((b) => b.id));
  const levels = new Map(v.levels.map((l) => [l.id, l]));
  const spaces = new Map(v.spaces.map((s) => [s.id, s]));
  const rules = new Set(v.rules.map((r) => r.id));
  const zones = new Set(v.zones.map((z) => z.id));

  const checkRules = (ids: string[] | undefined, path: string) =>
    ids?.forEach((r, i) => rules.has(r) || err("ref.unknown-rule", `${path}[${i}]`, `neznáme pravidlo „${r}“`));

  v.levels.forEach((l, i) => {
    if (l.building !== undefined && !buildings.has(l.building))
      err("ref.unknown-building", `levels[${i}].building`, `neznáma budova „${l.building}“`);
  });
  const ordinals = new Map<string, string>();
  v.levels.forEach((l, i) => {
    if (l.building === undefined) return;
    const key = `${l.building}/${l.ordinal}`;
    const prev = ordinals.get(key);
    if (prev) err("level.duplicate-ordinal", `levels[${i}].ordinal`, `budova „${l.building}“ už má podlažie s ordinal ${l.ordinal} (${prev})`);
    else ordinals.set(key, l.id);
  });

  v.spaces.forEach((s, i) => {
    if (!levels.has(s.level)) err("ref.unknown-level", `spaces[${i}].level`, `neznáme podlažie „${s.level}“`);
    if (s.zone !== undefined && !zones.has(s.zone)) err("ref.unknown-zone", `spaces[${i}].zone`, `neznáma zóna „${s.zone}“`);
  });

  const connected = new Set<string>();

  v.openings.forEach((o, i) => {
    const path = `openings[${i}]`;
    const [a, b] = o.between;
    if (a === b) err("opening.same-space", `${path}.between`, "prechod musí spájať dva rôzne priestory");
    const sa = spaces.get(a);
    const sb = spaces.get(b);
    if (!sa) err("ref.unknown-space", `${path}.between[0]`, `neznámy priestor „${a}“`);
    if (!sb) err("ref.unknown-space", `${path}.between[1]`, `neznámy priestor „${b}“`);
    checkRules(o.rules, `${path}.rules`);
    connected.add(a).add(b);
    if (!sa || !sb || sa.level === sb.level) return;
    const la = levels.get(sa.level);
    const lb = levels.get(sb.level);
    if (la && lb && !isOutdoor(la) && la.building === lb.building)
      err(
        "opening.cross-level",
        `${path}.between`,
        `prechod spája podlažia „${la.id}“ a „${lb.id}“ tej istej budovy – na to slúži vertikálne spojenie`
      );
  });

  v.vertical.forEach((vc, i) => {
    const path = `vertical[${i}]`;
    const owners = new Set<string | undefined>();
    for (const [levelId, spaceId] of Object.entries(vc.spaces)) {
      const level = levels.get(levelId);
      const space = spaces.get(spaceId);
      if (!level) err("ref.unknown-level", `${path}.spaces.${levelId}`, `neznáme podlažie „${levelId}“`);
      if (!space) err("ref.unknown-space", `${path}.spaces.${levelId}`, `neznámy priestor „${spaceId}“`);
      else if (space.level !== levelId)
        err("vertical.level-mismatch", `${path}.spaces.${levelId}`, `priestor „${spaceId}“ leží na podlaží „${space.level}“, nie „${levelId}“`);
      if (level) owners.add(level.building);
      connected.add(spaceId);
    }
    if (owners.size > 1) warn("vertical.multi-building", path, "vertikálne spojenie spája podlažia rôznych budov alebo exteriér");
    checkRules(vc.rules, `${path}.rules`);
  });

  v.pois.forEach((p, i) => {
    if (!spaces.has(p.space)) err("ref.unknown-space", `pois[${i}].space`, `neznámy priestor „${p.space}“`);
  });

  v.zones.forEach((z, i) => checkRules(z.rules, `zones[${i}].rules`));

  v.profiles.forEach((p, i) => {
    if (!Object.values(p.weights).some((w) => (w ?? 0) > 0))
      warn("profile.no-weights", `profiles[${i}].weights`, "profil nemá žiadnu kladnú váhu – všetky trasy budú mať nulovú cenu");
  });

  v.spaces.forEach((s, i) => {
    if (!connected.has(s.id)) warn("space.isolated", `spaces[${i}]`, `priestor „${s.id}“ nemá žiadny prechod ani vertikálne spojenie`);
  });

  return issues;
}
