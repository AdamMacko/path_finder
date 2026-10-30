// Dátový model podľa kapitoly 2.2 práce: Areál -> Budova -> Podlažie -> Priestor.
// Súradnice (x, y) sú zatiaľ v pixeloch zdrojového obrázka/SVG podkladu ("mapový
// priestor"). Prevod do metrického súradnicového systému areálu (2.2.1) je
// samostatný krok (kalibrácia podľa referenčných bodov), ktorý zatiaľ nerobíme.

import type { AnnotationKind } from "./annotationKinds";
import type { IndoorKind } from "./indoorKinds";

export type Point = { x: number; y: number };

/**
 * Obdĺžniková časť pôdorysu objektu. Objekt môže mať viacero častí naraz
 * (napr. pôdorys v tvare L = dva obdĺžniky), rotácia je v stupňoch, v smere
 * hodinových ručičiek, okolo stredu (cx, cy).
 */
export type RectShape = {
  id: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number;
};

/**
 * Spoločný tvar pre čokoľvek, čo sa dá anotovať obdĺžnikmi na mapovom podklade —
 * budovu na outdoor fotke aj miestnosť na pôdoryse podlažia. Nad týmto tvarom
 * pracuje zdieľaná editorová komponenta (AnnotationWorkspace), nezávisle od
 * toho, či ide o outdoor alebo indoor kontext.
 */
export type AnnotatedItem<K extends string = string> = {
  id: string;
  nazov: string;
  kind: K;
  footprint: RectShape[];
  /** Vlastná farba tvaru (hex) — ak nie je nastavená, použije sa predvolená farba podľa typu. */
  customColor: string | null;
  /** Či sa má objekt vôbec vykresliť na plátne (skrytie bez vymazania). */
  visible: boolean;
};

export type Priestor = AnnotatedItem<IndoorKind>;

export type Podlazie = {
  id: string;
  nazov: string;
  poradie: number;
  podkladObrazokUrl: string | null;
  svgContent: string | null;
  priestory: Priestor[];
};

export type Budova = AnnotatedItem<AnnotationKind> & {
  podlazia: Podlazie[];
};

export type Areal = {
  id: string;
  nazov: string;
  /** Zdroj outdoor podkladu (drone fotka / raster). Zatiaľ len jeden na areál. */
  podkladObrazokUrl: string | null;
  budovy: Budova[];
};

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyAreal(): Areal {
  return {
    id: createId("areal"),
    nazov: "Areál",
    podkladObrazokUrl: null,
    budovy: [],
  };
}

export function createRect(center: Point, size = { width: 160, height: 120 }): RectShape {
  return {
    id: createId("rect"),
    cx: center.x,
    cy: center.y,
    width: size.width,
    height: size.height,
    rotation: 0,
  };
}

export function createBudova(
  center: Point,
  nazov: string,
  kind: AnnotationKind,
  size?: { width: number; height: number }
): Budova {
  return {
    id: createId("budova"),
    nazov,
    kind,
    footprint: [createRect(center, size)],
    podlazia: [],
    customColor: null,
    visible: true,
  };
}

export function createPriestor(
  center: Point,
  nazov: string,
  kind: IndoorKind,
  size?: { width: number; height: number }
): Priestor {
  return {
    id: createId("priestor"),
    nazov,
    kind,
    footprint: [createRect(center, size)],
    customColor: null,
    visible: true,
  };
}

export function createPodlazie(nazov: string, poradie: number): Podlazie {
  return {
    id: createId("podlazie"),
    nazov,
    poradie,
    podkladObrazokUrl: null,
    svgContent: null,
    priestory: [],
  };
}

/** Rohové body obdĺžnika v poradí NW, NE, SE, SW — pre export do dátového modelu (priestor = polygón). */
export function rectToPolygon(rect: RectShape): Point[] {
  const rad = (rect.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = rect.width / 2;
  const hh = rect.height / 2;

  const corners: Point[] = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];

  return corners.map(({ x, y }) => ({
    x: rect.cx + x * cos - y * sin,
    y: rect.cy + x * sin + y * cos,
  }));
}

/** Otočí vektor (dx, dy) o -uhol stupňov — na prevod pohybu myši do lokálnej (natočenej) sústavy obdĺžnika. */
export function rotateVector(dx: number, dy: number, degrees: number): Point {
  const rad = (-degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}
