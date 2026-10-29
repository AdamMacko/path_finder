/** Nález validácie. `error` znamená, že dáta nemožno použiť; `warning` je podozrivé, ale prípustné. */
export interface Issue {
  severity: "error" | "warning";
  /** Strojovo čitateľný kód, napr. `ref.unknown-space`. */
  code: string;
  /** Cesta v JSON-e v tvare `spaces[3].level`, alebo `id` prvku SVG pri geometrii. */
  path: string;
  message: string;
}

export type Result<T> = { ok: true; value: T; issues: Issue[] } | { ok: false; issues: Issue[] };

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === "error");

export function result<T>(value: T, issues: Issue[]): Result<T> {
  return hasErrors(issues) ? { ok: false, issues } : { ok: true, value, issues };
}

/** Prevedie JSON Pointer (`/spaces/3/level`) na čitateľnú cestu (`spaces[3].level`). */
export function pointerToPath(pointer: string): string {
  return pointer
    .split("/")
    .slice(1)
    .map((seg) => seg.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((acc, seg) => (/^\d+$/.test(seg) ? `${acc}[${seg}]` : acc ? `${acc}.${seg}` : seg), "");
}
