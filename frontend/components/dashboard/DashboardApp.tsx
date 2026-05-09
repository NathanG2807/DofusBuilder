"use client";

import { useState } from "react";

import { ActiveSetCards } from "@/components/dashboard/ActiveSetCards";
import { InventoryGrid } from "@/components/dashboard/InventoryGrid";
import { SpellsPanel } from "@/components/dashboard/SpellsPanel";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { ToolsDrawer } from "@/components/dashboard/ToolsDrawer";
import { CatalogDrawer } from "@/components/items/CatalogDrawer";
import { Navbar } from "@/components/layout/Navbar";

type MobileView = "build" | "stats" | "sets";
type ActiveTool = "optimize" | "chat";

/* ── Bouton de la barre de navigation mobile ─────────────────────────────── */
function MobileNavBtn({
  label,
  emoji,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium uppercase tracking-wide transition ${
        active
          ? "text-[#9cce38]"
          : "text-[#666666] hover:text-[#aaaaaa]"
      }`}
    >
      <span className="text-[18px] leading-none">{emoji}</span>
      {label}
      {active && (
        <span className="h-0.5 w-8 rounded-full bg-[#6db824]" />
      )}
    </button>
  );
}

/* ── Dashboard principal ─────────────────────────────────────────────────── */
export function DashboardApp() {
  const [showTools, setShowTools] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>("optimize");
  const [mobileView, setMobileView] = useState<MobileView>("build");

  function openTools() {
    setActiveTool("optimize");
    setShowTools(true);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* ════════ Layout desktop (lg+) ════════ */}
      <main className="mx-auto hidden w-full max-w-[1600px] flex-1 gap-4 p-4 md:p-5 lg:flex lg:gap-6">

        {/* ── Colonne gauche : Panoplies actives ── */}
        <div className="flex w-[300px] shrink-0 flex-col gap-3 xl:w-[330px]">
          <div className="flex-1 overflow-y-auto">
            <ActiveSetCards />
          </div>
        </div>

        {/* ── Centre : Inventaire + Sorts ── */}
        <div className="flex min-w-0 flex-1 items-start justify-center gap-4">
          <div className="w-full max-w-[660px] shrink-0">
            <InventoryGrid onOpenTools={openTools} />
            <SpellsPanel />
          </div>

          {/* ── Stats ── */}
          <div className="w-[260px] shrink-0 xl:w-[290px]">
            <StatsPanel />
          </div>
        </div>
      </main>

      {/* ════════ Layout mobile (< lg) ════════ */}
      <div className="flex flex-1 flex-col lg:hidden">
        <div className="flex-1 overflow-y-auto">

          {mobileView === "build" && (
            <div className="p-3 pb-2">
              <InventoryGrid onOpenTools={openTools} />
              <SpellsPanel />
            </div>
          )}

          {mobileView === "stats" && (
            <div className="p-3">
              <StatsPanel />
            </div>
          )}

          {mobileView === "sets" && (
            <div className="flex flex-col p-3">
              <ActiveSetCards />
            </div>
          )}
        </div>

        {/* Barre de navigation bottom */}
        <nav className="sticky bottom-0 z-30 flex border-t border-[#222222] bg-[#141414] pb-safe">
          <MobileNavBtn emoji="⚔" label="Build"     active={mobileView === "build"} onClick={() => setMobileView("build")} />
          <MobileNavBtn emoji="📊" label="Stats"     active={mobileView === "stats"} onClick={() => setMobileView("stats")} />
          <MobileNavBtn emoji="🛡" label="Panoplies" active={mobileView === "sets"}  onClick={() => setMobileView("sets")}  />
        </nav>
      </div>

      {/* Tiroir Optimisation / Conseiller IA */}
      <ToolsDrawer
        isOpen={showTools}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onClose={() => setShowTools(false)}
      />

      {/* Catalogue en tiroir plein-écran */}
      <CatalogDrawer />
    </div>
  );
}
