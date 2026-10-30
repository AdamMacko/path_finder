"use client";

import * as React from "react";
import { Plus, Minus, Maximize, Lock, LockOpen, Eye, EyeOff } from "lucide-react";
import type { Point } from "../lib/model";

type Props = {
  imageUrl?: string;   // pre PNG/JPG
  svgContent?: string; // pre SVG text
  imageAlt?: string;
  scale: number;
  position: Point;
  onScaleChange: (scale: number) => void;
  onPositionChange: (position: Point) => void;
  /** Vystrelí sa pri skutočnom kliku (bez ťahania) na pozadie — slúži na kladenie anotácií. */
  onBackgroundClick?: (imagePoint: Point) => void;
  /** Keď je aktívny nástroj na pridávanie (nie "select"), posúvanie a priblíženie sa má úplne vypnúť. */
  panZoomDisabled?: boolean;
  /** Globálny prepínač — vypne/zapne vykresľovanie všetkých anotácií naraz, nezávisle od ich vlastného stavu. */
  annotationsVisible?: boolean;
  onToggleAnnotationsVisible?: () => void;
  /** Prekryvná vrstva (napr. obdĺžniky budov/miestností) vykreslená v tej istej transformovanej sústave ako podklad. */
  children?: React.ReactNode;
};

const CLICK_DRAG_THRESHOLD = 4;
const ZOOM_STEP = 0.1;
const WHEEL_SENSITIVITY = 0.0004;
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Pannable/zoomovateľné plátno nad obrázkovým alebo SVG podkladom, s vrstvou
 * anotácií (deti vykreslené v tej istej transformovanej sústave). Používa sa
 * jednotne pre outdoor fotku areálu aj pôdorys jednotlivého podlažia.
 */
