"use client";

import * as React from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import type { MapData, MapLevel, MapSpace, RouteLeg, Waypoint } from "@/lib/api/types";
import type { Vec2 } from "@/lib/core/geometry/types";
import {
  COLORS,
  SPACE_FILL,
  SPACE_TYPE_LABEL,
  levelLabel,
  ordinalLabel,
  ordinals,
  poiCategoryLabel,
  polygonBox,
  polygonPath,
  visibleLevels,
} from "./mapStyle";
import { usePanZoom } from "./usePanZoom";

export type MapMarker = { level: string; point: Vec2 };

type Props = {
  data: MapData;
  ordinal: number;
  onOrdinalChange: (ordinal: number) => void;
  selection: Waypoint | null;
  onSelect: (selection: Waypoint | null) => void;
  from?: MapMarker | null;
  to?: MapMarker | null;
  route?: RouteLeg[] | null;
};

const PAD = 4;

export function MapView({ data, ordinal, onOrdinalChange, selection, onSelect, from, to, route }: Props) {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [minX, minY, maxX, maxY] = data.bounds;
  const home = React.useMemo(
    () => ({ x: minX - PAD, y: minY - PAD, w: maxX - minX + 2 * PAD, h: maxY - minY + 2 * PAD }),
    [minX, minY, maxX, maxY]
  );
  const { view, unitsPerPx, zoomBy, reset, wasDrag } = usePanZoom(svgRef, home);
  // Prvky s konštantnou veľkosťou na obrazovke (popisy, značky) sa kreslia až po zmeraní mapy.
  const measured = unitsPerPx !== null;
  const px = (n: number) => n * (unitsPerPx ?? 0);

  const { active, faded } = React.useMemo(() => visibleLevels(data, ordinal), [data, ordinal]);
  const activeIds = new Set(active.map((l) => l.id));
  const spacesOf = (level: MapLevel) => data.spaces.filter((s) => s.level === level.id);
  const activeSpaces = data.spaces.filter((s) => activeIds.has(s.level));
  const levelById = new Map(data.levels.map((l) => [l.id, l]));
  const isOutdoor = (s: MapSpace) => levelById.get(s.level)?.building === undefined;
  // Exteriér pod budovami, aby steny budov neprekryl.
  const drawOrder = [...active].sort((a, b) => Number(a.building !== undefined) - Number(b.building !== undefined));

  const selectedSpace = selection && "space" in selection ? selection.space : null;
  const selectedPoi = selection && "poi" in selection ? selection.poi : null;

  const click = (sel: Waypoint | null) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!wasDrag()) onSelect(sel);
  };

  const fontSize = px(12);
  const label = (s: MapSpace) => s.name ?? (s.type === "stairs" || s.type === "elevator" ? SPACE_TYPE_LABEL[s.type] : null);
  const labelFits = (s: MapSpace, text: string) => {
    const box = polygonBox(s.polygon);
    return text.length * fontSize * 0.55 < box.w * 0.95 && fontSize * 1.2 < box.h;
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: COLORS.canvas }}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="h-full w-full touch-none select-none"
        onClick={click(null)}
        role="img"
        aria-label={`Mapa areálu ${data.venue.name}, podlažie ${ordinalLabel(ordinal)}`}
      >
        <defs>
          <pattern id="pf-restricted" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="1.2" stroke={COLORS.restricted} strokeWidth="0.25" strokeOpacity="0.35" />
          </pattern>
        </defs>

        {/* Tlmené vrstvy: obrysy budov bez tohto podlažia, exteriér nad prízemím. */}
        <g opacity={0.35} pointerEvents="none">
          {faded.flatMap(spacesOf).map((s) => (
            <path
              key={s.id}
              d={polygonPath(s.polygon)}
              fill={SPACE_FILL[s.type]}
              fillRule="evenodd"
              stroke={COLORS.wall}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        {drawOrder.map((level) => (
          <g key={level.id}>
            {spacesOf(level).map((s) => (
              <g key={s.id} onClick={click({ space: s.id })} className="cursor-pointer">
                <path
                  d={polygonPath(s.polygon)}
                  fill={SPACE_FILL[s.type]}
                  fillRule="evenodd"
                  stroke={isOutdoor(s) ? COLORS.wallOutdoor : COLORS.wall}
                  strokeWidth={isOutdoor(s) ? 1 : 1.5}
                  vectorEffect="non-scaling-stroke"
                  className="transition-[filter] hover:brightness-95"
                >
                  <title>{s.name ?? SPACE_TYPE_LABEL[s.type]}</title>
                </path>
                {s.restricted && <path d={polygonPath(s.polygon)} fill="url(#pf-restricted)" fillRule="evenodd" pointerEvents="none" />}
              </g>
            ))}
          </g>
        ))}

        {/* Prechody: dvere „prerušia“ stenu, obmedzené prechody sú oranžové. Virtuálne sa nekreslia. */}
        <g pointerEvents="none">
          {data.openings
            .filter((o) => o.type !== "virtual" && o.levels.some((l) => activeIds.has(l)))
            .map((o) => (
              <line
                key={o.id}
                x1={o.segment[0][0]}
                y1={o.segment[0][1]}
                x2={o.segment[1][0]}
                y2={o.segment[1][1]}
                stroke={o.restricted ? COLORS.restricted : "#ffffff"}
                strokeWidth={o.restricted ? 3.5 : 3}
                strokeLinecap="butt"
                vectorEffect="non-scaling-stroke"
              />
            ))}
        </g>

        {/* Vybraný priestor */}
        {selectedSpace && activeSpaces.some((s) => s.id === selectedSpace) && (
          <path
            d={polygonPath(activeSpaces.find((s) => s.id === selectedSpace)!.polygon)}
            fill={COLORS.primary}
            fillOpacity={0.12}
            fillRule="evenodd"
            stroke={COLORS.primary}
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}

        {measured && (
          <>
            {/* Trasa – iba úseky na aktívnych podlažiach. */}
            {route
              ?.filter((leg) => activeIds.has(leg.level))
              .map((leg, i) => {
                const points = leg.points.map((p) => p.join(",")).join(" ");
                return (
                  <g key={i} pointerEvents="none">
                    <polyline points={points} fill="none" stroke="#ffffff" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    <polyline points={points} fill="none" stroke={COLORS.primary} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    {leg.transition && (
                      <TransitionBadge at={leg.points[leg.points.length - 1]} r={px(10)} text={ordinalLabel(levelById.get(leg.transition.toLevel)?.ordinal ?? 0)} />
                    )}
                  </g>
                );
              })}

            {/* Popisy priestorov – skryjú sa, ak sa pri aktuálnom zoome do priestoru nezmestia. */}
            <g pointerEvents="none" fontSize={fontSize} fontFamily="var(--font-geist-sans), sans-serif" textAnchor="middle" dominantBaseline="central">
              {activeSpaces.map((s) => {
                const text = label(s);
                if (!text || !labelFits(s, text)) return null;
                return (
                  <text key={s.id} x={s.labelPoint[0]} y={s.labelPoint[1]} fill={isOutdoor(s) ? "#64748b" : "#334155"} fontWeight={500}>
                    {text}
                  </text>
                );
              })}
            </g>

            {/* Body záujmu */}
            {data.pois
              .filter((p) => activeIds.has(p.level))
              .map((p) => {
                const selected = selectedPoi === p.id;
                return (
                  <g key={p.id} onClick={click({ poi: p.id })} className="cursor-pointer">
                    <circle cx={p.point[0]} cy={p.point[1]} r={px(selected ? 9 : 7)} fill={selected ? COLORS.primary : COLORS.poi} stroke="#ffffff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                    <circle cx={p.point[0]} cy={p.point[1]} r={px(2.5)} fill="#ffffff" />
                    <title>{p.name ?? poiCategoryLabel(p.category)}</title>
                  </g>
                );
              })}

            {from && activeIds.has(from.level) && <Marker at={from.point} r={px(9)} color={COLORS.start} />}
            {to && activeIds.has(to.level) && <Marker at={to.point} r={px(9)} color={COLORS.target} />}
          </>
        )}
      </svg>

      {/* Prepínač podlaží */}
      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" role="group" aria-label="Podlažie">
        {ordinals(data).map((o) => {
          const here = data.levels.filter((l) => l.ordinal === o && l.building !== undefined);
          const marks = [from, to].filter((m) => m && levelById.get(m.level)?.ordinal === o).length;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onOrdinalChange(o)}
              aria-pressed={o === ordinal}
              title={here.map(levelLabel).join(", ") || "Exteriér"}
              className={`relative h-10 w-10 text-sm font-semibold transition ${o === ordinal ? "bg-[#0075be] text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {ordinalLabel(o)}
              {marks > 0 && o !== ordinal && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#0075be]" />}
            </button>
          );
        })}
      </div>

      {/* Zoom */}
      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <MapButton label="Priblížiť" onClick={() => zoomBy(1 / 1.5)}>
          <Plus size={16} />
        </MapButton>
        <MapButton label="Oddialiť" onClick={() => zoomBy(1.5)}>
          <Minus size={16} />
        </MapButton>
        <MapButton label="Celý areál" onClick={reset}>
          <Maximize2 size={14} />
        </MapButton>
      </div>

      {/* Mierka */}
      {measured && <ScaleBar unitsPerPx={unitsPerPx} />}
    </div>
  );
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-10 w-10 items-center justify-center text-slate-600 hover:bg-slate-50">
      {children}
    </button>
  );
}

function Marker({ at, r, color }: { at: Vec2; r: number; color: string }) {
  return (
    <g pointerEvents="none">
      <circle cx={at[0]} cy={at[1]} r={r} fill={color} stroke="#ffffff" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      <circle cx={at[0]} cy={at[1]} r={r * 0.35} fill="#ffffff" />
    </g>
  );
}

function TransitionBadge({ at, r, text }: { at: Vec2; r: number; text: string }) {
  return (
    <g>
      <circle cx={at[0]} cy={at[1]} r={r} fill={COLORS.primaryDark} stroke="#ffffff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <text x={at[0]} y={at[1]} fontSize={r} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontWeight={700}>
        {text}
      </text>
    </g>
  );
}

/** Mierka s „peknou“ dĺžkou (1, 2, 5 · 10ⁿ m) okolo 100 px. */
function ScaleBar({ unitsPerPx }: { unitsPerPx: number }) {
  const target = unitsPerPx * 100;
  const pow = 10 ** Math.floor(Math.log10(target));
  const meters = [1, 2, 5, 10].map((k) => k * pow).find((m) => m >= target * 0.6) ?? pow * 10;
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/85 px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
      <div className="h-1.5 border-x-2 border-b-2 border-slate-500" style={{ width: meters / unitsPerPx }} />
      <div className="mt-0.5">{meters >= 1000 ? `${meters / 1000} km` : `${meters} m`}</div>
    </div>
  );
}
