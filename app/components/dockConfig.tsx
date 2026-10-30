"use client";

import type { DockItemData } from "./dock";
import { MousePointer2 } from "lucide-react";
import type { KindMeta } from "../lib/annotationKinds";

export type Tool<K extends string> = "select" | "add-part" | `add-${K}`;

type DockOptions<K extends string> = {
  tool: Tool<K>;
  setTool: (tool: Tool<K>) => void;
  kinds: K[];
  kindMeta: Record<K, KindMeta>;
};

const ACTIVE_RING = "ring-[3px] ring-ink ring-offset-2 ring-offset-paper";

export function getDockItems<K extends string>({ tool, setTool, kinds, kindMeta }: DockOptions<K>): DockItemData[] {
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

  return items;
}