export function MapCanvas({
  imageUrl,
  svgContent,
  imageAlt = "Mapový podklad",
  scale,
  position,
  onScaleChange,
  onPositionChange,
  onBackgroundClick,
  panZoomDisabled = false,
  annotationsVisible = true,
  onToggleAnnotationsVisible,
  children,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [locked, setLocked] = React.useState(false);
  const effectivelyLocked = locked || panZoomDisabled;

  const [isDragging, setIsDragging] = React.useState(false);
  const [start, setStart] = React.useState({ x: 0, y: 0 });
  const dragOrigin = React.useRef({ x: 0, y: 0 });
  const dragMoved = React.useRef(false);

  function containerOffset() {
    const rect = containerRef.current?.getBoundingClientRect();
    return { left: rect?.left ?? 0, top: rect?.top ?? 0, width: rect?.width ?? 0, height: rect?.height ?? 0 };
  }

  function clientToImagePoint(clientX: number, clientY: number): Point {
    const { left, top } = containerOffset();
    return {
      x: (clientX - left - position.x) / scale,
      y: (clientY - top - position.y) / scale,
    };
  }

  /** Zmení priblíženie tak, aby bod (screenX, screenY) v rámci kontajnera ostal na mieste pod kurzorom. */
  function zoomAt(nextScaleRaw: number, screenX: number, screenY: number) {
    const nextScale = Math.min(Math.max(nextScaleRaw, MIN_SCALE), MAX_SCALE);
    if (nextScale === scale) return;
    const imgX = (screenX - position.x) / scale;
    const imgY = (screenY - position.y) / scale;
    onScaleChange(nextScale);
    onPositionChange({ x: screenX - imgX * nextScale, y: screenY - imgY * nextScale });
  }

  function zoomAtCenter(delta: number) {
    const { width, height } = containerOffset();
    zoomAt(scale + delta, width / 2, height / 2);
  }

  function resetView() {
    onScaleChange(1);
    onPositionChange({ x: 0, y: 0 });
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    if (effectivelyLocked) return;
    const { left, top } = containerOffset();
    const delta = e.deltaY * -WHEEL_SENSITIVITY;
    zoomAt(scale + delta, e.clientX - left, e.clientY - top);
  }

  function handleMouseDown(e: React.MouseEvent) {
    setIsDragging(true);
    setStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    dragMoved.current = false;
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    if (
      Math.abs(e.clientX - dragOrigin.current.x) > CLICK_DRAG_THRESHOLD ||
      Math.abs(e.clientY - dragOrigin.current.y) > CLICK_DRAG_THRESHOLD
    ) {
      dragMoved.current = true;
    }
    if (!effectivelyLocked) {
      onPositionChange({ x: e.clientX - start.x, y: e.clientY - start.y });
    }
  }

  function handleMouseUp(e: React.MouseEvent) {
    if (isDragging && !dragMoved.current) {
      onBackgroundClick?.(clientToImagePoint(e.clientX, e.clientY));
    }
    setIsDragging(false);
  }

  const controlButtonClass =
    "w-8 h-8 flex items-center justify-center rounded-sm border border-line bg-surface text-ink-soft shadow-sm hover:text-route hover:border-route transition-colors disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full border border-line rounded-md overflow-hidden bg-blueprint-grid bg-paper"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsDragging(false)}
    >
      <div
        className={cx(
          "absolute",
          !effectivelyLocked && "cursor-grab active:cursor-grabbing",
          !isDragging && "transition-transform duration-150 ease-out"
        )}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={imageAlt}
            draggable={false}
            className="select-none pointer-events-none max-w-none"
          />
        )}

        {svgContent && <div dangerouslySetInnerHTML={{ __html: svgContent }} />}

        {children}
      </div>

      {/* ovládacie prvky mapy */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
        <button
          type="button"
          onClick={() => zoomAtCenter(ZOOM_STEP)}
          disabled={effectivelyLocked}
          aria-label="Priblížiť"
          className={controlButtonClass}
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          onClick={() => zoomAtCenter(-ZOOM_STEP)}
          disabled={effectivelyLocked}
          aria-label="Oddialiť"
          className={controlButtonClass}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          onClick={resetView}
          disabled={effectivelyLocked}
          aria-label="Obnoviť pohľad"
          className={controlButtonClass}
        >
          <Maximize size={15} />
        </button>
        <button
          type="button"
          onClick={() => setLocked((l) => !l)}
          disabled={panZoomDisabled}
          aria-pressed={effectivelyLocked}
          aria-label={effectivelyLocked ? "Odomknúť posúvanie a priblíženie mapy" : "Zamknúť posúvanie a priblíženie mapy"}
          title={
            panZoomDisabled
              ? "Mapa je automaticky uzamknutá — práve pridávate anotáciu"
              : locked
              ? "Mapa je uzamknutá — klik len vyberá/umiestňuje"
              : "Zamknúť mapu, aby sa neposúvala pri klikaní"
          }
          className={cx(
            "w-8 h-8 flex items-center justify-center rounded-sm border shadow-sm transition-colors",
            effectivelyLocked
              ? "bg-route border-route text-white"
              : "border-line bg-surface text-ink-soft hover:text-route hover:border-route",
            panZoomDisabled && "disabled:opacity-70 disabled:pointer-events-none"
          )}
        >
          {effectivelyLocked ? <Lock size={15} /> : <LockOpen size={15} />}
        </button>

        {onToggleAnnotationsVisible && (
          <button
            type="button"
            onClick={onToggleAnnotationsVisible}
            aria-pressed={!annotationsVisible}
            aria-label={annotationsVisible ? "Skryť všetky anotácie" : "Zobraziť všetky anotácie"}
            title={annotationsVisible ? "Skryť všetky anotácie" : "Zobraziť všetky anotácie"}
            className={controlButtonClass}
          >
            {annotationsVisible ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
        )}
      </div>

      {/* zoom readout */}
      <div className="absolute bottom-3 right-3 bg-surface border border-line rounded-sm px-2.5 py-1.5 font-mono text-xs text-ink-soft tabular-nums pointer-events-none">
        {(scale * 100).toFixed(0)}%
      </div>
    </div>
  );
}
