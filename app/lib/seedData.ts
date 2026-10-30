import { createBudova, createPodlazie, createPriestor, type Areal, type Budova, type Podlazie, type Point } from "./model";
import type { IndoorKind } from "./indoorKinds";

function placeholderSvgDataUrl(width: number, height: number, label: string, bg = "#dfe6ea"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${bg}"/>` +
    `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#b9c3ca" stroke-width="2"/>` +
    `<text x="${width / 2}" y="${height / 2}" font-family="sans-serif" font-size="${Math.round(width / 28)}" fill="#8a97a8" text-anchor="middle" dominant-baseline="middle">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type SeedRoom = [kind: IndoorKind, nazov: string, center: Point, size: { width: number; height: number }];

function seedFloor(nazov: string, poradie: number, rooms: SeedRoom[]): Podlazie {
  const floor = createPodlazie(nazov, poradie);
  floor.podkladObrazokUrl = placeholderSvgDataUrl(560, 360, `Pôdorys — ${nazov}`, "#eef1f4");
  floor.priestory = rooms.map(([kind, roomNazov, center, size]) => createPriestor(center, roomNazov, kind, size));
  return floor;
}

export function createSeedAreal(): Areal {
  const hlavnaBudova: Budova = createBudova({ x: 350, y: 300 }, "Hlavná budova", "budova", { width: 260, height: 180 });
  hlavnaBudova.podlazia = [
    seedFloor("Prízemie", 1, [
      ["miestnosť", "Kancelária 101", { x: 150, y: 110 }, { width: 120, height: 100 }],
      ["miestnosť", "Kancelária 102", { x: 300, y: 110 }, { width: 120, height: 100 }],
      ["chodba", "Hlavná chodba", { x: 225, y: 220 }, { width: 290, height: 50 }],
      ["vertikála", "Schodisko", { x: 440, y: 110 }, { width: 60, height: 60 }],
    ]),
    seedFloor("1. poschodie", 2, [
      ["miestnosť", "Zasadačka", { x: 200, y: 140 }, { width: 190, height: 130 }],
      ["miestnosť", "Serverovňa", { x: 400, y: 140 }, { width: 100, height: 90 }],
      ["vertikála", "Schodisko", { x: 440, y: 260 }, { width: 60, height: 60 }],
      ["dvere", "Dvere na chodbu", { x: 300, y: 70 }, { width: 40, height: 18 }],
    ]),
  ];

  const dielna: Budova = createBudova({ x: 760, y: 260 }, "Dielňa", "budova", { width: 220, height: 160 });
  dielna.podlazia = [
    seedFloor("Prízemie", 1, [
      ["miestnosť", "Výrobná hala", { x: 220, y: 160 }, { width: 340, height: 240 }],
      ["dvere", "Vstupné dvere", { x: 30, y: 160 }, { width: 30, height: 60 }],
      ["ine", "Sklad materiálu", { x: 460, y: 280 }, { width: 100, height: 80 }],
    ]),
  ];

  // Sklad zámerne bez podlaží — ukazuje prázdny stav v detaile budovy.
  const sklad: Budova = createBudova({ x: 1120, y: 520 }, "Sklad", "budova", { width: 180, height: 140 });

  const parkovisko: Budova = createBudova({ x: 350, y: 650 }, "Parkovisko pri vstupe", "parkovisko", {
    width: 320,
    height: 160,
  });

  const vstup: Budova = createBudova({ x: 40, y: 300 }, "Hlavný vstup", "vstup", { width: 50, height: 50 });

  return {
    id: "seed-areal",
    nazov: "Testovací areál",
    podkladObrazokUrl: placeholderSvgDataUrl(1400, 900, "Ukážková fotka areálu"),
    budovy: [hlavnaBudova, dielna, sklad, parkovisko, vstup],
  };
}
