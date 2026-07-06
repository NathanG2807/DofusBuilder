"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { Activity, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Plaque } from "@/components/ui/Plaque";
import { fetchCommunityStats } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { CommunityStats } from "@/types/api";

const POLL_MS = 45_000;

const nf = new Intl.NumberFormat("fr-FR");
const df = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

type CommunityRow = {
  key: keyof Pick<
    CommunityStats,
    "online_users" | "members" | "builds_total" | "builds_public" | "craft_lists"
  >;
  label: string;
};

const COMMUNITY_ROWS: CommunityRow[] = [
  { key: "online_users", label: "En ligne" },
  { key: "members", label: "Membres" },
  { key: "builds_total", label: "Builds créés" },
  { key: "builds_public", label: "Builds publics" },
  { key: "craft_lists", label: "Listes atelier" },
  // { key: "items", label: "Objets (base locale)" },
  // { key: "item_sets", label: "Panoplies (base locale)" },
];

function AnimatedValue({ value }: { value: number | null }) {
  const spring = useSpring(value ?? 0, { stiffness: 90, damping: 22, mass: 0.6 });
  const display = useTransform(spring, (v) => nf.format(Math.round(v)));

  useEffect(() => {
    spring.set(value ?? 0);
  }, [spring, value]);

  if (value === null) {
    return <span className="tabular-nums text-white/35">—</span>;
  }

  return <motion.span className="tabular-nums">{display}</motion.span>;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">
      {children}
    </p>
  );
}

function AccordionPanel({
  open,
  children,
  nested = false,
}: {
  open: boolean;
  children: ReactNode;
  nested?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="overflow-hidden">
        <div className={nested ? "pt-2" : "pt-2.5"}>{children}</div>
      </div>
    </div>
  );
}

function AccordionTrigger({
  open,
  onToggle,
  label,
  nested = false,
  leading,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  nested?: boolean;
  leading?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(
        "flex w-full items-center gap-2 text-left transition-colors hover:text-white/70",
        nested ? "py-1" : "py-0.5",
      )}
    >
      <span className={cn("shrink-0 transition-transform duration-200", open && "rotate-90")}>
        <ChevronRight size={nested ? 12 : 13} className="text-white/30" />
      </span>
      {leading}
      <span
        className={cn(
          "font-semibold uppercase tracking-[0.16em]",
          nested
            ? "text-[9px] tracking-[0.18em] text-white/30"
            : "text-[10px] text-white/45",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function HomeLiveStats() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [error, setError] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchCommunityStats();
      setStats(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const game = stats?.game_data ?? null;
  const dataUpdatedLabel = game?.data_updated_at
    ? df.format(new Date(game.data_updated_at))
    : null;

  const liveIndicator = (
    <span className="relative flex h-2 w-2 shrink-0">
      <span
        className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
          error ? "bg-[#e05838]/70" : "animate-ping bg-[var(--dofus-green-active)]/60"
        }`}
      />
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${
          error ? "bg-[#e05838]" : "bg-[var(--dofus-green-active)]"
        }`}
      />
    </span>
  );

  return (
    <aside
      aria-label="Statistiques communautaires en direct"
      className="pointer-events-none fixed bottom-4 right-4 z-20 sm:bottom-6 sm:right-6"
    >
      <Plaque flat className="pointer-events-auto w-[230px] px-3.5 py-2.5 sm:w-[260px]">
        <AccordionTrigger
          open={liveOpen}
          onToggle={() => setLiveOpen((v) => !v)}
          label={error ? "Hors ligne" : "Live"}
          leading={
            <>
              {liveIndicator}
              <Activity size={11} className="shrink-0 opacity-70" aria-hidden />
            </>
          }
        />

        <AccordionPanel open={liveOpen}>
          <SectionLabel>Communauté</SectionLabel>
          <dl className="space-y-1.5">
            {COMMUNITY_ROWS.map(({ key, label }) => (
              <div key={key} className="flex items-baseline justify-between gap-3">
                <dt className="text-[11px] text-white/50">{label}</dt>
                <dd className="text-[13px] font-medium text-[var(--dofus-green-active)]">
                  <AnimatedValue value={stats ? stats[key] : null} />
                </dd>
              </div>
            ))}
          </dl>

          {game ? (
            <>
              <div className="my-3 border-t border-white/[0.06]" />
              <AccordionTrigger
                open={gameOpen}
                onToggle={() => setGameOpen((v) => !v)}
                label="Données Dofus 3"
                nested
              />
              <AccordionPanel open={gameOpen} nested>
                <dl className="space-y-1.5 pl-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11px] text-white/50">Version Dofus 3</dt>
                    <dd className="text-[12px] font-medium text-[#f0d78c]">{game.game_version}</dd>
                  </div>
                  {dataUpdatedLabel ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-[11px] text-white/50">Màj données</dt>
                      <dd className="text-[12px] font-medium text-[#f0d78c]">{dataUpdatedLabel}</dd>
                    </div>
                  ) : null}
                </dl>
              </AccordionPanel>
            </>
          ) : null}
        </AccordionPanel>
      </Plaque>
    </aside>
  );
}
