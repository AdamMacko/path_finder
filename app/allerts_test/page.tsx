"use client";

import * as React from "react";
import { AlertBox } from "../components/allertsBox";

type Sev = "success" | "info" | "warning" | "error";
type TestAlert = { id: string; severity: Sev; title?: string; message: string; dismissible?: boolean };

export default function AlertsTestPage() {
  const [alerts, setAlerts] = React.useState<TestAlert[]>([
    { id: "a1", severity: "success", title: "Hotovo", message: "Súbor bol úspešne nahratý." },
    { id: "a2", severity: "info", title: "Info", message: "Nájdené objekty: 5 budov, 2 parkoviská." },
    { id: "a3", severity: "warning", title: "Pozor", message: "V SVG chýba data-type pri 2 objektoch." },
    { id: "a4", severity: "error", title: "Chyba", message: "Nepodarilo sa načítať súbor. Skontroluj formát.", dismissible: true },
  ]);

  function add(severity: Sev) {
    const id = crypto.randomUUID();
    const template: Record<Sev, Omit<TestAlert, "id" | "severity">> = {
      success: { title: "Hotovo", message: "Operácia prebehla úspešne.", dismissible: true },
      info: { title: "Info", message: "Toto je informačná správa.", dismissible: true },
      warning: { title: "Pozor", message: "Niečo vyžaduje tvoju pozornosť.", dismissible: true },
      error: { title: "Chyba", message: "Nastala chyba. Skús znova alebo skontroluj dáta.", dismissible: true },
    };
    setAlerts((prev) => [{ id, severity, ...template[severity] }, ...prev]);
  }

  function remove(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  function clear() {
    setAlerts([]);
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Test alertov</h1>
        <p className="text-sm text-gray-500">Klikaj a sleduj, ako sa správajú, vyzerajú a zatvárajú.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="px-3 py-2 rounded-lg border text-sm" onClick={() => add("success")}>
          + Success
        </button>
        <button className="px-3 py-2 rounded-lg border text-sm" onClick={() => add("info")}>
          + Info
        </button>
        <button className="px-3 py-2 rounded-lg border text-sm" onClick={() => add("warning")}>
          + Warning
        </button>
        <button className="px-3 py-2 rounded-lg border text-sm" onClick={() => add("error")}>
          + Error
        </button>

        <button className="ml-auto px-3 py-2 rounded-lg border text-sm" onClick={clear}>
          Clear
        </button>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-xl border p-4 text-sm text-gray-500">Žiadne alerty.</div>
        ) : (
          alerts.map((a) => (
            <AlertBox
              key={a.id}
              severity={a.severity}
              title={a.title}
              dismissible={a.dismissible}
              onClose={() => remove(a.id)}
            >
              {a.message}
            </AlertBox>
          ))
        )}
      </div>
    </div>
  );
}
