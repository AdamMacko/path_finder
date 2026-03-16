"use client";

import * as React from "react";
import { 
  MapIcon, 
  UsersIcon, 
  ShieldCheckIcon, 
  ActivityIcon, 
  FileCodeIcon, 
  GlobeIcon, 
  ChevronRightIcon,
  AlertCircleIcon
} from 'lucide-react';

// --- TVOJ KOMPONENT ALERTBOX ---

export type AlertSeverity = "success" | "info" | "warning" | "error";

type AlertBoxProps = {
  severity?: AlertSeverity;
  title?: string;
  children: React.ReactNode;
  className?: string;
  dismissible?: boolean;
  onClose?: () => void;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

function getAlertStyles(severity: AlertSeverity) {
  switch (severity) {
    case "success":
      return {
        wrap: "border-green-200 bg-green-50 text-green-900",
        icon: "text-green-700",
        title: "text-green-900",
      };
    case "info":
      return {
        wrap: "border-blue-200 bg-blue-50 text-blue-900",
        icon: "text-blue-700",
        title: "text-blue-900",
      };
    case "warning":
      return {
        wrap: "border-amber-200 bg-amber-50 text-amber-950",
        icon: "text-amber-800",
        title: "text-amber-950",
      };
    case "error":
      return {
        wrap: "border-red-200 bg-red-50 text-red-900",
        icon: "text-red-700",
        title: "text-red-900",
      };
  }
}

function AlertIcon({ severity, className }: { severity: AlertSeverity; className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function AlertBox({
  severity = "info",
  title,
  children,
  className,
  dismissible = false,
  onClose,
}: AlertBoxProps) {
  const s = getAlertStyles(severity);

  return (
    <div
      role="alert"
      className={cx(
        "w-full rounded-xl border p-4",
        "flex items-start gap-3 shadow-sm transition-all",
        s.wrap,
        className
      )}
    >
      <AlertIcon severity={severity} className={cx("mt-0.5", s.icon)} />
      <div className="min-w-0 flex-1">
        {title ? (
          <div className={cx("text-sm font-semibold", s.title)}>{title}</div>
        ) : null}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
      {dismissible ? (
        <button
          type="button"
          aria-label="Zavrieť upozornenie"
          onClick={onClose}
          className="ml-2 rounded-lg border bg-white/60 px-2 py-1 text-xs hover:bg-white transition-colors"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

// --- POMOCNÉ KOMPONENTY PRE DASHBOARD ---

const StatCard = ({ title, value, icon, delta, color }: { 
  title: string, value: string, icon: React.ReactNode, delta?: string, color: string 
}) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
      {delta && <span className="text-xs font-semibold text-emerald-500">{delta}</span>}
    </div>
    <div className={cx("p-3 rounded-lg", color)}>
      {icon}
    </div>
  </div>
);

const AccessibilityBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="flex flex-col items-center w-full group">
    <div className="text-[10px] font-bold mb-2 text-slate-400 group-hover:text-slate-900 transition-colors">
      {value}%
    </div>
    <div className="relative w-full max-w-[40px] bg-slate-50 rounded-t-md h-[180px] flex items-end">
      <div 
        className={cx("w-full rounded-t-sm transition-all duration-1000 ease-in-out shadow-sm", color)} 
        style={{ height: `${value}%` }}
      />
    </div>
    <span className="text-[10px] mt-3 font-bold text-slate-500 text-center uppercase tracking-tighter">
      {label}
    </span>
  </div>
);

// --- HLAVNÁ STRÁNKA (PAGE) ---

export default function AdminDashboardPage() {
  const [topologyAlert, setTopologyAlert] = React.useState(true);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 font-sans text-slate-900">
      
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Prehľad systému</h1>
          <p className="text-slate-500 mt-1 font-medium">Správa multikriteriálneho navigačného grafu.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          SYSTÉM AKTÍVNY (A* ENGINE v0.4)
        </div>
      </div>

      {/* Tvoj AlertBox v akcii pre topologické chyby */}
      {topologyAlert && (
        <div className="mb-8">
          <AlertBox 
            severity="warning" 
            title="Nekonzistentná topológia"
            dismissible
            onClose={() => setTopologyAlert(false)}
          >
            Pri poslednom importe SVG v budove <strong>"Administratíva"</strong> boli nájdené izolované uzly (miestnosti 102, 105). 
            Tieto miesta nie sú momentálne dosiahnuteľné z hlavného vchodu.
          </AlertBox>
        </div>
      )}

      {/* KPI Sekcia */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Celkové uzly" value="3,102" 
          icon={<MapIcon size={20} className="text-blue-600" />} color="bg-blue-50" 
          delta="+12% nárast"
        />
        <StatCard 
          title="Konektivita" value="98.4%" 
          icon={<ShieldCheckIcon size={20} className="text-emerald-600" />} color="bg-emerald-50" 
        />
        <StatCard 
          title="Aktívne pravidlá" value="14" 
          icon={<ActivityIcon size={20} className="text-amber-600" />} color="bg-amber-50" 
        />
        <StatCard 
          title="POI body" value="482" 
          icon={<UsersIcon size={20} className="text-indigo-600" />} color="bg-indigo-50" 
        />
      </div>

      {/* Hlavný grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Graf dostupnosti */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold">Priechodnosť podľa profilov</h2>
            <div className="text-[10px] font-bold text-slate-400 border px-2 py-1 rounded">POSLEDNÝCH 24H</div>
          </div>
          
          <div className="flex items-end justify-around gap-4 h-[220px] px-2">
            <AccessibilityBar label="Študent" value={98} color="bg-blue-500" />
            <AccessibilityBar label="Zamestnanec" value={100} color="bg-indigo-600" />
            <AccessibilityBar label="Hosť" value={45} color="bg-slate-300" />
            <AccessibilityBar label="Vozíčkar" value={72} color="bg-amber-500" />
            <AccessibilityBar label="Externý servis" value={89} color="bg-emerald-500" />
          </div>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold mb-4 uppercase tracking-wider text-slate-400">Status podkladov</h2>
            <div className="space-y-4">
               <div className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-50 transition-colors">
                      <FileCodeIcon size={16} className="text-slate-600 group-hover:text-blue-600" />
                    </div>
                    <span className="text-sm font-bold">SVG Pôdorysy</span>
                  </div>
                  <span className="text-[10px] font-black text-green-600">OK</span>
               </div>
               <div className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-50 transition-colors">
                      <GlobeIcon size={16} className="text-slate-600 group-hover:text-blue-600" />
                    </div>
                    <span className="text-sm font-bold">OpenStreetMap</span>
                  </div>
                  <span className="text-[10px] font-black text-amber-600">SYNCING</span>
               </div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl shadow-md text-white">
            <h3 className="text-sm font-bold mb-2">Simulácia prostredia</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Vyskúšajte navigačný model pod rôznymi kritériami (čas, oprávnenia).
            </p>
            <button className="w-full py-2.5 bg-white text-slate-900 rounded-xl text-xs font-black hover:bg-slate-100 transition-colors">
              SPUSTIŤ TESTER
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}