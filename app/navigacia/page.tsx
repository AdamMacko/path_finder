import type { Metadata } from "next";
import Link from "next/link";
import { buildMapData } from "@/lib/server/mapData";
import { loadVenue } from "@/lib/server/venueStore";
import { AlertBox } from "../components/allertsBox";
import { Navigator } from "./navigator";

export const metadata: Metadata = { title: "Navigácia – Path Finder" };

/**
 * Prehliadač navigácie (F10). Dáta mapy pripravuje server pre zvolený profil (?profil=…),
 * takže interné body sa k návštevníkovi nedostanú (N6).
 * TODO: interné profily (údržbár…) budú vyžadovať prihlásenie – teraz ich môže zvoliť ktokoľvek.
 */
export default async function NavigationPage({ searchParams }: { searchParams: Promise<{ profil?: string | string[] }> }) {
  const { profil } = await searchParams;
  const loaded = loadVenue();

  if (!loaded.ok) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <AlertBox severity="error" title="Dáta areálu nie sú platné">
          Navigácia nie je dostupná. Podrobnosti sú v <Link href="/" className="underline">prehľade</Link>.
        </AlertBox>
      </div>
    );
  }

  const { venue, profiles } = loaded.index;
  const profile = (typeof profil === "string" && profiles.get(profil)) || venue.profiles[0];
  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <AlertBox severity="error" title="Areál nemá žiadny profil">
          Doplň aspoň jeden profil do dát areálu.
        </AlertBox>
      </div>
    );
  }

  return <Navigator data={buildMapData(venue, loaded.geometry, profile)} />;
}
