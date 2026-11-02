"use client";

import * as React from "react";
import { Clock, CreditCard, HardHat, Plus, Trash2, UserRound, X } from "lucide-react";
import type { Profile, Rule, Weights, Zone } from "@/lib/core/model/schema";
import { AlertBox } from "../components/allertsBox";
import { useLocalStorage } from "../lib/useLocalStorage";
import {
  DAYS,
  RULE_TYPE_HINT,
  RULE_TYPE_LABEL,
  createEmptyPravidla,
  createProfile,
  createRule,
  createSeedPravidla,
  createZone,
  describeRule,
  pravidlaProblems,
  withoutRule,
  type RuleType,
} from "../lib/rules";

type Tab = "rules" | "zones" | "profiles";

const TABS: { id: Tab; label: string }[] = [
  { id: "rules", label: "Pravidlá" },
  { id: "zones", label: "Zóny" },
  { id: "profiles", label: "Profily" },
];

const RULE_ICON: Record<RuleType, React.ReactNode> = {
  card: <CreditCard size={15} />,
  role: <UserRound size={15} />,
  time: <Clock size={15} />,
  ppe: <HardHat size={15} />,
};

const WEIGHTS: { key: keyof Weights; label: string; hint: string }[] = [
  { key: "distance", label: "Vzdialenosť", hint: "Cena za každý meter trasy." },
  { key: "time", label: "Čas", hint: "Cena za sekundu presunu (schody sú pomalšie než chodba, výťah má čakanie)." },
  { key: "outdoor", label: "Pobyt vonku", hint: "Pokuta za úseky v exteriéri (počasie)." },
  { key: "avoid", label: "Vyhnúť sa", hint: "Pokuta za priestory označené na vyhnutie (napr. pohyb vozíkov)." },
  { key: "unpreferred", label: "Mimo preferovaných", hint: "Pokuta za priestory, ktoré nie sú preferovanou trasou." },
  { key: "levelChanges", label: "Zmena podlažia", hint: "Pokuta za každú zmenu podlažia (schody, výťah)." },
];

