import type { MapLevel, RouteLeg } from "@/lib/api/types";
import type { Vec2 } from "@/lib/core/geometry/types";
import { VERTICAL_TYPE_LABEL, levelLabel } from "../components/map/mapStyle";

export interface RouteStep {
  /** Podlažie, ktoré sa po kliknutí na krok zobrazí. */
  level: string;
  text: string;
  /** Dĺžka kroku v metroch (0 pri zmene podlažia). */
  distance: number;
}

const pathLength = (p: Vec2[]) => p.slice(1).reduce((sum, c, i) => sum + Math.hypot(c[0] - p[i][0], c[1] - p[i][1]), 0);

/** Smer odbočky v bode `b` pri prechode a → b → c (os y smeruje nadol). */
function turn(a: Vec2, b: Vec2, c: Vec2): "left" | "right" | null {
  const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
  const dot = (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]);
  const angle = Math.atan2(cross, dot);
  if (Math.abs(angle) < Math.PI / 6) return null; // menej ako 30° je rovno
  return cross > 0 ? "right" : "left";
}

const meters = (m: number) => `${Math.max(1, Math.round(m))} m`;

/**
 * Zloží z úsekov trasy zoznam krokov v slovenčine. Zlúči rovné body, pri každej odbočke začne nový krok
 * a pri zmene podlažia pridá krok s použitým spojením (schody, výťah…).
 */
export function routeSteps(legs: RouteLeg[], levelById: Map<string, MapLevel>, targetName: string): RouteStep[] {
  const steps: RouteStep[] = [];
  legs.forEach((leg, li) => {
    const where = levelLabel(levelById.get(leg.level));
    const p = leg.points;
    let from = 0;
    let first = true;
    const flush = (to: number, next?: "left" | "right" | null) => {
      const distance = pathLength(p.slice(from, to + 1));
      if (distance < 0.5) return;
      const verb = first ? (li === 0 ? "Vyraz" : `Pokračuj na podlaží ${where}`) : "Pokračuj";
      const dir = next ? `, potom odbočíš ${next === "left" ? "doľava" : "doprava"}` : "";
      steps.push({ level: leg.level, text: `${verb} ${meters(distance)}${dir}`, distance });
      first = false;
    };
    for (let i = 1; i < p.length - 1; i++) {
      const t = turn(p[i - 1], p[i], p[i + 1]);
      if (t) {
        flush(i, t);
        from = i;
      }
    }
    flush(p.length - 1);

    if (leg.transition) {
      const to = levelLabel(levelById.get(leg.transition.toLevel));
      steps.push({ level: leg.level, text: `Použi ${VERTICAL_TYPE_LABEL[leg.transition.type]} na podlažie ${to}`, distance: 0 });
    }
  });
  steps.push({ level: legs[legs.length - 1]?.level ?? "", text: `Cieľ: ${targetName}`, distance: 0 });
  return steps;
}
