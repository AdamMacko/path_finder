"use client";

import * as React from "react";
import type { Calibration, LineShape, Point, PointItem } from "../lib/model";
import { trackDrag } from "../lib/drag";

/**
 * Vrstvy nad podkladom, ktoré nie sú obdĺžniky: úsečky (vstupy, dvere), body (body záujmu)
 * a kalibračná úsečka. Súradnice sú v pixeloch podkladu, veľkosti prvkov stále na obrazovke.
 */

const svgStyle: React.CSSProperties = { position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" };
const HANDLE = 6;

/** Text s bielym okrajom, čitateľný na fotke aj na pôdoryse. */
function Label({ x, y, scale, children, color }: { x: number; y: number; scale: number; children: React.ReactNode; color: string }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={12 / scale}
      fontWeight={600}
      textAnchor="middle"
      fill={color}
      stroke="white"
      strokeWidth={3 / scale}
      paintOrder="stroke"
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      {children}
    </text>
  );
}

/* ---------- Úsečky ---------- */

type LinesProps = {
  lines: LineShape[];
  color: string;
  scale: number;
  /** V režime "select" sa dajú úsečky vyberať a ťahať. */
  interactive: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Prvý bod úsečky, ktorú admin práve kreslí. */
  pending: Point | null;
  /** Prichytenie bodu k hranám priestorov (vstupy a dvere ležia na hranici). */
  snap: (p: Point) => Point;
  onMove: (id: string, a: Point, b: Point) => void;
};

export function LinesOverlay({ lines, color, scale, interactive, selectedId, onSelect, pending, snap, onMove }: LinesProps) {
  const px = (n: number) => n / scale;

  function dragEnd(e: React.MouseEvent, line: LineShape, end: "a" | "b") {
    e.stopPropagation();
    const [sx, sy] = [e.clientX, e.clientY];
    const origin = line[end];
    trackDrag((ev) => {
      const p = snap({ x: origin.x + (ev.clientX - sx) / scale, y: origin.y + (ev.clientY - sy) / scale });
      onMove(line.id, end === "a" ? p : line.a, end === "b" ? p : line.b);
    });
  }

  return (
    <svg width={1} height={1} style={svgStyle}>
      {lines
        .filter((l) => l.visible !== false)
        .map((l) => {
          const selected = l.id === selectedId;
          return (
            <g key={l.id}>
              <line
                x1={l.a.x}
                y1={l.a.y}
                x2={l.b.x}
                y2={l.b.y}
                stroke="white"
                strokeWidth={px(selected ? 8 : 6)}
                strokeLinecap="round"
              />
              <line
                x1={l.a.x}
                y1={l.a.y}
                x2={l.b.x}
                y2={l.b.y}
                stroke={color}
                strokeWidth={px(selected ? 5 : 3.5)}
                strokeLinecap="round"
              />
              {/* široká neviditeľná čiara na ľahké trafenie myšou */}
              <line
                x1={l.a.x}
                y1={l.a.y}
                x2={l.b.x}
                y2={l.b.y}
                stroke="transparent"
                strokeWidth={px(16)}
                style={interactive ? { pointerEvents: "stroke", cursor: "pointer" } : undefined}
                onMouseDown={interactive ? (e) => {
                  e.stopPropagation();
                  onSelect(l.id);
                } : undefined}
              />
              <Label x={(l.a.x + l.b.x) / 2} y={(l.a.y + l.b.y) / 2 - px(10)} scale={scale} color={color}>
                {l.nazov}
              </Label>
              {selected &&
                interactive &&
                (["a", "b"] as const).map((end) => (
                  <circle
                    key={end}
                    cx={l[end].x}
                    cy={l[end].y}
                    r={px(HANDLE)}
                    fill="white"
                    stroke={color}
                    strokeWidth={px(3)}
                    style={{ pointerEvents: "all", cursor: "move" }}
                    onMouseDown={(e) => dragEnd(e, l, end)}
                  />
                ))}
            </g>
          );
        })}
      {pending && <circle cx={pending.x} cy={pending.y} r={px(HANDLE)} fill={color} stroke="white" strokeWidth={px(2)} />}
    </svg>
  );
}

/* ---------- Body záujmu ---------- */

type PointsProps = {
  points: PointItem[];
  color: string;
  scale: number;
  interactive: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, p: Point) => void;
};

export function PointsOverlay({ points, color, scale, interactive, selectedId, onSelect, onMove }: PointsProps) {
  const px = (n: number) => n / scale;

  function drag(e: React.MouseEvent, item: PointItem) {
    e.stopPropagation();
    onSelect(item.id);
    const [sx, sy] = [e.clientX, e.clientY];
    const origin = item.point;
    trackDrag((ev) => onMove(item.id, { x: origin.x + (ev.clientX - sx) / scale, y: origin.y + (ev.clientY - sy) / scale }));
  }

  return (
    <svg width={1} height={1} style={svgStyle}>
      {points.map((p) => {
        const selected = p.id === selectedId;
        const fill = p.interny ? "#bd3a2f" : color;
        return (
          <g key={p.id}>
            <circle
              cx={p.point.x}
              cy={p.point.y}
              r={px(selected ? 10 : 8)}
              fill={fill}
              stroke="white"
              strokeWidth={px(2.5)}
              style={interactive ? { pointerEvents: "all", cursor: "move" } : undefined}
              onMouseDown={interactive ? (e) => drag(e, p) : undefined}
            />
            <circle cx={p.point.x} cy={p.point.y} r={px(3)} fill="white" style={{ pointerEvents: "none" }} />
            <Label x={p.point.x} y={p.point.y - px(14)} scale={scale} color={fill}>
              {p.nazov}
            </Label>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- Kalibrácia ---------- */

type CalibrationProps = {
  /** Uložená kalibrácia. */
  value: Calibration | null;
  /** Rozkreslené body (0 až 2), ktoré čakajú na zadanie vzdialenosti. */
  draft: Point[];
  scale: number;
};

export function CalibrationOverlay({ value, draft, scale }: CalibrationProps) {
  const px = (n: number) => n / scale;
  const color = "#7c3aed";
  const seg = draft.length === 2 ? { a: draft[0], b: draft[1], label: "" } : value ? { a: value.a, b: value.b, label: `${value.meters} m` } : null;

  return (
    <svg width={1} height={1} style={svgStyle}>
      {seg && (
        <>
          <line x1={seg.a.x} y1={seg.a.y} x2={seg.b.x} y2={seg.b.y} stroke={color} strokeWidth={px(2.5)} strokeDasharray={`${px(6)} ${px(4)}`} />
          {[seg.a, seg.b].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={px(5)} fill="white" stroke={color} strokeWidth={px(2.5)} />
          ))}
          {seg.label && <Label x={(seg.a.x + seg.b.x) / 2} y={(seg.a.y + seg.b.y) / 2 - px(10)} scale={scale} color={color}>{seg.label}</Label>}
        </>
      )}
      {draft.length === 1 && <circle cx={draft[0].x} cy={draft[0].y} r={px(5)} fill={color} stroke="white" strokeWidth={px(2)} />}
    </svg>
  );
}
