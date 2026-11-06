"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  ArrowRight, Building2, Check, ChevronDown, Copy, DoorOpen, FileCheck2, Layers, Map as MapIcon, MapPin, Ruler, Search, ShieldCheck, X,
} from "lucide-react";

/* ---------- Obsah ---------- */

const STEPS = [
  { icon: MapIcon, title: "Outdoor podklad", short: "Nahrajte fotku alebo SVG areálu.", detail: "Podklad má byť zhora a čitateľný. Veľké obrázky spomaľujú editor.", href: "/building_complex" },
  { icon: Ruler, title: "Mierka", short: "Dva body, ktorých vzdialenosť poznáte.", detail: "Čím ďalej od seba, tým presnejšie. Mierku nastavte aj pre každý pôdorys zvlášť.", href: "/building_complex" },
  { icon: MapIcon, title: "Pochôdzna plocha", short: "Obkreslite, kade sa dá ísť.", detail: "Budovy sa odpočítajú samy. Cesty pre autá a trávniky označte ako zakázané plochy.", href: "/building_complex" },
  { icon: Building2, title: "Budovy a vstupy", short: "Obdĺžniky budov a úsečky vstupov.", detail: "Každá budova potrebuje aspoň jeden vstup na obryse.", href: "/building_complex" },
  { icon: Layers, title: "Podlažia a priestory", short: "Pôdorysy, miestnosti, chodby.", detail: "Poradie podlaží je jedinečné: 0 je prízemie, záporné čísla suterén.", href: "/buildings" },
  { icon: DoorOpen, title: "Dvere a schodiská", short: "Dvere na hranici priestorov, schodisko na každom podlaží.", detail: "Dvere na prízemí prepojte so vstupom, podľa nich sa pôdorys ukotví na mapu.", href: "/buildings" },
  { icon: MapPin, title: "Body záujmu", short: "Ciele navigácie.", detail: "Interný bod (napr. serverovňa) uvidí iba profil s oprávnením.", href: "/buildings" },
  { icon: ShieldCheck, title: "Pravidlá a profily", short: "Kto kam smie a čo uprednostňuje.", detail: "Pravidlá do zón, zóny priestorom, váhy profilom.", href: "/rules" },
  { icon: FileCheck2, title: "Kontrola a export", short: "Prehľad ukáže, čo chýba.", detail: "Potom stiahnite JSON pre server.", href: "/" },
];

const PROBLEMS = [
  { code: "export.no-walkable", text: "Chýba pochôdzna plocha", fix: "Obkreslite hranicu plochy na outdoor mape." },
  { code: "export.no-calibration", text: "Podklad nie je kalibrovaný", fix: "Nastavte mierku, inak sa počíta 1 px = 1 m." },
  { code: "export.door-one-side", text: "Dvere neprepájajú dva priestory", fix: "Posuňte ich na spoločnú hranicu dvoch priestorov (do 0,5 m)." },
  { code: "export.door-no-space", text: "Dvere so vstupom neležia na priestore", fix: "Posuňte ich na stenu miestnosti pri vstupe." },
  { code: "export.door-no-entrance", text: "Dvere odkazujú na neexistujúci vstup", fix: "Znovu im priraďte vstup z outdoor mapy." },
  { code: "export.unanchored-building", text: "Budova nie je ukotvená na mapu", fix: "Na prízemí prepojte dvere so vstupom." },
  { code: "export.unaligned-floor", text: "Podlažie nemá spoločné schodisko", fix: "Označte schodisko aj na tomto podlaží a spojte ho." },
  { code: "export.vertical-incomplete", text: "Spojenie vedie iba na jedno podlažie", fix: "Pridajte schodisko alebo výťah na ďalšie podlažie." },
  { code: "export.multipart", text: "Priestor má viac obdĺžnikov", fix: "Exportuje sa iba prvý. Rozdeľte ho na samostatné priestory." },
  { code: "export.poi-outside", text: "Bod záujmu neleží v priestore", fix: "Presuňte ho dovnútra priestoru." },
  { code: "export.legacy-door", text: "Starý obdĺžnikový typ dverí", fix: "Nahraďte ho dverami ako úsečkou." },
];

