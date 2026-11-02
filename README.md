# Path Finder

Webová aplikácia na **multikriteriálnu navigáciu v budovách a areáli**, ktorá spája vonkajšie (outdoor) a vnútorné (indoor) prostredie do jedného navigačného modelu. Vzniká ako súčasť diplomovej práce a je určená na reálne nasadenie vo firemnom areáli (ANDRITZ Slovakia, Humenné).

> **Stav projektu:** prebieha vývoj. Hotový je editor areálu a administrácia (frontend). Generovanie navigačného grafu a výpočet trasy (`/api/route`) sú ďalšou etapou.

## Čo aplikácia robí

Administrátor v editore vytvorí digitálnu podobu areálu. Z nej sa následne počíta trasa podľa **profilu používateľa** (návštevník, zamestnanec, vozíčkar, …), ktorý určuje, ktoré priestory sú prístupné (tvrdé obmedzenia) a čo sa pri hľadaní trasy preferuje (mäkké náklady).

| Oblasť | Možnosti |
| --- | --- |
| **Outdoor mapa** | podklad (obrázok/SVG), pochôdzna plocha areálu, zakázané plochy, budovy, parkoviská, vstupy do budov, body záujmu, kalibrácia mierky |
| **Budovy a podlažia** | zoznam budov, podlažia, pôdorys každého podlažia, priestory, dvere, body záujmu, zóny, bezbariérovosť |
| **Vertikálne spojenia** | schody, výťah, rampa, eskalátor prepájajúce podlažia |
| **Pravidlá a profily** | pravidlá prístupu (karta, rola, čas, OOPP), zóny, profily s váhami kritérií |
| **Prehľad** | kontrola pripravenosti dát pre navigáciu so skóre a odkazmi na chýbajúce časti |
| **Úpravy** | späť/vpred (Ctrl+Z / Ctrl+Y), prichytávanie k hranám, automatické ukladanie |

### Model v skratke

- navigovateľné priestory sú **polygóny**, prechody sú **úsečky** na hranici dvoch priestorov,
- geometria je v SVG/pixeloch, sémantika (zóny, pravidlá) v JSON, každé podlažie má transformáciu do metrického systému areálu,
- pravidlá sú **tvrdé obmedzenia**, váhy kritérií sú **mäkké náklady**.

## Technológie

- [Next.js](https://nextjs.org) 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, `motion`, `lucide-react`
- TypeBox + Ajv na schému a validáciu dátového modelu
- Vitest na testy

## Rýchly štart

Požiadavky: Node.js 20+ a npm.

```bash
npm install
npm run dev
```

Aplikácia beží na [http://localhost:3000](http://localhost:3000).

Na vyskúšanie bez vlastných dát použite tlačidlo **Načítať ukážkové dáta** na stránke *Budovy*. Ukážkové dáta sú fiktívne.

### Skripty

| Príkaz | Popis |
| --- | --- |
| `npm run dev` | vývojový server |
| `npm run build` | produkčný build |
| `npm start` | spustenie buildu |
| `npm run lint` | ESLint |
| `npm test` | testy (Vitest) |
| `npm run schema` | export JSON schémy modelu |

## Stránky

| Cesta | Obsah |
| --- | --- |
| `/` | prehľad a kontrola pripravenosti |
| `/building_complex` | outdoor mapa areálu |
| `/buildings` | budovy a ich podlažia |
| `/buildings/[buildingId]` | pracovné okno jedného podlažia |
| `/rules` | pravidlá, zóny, profily |
| `/navigation` | vyhľadanie trasy (čaká na výpočet trasy) |

## Štruktúra projektu

```
app/
  page.tsx, building_complex/, buildings/, rules/, navigation/   stránky
  components/    editor (annotationWorkspace, areaPolygon, buildingsPanel, ...)
  lib/           frontendový model, snapovanie, kontroly, pravidlá, vertikály
  api/route/     endpoint na výpočet trasy (zatiaľ 501)
lib/
  core/          dátový model, schéma, geometria, ukážkové dáta
  server/        spracovanie mapových dát a úložisko
scripts/         pomocné skripty (export schémy)
```

## Ukladanie dát

Zatiaľ sa dáta ukladajú v **localStorage prehliadača** (`path-finder/areal`, `path-finder/pravidla`). Vymazanie údajov prehliadača ich odstráni. Perzistencia na serveri (databáza MySQL cez rozhranie úložiska) je plánovaná.

## Plán

- [x] editor outdoor mapy, budov, podlaží a vertikálnych spojení
- [x] pravidlá, zóny a profily
- [x] kontrola pripravenosti dát
- [ ] generovanie navigačného grafu z polygónov a prechodov
- [ ] A\* a výpočet trasy podľa profilu (`/api/route`)
- [ ] export/import venue JSON
- [ ] ukladanie na serveri (MySQL), prihlásenie a roly
- [ ] pilotné nasadenie a vyhodnotenie

## Dôvernosť dát

Reálne plány, fotografie a pravidlá firmy **nepatria do verejného repozitára**. Ukážkové dáta v kóde musia ostať fiktívne.

## Autor

Adam Macko, diplomová práca.
