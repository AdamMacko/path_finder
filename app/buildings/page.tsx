"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, ChevronRight, Layers } from "lucide-react";
import { useLocalStorage } from "../lib/useLocalStorage";
import { createEmptyAreal } from "../lib/model";
import { createSeedAreal } from "../lib/seedData";
import { KIND_META } from "../lib/annotationKinds";

export default function BuildingsPage() {
  const [areal, setAreal] = useLocalStorage("path-finder/areal", createEmptyAreal());
  const buildings = areal.budovy.filter((b) => b.kind === "budova");

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 pb-6 border-b border-line">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink">Správa budov</h1>
          <p className="text-sm text-ink-soft mt-1.5 max-w-xl">
            Budovy identifikované na outdoor mape. Vyberte budovu a doplňte jej podlažia a pôdorysy.
          </p>
        </div>
        <button
          onClick={() => setAreal(createSeedAreal())}
          className="shrink-0 text-xs text-ink-soft border border-line rounded-sm px-3 py-2 hover:text-route hover:border-route transition-colors"
        >
          Načítať ukážkové dáta
        </button>
      </div>

      {buildings.length === 0 ? (
        <div className="border border-line rounded-md bg-surface p-8 text-center">
          <Building2 size={28} className="mx-auto text-ink-soft mb-3" />
          <p className="text-sm font-medium text-ink">Zatiaľ žiadne budovy</p>
          <p className="text-sm text-ink-soft mt-1 max-w-sm mx-auto">
            Najprv označte budovy na outdoor mape areálu — odtiaľ sa tu automaticky objavia.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              href="/building_complex"
              className="inline-flex items-center gap-2 rounded-sm bg-route text-white px-4 py-2.5 text-sm font-medium hover:bg-route/90 transition-colors"
            >
              Prejsť na outdoor mapu
            </Link>
            <button
              onClick={() => setAreal(createSeedAreal())}
              className="inline-flex items-center gap-2 rounded-sm border border-line px-4 py-2.5 text-sm font-medium text-ink-soft hover:text-route hover:border-route transition-colors"
            >
              Načítať ukážkové dáta
            </button>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {buildings.map((b) => {
            const color = b.customColor ?? KIND_META[b.kind].hex;
            const floorCount = b.podlazia.length;
            return (
              <li key={b.id}>
                <Link
                  href={`/buildings/${b.id}`}
                  className="flex items-center gap-4 border border-line rounded-md bg-surface px-5 py-4 hover:border-route/50 hover:bg-route-soft/40 transition-colors group"
                >
                  <span
                    className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    <Building2 size={18} className="text-white" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{b.nazov}</div>
                    <div className="flex items-center gap-1.5 text-xs text-ink-soft mt-0.5">
                      <Layers size={12} />
                      {floorCount === 0 ? "Zatiaľ bez podlaží" : `${floorCount} ${floorCount === 1 ? "podlažie" : "podlaží"}`}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-ink-soft shrink-0 group-hover:text-route transition-colors" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
