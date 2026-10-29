// Zapíše JSON Schému areálu do lib/core/schema/venue.schema.json (pre editor, dokumentáciu a prílohu práce).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Venue } from "../lib/core/model/schema";

const out = join(dirname(fileURLToPath(import.meta.url)), "../lib/core/schema/venue.schema.json");
const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://path-finder/venue.schema.json",
  title: "Path Finder – areál",
  ...JSON.parse(JSON.stringify(Venue)),
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(schema, null, 2) + "\n");
console.log(`Schéma zapísaná do ${out}`);
