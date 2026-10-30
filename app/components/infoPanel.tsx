"use client";

import * as React from "react";

type InfoPanelProps = React.PropsWithChildren<{
  title?: string;
}>;

export function InfoPanel({ title, children }: InfoPanelProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLSpanElement | null>(null);
  const closeTimer = React.useRef<number | null>(null);

  function openNow() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }

  function closeSoon() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  }

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onMouseDown(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label="Informácie"
        aria-haspopup="dialog"
        aria-expanded={open}
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
        onFocus={openNow}
        onBlur={closeSoon}
        onClick={() => setOpen((v) => !v)}
        className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-ink-soft hover:border-route hover:text-route focus:outline-none focus:ring-2 focus:ring-route/30 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 17v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 7h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="false"
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          className="absolute z-[9999] left-0 top-[calc(100%+8px)] w-[320px] rounded-md border border-line bg-surface p-4 shadow-[0_8px_24px_-8px_rgba(17,22,29,0.18)]"
        >
          {title ? <div className="text-sm font-medium text-ink mb-1">{title}</div> : null}
          <div className="text-sm text-ink-soft leading-relaxed space-y-2">{children}</div>
        </div>
      ) : null}
    </span>
  );
}
