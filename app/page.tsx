"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, DoorOpen, Layers, MapPin, ShieldCheck, Users } from "lucide-react";
import { AlertBox } from "./components/allertsBox";
import { ExportPanel } from "./components/exportPanel";
import { OnboardingBanner } from "./components/onboardingBanner";
import { InfoPanel } from "./components/infoPanel";
import { checkReadiness, type Check } from "./lib/checks";
import { createEmptyAreal } from "./lib/model";
import { createEmptyPravidla } from "./lib/rules";
import { useLocalStorage } from "./lib/useLocalStorage";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

type KpiCellProps = { label: string; value: string; icon: React.ReactNode };

const KpiCell = ({ label, value, icon }: KpiCellProps) => (
  <div className="flex-1 min-w-[130px] px-5 py-4 first:pl-0 last:pr-0">
    <div className="flex items-center gap-1.5 text-ink-soft mb-2">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <span className="font-mono text-[1.7rem] leading-none font-semibold text-ink tabular-nums">{value}</span>
  </div>
);

const SECTIONS: Check["section"][] = ["Outdoor mapa", "Budovy", "Pravidlá"];

export default function AdminDashboardPage() {
  const [areal, , hydrated] = useLocalStorage("path-finder/areal", createEmptyAreal());
  const [pravidla] = useLocalStorage("path-finder/pravidla", createEmptyPravidla());

  const readiness = React.useMemo(() => checkReadiness(areal, pravidla), [areal, pravidla]);
  const { checks, score, stats } = readiness;
  const errors = checks.filter((c) => c.severity === "error");
  const percent = Math.round(score * 100);

  return (
    <div className="min-h-screen bg-paper p-6 md:p-10">
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-5 pb-6 border-b border-line">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink">Prehľad systému</h1>
          <p className="text-ink-soft mt-1.5 text-sm max-w-md">
            Stav príprav areálu pre multikriteriálny navigačný graf: čo je hotové a čo ešte chýba.
          </p>
        </div>

        <div className="flex items-center gap-3 border border-line rounded-md bg-surface px-4 py-2.5">
          <span className={cx("relative flex h-2 w-2 shrink-0 rounded-full", !hydrated ? "bg-line" : errors.length === 0 ? "bg-stake" : "bg-flag")} />
          <div className="leading-tight">
            <div className="text-sm font-medium text-ink">
              {!hydrated ? "Načítavam…" : errors.length === 0 ? "Areál je pripravený" : `Chýba ${errors.length} ${errors.length === 1 ? "vec" : errors.length < 5 ? "veci" : "vecí"}`}
            </div>
            <div className="font-mono text-xs text-ink-soft">pripravenosť {hydrated ? `${percent} %` : "…"}</div>
          </div>
        </div>
      </div>

      <OnboardingBanner />

      {hydrated && errors.length > 0 && (
        <div className="mb-8">
          <AlertBox severity="warning" title="Navigačný graf sa zatiaľ nedá odvodiť">
            Dokončite položky označené ako chyba v zozname nižšie. Najčastejšie chýba pochôdzna plocha, vstup do budovy alebo dvere medzi priestormi.
          </AlertBox>
        </div>
      )}

      <div className="mb-8 flex flex-wrap divide-x divide-line border border-line rounded-md bg-surface px-5">
        <KpiCell label="Budovy" value={String(stats.budovy)} icon={<Building2 size={14} />} />
        <KpiCell label="Podlažia" value={String(stats.podlazia)} icon={<Layers size={14} />} />
        <KpiCell label="Priestory" value={String(stats.priestory)} icon={<Layers size={14} />} />
        <KpiCell label="Vstupy a dvere" value={`${stats.vstupy} / ${stats.dvere}`} icon={<DoorOpen size={14} />} />
        <KpiCell label="Body záujmu" value={String(stats.poi)} icon={<MapPin size={14} />} />
        <KpiCell label="Pravidlá / profily" value={`${stats.pravidla} / ${stats.profily}`} icon={<ShieldCheck size={14} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface p-7 rounded-md border border-line">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center">
              <h2 className="text-base font-medium text-ink">Čo ešte chýba</h2>
              <InfoPanel title="Čo kontrolujeme">
                <p>
                  Chyba znamená, že sa trasa vypočítať nedá (napr. budova bez vstupu). Upozornenie znamená, že trasa vznikne, ale bude
                  nepresná alebo neúplná (napr. chýba mierka).
                </p>
              </InfoPanel>
            </div>
            <span className="font-mono text-xs text-ink-soft">{checks.length} položiek</span>
          </div>

          {!hydrated ? null : checks.length === 0 ? (
            <div className="flex items-center gap-3 rounded-md border border-line px-4 py-6 text-sm text-ink">
              <CheckCircle2 size={20} className="text-stake" />
              Všetky kontroly prešli, areál je pripravený.
            </div>
          ) : (
            <div className="space-y-6">
              {SECTIONS.map((section) => {
                const list = checks.filter((c) => c.section === section);
                if (list.length === 0) return null;
                return (
                  <div key={section}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">{section}</h3>
                    <ul className="divide-y divide-line rounded-md border border-line">
                      {list.map((c) => (
                        <li key={c.id}>
                          <Link href={c.href} className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-paper">
                            <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", c.severity === "error" ? "bg-alarm" : "bg-flag")} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm text-ink">{c.title}</span>
                              {c.detail && <span className="block text-xs text-ink-soft mt-0.5">{c.detail}</span>}
                            </span>
                            <span className="shrink-0 font-mono text-xs text-ink-soft">{c.severity === "error" ? "chyba" : "upozornenie"}</span>
                            <ArrowRight size={14} className="mt-0.5 shrink-0 text-ink-soft transition-colors group-hover:text-route" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-surface p-6 rounded-md border border-line">
            <h2 className="text-sm font-medium text-ink-soft mb-4 flex items-center gap-2">
              <Users size={15} />
              Profily používateľov
            </h2>
            {pravidla.profiles.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Zatiaľ žiadne.{" "}
                <Link href="/rules" className="text-route hover:underline">
                  Vytvoriť profil
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {pravidla.profiles.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm">
                    <span className="text-ink">{p.name ?? p.id}</span>
                    <span className="font-mono text-xs text-ink-soft">{p.roles.join(", ") || "bez rolí"}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-ink-soft leading-relaxed">
              Priechodnosť areálu pre jednotlivé profily sa zobrazí po zapnutí výpočtu trasy.
            </p>
          </div>

          <ExportPanel areal={areal} pravidla={pravidla} />

          <div className="bg-route-dark p-6 rounded-md">
            <h3 className="text-sm font-medium text-white mb-2">Vyskúšať navigáciu</h3>
            <p className="text-sm text-white/60 mb-5 leading-relaxed">
              Overte navigačný model pod rôznymi kritériami: čas, vzdialenosť, prístupové oprávnenia.
            </p>
            <Link
              href="/navigation"
              className="block w-full py-2.5 bg-route text-white rounded-sm text-sm font-medium text-center hover:bg-route/90 transition-colors"
            >
              Otvoriť navigáciu
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