const EXAMPLE = `{
  "venue": {
    "schemaVersion": 1,
    "id": "areal-xyz",
    "name": "Areál",
    "levels": [
      { "id": "OUT", "ordinal": 0,
        "transform": { "scale": 0.2, "rotation": 0, "offset": [0, 0] } }
    ],
    "spaces": [
      { "id": "priestor-1", "level": "podlazie-1", "type": "room" }
    ],
    "openings": [
      { "id": "usecka-1", "between": ["OUT-plocha", "priestor-1"] }
    ]
  },
  "geometry": {
    "podlazie-1": {
      "polygons": { "priestor-1": { "outer": [[0,0],[120,0],[120,100],[0,100]] } },
      "segments": { "usecka-1": [[40,100],[80,100]] }
    }
  }
}`;

/* ---------- Pomocné ---------- */

const reveal = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.45 } } as const;

function Heading({ id, kicker, title }: { id: string; kicker: string; title: string }) {
  return (
    <motion.div {...reveal} id={id} className="scroll-mt-8">
      <div className="font-mono text-xs uppercase tracking-widest text-route">{kicker}</div>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{title}</h2>
    </motion.div>
  );
}

/* ---------- Postup ---------- */

function Timeline() {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <ol className="relative mt-6">
      <motion.span
        aria-hidden
        className="absolute left-[19px] top-4 w-px origin-top bg-route/30"
        style={{ bottom: 16 }}
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const active = open === i;
        return (
          <motion.li key={s.title} {...reveal} transition={{ duration: 0.4, delay: Math.min(i, 3) * 0.05 }} className="relative pb-3 pl-14">
            <span
              className={`absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                active ? "border-route bg-route text-white" : "border-line bg-surface text-route"
              }`}
            >
              <Icon size={17} />
            </span>
            <button type="button" onClick={() => setOpen(active ? null : i)} className="group flex w-full items-center gap-3 rounded-md py-1.5 text-left" aria-expanded={active}>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">
                  <span className="mr-2 font-mono text-xs text-ink-soft">{i + 1}</span>
                  {s.title}
                </span>
                <span className="block text-sm text-ink-soft">{s.short}</span>
              </span>
              <ChevronDown size={16} className={`shrink-0 text-ink-soft transition-transform ${active ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
              {active && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="mb-1 mt-1 rounded-md bg-route-soft px-4 py-3 text-sm text-ink">
                    {s.detail}
                    <Link href={s.href} className="mt-2 flex items-center gap-1 font-medium text-route hover:underline">
                      Otvoriť <ArrowRight size={14} />
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        );
      })}
    </ol>
  );
}

/* ---------- Ilustrácie požiadaviek ---------- */

const draw = { initial: { pathLength: 0 }, whileInView: { pathLength: 1 }, viewport: { once: true }, transition: { duration: 0.9, ease: "easeInOut" } } as const;

function Pulse({ x, y }: { x: number; y: number }) {
  return (
    <motion.circle cx={x} cy={y} r={4} fill="none" stroke="#0075be" strokeWidth={2} animate={{ r: [4, 11], opacity: [0.8, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} />
  );
}

const ILLUSTRATIONS: { title: string; caption: string; art: React.ReactNode }[] = [
  {
    title: "Dvere na hranici",
    caption: "Dvere ležia na spoločnej stene dvoch priestorov.",
    art: (
      <>
        <rect x="10" y="12" width="60" height="56" rx="3" fill="#e6f1f9" stroke="#0075be" />
        <rect x="70" y="12" width="60" height="56" rx="3" fill="#eef1f4" stroke="#5b6472" />
        <motion.line x1="70" y1="30" x2="70" y2="50" stroke="#f07e3b" strokeWidth="5" strokeLinecap="round" {...draw} />
        <Pulse x={70} y={40} />
      </>
    ),
  },
  {
    title: "Vstup ↔ dvere",
    caption: "Dvere na prízemí prepojte so vstupom budovy.",
    art: (
      <>
        <rect x="45" y="8" width="70" height="46" rx="3" fill="#e6f1f9" stroke="#0075be" />
        <rect x="0" y="54" width="160" height="22" fill="#eef1f4" />
        <motion.line x1="65" y1="54" x2="95" y2="54" stroke="#f07e3b" strokeWidth="5" strokeLinecap="round" {...draw} />
        <motion.path d="M80 54 L80 66" stroke="#0075be" strokeWidth="2" strokeDasharray="3 3" {...draw} />
        <Pulse x={80} y={54} />
      </>
    ),
  },
  {
    title: "Schodisko na každom podlaží",
    caption: "Jedna skupina spája schodisko cez všetky podlažia.",
    art: (
      <>
        <rect x="20" y="8" width="120" height="26" rx="3" fill="#eef1f4" stroke="#5b6472" />
        <rect x="20" y="46" width="120" height="26" rx="3" fill="#eef1f4" stroke="#5b6472" />
        <rect x="100" y="12" width="22" height="18" fill="#47a23f" fillOpacity=".35" stroke="#47a23f" />
        <rect x="100" y="50" width="22" height="18" fill="#47a23f" fillOpacity=".35" stroke="#47a23f" />
        <motion.path d="M111 30 L111 50" stroke="#47a23f" strokeWidth="2.5" strokeLinecap="round" {...draw} />
        <Pulse x={111} y={40} />
      </>
    ),
  },
  {
    title: "Mierka",
    caption: "Dva body so známou vzdialenosťou v metroch.",
    art: (
      <>
        <rect x="8" y="14" width="144" height="52" rx="3" fill="#eef1f4" stroke="#b9c3ca" />
        <motion.line x1="30" y1="40" x2="130" y2="40" stroke="#0075be" strokeWidth="2" {...draw} />
        <circle cx="30" cy="40" r="4" fill="#0075be" />
        <circle cx="130" cy="40" r="4" fill="#0075be" />
        <motion.text x="80" y="33" textAnchor="middle" fontSize="11" fill="#0075be" fontFamily="monospace" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.8 }}>
          20 m
        </motion.text>
      </>
    ),
  },
];

function Illustrations() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {ILLUSTRATIONS.map((it, i) => (
        <motion.div key={it.title} {...reveal} transition={{ duration: 0.45, delay: (i % 2) * 0.08 }} className="rounded-md border border-line bg-surface p-4">
          <svg viewBox="0 0 160 80" className="h-24 w-full" aria-hidden>
            {it.art}
          </svg>
          <div className="mt-2 text-sm font-medium text-ink">{it.title}</div>
          <p className="text-sm text-ink-soft">{it.caption}</p>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- Interaktívna ukážka pravidiel ---------- */

const RULES = [
  { id: "card", label: "Karta" },
  { id: "ppe", label: "OOPP" },
  { id: "role", label: "Rola" },
  { id: "time", label: "Smena" },
] as const;

const PROFILES = {
  visitor: { label: "Návštevník", has: { card: false, ppe: false, role: false } },
  employee: { label: "Zamestnanec", has: { card: true, ppe: true, role: true } },
} as const;

function RulesDemo() {
  const [profile, setProfile] = React.useState<keyof typeof PROFILES>("visitor");
  const [onShift, setOnShift] = React.useState(true);
  const has = PROFILES[profile].has;
  const pass = { card: has.card, ppe: has.ppe, role: has.role, time: onShift };
  const allowed = RULES.every((r) => pass[r.id]);

  return (
    <motion.div {...reveal} className="mt-6 rounded-md border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-line p-0.5">
          {(Object.keys(PROFILES) as (keyof typeof PROFILES)[]).map((k) => (
            <button key={k} type="button" onClick={() => setProfile(k)} className={`rounded px-3 py-1.5 text-sm transition-colors ${profile === k ? "bg-route text-white" : "text-ink-soft hover:text-ink"}`}>
              {PROFILES[k].label}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={onShift} onChange={(e) => setOnShift(e.target.checked)} className="accent-[#0075be]" />
          Počas smeny
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {RULES.map((r) => (
          <motion.span
            key={r.id}
            layout
            animate={{ backgroundColor: pass[r.id] ? "#e8f5e6" : "#fdecea", color: pass[r.id] ? "#2f7a28" : "#b3261e" }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
          >
            {pass[r.id] ? <Check size={14} /> : <X size={14} />}
            {r.label}
          </motion.span>
        ))}
        <ArrowRight size={16} className="mx-1 text-ink-soft" />
        <span className="rounded-md border border-line px-3 py-1 text-sm text-ink">Zóna Výroba</span>
        <ArrowRight size={16} className="mx-1 text-ink-soft" />
        <AnimatePresence mode="wait">
          <motion.span key={String(allowed)} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className={`rounded-md px-3 py-1 text-sm font-semibold text-white ${allowed ? "bg-stake" : "bg-alarm"}`}>
            {allowed ? "Vstup povolený" : "Nedostupné"}
          </motion.span>
        </AnimatePresence>
      </div>
      <p className="mt-4 text-sm text-ink-soft">Tvrdé pravidlá rozhodnú, či cieľ je dostupný. Váhy profilu potom vyberú najlepšiu z dostupných ciest.</p>
    </motion.div>
  );
}

/* ---------- Formát ---------- */

function FormatTabs() {
  const [tab, setTab] = React.useState<"overview" | "json">("overview");
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EXAMPLE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // schránka nemusí byť dostupná
    }
  };
  return (
    <motion.div {...reveal} className="mt-6 rounded-md border border-line bg-surface">
      <div className="flex border-b border-line px-2">
        {([["overview", "Prehľad"], ["json", "Ukážka JSON"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`relative px-4 py-3 text-sm transition-colors ${tab === k ? "font-medium text-route" : "text-ink-soft hover:text-ink"}`}>
            {label}
            {tab === k && <motion.span layoutId="format-tab" className="absolute inset-x-3 -bottom-px h-0.5 bg-route" />}
          </button>
        ))}
      </div>
      <div className="p-5">
        {tab === "overview" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-line p-4">
              <div className="font-mono text-sm font-medium text-route">venue</div>
              <p className="mt-1 text-sm text-ink-soft">Čo kde je a ako to súvisí.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["budovy", "podlažia", "priestory", "prechody", "schodiská", "body záujmu", "pravidlá", "zóny", "profily"].map((c) => (
                  <span key={c} className="rounded-full bg-route-soft px-2.5 py-0.5 text-xs text-ink">{c}</span>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-line p-4">
              <div className="font-mono text-sm font-medium text-route">geometry</div>
              <p className="mt-1 text-sm text-ink-soft">Tvary po podlažiach, v pixeloch podkladu.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["polygons", "segments", "points"].map((c) => (
                  <span key={c} className="rounded-full bg-route-soft px-2.5 py-0.5 font-mono text-xs text-ink">{c}</span>
                ))}
              </div>
            </div>
            <p className="font-mono text-xs text-ink-soft sm:col-span-2">
              local = R(rotation) · (scale · svg) + offset &nbsp;·&nbsp; spája ich <span className="text-ink">id</span> &nbsp;·&nbsp; povolené znaky id: A–Z a–z 0–9 _ . : -
            </p>
          </div>
        ) : (
          <div className="relative">
            <button type="button" onClick={copy} className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs text-ink-soft hover:text-ink">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Skopírované" : "Kopírovať"}
            </button>
            <pre className="overflow-x-auto rounded-md bg-paper p-4 font-mono text-xs leading-relaxed text-ink">{EXAMPLE}</pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ---------- Problémy ---------- */

function Problems() {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const list = PROBLEMS.filter((p) => !q || `${p.text} ${p.fix} ${p.code}`.toLowerCase().includes(q));
  return (
    <motion.div {...reveal} className="mt-6">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Hľadať hlásenie…" aria-label="Hľadať hlásenie" className="w-full rounded-md border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-route" />
      </div>
      <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-surface">
        {list.map((p) => {
          const active = open === p.code;
          return (
            <li key={p.code}>
              <button type="button" onClick={() => setOpen(active ? null : p.code)} aria-expanded={active} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink hover:bg-paper">
                <span className="flex-1">{p.text}</span>
                <ChevronDown size={15} className={`shrink-0 text-ink-soft transition-transform ${active ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {active && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-4 pb-3 text-sm text-ink-soft">
                      {p.fix}
                      <div className="mt-1 font-mono text-xs">{p.code}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
        {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-soft">Nič sa nenašlo.</li>}
      </ul>
    </motion.div>
  );
}

/* ---------- Stránka ---------- */

const NAV = [["postup", "Postup"], ["data", "Dáta"], ["pravidla", "Pravidlá"], ["format", "Formát"], ["chyby", "Problémy"]] as const;

export function HelpView() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-paper p-6 md:p-10">
        <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-10 border-b border-line pb-6">
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink">Pomocník</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Ako pripraviť areál pre navigáciu.</p>
          <nav className="mt-4 flex flex-wrap gap-2">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-full border border-line bg-surface px-3.5 py-1 text-sm text-ink-soft transition-colors hover:border-route hover:text-route">
                {label}
              </a>
            ))}
          </nav>
        </motion.header>

        <div className="max-w-3xl space-y-14">
          <section>
            <Heading id="postup" kicker="1" title="Postup" />
            <Timeline />
          </section>
          <section>
            <Heading id="data" kicker="2" title="Na čo si dať pozor" />
            <Illustrations />
          </section>
          <section>
            <Heading id="pravidla" kicker="3" title="Pravidlá a profily" />
            <RulesDemo />
          </section>
          <section>
            <Heading id="format" kicker="4" title="Formát exportu" />
            <FormatTabs />
          </section>
          <section>
            <Heading id="chyby" kicker="5" title="Časté problémy" />
            <Problems />
          </section>
        </div>
      </div>
    </MotionConfig>
  );
}
