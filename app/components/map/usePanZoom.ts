"use client";

import * as React from "react";

export type ViewBox = { x: number; y: number; w: number; h: number };

/** Posun pod týmto počtom pixelov je ešte klik, nie ťahanie. */
const CLICK_SLOP = 4;

/**
 * Posun a zoom SVG mapy cez `viewBox`: koliesko (zoom okolo kurzora), ťahanie myšou alebo prstom
 * a pinch dvoma prstami. Listener pre `wheel` je natívny s `{ passive: false }` – Reactový
 * `onWheel` je pasívny a `preventDefault()` v ňom nezabráni scrollovaniu stránky.
 */
export function usePanZoom(svgRef: React.RefObject<SVGSVGElement | null>, home: ViewBox) {
  const [view, setView] = React.useState(home);
  // null, kým sa SVG nezmeria (pri renderi na serveri a pred prvým ResizeObserverom).
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
  const moved = React.useRef(0);

  const minW = home.w / 40;
  const maxW = home.w * 3;

  const zoomAt = React.useCallback(
    (p: [number, number], factor: number) =>
      setView((v) => {
        const w = Math.min(maxW, Math.max(minW, v.w * factor));
        const k = w / v.w;
        return { x: p[0] - (p[0] - v.x) * k, y: p[1] - (p[1] - v.y) * k, w, h: v.h * k };
      }),
    [minW, maxW]
  );

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const pointers = new Map<number, { x: number; y: number }>();

    const toSvg = (cx: number, cy: number): [number, number] | null => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const p = new DOMPoint(cx, cy).matrixTransform(ctm.inverse());
      return [p.x, p.y];
    };
    const pan = (dx: number, dy: number) => {
      const s = svg.getScreenCTM()?.a ?? 1;
      setView((v) => ({ ...v, x: v.x - dx / s, y: v.y - dy / s }));
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toSvg(e.clientX, e.clientY);
      if (p) zoomAt(p, Math.exp(e.deltaY * 0.0015));
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) moved.current = 0;
    };
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const next = { x: e.clientX, y: e.clientY };
      if (pointers.size === 1) {
        moved.current += Math.hypot(next.x - prev.x, next.y - prev.y);
        // Pointer capture až pri skutočnom ťahaní, inak by klik na priestor dostalo SVG namiesto priestoru.
        if (moved.current > CLICK_SLOP) {
          if (!svg.hasPointerCapture(e.pointerId)) svg.setPointerCapture(e.pointerId);
          pan(next.x - prev.x, next.y - prev.y);
        }
      } else if (pointers.size === 2) {
        const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)![1];
        const before = Math.hypot(prev.x - other.x, prev.y - other.y);
        const after = Math.hypot(next.x - other.x, next.y - other.y);
        const mid = toSvg((next.x + other.x) / 2, (next.y + other.y) / 2);
        if (mid && after > 0) zoomAt(mid, before / after);
        pan((next.x - prev.x) / 2, (next.y - prev.y) / 2);
        moved.current = Infinity;
      }
      pointers.set(e.pointerId, next);
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
    };

    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width || 1, h: entry.contentRect.height || 1 }));
    ro.observe(svg);
    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
    svg.addEventListener("pointercancel", onUp);
    return () => {
      ro.disconnect();
      svg.removeEventListener("wheel", onWheel);
      svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerup", onUp);
      svg.removeEventListener("pointercancel", onUp);
    };
  }, [svgRef, zoomAt]);

  /** Jednotky mapy (metre) na jeden pixel obrazovky – na prvky s konštantnou veľkosťou na obrazovke. Null pred zmeraním. */
  const unitsPerPx = size ? Math.max(view.w / size.w, view.h / size.h) : null;

  return {
    view,
    unitsPerPx,
    zoomBy: (factor: number) => zoomAt([view.x + view.w / 2, view.y + view.h / 2], factor),
    reset: () => setView(home),
    /** Volať v onClick: true, ak išlo o ťahanie mapy, nie o klik. */
    wasDrag: () => moved.current > CLICK_SLOP,
  };
}
