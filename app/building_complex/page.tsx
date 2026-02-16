import { InfoPanel } from "../components/infoPanel";

export default function ImportPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Import mapy areálu
        </h1>

        <InfoPanel title="Ako funguje import?">
          <p>
            Outdoor mapa slúži ako vstupný bod pre celý navigačný systém.
          </p>
          <ul className="list-disc pl-5">
            <li>
              <b>SVG mapa</b> umožňuje automatické rozpoznanie budov a parkovísk.
            </li>
            <li>
              <b>Obrázok / dron snímka</b> slúži ako vizuálny podklad pre manuálnu
              anotáciu objektov.
            </li>
          </ul>
          <p>
            Po importe budete pokračovať vytváraním vnútornej štruktúry budov.
          </p>
        </InfoPanel>
      </div>

      {/* zvyšok stránky */}
    </div>
  );
}
