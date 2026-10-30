"use client";

import * as React from "react";
import {
  MapIcon,
  ShieldCheckIcon,
  ActivityIcon,
  UsersIcon,
  FileCodeIcon,
  GlobeIcon,
} from "lucide-react";
import { AlertBox } from "./components/allertsBox";
import { InfoPanel } from "./components/infoPanel";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

// --- KPI pás ----------------------------------------------------------

type KpiCellProps = {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  icon: React.ReactNode;
};

const KpiCell = ({ label, value, unit, delta, icon }: KpiCellProps) => (
  <div className="flex-1 min-w-[150px] px-5 py-4 first:pl-0 last:pr-0">
    <div className="flex items-center gap-1.5 text-ink-soft mb-2">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-[1.7rem] leading-none font-semibold text-ink tabular-nums">
        {value}
      </span>
      {unit && <span className="text-sm text-ink-soft">{unit}</span>}
    </div>
    {delta && <div className="mt-1.5 text-xs font-mono text-stake">{delta}</div>}
  </div>
);

// --- Priechodnosť podľa profilov ---------------------------------------

const AccessibilityBar = ({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) => (
  <div className="flex flex-col items-center w-full group">
    <div className="font-mono text-xs text-ink-soft mb-2 tabular-nums">{value}%</div>
    <div className="relative w-full max-w-[36px] bg-paper rounded-sm h-[180px] flex items-end overflow-hidden border border-line">
      <div
        className={cx("w-full transition-all duration-700 ease-out", colorClass)}
        style={{ height: `${value}%` }}
      />
    </div>
    <span className="text-xs mt-3 text-ink-soft text-center leading-snug">{label}</span>
  </div>
);

// --- Hlavná stránka -----------------------------------------------------

export default function AdminDashboardPage() {
  const [topologyAlert, setTopologyAlert] = React.useState(true);

  return (
    <div className="min-h-screen bg-paper p-6 md:p-10">
      {/* Title block */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-5 pb-6 border-b border-line">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink">
            Prehľad systému
          </h1>
          <p className="text-ink-soft mt-1.5 text-sm max-w-md">
            Stav multikriteriálneho navigačného grafu pre komplex budov.
          </p>
        </div>

        <div className="flex items-center gap-3 border border-line rounded-md bg-surface px-4 py-2.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-stake/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-stake" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-medium text-ink">Systém aktívny</div>
            <div className="font-mono text-xs text-ink-soft">A* engine v0.4</div>
          </div>
        </div>
      </div>

      {/* Upozornenie na topológiu */}
      {topologyAlert && (
        <div className="mb-8">
          <AlertBox
            severity="warning"
            title="Nekonzistentná topológia"
            dismissible
            onClose={() => setTopologyAlert(false)}
          >
            Pri poslednom importe SVG v budove &bdquo;Administratíva&ldquo; boli nájdené izolované uzly
            (miestnosti 102, 105). Tieto miesta nie sú momentálne dosiahnuteľné z hlavného vchodu.
          </AlertBox>
        </div>
      )}

      {/* KPI pás */}
      <div className="mb-8 flex flex-wrap divide-x divide-line border border-line rounded-md bg-surface px-5">
        <KpiCell
          label="Uzly grafu"
          value="3 102"
          delta="+12 % za mesiac"
          icon={<MapIcon size={14} />}
        />
        <KpiCell
          label="Konektivita"
          value="98,4"
          unit="%"
          icon={<ShieldCheckIcon size={14} />}
        />
        <KpiCell
          label="Aktívne pravidlá"
          value="14"
          icon={<ActivityIcon size={14} />}
        />
        <KpiCell
          label="Body záujmu"
          value="482"
          icon={<UsersIcon size={14} />}
        />
      </div>

      {/* Hlavný grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priechodnosť podľa profilov */}
        <div className="lg:col-span-2 bg-surface p-7 rounded-md border border-line">
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center">
              <h2 className="text-base font-medium text-ink">Priechodnosť podľa profilov</h2>
              <InfoPanel title="Čo je priechodnosť">
                <p>
                  Podiel uzlov navigačnej siete, ktoré sú pre daný profil používateľa dosiahnuteľné
                  pri dodržaní jeho prístupových oprávnení.
                </p>
              </InfoPanel>
            </div>
            <span className="font-mono text-xs text-ink-soft">posledných 24 h</span>
          </div>

          <div className="flex items-end justify-around gap-4 h-[220px] px-2">
            <AccessibilityBar label="Študent" value={98} colorClass="bg-route/55" />
            <AccessibilityBar label="Zamestnanec" value={100} colorClass="bg-route" />
            <AccessibilityBar label="Hosť" value={45} colorClass="bg-ink-soft/40" />
            <AccessibilityBar label="Vozíčkar" value={72} colorClass="bg-flag" />
            <AccessibilityBar label="Externý servis" value={89} colorClass="bg-stake" />
          </div>
        </div>

        {/* Bočný panel */}
        <div className="space-y-6">
          <div className="bg-surface p-6 rounded-md border border-line">
            <h2 className="text-sm font-medium text-ink-soft mb-4">Status podkladov</h2>
            <div className="divide-y divide-line">
              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <FileCodeIcon size={16} className="text-ink-soft" />
                  <span className="text-sm text-ink">SVG pôdorysy</span>
                </div>
                <span className="font-mono text-xs text-stake">hotovo</span>
              </div>
              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <GlobeIcon size={16} className="text-ink-soft" />
                  <span className="text-sm text-ink">OpenStreetMap</span>
                </div>
                <span className="font-mono text-xs text-flag">synchronizuje sa</span>
              </div>
            </div>
          </div>

          <div className="bg-ink p-6 rounded-md">
            <h3 className="text-sm font-medium text-white mb-2">Simulácia prostredia</h3>
            <p className="text-sm text-white/60 mb-5 leading-relaxed">
              Overte navigačný model pod rôznymi kritériami — čas, vzdialenosť, prístupové oprávnenia.
            </p>
            <button className="w-full py-2.5 bg-route text-white rounded-sm text-sm font-medium hover:bg-route/90 transition-colors">
              Spustiť simuláciu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