const inputClass =
  "w-full border border-line rounded-sm px-2.5 py-1.5 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-route/30 focus:border-route";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export default function PravidlaPage() {
  const [pravidla, setPravidla, hydrated] = useLocalStorage("path-finder/pravidla", createEmptyPravidla());
  const [tab, setTab] = React.useState<Tab>("rules");
  const problems = pravidlaProblems(pravidla);

  const setRule = (next: Rule) => setPravidla((p) => ({ ...p, rules: p.rules.map((r) => (r.id === next.id ? next : r)) }));
  const setZone = (next: Zone) => setPravidla((p) => ({ ...p, zones: p.zones.map((z) => (z.id === next.id ? next : z)) }));
  const setProfile = (next: Profile) => setPravidla((p) => ({ ...p, profiles: p.profiles.map((x) => (x.id === next.id ? next : x)) }));

  const count = { rules: pravidla.rules.length, zones: pravidla.zones.length, profiles: pravidla.profiles.length };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-line">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink">Pravidlá a profily</h1>
          <p className="text-sm text-ink-soft mt-1.5 max-w-xl">
            Tvrdé obmedzenia (karta, rola, čas, OOPP) rozhodujú, či je prechod pre používateľa vôbec prípustný. Váhy v profile určujú,
            ktorá z prípustných trás je vhodnejšia.
          </p>
        </div>
        <button
          onClick={() => setPravidla(createSeedPravidla())}
          className="shrink-0 text-xs text-ink-soft border border-line rounded-sm px-3 py-2 hover:text-route hover:border-route transition-colors"
        >
          Načítať ukážkové pravidlá
        </button>
      </div>

      {hydrated && problems.length > 0 && (
        <AlertBox severity="warning" title="Skontrolujte nastavenie">
          <ul className="list-disc pl-4 space-y-0.5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </AlertBox>
      )}

      <div role="tablist" className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "px-4 py-2.5 text-sm -mb-px border-b-2 transition-colors",
              tab === t.id ? "border-route text-route font-medium" : "border-transparent text-ink-soft hover:text-ink"
            )}
          >
            {t.label} <span className="font-mono text-xs">({count[t.id]})</span>
          </button>
        ))}
      </div>

      {!hydrated ? null : tab === "rules" ? (
        <section className="space-y-3">
          {pravidla.rules.length === 0 && (
            <Empty title="Zatiaľ žiadne pravidlá" text="Pridajte pravidlo a priraďte ho zóne alebo prechodu. Môžete aj načítať ukážkové pravidlá." />
          )}
          {pravidla.rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              usedIn={pravidla.zones.filter((z) => z.rules.includes(rule.id)).map((z) => z.name ?? z.id)}
              onChange={setRule}
              onDelete={() => setPravidla((p) => withoutRule(p, rule.id))}
            />
          ))}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(RULE_TYPE_LABEL) as RuleType[]).map((type) => (
              <button
                key={type}
                onClick={() => setPravidla((p) => ({ ...p, rules: [...p.rules, createRule(type)] }))}
                className="flex items-center gap-2 rounded-md border border-dashed border-line px-3 py-2 text-sm text-ink-soft hover:border-route hover:text-route transition-colors"
              >
                <Plus size={14} />
                {RULE_TYPE_LABEL[type]}
              </button>
            ))}
          </div>
        </section>
      ) : tab === "zones" ? (
        <section className="space-y-3">
          {pravidla.zones.length === 0 && (
            <Empty title="Zatiaľ žiadne zóny" text="Zóna je skupina priestorov (napr. výroba). Jej pravidlá platia pre prechody, ktoré do nej vedú zvonka." />
          )}
          {pravidla.zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              rules={pravidla.rules}
              onChange={setZone}
              onDelete={() => setPravidla((p) => ({ ...p, zones: p.zones.filter((z) => z.id !== zone.id) }))}
            />
          ))}
          <AddButton label="Pridať zónu" onClick={() => setPravidla((p) => ({ ...p, zones: [...p.zones, createZone()] }))} />
        </section>
      ) : (
        <section className="space-y-3">
          {pravidla.profiles.length === 0 && (
            <Empty title="Zatiaľ žiadne profily" text="Profil určuje, kto používateľ je (roly, karta, OOPP) a akú trasu uprednostňuje." />
          )}
          {pravidla.profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onChange={setProfile}
              onDelete={() => setPravidla((p) => ({ ...p, profiles: p.profiles.filter((x) => x.id !== profile.id) }))}
            />
          ))}
          <AddButton label="Pridať profil" onClick={() => setPravidla((p) => ({ ...p, profiles: [...p.profiles, createProfile()] }))} />
        </section>
      )}
    </div>
  );
}

/* ---------- Spoločné prvky ---------- */

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-line rounded-md bg-surface p-8 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="text-sm text-ink-soft mt-1 max-w-md mx-auto">{text}</p>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed border-line py-3 text-sm text-ink-soft hover:text-route hover:border-route transition-colors"
    >
      <Plus size={15} />
      {label}
    </button>
  );
}

