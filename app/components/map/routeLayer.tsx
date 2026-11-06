"use client";

import * as React from "react";
import type { MapLevel, RouteLeg } from "@/lib/api/types";
import type { Vec2 } from "@/lib/core/geometry/types";
import { COLORS, ordinalLabel } from "./mapStyle";

const legLength = (p: Vec2[]) => p.slice(1).reduce((sum, c, i) => sum + Math.hypot(c[0] - p[i][0], c[1] - p[i][1]), 0);

/** Začiatok `points` až po vzdialenosť `dist` od jeho začiatku. */
function sliceBy(points: Vec2[], dist: number): Vec2[] {
  const out: Vec2[] = [points[0]];
  let left = dist;
  for (let i = 1; i < points.length && left > 0; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const seg = Math.hypot(bx - ax, by - ay);
    if (left >= seg) {
      out.push(points[i]);
      left -= seg;
    } else {
      const k = left / seg;
      out.push([ax + (bx - ax) * k, ay + (by - ay) * k]);
      left = 0;
    }
  }
  return out;
}

const easeInOut = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

/** Postupne odkrýva trasu od štartu k cieľu. Pri `prefers-reduced-motion` ju ukáže hneď. */
function useReveal(route: RouteLeg[], total: number) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(1);
      return;
    }
    setT(0);
    const duration = Math.min(2600, 700 + total * 25);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      setT(easeInOut(k));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [route, total]);
  return t;
}

type Props = {
  route: RouteLeg[];
  activeIds: Set<string>;
  levelById: Map<string, MapLevel>;
  /** Veľkosť jedného obrazovkového pixelu v jednotkách mapy. */
  px: (n: number) => number;
  /** Počas kreslenia sa volá, keď sa kreslenie presunie na iné podlažie. */
  onFollow: (level: string) => void;
};

export function RouteLayer({ route, activeIds, levelById, px, onFollow }: Props) {
  const lengths = React.useMemo(() => route.map((l) => legLength(l.points)), [route]);
  const total = lengths.reduce((a, b) => a + b, 0);
  const t = useReveal(route, total);
  const covered = t * total;

  // Úsek, ktorý sa práve kreslí (po dokončení posledný).
  let current = 0;
  for (let acc = 0; current < route.length - 1 && acc + lengths[current] <= covered; current++) acc += lengths[current];
  const followLevel = t > 0 && t < 1 ? route[current]?.level : undefined;
  React.useEffect(() => {
    if (followLevel) onFollow(followLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followLevel]);

  let offset = 0;
  return (
    <>
      {route.map((leg, i) => {
        const from = offset;
        offset += lengths[i];
        if (!activeIds.has(leg.level) || covered <= from) return null;
        const done = covered >= offset;
        const shown = done ? leg.points : sliceBy(leg.points, covered - from);
        const points = shown.map((p) => p.join(",")).join(" ");
        const head = shown[shown.length - 1];
        return (
          <g key={i} pointerEvents="none">
            <polyline points={points} fill="none" stroke="#ffffff" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <polyline points={points} fill="none" stroke={COLORS.primary} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {!done && <circle cx={head[0]} cy={head[1]} r={px(6)} fill="#ffffff" stroke={COLORS.primary} strokeWidth={3} vectorEffect="non-scaling-stroke" />}
            {done && leg.transition && (
              <TransitionBadge at={leg.points[leg.points.length - 1]} r={px(10)} text={ordinalLabel(levelById.get(leg.transition.toLevel)?.ordinal ?? 0)} />
            )}
          </g>
        );
      })}
    </>
  );
}

function TransitionBadge({ at, r, text }: { at: Vec2; r: number; text: string }) {
  return (
    <g>
      <circle cx={at[0]} cy={at[1]} r={r} fill={COLORS.primaryDark} stroke="#ffffff" strokeWidth={2} vectorEffect="non-scaling-stroke">
        <animate attributeName="r" from={r * 0.3} to={r} dur="0.25s" fill="freeze" />
      </circle>
      <text x={at[0]} y={at[1]} fontSize={r} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontWeight={700}>
        {text}
      </text>
    </g>
  );
}

/** Pulzujúce kruhy okolo štartu, kým sa trasa počíta. */
export function SearchPulse({ at, r }: { at: Vec2; r: number }) {
  return (
    <g pointerEvents="none">
      {[0, 0.5].map((begin) => (
        <circle key={begin} cx={at[0]} cy={at[1]} r={r} fill="none" stroke={COLORS.primary} strokeWidth={3} vectorEffect="non-scaling-stroke">
          <animate attributeName="r" from={r} to={r * 5} dur="1s" begin={`${begin}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.7" to="0" dur="1s" begin={`${begin}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}
