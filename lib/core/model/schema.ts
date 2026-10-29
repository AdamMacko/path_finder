import { Type, type Static, type TLiteral, type TSchema } from "@sinclair/typebox";

/**
 * Dátový model areálu (kap. 2.2). Jedna definícia slúži ako TS typ (`Static<…>`) aj ako JSON Schéma
 * (R9), ktorou sa validuje ručne písaný JSON aj výstup editora v administrácii.
 * Geometria tu nie je: tú nesie SVG a JSON naň odkazuje cez `id` (R2).
 */

export const SCHEMA_VERSION = 1;

const strict = <T extends Record<string, TSchema>>(props: T, description?: string) =>
  Type.Object(props, { additionalProperties: false, ...(description ? { description } : {}) });

/** Union reťazcových literálov so zachovaním presného TS typu. */
const literals = <const T extends readonly string[]>(values: T) =>
  Type.Union(values.map((v) => Type.Literal(v)) as unknown as { -readonly [K in keyof T]: TLiteral<T[K]> });

const Id = Type.String({ pattern: "^[A-Za-z0-9_.:-]+$", minLength: 1, description: "Identifikátor, zhodný s `id` prvku v SVG." });
const IdList = Type.Array(Id, { uniqueItems: true });
const Vec2 = Type.Tuple([Type.Number(), Type.Number()]);
const Time = Type.String({ pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$", description: "Čas HH:MM." });

export const Day = literals(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);

export const LevelTransform = strict(
  {
    scale: Type.Number({ exclusiveMinimum: 0, description: "Metrov na jednotku SVG." }),
    rotation: Type.Number({ description: "Stupne; os y smeruje nadol, kladný uhol je v smere hodinových ručičiek." }),
    offset: Vec2,
  },
  "local = R(rotation) · (scale · svg) + offset (R5)."
);

export const Building = strict({
  id: Id,
  name: Type.Optional(Type.String()),
});

export const Level = strict(
  {
    id: Id,
    building: Type.Optional(Id),
    ordinal: Type.Integer({ description: "Poradie podlažia; 0 = prízemie, záporné = suterén." }),
    name: Type.Optional(Type.String()),
    elevation: Type.Optional(Type.Number({ description: "Výška podlahy v metroch; predvolene ordinal · floorHeight." })),
    svg: Type.Optional(Type.String({ description: "Súbor s geometriou podlažia." })),
    transform: Type.Optional(LevelTransform),
  },
  "Podlažie budovy, alebo vonkajšia vrstva, ak `building` chýba."
);

export const SpaceType = literals(
  [
    // interiér
    "room", "corridor", "hall", "lobby", "stairs", "elevator", "warehouse", "office", "restroom",
    // exteriér
    "walkway", "road", "courtyard", "parking",
    "other",
  ]
);

export const SpaceCriteria = strict(
  {
    preferred: Type.Optional(Type.Boolean({ description: "Preferovaná trasa (napr. vyznačený chodník)." })),
    avoid: Type.Optional(Type.Boolean({ description: "Priestor, ktorému sa má trasa radšej vyhnúť (napr. pohyb vozíkov)." })),
  },
  "Mäkké kritériá priestoru (R7); profil určuje ich váhu."
);

export const Space = strict(
  {
    id: Id,
    level: Id,
    type: SpaceType,
    name: Type.Optional(Type.String()),
    zone: Type.Optional(Id),
    accessible: Type.Optional(Type.Boolean({ description: "Či je priestor bezbariérový; predvolene áno." })),
    criteria: Type.Optional(SpaceCriteria),
  },
  "Priestor – polygón v SVG podlažia (R1)."
);

export const OpeningType = literals(["door", "gate", "turnstile", "virtual"]);

export const Opening = strict(
  {
    id: Id,
    between: Type.Tuple([Id, Id]),
    type: Type.Optional(OpeningType),
    oneWay: Type.Optional(Type.Boolean({ description: "Prechod je možný iba v smere between[0] → between[1]." })),
    accessible: Type.Optional(Type.Boolean({ description: "Predvolene áno." })),
    rules: Type.Optional(IdList),
  },
  "Prechod – úsečka (`<line>`) na spoločnej hranici dvoch priestorov (R3)."
);

export const VerticalType = literals(["stairs", "elevator", "ramp", "escalator"]);

export const Vertical = strict(
  {
    id: Id,
    type: VerticalType,
    spaces: Type.Record(Id, Id, {
      minProperties: 2,
      description: "Podlažie → priestor (šachta, schodisko) na tom podlaží.",
    }),
    accessible: Type.Optional(Type.Boolean({ description: "Predvolene nie pre schody a eskalátor, inak áno." })),
    rules: Type.Optional(IdList),
  },
  "Vertikálne spojenie – jeden objekt pre viacero podlaží (R3)."
);

export const Poi = strict(
  {
    id: Id,
    space: Id,
    category: Type.String({ minLength: 1 }),
    name: Type.Optional(Type.String()),
    internal: Type.Optional(Type.Boolean({ description: "Interný bod, návštevník ho nevidí (N6)." })),
  },
  "Bod záujmu. Poloha je `<circle>` s rovnakým `id`, inak reprezentatívny bod priestoru."
);

export const Rule = Type.Union(
  [
    strict({ id: Id, type: Type.Literal("card"), name: Type.Optional(Type.String()) }, "Vyžaduje prístupovú kartu."),
    strict(
      { id: Id, type: Type.Literal("role"), name: Type.Optional(Type.String()), roles: Type.Array(Type.String(), { minItems: 1, uniqueItems: true }) },
      "Vyžaduje aspoň jednu z rolí."
    ),
    strict(
      {
        id: Id,
        type: Type.Literal("time"),
        name: Type.Optional(Type.String()),
        days: Type.Optional(Type.Array(Day, { minItems: 1, uniqueItems: true })),
        from: Time,
        to: Time,
      },
      "Časové okno. Ak from > to, okno prechádza cez polnoc (nočná zmena)."
    ),
    strict({ id: Id, type: Type.Literal("ppe"), name: Type.Optional(Type.String()) }, "Vyžaduje osobné ochranné pracovné prostriedky (OOPP)."),
  ],
  { description: "Pravidlo prístupu – tvrdé obmedzenie definované raz na úrovni areálu (R6)." }
);

export const Zone = strict(
  {
    id: Id,
    name: Type.Optional(Type.String()),
    rules: IdList,
  },
  "Skupina priestorov; jej pravidlá platia pre prechody vedúce do zóny zvonka (R6)."
);

export const Weights = strict(
  {
    distance: Type.Optional(Type.Number({ minimum: 0 })),
    time: Type.Optional(Type.Number({ minimum: 0 })),
    outdoor: Type.Optional(Type.Number({ minimum: 0, description: "Penalizácia za úseky vonku." })),
    avoid: Type.Optional(Type.Number({ minimum: 0, description: "Penalizácia za priestory s criteria.avoid." })),
    unpreferred: Type.Optional(Type.Number({ minimum: 0, description: "Penalizácia mimo priestorov s criteria.preferred." })),
    levelChanges: Type.Optional(Type.Number({ minimum: 0, description: "Penalizácia za každú zmenu podlažia." })),
  },
  "Váhy mäkkých kritérií (R7)."
);

export const Requirement = literals(["accessible"]);

export const Profile = strict(
  {
    id: Id,
    name: Type.Optional(Type.String()),
    roles: Type.Array(Type.String(), { uniqueItems: true }),
    card: Type.Optional(Type.Boolean()),
    ppe: Type.Optional(Type.Boolean()),
    require: Type.Optional(Type.Array(Requirement, { uniqueItems: true })),
    internal: Type.Optional(Type.Boolean({ description: "Vidí interné body záujmu (N6)." })),
    speed: Type.Optional(Type.Number({ exclusiveMinimum: 0, description: "Rýchlosť chôdze v m/s." })),
    weights: Weights,
  },
  "Profil používateľa – používateľ volí profil, nie jednotlivé váhy (R8)."
);

export const Defaults = strict({
  floorHeight: Type.Optional(Type.Number({ exclusiveMinimum: 0, description: "Výška podlažia v m; predvolene 3.5." })),
  wallTolerance: Type.Optional(
    Type.Number({ minimum: 0, description: "Max. vzdialenosť prechodu od hranice priestoru v m (hrúbka steny); predvolene 0.5." })
  ),
  speed: Type.Optional(Type.Number({ exclusiveMinimum: 0, description: "Rýchlosť chôdze v m/s; predvolene 1.3." })),
});

export const GeoReference = strict(
  {
    point: Vec2,
    lat: Type.Number({ minimum: -90, maximum: 90 }),
    lon: Type.Number({ minimum: -180, maximum: 180 }),
    bearing: Type.Optional(Type.Number({ description: "Azimut osi −y lokálneho systému v stupňoch od severu." })),
  },
  "Voliteľné ukotvenie lokálneho systému v GPS jedným referenčným bodom (R5)."
);

export const Venue = strict(
  {
    $schema: Type.Optional(Type.String()),
    schemaVersion: Type.Literal(SCHEMA_VERSION),
    id: Id,
    name: Type.String(),
    defaults: Type.Optional(Defaults),
    geoReference: Type.Optional(GeoReference),
    buildings: Type.Array(Building),
    levels: Type.Array(Level, { minItems: 1 }),
    spaces: Type.Array(Space),
    openings: Type.Array(Opening),
    vertical: Type.Array(Vertical),
    pois: Type.Array(Poi),
    rules: Type.Array(Rule),
    zones: Type.Array(Zone),
    profiles: Type.Array(Profile),
  },
  "Areál – koreňový objekt dátového modelu."
);

export type Building = Static<typeof Building>;
export type Level = Static<typeof Level>;
export type SpaceType = Static<typeof SpaceType>;
export type Space = Static<typeof Space>;
export type Opening = Static<typeof Opening>;
export type Vertical = Static<typeof Vertical>;
export type Poi = Static<typeof Poi>;
export type Rule = Static<typeof Rule>;
export type Zone = Static<typeof Zone>;
export type Weights = Static<typeof Weights>;
export type Profile = Static<typeof Profile>;
export type Venue = Static<typeof Venue>;