function Card({ header, onDelete, children }: { header: React.ReactNode; onDelete: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-line rounded-md bg-surface">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        {header}
        <button onClick={onDelete} aria-label="Odstrániť" className="shrink-0 p-1.5 text-ink-soft hover:text-alarm transition-colors">
          <Trash2 size={15} />
        </button>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-ink-soft">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

/** Zoznam reťazcov (roly) – pridáva sa Enterom alebo čiarkou, odstraňuje krížikom. */
function Chips({ values, onChange, placeholder }: { values: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const [text, setText] = React.useState("");
  const add = (raw: string) => {
    const v = raw.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setText("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-line bg-paper px-2 py-1.5 focus-within:ring-2 focus-within:ring-route/30">
      {values.map((v) => (
        <span key={v} className="flex items-center gap-1 rounded-sm bg-route-soft px-2 py-0.5 text-xs text-route">
          {v}
          <button onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Odstrániť ${v}`}>
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value.slice(0, -1)) : setText(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(text);
          } else if (e.key === "Backspace" && text === "" && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={() => add(text)}
        placeholder={values.length === 0 ? placeholder : ""}
        className="min-w-[8rem] flex-1 bg-transparent text-sm focus:outline-none"
      />
    </div>
  );
}

/* ---------- Pravidlá ---------- */

function RuleCard({ rule, usedIn, onChange, onDelete }: { rule: Rule; usedIn: string[]; onChange: (r: Rule) => void; onDelete: () => void }) {
  return (
    <Card
      onDelete={onDelete}
      header={
        <>
          <span className="flex shrink-0 items-center gap-1.5 rounded-sm bg-paper px-2 py-1 text-xs text-ink-soft">
            {RULE_ICON[rule.type]}
            {RULE_TYPE_LABEL[rule.type]}
          </span>
          <input
            value={rule.name ?? ""}
            onChange={(e) => onChange({ ...rule, name: e.target.value })}
            aria-label="Názov pravidla"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink focus:outline-none"
          />
        </>
      }
    >
      <p className="text-xs text-ink-soft">{RULE_TYPE_HINT[rule.type]}</p>

      {rule.type === "role" && (
        <Field label="Povolené roly" hint="Napíšte názov roly a stlačte Enter. Roly sa priraďujú profilom.">
          <Chips values={rule.roles} onChange={(roles) => onChange({ ...rule, roles })} placeholder="napr. employee" />
        </Field>
      )}

      {rule.type === "time" && (
        <div className="space-y-3">
          <Field label="Dni">
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => {
                const on = rule.days ? rule.days.includes(d.value) : true;
                return (
                  <button
                    key={d.value}
                    onClick={() => {
                      const current = rule.days ?? DAYS.map((x) => x.value);
                      const next = on ? current.filter((x) => x !== d.value) : [...current, d.value];
                      // Všetkých sedem dní = bez obmedzenia dňa; žiadny deň by pravidlo nikdy nesplnil, preto ostane aspoň jeden.
                      if (next.length === 0) return;
                      onChange({ ...rule, days: next.length === DAYS.length ? undefined : (next as typeof rule.days) });
                    }}
                    className={cx(
                      "h-8 w-9 rounded-sm border text-xs transition-colors",
                      on ? "border-route bg-route text-white" : "border-line text-ink-soft hover:border-route"
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="flex gap-3">
            <Field label="Od">
              <input type="time" value={rule.from} onChange={(e) => e.target.value && onChange({ ...rule, from: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Do">
              <input type="time" value={rule.to} onChange={(e) => e.target.value && onChange({ ...rule, to: e.target.value })} className={inputClass} />
            </Field>
          </div>
          {rule.from > rule.to && <p className="text-xs text-flag">Okno prechádza cez polnoc (nočná zmena).</p>}
        </div>
      )}

      <p className="text-xs text-ink-soft">
        {describeRule(rule)} · {usedIn.length > 0 ? `použité v zónach: ${usedIn.join(", ")}` : "zatiaľ nepoužité v žiadnej zóne"}
      </p>
    </Card>
  );
}

/* ---------- Zóny ---------- */

function ZoneCard({ zone, rules, onChange, onDelete }: { zone: Zone; rules: Rule[]; onChange: (z: Zone) => void; onDelete: () => void }) {
  return (
    <Card
      onDelete={onDelete}
      header={
        <input
          value={zone.name ?? ""}
          onChange={(e) => onChange({ ...zone, name: e.target.value })}
          aria-label="Názov zóny"
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink focus:outline-none"
        />
      }
    >
      {rules.length === 0 ? (
        <p className="text-sm text-ink-soft">Najprv pridajte pravidlá na karte Pravidlá.</p>
      ) : (
        <Field label="Pravidlá platné pri vstupe do zóny" hint="Používateľ musí splniť všetky vybrané pravidlá.">
          <ul className="space-y-1">
            {rules.map((r) => (
              <li key={r.id}>
                <label className="flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm text-ink hover:bg-paper">
                  <input
                    type="checkbox"
                    checked={zone.rules.includes(r.id)}
                    onChange={(e) =>
                      onChange({ ...zone, rules: e.target.checked ? [...zone.rules, r.id] : zone.rules.filter((id) => id !== r.id) })
                    }
                  />
                  <span className="text-ink-soft">{RULE_ICON[r.type]}</span>
                  <span className="flex-1">{r.name ?? r.id}</span>
                  <span className="text-xs text-ink-soft">{describeRule(r)}</span>
                </label>
              </li>
            ))}
          </ul>
        </Field>
      )}
      <p className="text-xs text-ink-soft">Priestory do zóny zaraďujete na stránke Správa budov, pri vybranom priestore.</p>
    </Card>
  );
}

/* ---------- Profily ---------- */

function ProfileCard({ profile, onChange, onDelete }: { profile: Profile; onChange: (p: Profile) => void; onDelete: () => void }) {
  const accessible = profile.require?.includes("accessible") ?? false;
  const setWeight = (key: keyof Weights, value: number) => onChange({ ...profile, weights: { ...profile.weights, [key]: value } });

  return (
    <Card
      onDelete={onDelete}
      header={
        <input
          value={profile.name ?? ""}
          onChange={(e) => onChange({ ...profile, name: e.target.value })}
          aria-label="Názov profilu"
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink focus:outline-none"
        />
      }
    >
      <Field label="Roly profilu" hint="Pravidlá typu Rola sa porovnávajú s týmito rolami.">
        <Chips values={profile.roles} onChange={(roles) => onChange({ ...profile, roles })} placeholder="napr. visitor, employee" />
      </Field>

      <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {(
          [
            ["Má prístupovú kartu", !!profile.card, (v: boolean) => onChange({ ...profile, card: v })],
            ["Má OOPP", !!profile.ppe, (v: boolean) => onChange({ ...profile, ppe: v })],
            ["Vidí interné body záujmu", !!profile.internal, (v: boolean) => onChange({ ...profile, internal: v })],
            [
              "Vyžaduje bezbariérovú trasu",
              accessible,
              (v: boolean) => onChange({ ...profile, require: v ? ["accessible"] : undefined }),
            ],
          ] as const
        ).map(([label, checked, set]) => (
          <label key={label} className="flex items-center gap-2.5 py-1 text-sm text-ink">
            <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} />
            {label}
          </label>
        ))}
      </div>

      <Field label="Rýchlosť chôdze (m/s)" hint="Predvolene 1,3 m/s. Pomalší profil (napr. vozík 0,8) predĺži odhadovaný čas.">
        <input
          type="number"
          min={0.1}
          max={3}
          step={0.1}
          value={profile.speed ?? ""}
          placeholder="1,3"
          onChange={(e) => {
            const v = Number.parseFloat(e.target.value);
            onChange({ ...profile, speed: Number.isFinite(v) && v > 0 ? v : undefined });
          }}
          className={cx(inputClass, "max-w-[8rem]")}
        />
      </Field>

      <div>
        <p className="text-xs text-ink-soft">Váhy kritérií (0 = nezohľadňuje sa)</p>
        <div className="mt-2 space-y-2.5">
          {WEIGHTS.map(({ key, label, hint }) => {
            const value = profile.weights[key] ?? 0;
            return (
              <div key={key} title={hint}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink">{label}</span>
                  <span className="font-mono text-xs text-ink-soft tabular-nums">{value.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={value}
                  onChange={(e) => setWeight(key, Number.parseFloat(e.target.value))}
                  aria-label={label}
                  className="w-full accent-route"
                />
                <p className="text-xs text-ink-soft">{hint}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
