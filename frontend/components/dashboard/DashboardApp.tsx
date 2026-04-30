"use client";

import { useState } from "react";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { ActiveSetCards } from "@/components/dashboard/ActiveSetCards";
import { InventoryGrid } from "@/components/dashboard/InventoryGrid";
import { OptimizePanel } from "@/components/dashboard/OptimizePanel";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { CatalogDrawer } from "@/components/items/CatalogDrawer";
import { Navbar } from "@/components/layout/Navbar";

/* ── Accordéon générique ───────────────────────────────────────────────────── */
function Accordion({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border-2 border-[#6b5428]/80 bg-[#1a1510]/95 shadow-inner overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 hover:bg-[#231e18]/60 transition"
      >
        <span className="text-lg">{icon}</span>
        <span className="flex-1 text-left font-serif text-[15px] font-semibold text-[#f0d78c]">
          {title}
        </span>
        <span className={`text-[12px] text-[#6a5c48] transition-transform ${open ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {open && (
        <div className="border-t border-[#6b5428]/40 px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function DashboardApp() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 gap-4 p-4 md:p-5 lg:gap-6">

        {/* ── Colonne gauche : Outils (accordéons compacts) ── */}
        <div className="flex w-[280px] shrink-0 flex-col gap-3 xl:w-[320px]">
          <Accordion title="Optimisation auto" icon="⚙️" defaultOpen>
            <OptimizePanel bare />
          </Accordion>
          <Accordion title="Conseiller IA" icon="🤖">
            <ChatPanel bare />
          </Accordion>
        </div>

        {/* ── Centre : Build (inventaire) + Stats côte à côte ── */}
        <div className="flex min-w-0 flex-1 items-start justify-center gap-4">

          {/* Inventaire + cards de panoplies */}
          <div className="w-full max-w-[600px] shrink-0">
            <InventoryGrid />
            <ActiveSetCards />
          </div>

          {/* Stats collées à droite du build */}
          <div className="w-[260px] shrink-0 xl:w-[290px]">
            <StatsPanel />
          </div>

        </div>

      </main>

      {/* Catalogue en tiroir plein-écran */}
      <CatalogDrawer />
    </div>
  );
}
