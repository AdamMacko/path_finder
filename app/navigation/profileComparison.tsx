"use client";

import * as React from "react";
import { Loader2, Scale } from "lucide-react";
import type { MapProfile, RouteResponse, Waypoint } from "@/lib/api/types";

type Row = { profile: MapProfile; result: RouteResponse };

const formatDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
const formatDuration = (s: number) => (s < 60 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`);

/** Rovnaká trasa (štart, cieľ, čas) vypočítaná postupne pre všetky profily – ukáže vplyv pravidiel a váh. */
export function ProfileComparison({
  profiles,
  current,
  from,
  to,
  time,
}: {
  profiles: MapProfile[];
  current: string;
  from: Waypoint;
  to: Waypoint;
  time?: string;
}) {
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Zmena zadania zneplatní starú tabuľku.
  const key = JSON.stringify([from, to, time, current]);
  React.useEffect(() => setRows(null), [key]);

  async function compare() {
    setLoading(true);
    try {
      const results = await Promise.all(
        profiles.map(async (profile): Promise<Row> => {
          try {
            const res = await fetch("/api/route", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profile: profile.id, from, to, time }),
            });
            return { profile, result: (await res.json()) as RouteResponse };
          } catch {
            return { profile, result: { status: "error", message: "Server je nedostupný." } };
          }
        }),
      );
      setRows(results);
    } finally {
      setLoading(false);
    }
  }

  const best = rows
    ? Math.min(...rows.flatMap((r) => (r.result.status === "ok" ? [r.result.duration] : [])), Infinity)
    : Infinity;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={compare}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#0075be] disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Scale size={16} />}
        Porovnať profily
      </button>
      {rows && (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-1 font-semibold">Profil</th>
              <th className="py-1 font-semibold">Čas</th>
              <th className="py-1 font-semibold">Dĺžka</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ profile, result }) => (
              <tr key={profile.id} className={`border-t border-slate-100 ${profile.id === current ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                <td className="py-1.5 pr-2">{profile.name ?? profile.id}</td>
                {result.status === "ok" ? (
                  <>
                    <td className={`py-1.5 ${result.duration === best ? "text-[#16a34a]" : ""}`}>{formatDuration(result.duration)}</td>
                    <td className="py-1.5">{formatDistance(result.distance)}</td>
                  </>
                ) : (
                  <td colSpan={2} className="py-1.5 text-xs text-slate-500" title={result.message}>
                    {result.status === "unreachable" ? "nedostupné" : "bez trasy"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
