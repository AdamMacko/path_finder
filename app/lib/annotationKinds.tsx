import * as React from "react";
import { Building2, SquareParking, DoorOpen, Tag } from "lucide-react";

export type AnnotationKind = "budova" | "parkovisko" | "vstup" | "ine";

export type KindMeta = {
  label: string;
  addLabel: string;
  placeHint: string;
  icon: React.ReactNode;
  /** Plná farba kruhu v docku (musí byť doslovný tailwind reťazec, nie skladaný za behu). */
  dockBgClass: string;
  /** Bodka pri stavovom paneli nad dockom. */
  dotClass: string;
  /** Predvolená farba tvaru na plátne (hex) — dá sa pre konkrétny objekt prebiť. */
  hex: string;
  defaultSize: { width: number; height: number };
};

export const ANNOTATION_KINDS: AnnotationKind[] = ["budova", "parkovisko", "vstup", "ine"];

export const KIND_META: Record<AnnotationKind, KindMeta> = {
  budova: {
    label: "Budova",
    addLabel: "Pridať budovu",
    placeHint: "Kliknite na fotku na miesto, kde na nej stojí budova.",
    icon: <Building2 size={18} />,
    dockBgClass: "bg-route",
    dotClass: "bg-route",
    hex: "#0068b4",
    defaultSize: { width: 160, height: 120 },
  },
  parkovisko: {
    label: "Parkovisko",
    addLabel: "Pridať parkovisko",
    placeHint: "Kliknite na fotku na miesto, kde sa nachádza parkovisko.",
    icon: <SquareParking size={18} />,
    dockBgClass: "bg-ink-soft",
    dotClass: "bg-ink-soft",
    hex: "#596679",
    defaultSize: { width: 240, height: 160 },
  },
  vstup: {
    label: "Vstup",
    addLabel: "Pridať vstup",
    placeHint: "Kliknite na fotku na miesto vstupu/brány do areálu.",
    icon: <DoorOpen size={18} />,
    dockBgClass: "bg-stake",
    dotClass: "bg-stake",
    hex: "#3f7a5c",
    defaultSize: { width: 50, height: 50 },
  },
  ine: {
    label: "Iné",
    addLabel: "Pridať iný objekt",
    placeHint: "Kliknite na fotku na miesto objektu, ktorý chcete označiť.",
    icon: <Tag size={18} />,
    dockBgClass: "bg-flag",
    dotClass: "bg-flag",
    hex: "#b8660e",
    defaultSize: { width: 100, height: 80 },
  },
};
