import * as React from "react";
import Link from "next/link";
import { Building2Icon, DoorOpenIcon, FileCodeIcon, LayersIcon, MapPinIcon, ShieldCheckIcon, SquareIcon } from "lucide-react";
import type { Issue } from "@/lib/core/model/issues";
import { loadVenue } from "@/lib/server/venueStore";
import { AlertBox } from "./components/allertsBox";

/* ---------- Pomocné komponenty ---------- */

const StatCard = ({ title, value, icon, note, color }: { title: string; value: React.ReactNode; icon: React.ReactNode; note?: string; color: string }) => (
  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="mt-1 text-2xl font-bold text-slate-900">{value}</h3>
      {note && <span className="text-xs font-medium text-slate-400">{note}</span>}
    </div>
    <div className={`rounded-lg p-3 ${color}`}>{icon}</div>
  </div>
);

const Badge = ({ on, children }: { on?: boolean; children: React.ReactNode }) => (
  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${on ? "bg-[#0075be]/10 text-[#0075be]" : "bg-slate-100 text-slate-300"}`}>{children}</span>
);

function IssueList({ issues }: { issues: Issue[] }) {
  return (
    <ul className="mt-1 space-y-1">
      {issues.map((i, k) => (
        <li key={k}>
          <code className="text-xs opacity-70">{i.path || "(koreň)"}</code> – {i.message}
        </li>
      ))}
    </ul>
  );
}

/* ---------- Stránka ---------- */

export default function DashboardPage() {
  const loaded = loadVenue();
  const errors = loaded.issues.filter((i) => i.severity === "error");
  const warnings = loaded.issues.filter((i) => i.severity === "warning");

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 font-sans text-slate-900 md:p-10">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Prehľad areálu</h1>
          <p className="mt-1 font-medium text-slate-500">Dátový model, validácia a podklady multikritériovej navigácie.</p>
        </div>
        {loaded.ok && (
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold shadow-sm">
            <div className={`h-2 w-2 rounded-full ${errors.length ? "bg-red-500" : "bg-green-500"}`} />
            {loaded.index.venue.name}
          </div>
        )}
      </div>

      <div className="mb-8 space-y-3">
        {errors.length > 0 && (
          <AlertBox severity="error" title={`Dáta areálu obsahujú chyby (${errors.length})`}>
            <IssueList issues={errors} />
          </AlertBox>
        )}
        {warnings.length > 0 && (
          <AlertBox severity="warning" title={`Upozornenia (${warnings.length})`}>
            <IssueList issues={warnings} />
          </AlertBox>
        )}
        {loaded.issues.length === 0 && (
          <AlertBox severity="success" title="Dáta areálu sú konzistentné">
            JSON prešiel validáciou schémy aj väzieb a geometria zo SVG sedí s priestormi a prechodmi.
          </AlertBox>
        )}
      </div>

      {loaded.ok && <VenueOverview loaded={loaded} />}
    </div>
  );
}

function VenueOverview({ loaded }: { loaded: Extract<ReturnType<typeof loadVenue>, { ok: true }> }) {
  const { venue } = loaded.index;
  const indoorLevels = venue.levels.filter((l) => l.building !== undefined);
  const internalPois = venue.pois.filter((p) => p.internal).length;
  const spacesOn = (level: string) => venue.spaces.filter((s) => s.level === level).length;
  const buildingName = new Map(venue.buildings.map((b) => [b.id, b.name ?? b.id]));

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Budovy / podlažia" value={`${venue.buildings.length} / ${indoorLevels.length}`} note={`+ ${venue.levels.length - indoorLevels.length} vonkajšia vrstva`} icon={<Building2Icon size={20} className="text-blue-600" />} color="bg-blue-50" />
        <StatCard title="Priestory" value={venue.spaces.length} icon={<SquareIcon size={20} className="text-emerald-600" />} color="bg-emerald-50" />
        <StatCard title="Prechody" value={venue.openings.length} note={`+ ${venue.vertical.length} vertikálne spojenia`} icon={<DoorOpenIcon size={20} className="text-amber-600" />} color="bg-amber-50" />
        <StatCard title="Body záujmu" value={venue.pois.length} note={`z toho ${internalPois} interných`} icon={<MapPinIcon size={20} className="text-indigo-600" />} color="bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 lg:col-span-2">
          <h2 className="mb-6 text-lg font-bold">Profily používateľov</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 pr-4">Profil</th>
                  <th className="pb-3 pr-4">Roly</th>
                  <th className="pb-3 pr-4">Oprávnenia</th>
                  <th className="pb-3">Váhy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {venue.profiles.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 font-semibold">{p.name ?? p.id}</td>
                    <td className="py-3 pr-4 text-slate-500">{p.roles.join(", ") || "–"}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        <Badge on={p.card}>karta</Badge>
                        <Badge on={p.ppe}>OOPP</Badge>
                        <Badge on={p.require?.includes("accessible")}>bezbar.</Badge>
                        <Badge on={p.internal}>interné</Badge>
                      </div>
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-500">
                      {Object.entries(p.weights)
                        .map(([k, w]) => `${k} ${w}`)
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheckIcon size={14} />
            {venue.rules.length} pravidiel, {venue.zones.length} zón s obmedzeným prístupom
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Podlažia a podklady</h2>
            <div className="space-y-3">
              {venue.levels.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-slate-100 p-2">
                      {l.svg ? <FileCodeIcon size={16} className="text-slate-600" /> : <LayersIcon size={16} className="text-slate-600" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{l.name ?? l.id}</div>
                      <div className="truncate text-xs text-slate-400">
                        {l.building ? buildingName.get(l.building) : "Exteriér"} · {l.svg ?? "bez SVG"}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-slate-500">{spacesOn(l.id)} priest.</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-md">
            <h3 className="mb-2 text-sm font-bold">Navigačný graf</h3>
            <p className="mb-4 text-xs leading-relaxed text-slate-400">
              Graf sa vygeneruje automaticky z priestorov a prechodov. Generovanie grafu a výpočet trasy sa práve pripravujú.
            </p>
            <Link href="/navigacia" className="block w-full rounded-xl bg-white py-2.5 text-center text-xs font-black text-slate-900 transition-colors hover:bg-slate-100">
              OTVORIŤ NAVIGÁCIU
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
