"use client";

import * as React from "react";

export type AlertSeverity = "success" | "info" | "warning" | "error";

type AlertBoxProps = {
  severity?: AlertSeverity;
  title?: string;
  children: React.ReactNode;
  className?: string;
  dismissible?: boolean;
  onClose?: () => void;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

function styles(severity: AlertSeverity) {
  switch (severity) {
    case "success":
      return { bar: "bg-stake", icon: "text-stake" };
    case "info":
      return { bar: "bg-route", icon: "text-route" };
    case "warning":
      return { bar: "bg-flag", icon: "text-flag" };
    case "error":
      return { bar: "bg-alarm", icon: "text-alarm" };
  }
}

function icons(severity: AlertSeverity) {
  switch (severity) {
    case "success":
      return (
        <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      );
    case "warning":
      return (
        <>
          <path d="M12 4.5 2.5 20h19L12 4.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M12 10.5v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 17.25h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case "error":
      return (
        <>
          <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "info":
    default:
      return (
        <>
          <path d="M12 10.5v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 7.25h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
  }
}

export function AlertBox({
  severity = "info",
  title,
  children,
  className,
  dismissible = false,
  onClose,
}: AlertBoxProps) {
  const s = styles(severity);

  return (
    <div
      role="alert"
      className={cx(
        "relative w-full overflow-hidden rounded-md border border-line bg-surface pl-4 pr-3 py-3",
        "flex items-start gap-3",
        className
      )}
    >
      <span className={cx("absolute inset-y-0 left-0 w-[3px]", s.bar)} aria-hidden="true" />

      <svg className={cx("mt-0.5 shrink-0", s.icon)} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {icons(severity)}
      </svg>

      <div className="min-w-0 flex-1">
        {title ? <div className="text-sm font-medium text-ink mb-0.5">{title}</div> : null}
        <div className="text-sm leading-relaxed text-ink-soft">{children}</div>
      </div>

      {dismissible ? (
        <button
          type="button"
          aria-label="Zavrieť upozornenie"
          onClick={onClose}
          className="shrink-0 -mr-1 -mt-1 rounded-sm p-1.5 text-ink-soft hover:bg-paper hover:text-ink transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
