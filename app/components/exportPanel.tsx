"use client";

import * as React from "react";
import { Download, FileCheck2, Upload } from "lucide-react";
import type { Issue } from "@/lib/core/model/issues";
import { checkBundle, exportVenue } from "../lib/exportVenue";
import type { Areal } from "../lib/model";
import type { Pravidla } from "../lib/rules";

type Report = { title: string; ok: boolean; issues: Issue[] };

/** Export areálu z editora do JSON pre server a kontrola nahraného súboru voči schéme a geometrii. */
export function ExportPanel({ areal, pravidla }: { areal: Areal; pravidla: Pravidla }) {
  const [report, setReport] = React.useState<Report | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  function download() {
    const { bundle, issues, ok } = exportVenue(areal, pravidla);
    setReport({ title: ok ? "Export je platný" : "Export obsahuje chyby", ok, issues });
    if (!ok) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bundle.venue.id}.venue.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function check(file: File | undefined) {
    if (!file) return;
    try {
      const { ok, issues } = checkBundle(JSON.parse(await file.text()));
      setReport({ title: ok ? `Súbor „${file.name}“ je platný` : `Súbor „${file.name}“ obsahuje chyby`, ok, issues });
    } catch {
      setReport({ title: `Súbor „${file.name}“ nie je platný JSON`, ok: false, issues: [] });
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  const button = "flex w-full items-center justify-center gap-2 rounded-sm border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-route";

  return (
    <div className="bg-surface p-6 rounded-md border border-line">
      <h2 className="text-sm font-medium text-ink-soft mb-4 flex items-center gap-2">
        <FileCheck2 size={15} />
        Export pre server
      </h2>
      <div className="space-y-2">
        <button type="button" onClick={download} className={button}>
          <Download size={15} />
          Exportovať areál (JSON)
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={button}>
          <Upload size={15} />
          Skontrolovať súbor
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => check(e.target.files?.[0])} />
      </div>

      {report && (
        <div className="mt-4 space-y-2">
          <div className={`text-sm font-medium ${report.ok ? "text-stake" : "text-alarm"}`}>{report.title}</div>
          {report.issues.length > 0 && (
            <ul className="max-h-56 space-y-1.5 overflow-y-auto text-xs leading-relaxed text-ink-soft">
              {report.issues.map((i, n) => (
                <li key={n} className="flex gap-2">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${i.severity === "error" ? "bg-alarm" : "bg-flag"}`} />
                  <span>{i.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="mt-4 text-xs text-ink-soft leading-relaxed">
        Súbor obsahuje dátový model (<span className="font-mono">venue</span>) a geometriu podlaží v pixeloch s transformáciou do metrov.
      </p>
    </div>
  );
}
