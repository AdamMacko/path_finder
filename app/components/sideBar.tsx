"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  History,
  User,
  LifeBuoy,
  Menu,
  Building,
  Building2Icon,
} from "lucide-react";

const Sidebar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const items = [
    { to: "/", label: "Prehľad", icon: LayoutDashboard },
    { to: "/building_complex", label: "Budovy areálu", icon: Building2Icon },
    { to: "/my-firm", label: "Moja firma", icon: User },
    { to: "/pomocnik", label: "Pomocník", icon: LifeBuoy },
  ];

  return (
    <>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 z-40"
        />
      )}

      <aside
        className={`h-[100dvh] bg-white border-r border-[#e6e6e6] shadow-sm z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${sidebarOpen ? "fixed left-0 top-0 w-[260px]" : "w-16"}`}
      >
        <div className="pt-8 flex flex-col items-center h-[60px]">
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="w-12 py-3 flex items-center justify-center rounded-lg hover:bg-[#f3f6f9]"
          >
            <Menu size={22} className="text-[#003a70]" />
          </button>
        </div>

        <nav className="mt-10 flex flex-col gap-1 px-2">
          {items.map(({ to, label, icon: Icon }) => {
            const isActive =
              to === "/" ? pathname === "/" : pathname.startsWith(to);

            return (
              <Link
                key={to}
                href={to}
                onClick={() => setSidebarOpen(false)}
                className={`group relative flex items-center rounded-xl px-3.5 py-3 transition ${
                  isActive
                    ? "bg-[#0075be] text-[#FFFFFF]"
                    : "text-[#777777] hover:bg-[#f3f6f9]"
                }`}
              >
                <div className="w-6 flex justify-center">
                  <Icon size={18} />
                </div>

                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${
                    sidebarOpen
                      ? "max-w-[160px] opacity-100 translate-x-0 mx-6 ml-10"
                      : "max-w-0 opacity-0 -translate-x-2 ml-0"
                  }`}
                >
                  {label}
                </span>

                {!sidebarOpen && (
                  <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 rounded-lg bg-[#1f2937] px-3 py-1.5 text-xs text-white opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap shadow-lg">
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
