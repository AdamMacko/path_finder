"use client";

import * as React from "react";

export type AlertSeverity = "success" | "info" | "warning" | "error";

type AlertBoxProps = {
  severity?: AlertSeverity;
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onClose?: () => void;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

function styles(severity: AlertSeverity) {
  switch (severity) {
    case "success":
      return { wrap: "border-green-200 bg-green-50 text-green-900", icon: "text-green-700" };
    case "info":
      return { wrap: "border-blue-200 bg-blue-50 text-blue-900", icon: "text-blue-700" };
    case "warning":
      return { wrap: "border-amber-200 bg-amber-50 text-amber-950", icon: "text-amber-800" };
    case "error":
      return { wrap: "border-red-200 bg-red-50 text-red-900", icon: "text-red-700" };
  }
}

function Icon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function AlertBox({
  severity = "info",
  title,
  children,
  dismissible = false,
  onClose,
}: AlertBoxProps) {
  const s = styles(severity);

  return (
    <div role="alert" className={cx("w-full rounded-xl border p-4 flex items-start gap-3 shadow-sm", s.wrap)}>
      <Icon className={cx("mt-0.5", s.icon)} />

      <div className="min-w-0 flex-1">
        {title ? <div className="text-sm font-semibold mb-1">{title}</div> : null}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>

      {dismissible ? (
        <button
          type="button"
          aria-label="Zavrieť upozornenie"
          onClick={onClose}
          className="ml-2 rounded-lg border bg-white/60 px-2 py-1 text-xs hover:bg-white"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
