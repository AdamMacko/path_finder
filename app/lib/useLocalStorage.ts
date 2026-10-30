"use client";

import * as React from "react";

/**
 * Jednoduchý localStorage-backed state hook. SSR-bezpečný: na serveri a pri
 * prvom kliente renderi vracia initialValue, zo storage sa dočíta v efekte
 * (nespôsobuje hydration mismatch, len jeden re-render navyše po mounte).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = React.useState<T>(initialValue);
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      // ignorovať poškodené dáta v localStorage
    } finally {
      hydrated.current = true;
    }
  }, [key]);

  React.useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // napr. plné úložisko alebo private mode — anotácie ostanú len v pamäti
    }
  }, [key, value]);

  return [value, setValue];
}
