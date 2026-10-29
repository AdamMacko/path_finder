"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpDown, Loader2, MapPin, Navigation, X } from "lucide-react";
import type { MapData, RouteResponse, Waypoint } from "@/lib/api/types";
import { AlertBox } from "../components/allertsBox";
import { MapView, type MapMarker } from "../components/map/mapView";
import { COLORS, SPACE_TYPE_LABEL, VERTICAL_TYPE_LABEL, levelLabel, poiCategoryLabel } from "../components/map/mapStyle";

/* ---------- Pomocné funkcie nad dátami mapy ---------- */

const encode = (w: Waypoint | null) => (!w ? "" : "poi" in w ? `poi:${w.poi}` : "space" in w ? `space:${w.space}` : "");
const decode = (v: string): Waypoint | null =>
  v.startsWith("poi:") ? { poi: v.slice(4) } : v.startsWith("space:") ? { space: v.slice(6) } : null;

function resolveWaypoint(data: MapData, w: Waypoint | null) {
  if (!w) return null;
  if ("poi" in w) {
    const poi = data.pois.find((p) => p.id === w.poi);
    if (!poi) return null;
    const space = data.spaces.find((s) => s.id === poi.space);
    return { title: poi.name ?? poiCategoryLabel(poi.category), subtitle: space?.name, level: poi.level, point: poi.point };
  }
  if ("space" in w) {
    const s = data.spaces.find((x) => x.id === w.space);
    if (!s) return null;
    return { title: s.name ?? SPACE_TYPE_LABEL[s.type], subtitle: s.name ? SPACE_TYPE_LABEL[s.type] : undefined, level: s.level, point: s.labelPoint };
  }
  return { title: "Bod na mape", level: w.level, point: w.point };
}

const formatDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
const formatDuration = (s: number) => (s < 60 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`);

function nowLocal() {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/* ---------- Komponent ---------- */

export function Navigator({ data }: { data: MapData }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profilePending, startProfile] = React.useTransition();

  const [ordinal, setOrdinal] = React.useState(0);
  const [selection, setSelection] = React.useState<Waypoint | null>(null);
  const [fromState, setFrom] = React.useState<Waypoint | null>(null);
  const [toState, setTo] = React.useState<Waypoint | null>(null);
  const [time, setTime] = React.useState<string | null>(null); // null = teraz
  const [result, setResult] = React.useState<RouteResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Po zmene profilu môže interný bod zmiznúť – výber, ktorý už v dátach nie je, sa ignoruje.
  const from = resolveWaypoint(data, fromState) ? fromState : null;
  const to = resolveWaypoint(data, toState) ? toState : null;
  const fromInfo = resolveWaypoint(data, from);
  const toInfo = resolveWaypoint(data, to);
  const selectionInfo = resolveWaypoint(data, selection);

  const levelById = React.useMemo(() => new Map(data.levels.map((l) => [l.id, l])), [data.levels]);
  const showLevel = (level: string) => setOrdinal(levelById.get(level)?.ordinal ?? 0);

  const invalidate = () => setResult(null);
  const choose = (which: "from" | "to", w: Waypoint | null) => {
    (which === "from" ? setFrom : setTo)(w);
    invalidate();
    const info = resolveWaypoint(data, w);
    if (info) showLevel(info.level);
  };

  const changeProfile = (id: string) => {
    invalidate();
    startProfile(() => router.replace(`${pathname}?profil=${encodeURIComponent(id)}`, { scroll: false }));
  };

  async function findRoute() {
    if (!from || !to) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: data.profile, from, to, time: time ? new Date(time).toISOString() : undefined }),
      });
      const body = (await res.json()) as RouteResponse;
      setResult(body);
      if (body.status === "ok" && body.legs[0]) showLevel(body.legs[0].level);
    } catch {
      setResult({ status: "error", message: "Server je nedostupný." });
    } finally {
      setLoading(false);
    }
  }

  const marker = (info: ReturnType<typeof resolveWaypoint>): MapMarker | null => (info ? { level: info.level, point: info.point } : null);

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row">
      {/* Panel */}
      <aside className="order-2 max-h-[48dvh] shrink-0 overflow-y-auto border-t border-slate-200 bg-white md:order-1 md:h-full md:max-h-none md:w-[360px] md:border-r md:border-t-0">
        <div className="space-y-5 p-4 md:p-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Navigácia</h1>
            <p className="text-sm text-slate-500">{data.venue.name}</p>
          </div>

          <Field label="Profil">
            <select
              value={data.profile}
              onChange={(e) => changeProfile(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              disabled={profilePending}
            >
              {data.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? p.id}
                </option>
              ))}
            </select>
          </Field>

          <div className="relative space-y-3">
            <WaypointSelect label="Odkiaľ" color={COLORS.start} data={data} value={from} onChange={(w) => choose("from", w)} />
            <WaypointSelect label="Kam" color={COLORS.target} data={data} value={to} onChange={(w) => choose("to", w)} />
            <button
              type="button"
              aria-label="Vymeniť štart a cieľ"
              title="Vymeniť"
              onClick={() => {
                setFrom(to);
                setTo(from);
                invalidate();
              }}
              className="absolute right-0 top-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          <Field label="Odchod">
            <div className="flex gap-2">
              <select
                value={time === null ? "now" : "at"}
                onChange={(e) => {
                  setTime(e.target.value === "now" ? null : nowLocal());
                  invalidate();
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="now">Teraz</option>
                <option value="at">Zvoliť čas</option>
              </select>
              {time !== null && (
                <input
                  type="datetime-local"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value);
                    invalidate();
                  }}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              )}
            </div>
          </Field>

          <button
            type="button"
            onClick={findRoute}
            disabled={!from || !to || encode(from) === encode(to) || loading || profilePending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0075be] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#003a70] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
            Nájsť trasu
          </button>

          {result?.status === "ok" && (
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-slate-900">{formatDuration(result.duration)}</span>
                <span className="text-sm text-slate-500">{formatDistance(result.distance)}</span>
              </div>
              <ol className="mt-3 space-y-1 text-sm text-slate-600">
                {result.legs.map((leg, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => showLevel(leg.level)} className="hover:text-[#0075be]">
                      {levelLabel(levelById.get(leg.level))}
                      {leg.transition && ` → ${VERTICAL_TYPE_LABEL[leg.transition.type]} → ${levelLabel(levelById.get(leg.transition.toLevel))}`}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {result?.status === "unreachable" && (
            <AlertBox severity="warning" title="Cieľ je nedostupný">
              {result.message}
            </AlertBox>
          )}
          {result?.status === "error" && (
            <AlertBox severity="error" title="Trasu sa nepodarilo vypočítať">
              {result.message}
            </AlertBox>
          )}

          {selectionInfo && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <MapPin size={14} className="shrink-0 text-[#0075be]" />
                    <span className="truncate">{selectionInfo.title}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {[selectionInfo.subtitle, levelLabel(levelById.get(selectionInfo.level))].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button type="button" aria-label="Zrušiť výber" onClick={() => setSelection(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200">
                  <X size={14} />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => choose("from", selection)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:border-[#16a34a]">
                  Odtiaľto
                </button>
                <button type="button" onClick={() => choose("to", selection)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:border-[#dc2626]">
                  Sem
                </button>
              </div>
            </div>
          )}

          {!fromInfo && !toInfo && !selectionInfo && (
            <p className="text-xs leading-relaxed text-slate-400">Štart a cieľ vyber zo zoznamu alebo klikni na miesto na mape.</p>
          )}
        </div>
      </aside>

      {/* Mapa */}
      <div className="order-1 min-h-0 flex-1 md:order-2">
        <MapView
          data={data}
          ordinal={ordinal}
          onOrdinalChange={setOrdinal}
          selection={selection}
          onSelect={setSelection}
          from={marker(fromInfo)}
          to={marker(toInfo)}
          route={result?.status === "ok" ? result.legs : null}
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function WaypointSelect({
  label,
  color,
  data,
  value,
  onChange,
}: {
  label: string;
  color: string;
  data: MapData;
  value: Waypoint | null;
  onChange: (w: Waypoint | null) => void;
}) {
  const levelName = new Map(data.levels.map((l) => [l.id, levelLabel(l)]));
  const named = data.spaces.filter((s) => s.name);
  return (
    <div className="space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <select
        aria-label={label}
        value={encode(value)}
        onChange={(e) => onChange(decode(e.target.value))}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        <option value="">— vyber —</option>
        <optgroup label="Body záujmu">
          {data.pois.map((p) => (
            <option key={p.id} value={`poi:${p.id}`}>
              {p.name ?? poiCategoryLabel(p.category)} ({levelName.get(p.level)})
            </option>
          ))}
        </optgroup>
        <optgroup label="Priestory">
          {named.map((s) => (
            <option key={s.id} value={`space:${s.id}`}>
              {s.name} ({levelName.get(s.level)})
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
