"use client";

import * as React from "react";
import { type RectShape, rotateVector } from "../lib/model";
import { hexToRgba } from "../lib/color";

const MIN_SIZE = 20;

export type RectTier = "active" | "sibling" | "rest";

const TIER_STYLE: Record<RectTier, { borderAlpha: number; fillAlpha: number; borderWidth: number }> = {
  active: { borderAlpha: 1, fillAlpha: 0.18, borderWidth: 3 },
  sibling: { borderAlpha: 0.85, fillAlpha: 0.1, borderWidth: 2 },
  rest: { borderAlpha: 0.65, fillAlpha: 0.06, borderWidth: 2 },
};

type Props = {
  rect: RectShape;
  /** Farba tvaru (hex) — predvolená podľa typu objektu, alebo vlastná. */
  color: string;
  tier: RectTier;
  /** Len aktívny (práve vybraný) obdĺžnik ponúka úchyty. */
  active: boolean;
  /** Aktuálne priblíženie plátna — treba na prevod pohybu myši (v px obrazovky) na px podkladu. */
  scale: number;
  /** Len v režime "select" sa dá ťahať/meniť. */
  editable: boolean;
  onSelect: () => void;
  onChange: (next: RectShape) => void;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

const CORNERS: Array<{ key: string; sx: 1 | -1; sy: 1 | -1; pos: string }> = [
  { key: "nw", sx: -1, sy: -1, pos: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
  { key: "ne", sx: 1, sy: -1, pos: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
  { key: "se", sx: 1, sy: 1, pos: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
  { key: "sw", sx: -1, sy: 1, pos: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
];

export function FootprintRect({ rect, color, tier, active, scale, editable, onSelect, onChange }: Props) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  function startMove(e: React.MouseEvent) {
    e.stopPropagation();
    if (!editable) {
      onSelect();
      return;
    }
    onSelect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startRect = rect;

    function onMove(ev: MouseEvent) {
      const dx = (ev.clientX - startClientX) / scale;
      const dy = (ev.clientY - startClientY) / scale;
      onChange({ ...startRect, cx: startRect.cx + dx, cy: startRect.cy + dy });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // Ťahaný roh sa hýbe, protiľahlý roh ostáva presne na mieste (bežné správanie
  // ako vo Figme/PowerPointe) — nie zmena veľkosti symetricky okolo stredu.
  function startResize(e: React.MouseEvent, sx: 1 | -1, sy: 1 | -1) {
    e.stopPropagation();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startRect = rect;

    function onMove(ev: MouseEvent) {
      const dxImage = (ev.clientX - startClientX) / scale;
      const dyImage = (ev.clientY - startClientY) / scale;
      // pohyb myši prevedieme do lokálnej (natočenej) sústavy obdĺžnika
      const local = rotateVector(dxImage, dyImage, startRect.rotation);

      const width = Math.max(MIN_SIZE, startRect.width + sx * local.x);
      const height = Math.max(MIN_SIZE, startRect.height + sy * local.y);

      // stred posunieme len o polovicu SKUTOČNEJ (orezanej) zmeny rozmeru —
      // tak protiľahlý roh zostane presne na svojej pôvodnej globálnej pozícii,
      // aj keď sa už narazilo na minimálnu veľkosť
      const widthDelta = width - startRect.width;
      const heightDelta = height - startRect.height;
      const centerLocalOffset = { x: (sx * widthDelta) / 2, y: (sy * heightDelta) / 2 };
      const centerGlobalOffset = rotateVector(centerLocalOffset.x, centerLocalOffset.y, -startRect.rotation);

      onChange({
        ...startRect,
        width,
        height,
        cx: startRect.cx + centerGlobalOffset.x,
        cy: startRect.cy + centerGlobalOffset.y,
      });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startRotate(e: React.MouseEvent) {
    e.stopPropagation();
    const el = rootRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const startRect = rect;

    function onMove(ev: MouseEvent) {
      const angle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX);
      const deg = (angle * 180) / Math.PI + 90;
      onChange({ ...startRect, rotation: Math.round(deg) });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const tierStyle = TIER_STYLE[tier];

  return (
    <div
      ref={rootRef}
      onMouseDown={startMove}
      className={cx(
        "absolute transition-[border-color,background-color]",
        active && "z-10",
        editable ? "cursor-move" : "cursor-pointer"
      )}
      style={{
        left: rect.cx - rect.width / 2,
        top: rect.cy - rect.height / 2,
        width: rect.width,
        height: rect.height,
        transform: `rotate(${rect.rotation}deg)`,
        transformOrigin: "center",
        borderStyle: "solid",
        borderWidth: tierStyle.borderWidth,
        borderColor: hexToRgba(color, tierStyle.borderAlpha),
        backgroundColor: hexToRgba(color, tierStyle.fillAlpha),
      }}
    >
      {editable && active && (
        <>
          {CORNERS.map(({ key, sx, sy, pos }) => (
            <div
              key={key}
              onMouseDown={(e) => startResize(e, sx, sy)}
              className={cx("absolute w-4 h-4 rounded-full bg-surface shadow-[0_1px_4px_rgba(17,22,29,0.4)]", pos)}
              style={{ border: `3px solid ${color}` }}
            />
          ))}
          <div className="absolute left-1/2 -top-7 -translate-x-1/2 w-px h-7" style={{ backgroundColor: color }} />
          <div
            onMouseDown={startRotate}
            className="absolute left-1/2 -top-10 -translate-x-1/2 w-4 h-4 rounded-full border-[3px] border-surface cursor-grab shadow-[0_1px_4px_rgba(17,22,29,0.4)]"
            style={{ backgroundColor: color }}
          />
        </>
      )}
    </div>
  );
}
