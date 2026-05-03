"use client";

import { useState } from "react";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { ActiveSetCards } from "@/components/dashboard/ActiveSetCards";
import { InventoryGrid } from "@/components/dashboard/InventoryGrid";
import { OptimizePanel } from "@/components/dashboard/OptimizePanel";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { CatalogDrawer } from "@/components/items/CatalogDrawer";
import { Navbar } from "@/components/layout/Navbar";

type MobileView = "build" | "stats" | "tools";
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

/* ── Tab switcher Optimisation / IA (partagé desktop + mobile) ───────────── */
function ToolTabs({
  activeTool,
  setActiveTool,
}: {
  activeTool: ActiveTool;
  setActiveTool: (t: ActiveTool) => void;
}) {
  return (
    <div className="relative grid grid-cols-2 rounded-lg border border-[#222222] bg-[#111111] p-1">
      <span
        aria-hidden
        className={`absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-md border border-[#4a8000]/60 bg-[#1a2c0a] transition-transform duration-300 ease-out ${
          activeTool === "optimize" ? "translate-x-0" : "translate-x-[calc(100%+0.5rem)]"
        }`}
      />
      <button
        type="button"
        onClick={() => setActiveTool("optimize")}
        className={`relative z-10 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
          activeTool === "optimize" ? "text-[#9cce38]" : "text-[#888888] hover:text-[#cccccc]"
        }`}
      >
        ⚙ Optim. auto
      </button>
      <button
        type="button"
        onClick={() => setActiveTool("chat")}
        className={`relative z-10 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
          activeTool === "chat" ? "text-[#9cce38]" : "text-[#888888] hover:text-[#cccccc]"
        }`}
      >
        🤖 Conseiller IA
      </button>
    </div>
  );
}

/* ── Dashboard principal ─────────────────────────────────────────────────── */
export function DashboardApp() {
  const [activeTool, setActiveTool] = useState<ActiveTool>("optimize");
  const [mobileView, setMobileView] = useState<MobileView>("build");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* ════════ Layout desktop (lg+) ════════ */}
      <main className="mx-auto hidden w-full max-w-[1600px] flex-1 gap-4 p-4 md:p-5 lg:flex lg:gap-6">

        {/* ── Colonne gauche : Outils ── */}
        <div className="flex w-[300px] shrink-0 flex-col gap-3 xl:w-[330px]">
          <section className="overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#181818]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_24px_rgba(0,0,0,0.55)]">
            <div className="border-b border-[#222222] p-2">
              <ToolTabs activeTool={activeTool} setActiveTool={setActiveTool} />
            </div>
            <div className="p-4">
              {activeTool === "optimize"
                ? <OptimizePanel bare />
                : <ChatPanel bare />}
            </div>
          </section>
        </div>

        {/* ── Centre : Inventaire + Panoplies ── */}
        <div className="flex min-w-0 flex-1 items-start justify-center gap-4">
          <div className="w-full max-w-[600px] shrink-0">
            <InventoryGrid />
            <ActiveSetCards />
          </div>

          {/* ── Stats ── */}
          <div className="w-[260px] shrink-0 xl:w-[290px]">
            <StatsPanel />
          </div>
        </div>
      </main>

      {/* ════════ Layout mobile (< lg) ════════ */}
      <div className="flex flex-1 flex-col lg:hidden">

        {/* Contenu de la vue active */}
        <div className="flex-1 overflow-y-auto">

          {mobileView === "build" && (
            <div className="p-3 pb-2">
              <InventoryGrid />
              <ActiveSetCards />
            </div>
          )}

          {mobileView === "stats" && (
            <div className="p-3">
              <StatsPanel />
            </div>
          )}

          {mobileView === "tools" && (
            <div className="p-3">
              <section className="overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#181818]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_24px_rgba(0,0,0,0.55)]">
                <div className="border-b border-[#222222] p-2">
                  <ToolTabs activeTool={activeTool} setActiveTool={setActiveTool} />
                </div>
                <div className="p-4">
                  {activeTool === "optimize"
                    ? <OptimizePanel bare />
                    : <ChatPanel bare />}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Barre de navigation bottom */}
        <nav className="sticky bottom-0 z-30 flex border-t border-[#222222] bg-[#141414] pb-safe">
          <MobileNavBtn emoji="⚔" label="Build"  active={mobileView === "build"}  onClick={() => setMobileView("build")}  />
          <MobileNavBtn emoji="📊" label="Stats"  active={mobileView === "stats"}  onClick={() => setMobileView("stats")}  />
          <MobileNavBtn emoji="⚙" label="Outils" active={mobileView === "tools"} onClick={() => setMobileView("tools")} />
        </nav>
      </div>

      {/* Catalogue en tiroir plein-écran */}
      <CatalogDrawer />
    </div>
  );
}
