"use client";

import * as React from "react";
import Link from "next/link";
import { LifeBuoy, X } from "lucide-react";
import { useLocalStorage } from "../lib/useLocalStorage";

/** Pri prvom otvorení prehľadu odkáže admina na pomocníka. Po zavretí sa už neukáže. */
export function OnboardingBanner() {
  const [seen, setSeen, hydrated] = useLocalStorage("path-finder/onboarding", false);
  if (!hydrated || seen) return null;
  return (
    <div className="mb-8 flex items-start gap-4 rounded-md border border-line bg-route-soft p-4">
      <LifeBuoy size={20} className="mt-0.5 shrink-0 text-route" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink">Začnite tu</div>
        <p className="mt-0.5 text-sm text-ink-soft">
          Pomocník vysvetlí postup prípravy areálu, požiadavky na dáta a formát exportu.
        </p>
        <Link href="/help" onClick={() => setSeen(true)} className="mt-2 inline-block text-sm font-medium text-route hover:underline">
          Otvoriť pomocníka
        </Link>
      </div>
      <button type="button" aria-label="Zavrieť" onClick={() => setSeen(true)} className="rounded-md p-1 text-ink-soft hover:bg-surface">
        <X size={16} />
      </button>
    </div>
  );
}
