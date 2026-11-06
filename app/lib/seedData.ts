import {
  createBudova,
  createLine,
  createPodlazie,
  createPoi,
  createPriestor,
  type Areal,
  type Budova,
  type Calibration,
  type LineShape,
  type Podlazie,
  type Point,
  type PointItem,
  type Priestor,
} from "./model";
import type { IndoorKind } from "./indoorKinds";

function placeholderSvgDataUrl(width: number, height: number, label: string, bg = "#dfe6ea"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${bg}"/>` +
    `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#b9c3ca" stroke-width="2"/>` +
    `<text x="${width / 2}" y="${height / 2}" font-family="sans-serif" font-size="${Math.round(width / 28)}" fill="#8a97a8" text-anchor="middle" dominant-baseline="middle">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type SeedRoom = [kind: IndoorKind, nazov: string, center: Point, size: { width: number; height: number }, meta?: Priestor["meta"]];
type SeedLine = [a: Point, b: Point, nazov: string, ref?: string | null];
type SeedPoi = [nazov: string, point: Point, kategoria: string, interny?: boolean];

type SeedFloorOptions = { rooms: SeedRoom[]; doors?: SeedLine[]; poi?: SeedPoi[]; mierka?: Calibration };

function seedFloor(nazov: string, poradie: number, { rooms, doors = [], poi = [], mierka }: SeedFloorOptions): Podlazie {
  const floor = createPodlazie(nazov, poradie);
  floor.podkladObrazokUrl = placeholderSvgDataUrl(560, 360, `Pôdorys — ${nazov}`, "#eef1f4");
  floor.priestory = rooms.map(([kind, roomNazov, center, size, meta]) => {
    const room = createPriestor(center, roomNazov, kind, size);
    if (meta) room.meta = meta;
    return room;
  });
  floor.dvere = doors.map(([a, b, doorNazov, ref]) => createLine(a, b, doorNazov, ref ?? null));
  floor.poi = poi.map(([poiNazov, point, kategoria, interny]): PointItem => ({ ...createPoi(point, poiNazov, kategoria), interny: !!interny }));
  floor.mierka = mierka ?? null;
  return floor;
}

export function createSeedAreal(): Areal {
  const hlavnaBudova: Budova = createBudova({ x: 350, y: 300 }, "Hlavná budova", "budova", { width: 260, height: 180 });
  const dielna: Budova = createBudova({ x: 760, y: 260 }, "Dielňa", "budova", { width: 220, height: 160 });
  // Sklad zámerne bez podlaží — ukazuje prázdny stav v detaile budovy.
  const sklad: Budova = createBudova({ x: 1120, y: 520 }, "Sklad", "budova", { width: 180, height: 140 });
  const parkovisko: Budova = createBudova({ x: 350, y: 650 }, "Parkovisko pri vstupe", "parkovisko", {
    width: 320,
    height: 160,
  });

  // Vstupy na obryse budov (spodná hrana hlavnej budovy, ľavá hrana dielne).
  const vstupHlavna: LineShape = createLine({ x: 320, y: 390 }, { x: 380, y: 390 }, "Hlavný vstup", hlavnaBudova.id);
  const vstupDielna: LineShape = createLine({ x: 650, y: 235 }, { x: 650, y: 285 }, "Vstup do dielne", dielna.id);

  hlavnaBudova.podlazia = [
    seedFloor("Prízemie", 0, {
      rooms: [
        ["miestnosť", "Kancelária 101", { x: 150, y: 110 }, { width: 120, height: 100 }],
        ["miestnosť", "Kancelária 102", { x: 300, y: 110 }, { width: 120, height: 100 }],
        ["chodba", "Hlavná chodba", { x: 275, y: 185 }, { width: 390, height: 50 }],
        ["vertikála", "Schodisko", { x: 440, y: 130 }, { width: 60, height: 60 }, { vertikala: { skupina: "seed-schody", typ: "stairs" } }],
      ],
      doors: [
        [{ x: 130, y: 160 }, { x: 170, y: 160 }, "Dvere do kancelárie 101"],
        [{ x: 280, y: 160 }, { x: 320, y: 160 }, "Dvere do kancelárie 102"],
        [{ x: 425, y: 160 }, { x: 455, y: 160 }, "Dvere na schodisko"],
        [{ x: 250, y: 210 }, { x: 300, y: 210 }, "Hlavné dvere", vstupHlavna.id],
      ],
      poi: [["Recepcia", { x: 275, y: 185 }, "reception"]],
      mierka: { a: { x: 80, y: 185 }, b: { x: 470, y: 185 }, meters: 20 },
    }),
    seedFloor("1. poschodie", 1, {
      rooms: [
        ["miestnosť", "Zasadačka", { x: 200, y: 140 }, { width: 190, height: 130 }],
        ["miestnosť", "Serverovňa", { x: 400, y: 160 }, { width: 100, height: 90 }],
        ["chodba", "Chodba", { x: 275, y: 230 }, { width: 390, height: 50 }],
        ["vertikála", "Schodisko", { x: 440, y: 285 }, { width: 60, height: 60 }, { vertikala: { skupina: "seed-schody", typ: "stairs" } }],
      ],
      doors: [
        [{ x: 170, y: 205 }, { x: 230, y: 205 }, "Dvere do zasadačky"],
        [{ x: 375, y: 205 }, { x: 425, y: 205 }, "Dvere do serverovne"],
        [{ x: 425, y: 255 }, { x: 455, y: 255 }, "Dvere na schodisko"],
      ],
      poi: [
        ["Zasadačka", { x: 200, y: 140 }, "meeting_room"],
        ["Serverovňa", { x: 400, y: 160 }, "server_room", true],
      ],
      mierka: { a: { x: 80, y: 230 }, b: { x: 470, y: 230 }, meters: 20 },
    }),
  ];

  dielna.podlazia = [
    seedFloor("Prízemie", 0, {
      rooms: [
        ["miestnosť", "Výrobná hala", { x: 220, y: 160 }, { width: 340, height: 240 }, { zona: "vyroba" }],
        ["ine", "Sklad materiálu", { x: 440, y: 200 }, { width: 100, height: 80 }, { zona: "vyroba" }],
      ],
      doors: [
        [{ x: 50, y: 130 }, { x: 50, y: 190 }, "Vstupné dvere", vstupDielna.id],
        [{ x: 390, y: 170 }, { x: 390, y: 230 }, "Dvere do skladu"],
      ],
      poi: [["Montážna linka", { x: 220, y: 160 }, "workplace"]],
      mierka: { a: { x: 50, y: 300 }, b: { x: 390, y: 300 }, meters: 30 },
    }),
  ];

  return {
    id: "seed-areal",
    nazov: "Testovací areál",
    podkladObrazokUrl: "/maps/outdoor-areal.svg",
    budovy: [hlavnaBudova, dielna, sklad, parkovisko],
    hranica: [
      { x: 60, y: 90 },
      { x: 1400, y: 90 },
      { x: 1400, y: 850 },
      { x: 60, y: 850 },
    ],
    zakazane: [
      [
        { x: 900, y: 600 },
        { x: 1010, y: 600 },
        { x: 1010, y: 710 },
        { x: 900, y: 710 },
      ],
    ],
    vstupy: [vstupHlavna, vstupDielna],
    poi: [createPoi({ x: 350, y: 650 }, "Parkovisko pre návštevy", "parking")],
    mierka: { a: { x: 220, y: 210 }, b: { x: 480, y: 210 }, meters: 52 },
  };
}
