"use client";

import * as React from "react";

export type History = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const MAX_HISTORY = 100;
/** Zmeny v rýchlom slede (napr. ťahanie myšou) sa zlúčia do jedného kroku späť. */
const COALESCE_MS = 600;

/**
 * Jednoduchý localStorage-backed state hook s históriou zmien. SSR-bezpečný: na serveri a pri
 * prvom kliente renderi vracia initialValue, zo storage sa dočíta v efekte
 * (nespôsobuje hydration mismatch, len jeden re-render navyše po mounte).
 *
 * Do storage sa nezapisuje, kým sa uložená hodnota nenačíta (`hydrated`). Inak by sa pri mounte
 * (a v dev režime pri opakovanom spustení efektov) prepísali uložené dáta počiatočnou hodnotou.
 * `hydrated` umožňuje stránke nezobrazovať „nenájdené“, kým sa dáta ešte načítavajú.
 * `history` dáva späť/znova pre zmeny urobené cez vrátený setter (načítanie zo storage sa nezapočítava).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>, boolean, History] {
  const [value, setValue] = React.useState<T>(initialValue);
  const [hydrated, setHydrated] = React.useState(false);
  const [, bump] = React.useState(0);

  const current = React.useRef(value);
  const past = React.useRef<T[]>([]);
  const future = React.useRef<T[]>([]);
  const lastRecorded = React.useRef(0);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        current.current = parsed;
        setValue(parsed);
      }
    } catch {
      // ignorovať poškodené dáta v localStorage
    } finally {
      setHydrated(true);
    }
  }, [key]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // napr. plné úložisko alebo private mode — anotácie ostanú len v pamäti
    }
  }, [key, value, hydrated]);

  const set = React.useCallback<React.Dispatch<React.SetStateAction<T>>>((action) => {
    const prev = current.current;
    const next = typeof action === "function" ? (action as (p: T) => T)(prev) : action;
    if (Object.is(next, prev)) return;
    const now = Date.now();
    if (now - lastRecorded.current > COALESCE_MS || past.current.length === 0) {
      past.current.push(prev);
      if (past.current.length > MAX_HISTORY) past.current.shift();
    }
    lastRecorded.current = now;
    future.current = [];
    current.current = next;
    setValue(next);
    bump((n) => n + 1);
  }, []);

  const history = React.useMemo<History>(
    () => ({
      canUndo: past.current.length > 0,
      canRedo: future.current.length > 0,
      undo: () => {
        const prev = past.current.pop();
        if (prev === undefined) return;
        future.current.push(current.current);
        current.current = prev;
        lastRecorded.current = 0;
        setValue(prev);
        bump((n) => n + 1);
      },
      redo: () => {
        const next = future.current.pop();
        if (next === undefined) return;
        past.current.push(current.current);
        current.current = next;
        lastRecorded.current = 0;
        setValue(next);
        bump((n) => n + 1);
      },
    }),
    // `value` mení po každej zmene, takže canUndo/canRedo sa prepočítajú.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value]
  );

  return [value, set, hydrated, history];
}
