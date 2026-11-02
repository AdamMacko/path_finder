"use client";

import * as React from "react";
import type { Point } from "../lib/model";
import { trackDrag as listen } from "../lib/drag";
import { pointsAttr } from "../lib/walkable";

const HANDLE = 7;
export const MIN_VERTICES = 3;

const interactive: React.CSSProperties = { pointerEvents: "all" };

/** Úchyty vrcholov jedného polygónu: ťahaním posun, biely bod na hrane pridá vrchol, dvojklik vrchol odstráni. */
function PolygonHandles({
  polygon,
  color,
  scale,
  onChange,
}: {
  polygon: Point[];
  color: string;
  scale: number;
  onChange: (next: Point[]) => void;
}) {
  const px = (n: number) => n / scale;

  function dragVertex(e: React.MouseEvent, points: Point[], index: number) {
    e.stopPropagation();
    const [sx, sy] = [e.clientX, e.clientY];
    const origin = points[index];
    listen((ev) =>
      onChange(
        points.map((p, i) => (i === index ? { x: origin.x + (ev.clientX - sx) / scale, y: origin.y + (ev.clientY - sy) / scale } : p))
      )
    );
  }

  function insertVertex(e: React.MouseEvent, after: number) {
    const a = polygon[after];
    const b = polygon[(after + 1) % polygon.length];
    const next = [...polygon.slice(0, after + 1), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, ...polygon.slice(after + 1)];
    onChange(next);
    dragVertex(e, next, after + 1);
  }

  function removeVertex(index: number) {
    if (polygon.length > MIN_VERTICES) onChange(polygon.filter((_, i) => i !== index));
  }

  return (
    <>
      {polygon.map((p, i) => {
        const q = polygon[(i + 1) % polygon.length];
        return (
          <circle
            key={`mid-${i}`}
            cx={(p.x + q.x) / 2}
            cy={(p.y + q.y) / 2}
            r={px(HANDLE - 2)}
            fill="white"
            fillOpacity={0.9}
            stroke={color}
            strokeWidth={px(2)}
            style={{ ...interactive, cursor: "copy" }}
            onMouseDown={(e) => insertVertex(e, i)}
          >
            <title>Potiahnutím pridáte vrchol</title>
          </circle>
        );
      })}
      {polygon.map((p, i) => (
        <circle
          key={`v-${i}`}
          cx={p.x}
          cy={p.y}
          r={px(HANDLE)}
          fill="white"
          stroke={color}
          strokeWidth={px(3)}
          style={{ ...interactive, cursor: "move" }}
          onMouseDown={(e) => dragVertex(e, polygon, i)}
          onDoubleClick={() => removeVertex(i)}
        >
          <title>Ťahaním posuniete vrchol, dvojklikom ho odstránite</title>
        </circle>
      ))}
    </>
  );
}

type Props = {
  /** Dokončený polygón pochôdznej plochy. */
  polygon: Point[] | null;
  /** Zakázané plochy – od pochôdznej plochy sa odčítajú rovnako ako budovy. */
  forbidden: Point[][];
  /** Rozkreslený polygón (body, ktoré admin práve kladie). */
  draft: Point[];
  /** Farba rozkresleného polygónu (podľa toho, či sa kreslí plocha alebo zakázaná plocha). */
  draftColor: string;
  /** Diery – obrysy budov, ktoré sa od plochy odčítajú. */
  holes: Point[][];
  color: string;
  forbiddenColor: string;
  /** Aktuálne priblíženie plátna – úchyty a čiary majú stálu veľkosť na obrazovke. */
  scale: number;
  /** Nástroj "select": vrcholy sa dajú ťahať, pridávať a mazať. */
  editable: boolean;
  onChange: (next: Point[]) => void;
  onChangeForbidden: (index: number, next: Point[]) => void;
  /** Klik na prvý bod rozkresleného polygónu ho uzavrie. */
  onCloseDraft: () => void;
};

/**
 * Vrstva nad podkladom: pochôdzna plocha ako polygón s dierami po budovách a zakázaných plochách
 * (náhľad toho, čo sa exportuje) a úchyty na jej úpravu. Súradnice sú v pixeloch podkladu.
 */
export function AreaPolygon({
  polygon,
  forbidden,
  draft,
  draftColor,
  holes,
  color,
  forbiddenColor,
  scale,
  editable,
  onChange,
  onChangeForbidden,
  onCloseDraft,
}: Props) {
  const maskId = `walkable-${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const px = (n: number) => n / scale;

  return (
    <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      {polygon && (
        <>
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x={-100000} y={-100000} width={200000} height={200000}>
              <polygon points={pointsAttr(polygon)} fill="white" />
              {holes.map((h, i) => (
                <polygon key={i} points={pointsAttr(h)} fill="black" />
              ))}
              {forbidden.map((f, i) => (
                <polygon key={`f-${i}`} points={pointsAttr(f)} fill="black" />
              ))}
            </mask>
          </defs>
          <polygon points={pointsAttr(polygon)} fill={color} fillOpacity={0.22} mask={`url(#${maskId})`} />
          <polygon
            points={pointsAttr(polygon)}
            fill="none"
            stroke={color}
            strokeWidth={px(2.5)}
            strokeDasharray={`${px(8)} ${px(5)}`}
          />
        </>
      )}

      {forbidden.map((f, i) => (
        <g key={`forbidden-${i}`}>
          <polygon
            points={pointsAttr(f)}
            fill={forbiddenColor}
            fillOpacity={0.28}
            stroke={forbiddenColor}
            strokeWidth={px(2)}
            strokeDasharray={`${px(4)} ${px(4)}`}
          />
          {editable && <PolygonHandles polygon={f} color={forbiddenColor} scale={scale} onChange={(next) => onChangeForbidden(i, next)} />}
        </g>
      ))}

      {polygon && editable && <PolygonHandles polygon={polygon} color={color} scale={scale} onChange={onChange} />}

      {draft.length > 0 && (
        <>
          <polyline
            points={pointsAttr(draft)}
            fill={draft.length >= MIN_VERTICES ? draftColor : "none"}
            fillOpacity={0.12}
            stroke={draftColor}
            strokeWidth={px(2.5)}
          />
          {draft.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={px(i === 0 ? HANDLE + 2 : HANDLE - 2)}
              fill={i === 0 ? draftColor : "white"}
              stroke={draftColor}
              strokeWidth={px(2)}
              style={i === 0 && draft.length >= MIN_VERTICES ? { ...interactive, cursor: "pointer" } : undefined}
              onMouseDown={
                i === 0 && draft.length >= MIN_VERTICES
                  ? (e) => {
                      e.stopPropagation();
                      onCloseDraft();
                    }
                  : undefined
              }
            >
              {i === 0 && draft.length >= MIN_VERTICES && <title>Kliknutím uzavriete plochu</title>}
            </circle>
          ))}
        </>
      )}
    </svg>
  );
}
