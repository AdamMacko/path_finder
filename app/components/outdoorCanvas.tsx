"use client";

import * as React from "react";

type Props = {
  imageUrl?: string;   // pre PNG/JPG
  svgContent?: string; // pre SVG text
};

export function OutdoorCanvas({ imageUrl, svgContent }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const [scale, setScale] = React.useState(1);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [start, setStart] = React.useState({ x: 0, y: 0 });

  // Zoom kolieskom
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setScale((prev) => Math.min(Math.max(prev + delta, 0.2), 5));
  }

  // Pan
  function handleMouseDown(e: React.MouseEvent) {
    setIsDragging(true);
    setStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - start.x,
      y: e.clientY - start.y,
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[600px] border rounded-xl overflow-hidden bg-gray-100"
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        onMouseDown={handleMouseDown}
        className="absolute cursor-grab active:cursor-grabbing"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Outdoor mapa"
            draggable={false}
            className="select-none pointer-events-none"
          />
        )}

        {svgContent && (
          <div
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>

      {/* Info panel */}
      <div className="absolute bottom-3 right-3 bg-white/90 border rounded-lg px-3 py-2 text-xs shadow">
        Zoom: {scale.toFixed(2)}
      </div>
    </div>
  );
}
