"use client";

import type * as React from "react";
import type { DockItemData } from "./dock";
import { MousePointer2 } from "lucide-react";
import type { KindMeta } from "../lib/annotationKinds";

/** Nástroje, ktoré nepridávajú obdĺžnikový objekt, ale kreslia plochu, úsečku, bod alebo kalibrujú mierku. */
export type DrawTool = "draw-area" | "draw-forbidden" | "draw-line" | "draw-point" | "calibrate";

export type Tool<K extends string> = "select" | "add-part" | DrawTool | `add-${K}`;

export type DockExtra = {
  tool: DrawTool;
  label: string;
  icon: React.ReactNode;
  dockBgClass: string;
};

type DockOptions<K extends string> = {
  tool: Tool<K>;
  setTool: (tool: Tool<K>) => void;
  kinds: K[];
  kindMeta: Record<K, KindMeta>;
  /** Doplnkové kresliace nástroje podľa toho, čo stránka podporuje. */
  extras?: DockExtra[];
};

const ACTIVE_RING = "ring-[3px] ring-ink ring-offset-2 ring-offset-paper";

export function getDockItems<K extends string>({ tool, setTool, kinds, kindMeta, extras = [] }: DockOptions<K>): DockItemData[] {
  const items: DockItemData[] = [
    {
      icon: <MousePointer2 size={18} className="text-white" />,
      label: "Ukazovateľ",
      onClick: () => setTool("select"),
      className: `bg-ink ${tool === "select" ? ACTIVE_RING : ""}`,
    },
  ];

  for (const kind of kinds) {
    const meta = kindMeta[kind];
    const toolName: Tool<K> = `add-${kind}`;
    items.push({
      icon: <span className="text-white">{meta.icon}</span>,
      label: meta.addLabel,
      onClick: () => setTool(toolName),
      className: `${meta.dockBgClass} ${tool === toolName ? ACTIVE_RING : ""}`,
    });
  }

  for (const extra of extras) {
    items.push({
      icon: <span className="text-white">{extra.icon}</span>,
      label: extra.label,
      onClick: () => setTool(extra.tool),
      className: `${extra.dockBgClass} ${tool === extra.tool ? ACTIVE_RING : ""}`,
    });
  }

  return items;
}
