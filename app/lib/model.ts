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
 * Kalibrácia mierky: dva body na podklade, ktorých skutočná vzdialenosť je známa. Z nej vznikne
 * prevod pixelov podkladu na metre (kap. 2.2.1) – metrický systém, v ktorom sa počíta trasa.
 */
export type Calibration = { a: Point; b: Point; meters: number };

/** Metrov na pixel podkladu, alebo `null`, ak kalibrácia chýba či je neplatná. */
export function metersPerPixel(c: Calibration | null | undefined): number | null {
  if (!c || !(c.meters > 0)) return null;
  const px = Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y);
  return px > 0 ? c.meters / px : null;
}

/**
 * Úsečka na podklade. Slúži na vstupy do budov (outdoor mapa) a dvere (pôdorys podlažia) – prechody,
 * ktoré ležia na hranici dvoch priestorov.
 */
export type LineShape = {
  id: string;
  nazov: string;
  a: Point;
  b: Point;
  visible: boolean;
  /** Vstup: id budovy, ku ktorej patrí. Dvere: id vstupu z exteriéru, ktorý prepájajú (iba na prízemí). */
  ref: string | null;
};

/** Bod záujmu (cieľ navigácie). */
export type PointItem = {
  id: string;
  nazov: string;
  kategoria: string;
  /** Interný bod vidí iba profil s oprávnením (N6). */
  interny: boolean;
  point: Point;
};

export type VerticalKind = "stairs" | "elevator" | "ramp" | "escalator";

/** Doplnkové vlastnosti priestoru, ktoré sa nekreslia, ale ovplyvňujú trasu. */
export type ItemMeta = {
  /** Zóna z pravidiel prístupu (napr. výroba). */
  zona?: string | null;
  /** Priestor je bezbariérový; predvolene áno. */
  bezbarierovy?: boolean;
  /** Schodisko/výťah: spojenie s priestormi na ďalších podlažiach tej istej budovy. */
  vertikala?: { skupina: string; typ: VerticalKind };
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
  meta?: ItemMeta;
};

export type Priestor = AnnotatedItem<IndoorKind>;

export type Podlazie = {
  id: string;
  nazov: string;
  poradie: number;
  podkladObrazokUrl: string | null;
  svgContent: string | null;
  priestory: Priestor[];
  /** Dvere medzi priestormi (úsečky). Chýba v dátach uložených pred zavedením tejto vlastnosti. */
  dvere?: LineShape[];
  poi?: PointItem[];
  /** Mierka pôdorysu; bez nej sa nedá určiť dĺžka trasy v metroch. */
  mierka?: Calibration | null;
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
  /**
   * Hranica pochôdznej plochy areálu (polygón). Budovy sa z nej pri exporte odčítajú ako diery,
   * takže ich netreba kresliť dvakrát. Chýba v dátach uložených pred zavedením tejto vlastnosti.
   */
  hranica?: Point[] | null;
  /** Zakázané plochy (cesta pre autá, trávnik, …) – ďalšie diery v pochôdznej ploche. */
  zakazane?: Point[][];
  /** Vstupy do budov (úsečky na hranici budovy). */
  vstupy?: LineShape[];
  poi?: PointItem[];
  mierka?: Calibration | null;
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
    hranica: null,
    zakazane: [],
    vstupy: [],
    poi: [],
    mierka: null,
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
    dvere: [],
    poi: [],
    mierka: null,
  };
}

export function createLine(a: Point, b: Point, nazov: string, ref: string | null = null): LineShape {
  return { id: createId("usecka"), nazov, a, b, visible: true, ref };
}

export function createPoi(point: Point, nazov: string, kategoria = "other"): PointItem {
  return { id: createId("poi"), nazov, kategoria, interny: false, point };
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
