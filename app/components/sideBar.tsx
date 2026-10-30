"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LifeBuoy, Menu, Building2Icon, Map } from "lucide-react";

const Sidebar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const items = [
    { to: "/", label: "Prehľad", icon: LayoutDashboard },
    { to: "/building_complex", label: "Outdoor Mapa", icon: Map },
    { to: "/buildings", label: "Správa budov", icon: Building2Icon },
    { to: "/pomocnik", label: "Pomocník", icon: LifeBuoy },
  ];

  return (
    <>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-ink/25 z-40"
        />
      )}

      <aside
        className={`h-[100dvh] bg-surface border-r border-line z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${sidebarOpen ? "fixed left-0 top-0 w-[260px]" : "w-16"}`}
      >
        <div className="pt-7 pb-5 flex flex-col items-center gap-3 border-b border-line">
          <Image src="/logo.svg" alt="Path Finder" width={28} height={28} priority />

          <button
            onClick={() => setSidebarOpen((p) => !p)}
            aria-label={sidebarOpen ? "Zbaliť navigáciu" : "Rozbaliť navigáciu"}
            className="w-10 h-9 flex items-center justify-center rounded-md text-ink-soft hover:bg-paper hover:text-route transition-colors"
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="mt-4 flex flex-col gap-0.5 px-2">
          {items.map(({ to, label, icon: Icon }) => {
            const isActive =
              to === "/" ? pathname === "/" : pathname.startsWith(to);

            return (
              <Link
                key={to}
                href={to}
                onClick={() => setSidebarOpen(false)}
                className={`group relative flex items-center rounded-md px-3 py-2.5 text-sm transition-colors border-l-2 ${isActive
                    ? "bg-route-soft text-route border-route font-medium"
                    : "text-ink-soft hover:bg-paper hover:text-ink border-transparent"
                  }`}
              >
                <div className="w-6 flex justify-center shrink-0">
                  <Icon size={17} />
                </div>

                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${sidebarOpen
                      ? "max-w-[160px] opacity-100 translate-x-0 ml-3"
                      : "max-w-0 opacity-0 -translate-x-2 ml-0"
                    }`}
                >
                  {label}
                </span>

                {!sidebarOpen && (
                  <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 rounded-md bg-ink px-2.5 py-1.5 text-xs text-white opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
