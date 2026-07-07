"use client";

import { BarChart3, Shield, Swords, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ActiveSetCards } from "@/components/dashboard/ActiveSetCards";
import { InventoryGrid } from "@/components/dashboard/InventoryGrid";
import { SpellsPanel } from "@/components/dashboard/SpellsPanel";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { ToolsDrawer } from "@/components/dashboard/ToolsDrawer";
import { CatalogDrawer } from "@/components/items/CatalogDrawer";
import { Navbar, type AppTab } from "@/components/layout/Navbar";
import { StuffsPanel } from "@/components/stuffs/StuffsPanel";
import { Button } from "@/components/ui/Button";
import { createBuild, listMyBuilds } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useBuildStore } from "@/store/build-store";

type MobileView = "build" | "stats" | "sets";
type ActiveTool = "optimize" | "chat";

type ForeignBuild = { id: string; name: string };

/* ── Bouton de la barre de navigation mobile ─────────────────────────────── */
function MobileNavBtn({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium uppercase tracking-wide transition ${
        active
          ? "text-[var(--dofus-green-active)]"
          : "text-[#666666] hover:text-[#aaaaaa]"
      }`}
    >
      {icon}
      {label}
      {active && (
        <span className="h-0.5 w-8 rounded-full bg-[#6db824]" />
      )}
    </button>
  );
}

/* ── Banner "build étranger" ─────────────────────────────────────────────── */
function ForeignBuildBanner({
  build,
  onDismiss,
}: {
  build: ForeignBuild;
  onDismiss?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const currentBuild = useBuildStore((s) => s.currentBuild);
  const stats = useBuildStore((s) => s.stats);
  const activeSetBonuses = useBuildStore((s) => s.activeSetBonuses);
  const charStats = useBuildStore((s) => s.charStats);
  const parchoStats = useBuildStore((s) => s.parchoStats);
  const exoFm = useBuildStore((s) => s.exoFm);
  const level = useBuildStore((s) => s.level);
  const classId = useBuildStore((s) => s.classId);
  const sex = useBuildStore((s) => s.sex);
  const itemById = useBuildStore((s) => s.itemById);

  async function handleCopy() {
    if (!getAccessToken()) {
      setMsg("Connectez-vous pour copier ce build.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      // Build slots_preview from cached items
      const slotsPreview: Record<string, string | null> = {};
      for (const [slot, itemId] of Object.entries(currentBuild)) {
        if (itemId == null) continue;
        slotsPreview[slot] = itemById[itemId]?.image_url_icon ?? null;
      }
      await createBuild({
        name: `Copie — ${build.name}`,
        slots: { ...currentBuild },
        total_stats: { ...stats },
        active_set_bonuses: [...activeSetBonuses],
        char_stats: Object.keys(charStats).length > 0 ? { ...charStats } : null,
        parcho_stats: Object.keys(parchoStats).length > 0 ? { ...parchoStats } : null,
        exo_fm: Object.keys(exoFm).length > 0 ? (exoFm as Record<string, string>) : null,
        level,
        class_id: classId,
        sex,
        is_public: false,
        tags: [],
        slots_preview: slotsPreview,
      });
      setMsg("Build copié dans vos sauvegardes !");
      setTimeout(() => onDismiss?.(), 1800);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur lors de la copie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-4 mt-3 flex items-center justify-between gap-4 rounded-xl border border-[#f0d78c]/20 bg-[#f0d78c]/5 px-4 py-2.5 md:mx-8">
      <div className="flex items-center gap-2 min-w-0">
        <svg className="h-3.5 w-3.5 shrink-0 text-[#f0d78c]/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
        </svg>
        <span className="truncate text-[12px] text-[#f0d78c]/80">
          Consultation du build <span className="font-semibold text-[#f0d78c]">{build.name}</span>
          {" — "}lecture seule
        </span>
        {msg && (
          <span className={`shrink-0 text-[11px] ${msg.includes("copié") ? "text-emerald-400" : "text-amber-400"}`}>
            {msg}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={saving}
          onClick={() => void handleCopy()}
          className="border-[#f0d78c]/30 bg-[#f0d78c]/10 text-[#f0d78c] hover:bg-[#f0d78c]/20"
        >
          {saving ? "Copie…" : "Copier dans mes builds"}
        </Button>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded p-0.5 text-[#555] transition hover:text-[#999]"
            title="Fermer"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Dashboard principal ─────────────────────────────────────────────────── */
export function DashboardApp({
  initialTab = "buildroom",
  readOnly = false,
  sharedBuild = null,
}: {
  initialTab?: AppTab;
  readOnly?: boolean;
  sharedBuild?: { id: string; name: string } | null;
} = {}) {
  const [showTools, setShowTools] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>("optimize");
  const [mobileView, setMobileView] = useState<MobileView>("build");
  const [activeTab, setActiveTab] = useState<AppTab>(initialTab);
  const [foreignBuild, setForeignBuild] = useState<ForeignBuild | null>(
    readOnly && sharedBuild ? sharedBuild : null,
  );

  useEffect(() => {
    if (readOnly && sharedBuild) {
      setForeignBuild(sharedBuild);
    }
  }, [readOnly, sharedBuild]);

  useEffect(() => {
    function handleSwitchTab(e: Event) {
      const detail = (e as CustomEvent).detail as { tab: AppTab; foreign?: ForeignBuild } | AppTab;
      if (typeof detail === "string") {
        if (detail === "buildroom" || detail === "stuffs") setActiveTab(detail);
        if (detail === "buildroom") setForeignBuild(null);
      } else {
        if (detail.tab === "buildroom" || detail.tab === "stuffs") setActiveTab(detail.tab);
        if (detail.tab === "buildroom") setForeignBuild(detail.foreign ?? null);
      }
    }
    window.addEventListener("switch-tab", handleSwitchTab);
    return () => window.removeEventListener("switch-tab", handleSwitchTab);
  }, []);

  function openTools() {
    setActiveTool("optimize");
    setShowTools(true);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (!readOnly && tab !== "buildroom") setForeignBuild(null);
        }}
      />

      {activeTab === "stuffs" ? (
        <StuffsPanel />
      ) : (
        <>
          {/* ── Bannière build étranger ── */}
          {(foreignBuild || (readOnly && sharedBuild)) && (
            <ForeignBuildBanner
              build={foreignBuild ?? sharedBuild!}
              onDismiss={readOnly ? undefined : () => setForeignBuild(null)}
            />
          )}

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
                <InventoryGrid onOpenTools={readOnly ? undefined : openTools} readOnly={readOnly} />
                <SpellsPanel />
              </div>

              {/* ── Stats ── */}
              <div className="w-[260px] shrink-0 xl:w-[290px]">
                <StatsPanel readOnly={readOnly} />
              </div>
            </div>
          </main>

          {/* ════════ Layout mobile (< lg) ════════ */}
          <div className="flex flex-1 flex-col lg:hidden">
            <div className="flex-1 overflow-y-auto">
              {mobileView === "build" && (
                <div className="p-3 pb-2">
                  <InventoryGrid onOpenTools={readOnly ? undefined : openTools} readOnly={readOnly} />
                  <SpellsPanel />
                </div>
              )}
              {mobileView === "stats" && (
                <div className="p-3">
                  <StatsPanel readOnly={readOnly} />
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
              <MobileNavBtn icon={<Swords size={17} />} label="Build" active={mobileView === "build"} onClick={() => setMobileView("build")} />
              <MobileNavBtn icon={<BarChart3 size={17} />} label="Stats" active={mobileView === "stats"} onClick={() => setMobileView("stats")} />
              <MobileNavBtn icon={<Shield size={17} />} label="Panoplies" active={mobileView === "sets"} onClick={() => setMobileView("sets")} />
            </nav>
          </div>

          {/* Tiroir Optimisation / Conseiller IA */}
          {!readOnly && (
            <ToolsDrawer
              isOpen={showTools}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              onClose={() => setShowTools(false)}
            />
          )}

          {!readOnly && <CatalogDrawer />}
        </>
      )}
    </div>
  );
}
