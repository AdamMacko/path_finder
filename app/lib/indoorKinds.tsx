import * as React from "react";
import { Square, Route, ArrowUpDown, DoorClosed, Tag } from "lucide-react";
import type { KindMeta } from "./annotationKinds";

export type IndoorKind = "miestnosť" | "chodba" | "vertikála" | "dvere" | "ine";

export const INDOOR_KINDS: IndoorKind[] = ["miestnosť", "chodba", "vertikála", "dvere", "ine"];

export const INDOOR_KIND_META: Record<IndoorKind, KindMeta> = {
  miestnosť: {
    label: "Miestnosť",
    addLabel: "Pridať miestnosť",
    placeHint: "Kliknite na pôdorys na miesto, kde sa nachádza miestnosť.",
    icon: <Square size={18} />,
    dockBgClass: "bg-route",
    dotClass: "bg-route",
    hex: "#0075be",
    defaultSize: { width: 120, height: 100 },
  },
  chodba: {
    label: "Chodba",
    addLabel: "Pridať chodbu",
    placeHint: "Kliknite na pôdorys na miesto, kade vedie chodba.",
    icon: <Route size={18} />,
    dockBgClass: "bg-ink-soft",
    dotClass: "bg-ink-soft",
    hex: "#5b6472",
    defaultSize: { width: 220, height: 60 },
  },
  vertikála: {
    label: "Schodisko / výťah",
    addLabel: "Pridať schodisko / výťah",
    placeHint: "Kliknite na miesto schodiska alebo výťahu — prepojenie medzi podlažiami.",
    icon: <ArrowUpDown size={18} />,
    dockBgClass: "bg-stake",
    dotClass: "bg-stake",
    hex: "#47a23f",
    defaultSize: { width: 70, height: 70 },
  },
  dvere: {
    label: "Dvere",
    addLabel: "Pridať dvere",
    placeHint: "Kliknite na miesto dverí medzi dvoma priestormi.",
    icon: <DoorClosed size={18} />,
    dockBgClass: "bg-flag",
    dotClass: "bg-flag",
    hex: "#f07e3b",
    defaultSize: { width: 40, height: 20 },
  },
  ine: {
    label: "Iné",
    addLabel: "Pridať iný priestor",
    placeHint: "Kliknite na pôdorys na miesto priestoru, ktorý chcete označiť.",
    icon: <Tag size={18} />,
    dockBgClass: "bg-alarm",
    dotClass: "bg-alarm",
    hex: "#bd3a2f",
    defaultSize: { width: 100, height: 80 },
  },
};
