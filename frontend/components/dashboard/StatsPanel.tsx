"use client";

import { useMemo, useState } from "react";

import { STAT_GROUPS } from "@/lib/statLabels";
import { useBuildStore } from "@/store/build-store";

const BASE_PA          = 6;
const BASE_PM          = 3;
const BASE_PROSPECTING = 100;

// Stats investissables manuellement (groupe Primaires)
const INVESTABLE_KEYS = new Set([
  "vitality", "wisdom", "strength", "chance", "agility", "intelligence",
]);

const ELEMENTAL_KEYS = new Set(["strength", "chance", "agility", "intelligence"]);

function getPointCost(statKey: string, nextValue: number) {
  if (statKey === "vitality") return 1;
  if (statKey === "wisdom") return 3;
  if (ELEMENTAL_KEYS.has(statKey)) {
    if (nextValue <= 100) return 1;
    if (nextValue <= 200) return 2;
    if (nextValue <= 300) return 3;
    return 4;
  }
  return 1;
}

function getInvestCost(statKey: string, invested: number) {
  let total = 0;
  for (let i = 1; i <= invested; i += 1) {
    total += getPointCost(statKey, i);
  }
  return total;
}

function getMaxAffordableInvest(statKey: string, current: number, availablePoints: number) {
  let target = current;
  let remaining = availablePoints;
  while (remaining >= getPointCost(statKey, target + 1)) {
    target += 1;
    remaining -= getPointCost(statKey, target);
  }
  return target;
}

function applyCharacterInvestments(baseStats: Record<string, number>, charStats: Record<string, number>) {
  const result = { ...baseStats };
  for (const [key, value] of Object.entries(charStats)) {
    if (value > 0) {
      result[key] = (result[key] ?? 0) + value;
    }
  }

  const totalElementalStats = (result.strength ?? 0)
    + (result.chance ?? 0)
    + (result.agility ?? 0)
    + (result.intelligence ?? 0);
  const stuffInitiativeBonus = baseStats.initiative ?? 0;
  result.initiative = stuffInitiativeBonus + totalElementalStats;

  return result;
}

/* ── Ligne stat standard (2 colonnes) ─────────────────────────────────────── */
function StatRow({ statKey, label, icon, value }: {
  statKey: string;
  label: string;
  icon: string;
  value: number;
}) {
  const zero = value === 0;
  return (
    <div
      className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${zero ? "opacity-40" : "bg-[#231e18]"}`}
      title={statKey}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/assets/elements/${icon}.png`} alt="" width={14} height={14}
        className="h-[14px] w-[14px] shrink-0 object-contain" />
      <span className="min-w-0 flex-1 truncate text-[11px] text-[#a89878]">{label}</span>
      <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${
        value > 0 ? "text-[#f0d78c]" : value < 0 ? "text-red-400" : "text-[#5a5248]"
      }`}>{value}</span>
    </div>
  );
}

/* ── Ligne stat investissable (3 colonnes) ────────────────────────────────── */
function InvestableRow({ statKey, label, icon, equipValue, invested, availablePoints, onInvest }: {
  statKey: string;
  label: string;
  icon: string;
  equipValue: number;   // valeur venant des équipements + bases
  invested: number;     // points investis manuellement
  availablePoints: number;
  onInvest: (v: number) => void;
}) {
  const total = equipValue + invested;

  return (
    <div className="flex items-center gap-1 rounded bg-[#231e18] px-1.5 py-0.5" title={statKey}>
      {/* Icône + label */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/assets/elements/${icon}.png`} alt="" width={14} height={14}
        className="h-[14px] w-[14px] shrink-0 object-contain" />
      <span className="min-w-0 w-[68px] shrink-0 truncate text-[11px] text-[#a89878]">{label}</span>

      {/* Input points investis */}
      <input
        type="number"
        min={0}
        max={getMaxAffordableInvest(statKey, invested, availablePoints)}
        value={invested === 0 ? "" : invested}
        placeholder="0"
        onChange={(e) => {
          const v = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
          const maxAllowed = getMaxAffordableInvest(statKey, invested, availablePoints);
          onInvest(Math.min(v, maxAllowed));
        }}
        className="w-14 rounded border border-[#5c4a32] bg-[#14120f] px-1 py-0 text-center text-[11px] text-[#e8c96e] outline-none focus:border-[#c9a227] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      {/* Total */}
      <span className={`ml-auto shrink-0 text-[11px] font-semibold tabular-nums ${
        total > 0 ? "text-[#f0d78c]" : "text-[#5a5248]"
      }`}>{total}</span>
    </div>
  );
}

/* ── Groupe pliable ───────────────────────────────────────────────────────── */
function StatGroup({
  title,
  stats,
  displayStats,
  charStats,
  availablePoints,
  onInvest,
  defaultOpen = true,
}: {
  title: string;
  stats: { key: string; label: string; icon: string }[];
  displayStats: Record<string, number>;
  charStats: Record<string, number>;
  availablePoints: number;
  onInvest: (key: string, value: number) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasPrimaries = stats.some((s) => INVESTABLE_KEYS.has(s.key));

  return (
    <div className="rounded-xl border border-[#6b5428]/60 bg-[#1a1510]/95 shadow-inner overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-2.5 py-1.5 hover:bg-[#231e18]/60 transition"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#c9a227]">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {hasPrimaries && open && (
            <span className={`text-[10px] font-medium tabular-nums ${
              availablePoints > 0 ? "text-emerald-400" : "text-[#6a5c48]"
            }`}>
              {availablePoints} pts dispo
            </span>
          )}
          <span className="text-[10px] text-[#6a5c48]">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className={`flex flex-col gap-0.5 px-2 pb-2 ${hasPrimaries ? "" : "grid grid-cols-2 gap-x-1"}`}
          style={hasPrimaries ? {} : { display: "grid" }}>
          {hasPrimaries ? (
            // Header colonnes pour les stats investissables
            <>
              <div className="mb-0.5 grid grid-cols-[14px_68px_1fr_auto] items-center gap-1 px-1.5 text-[9px] uppercase tracking-wide text-[#5a5248]">
                <span />
                <span>Carac.</span>
                <span className="text-center">Points</span>
                <span className="text-right">Total</span>
              </div>
              {stats.map(({ key, label, icon }) => (
                <InvestableRow
                  key={key}
                  statKey={key}
                  label={label}
                  icon={icon}
                  equipValue={(displayStats[key] ?? 0) - (charStats[key] ?? 0)}
                  invested={charStats[key] ?? 0}
                  availablePoints={availablePoints}
                  onInvest={(v) => onInvest(key, v)}
                />
              ))}
            </>
          ) : (
            stats.map(({ key, label, icon }) => (
              <StatRow key={key} statKey={key} label={label} icon={icon}
                value={displayStats[key] ?? 0} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Panel principal ──────────────────────────────────────────────────────── */
export function StatsPanel() {
  const rawStats    = useBuildStore((s) => s.stats);
  const level       = useBuildStore((s) => s.level);
  const charStats   = useBuildStore((s) => s.charStats);
  const setCharStat = useBuildStore((s) => s.setCharStat);
  const currentBuild = useBuildStore((s) => s.currentBuild);
  const itemById     = useBuildStore((s) => s.itemById);

  const stuffLevel = useMemo(() => {
    const levels = Object.values(currentBuild)
      .filter((id): id is number => id != null)
      .map((id) => itemById[id]?.level ?? 0);
    return levels.length ? Math.max(...levels) : 0;
  }, [currentBuild, itemById]);

  // Stats équipement + bases
  const baseStats = useMemo(() => {
    const basePA   = BASE_PA + (level >= 100 ? 1 : 0);
    const basePV   = 50 + level * 5;
    const basePods = 1000 + level * 5;
    const result   = { ...rawStats };
    if (!result.pa)          result.pa          = basePA;
    if (!result.pm)          result.pm          = BASE_PM;
    if (!result.vitality)    result.vitality    = basePV;
    if (!result.prospecting) result.prospecting = BASE_PROSPECTING;
    if (!result.pods)        result.pods        = basePods;
    return result;
  }, [rawStats, level]);
  const stats = useMemo(
    () => applyCharacterInvestments(baseStats, charStats),
    [baseStats, charStats],
  );

  // Points totaux disponibles vs utilisés (premiers points gagnés au niveau 2)
  const totalPoints = Math.max(0, (level - 1) * 5);
  const usedPoints  = useMemo(
    () => Object.entries(charStats).reduce((sum, [key, value]) => sum + getInvestCost(key, value), 0),
    [charStats],
  );
  const availablePoints = totalPoints - usedPoints;

  return (
    <aside className="flex flex-col gap-2">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between rounded-lg border border-[#6b5428]/50 bg-[#1a1510]/95 px-3 py-1.5">
        <span className="font-serif text-sm font-semibold text-[#f0d78c]">
          Caractéristiques
        </span>
        <div className="flex items-center gap-2">
          {stuffLevel > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[#a89878]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/elements/lvl.png" alt="" width={13} height={13}
                className="h-[13px] w-[13px] object-contain" />
              {stuffLevel}
            </span>
          )}
          {level >= 100 && (
            <span className="rounded-full bg-[#c9a227]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#c9a227]">
              +1 PA niv.100
            </span>
          )}
        </div>
      </div>

      {/* ── PA / PM hors groupe ── */}
      <div className="grid grid-cols-2 gap-x-1 rounded-xl border border-[#6b5428]/60 bg-[#1a1510]/95 px-2 py-1.5 shadow-inner">
        {[
          { key: "pa", label: "PA", icon: "pa" },
          { key: "pm", label: "PM", icon: "pm" },
        ].map(({ key, label, icon }) => (
          <StatRow key={key} statKey={key} label={label} icon={icon} value={stats[key] ?? 0} />
        ))}
      </div>

      {/* ── Groupes ── */}
      {STAT_GROUPS.map((group, i) => (
        <StatGroup
          key={group.title}
          title={group.title}
          stats={group.stats}
          displayStats={stats}
          charStats={charStats}
          availablePoints={availablePoints}
          onInvest={setCharStat}
          defaultOpen={i === 0}
        />
      ))}
    </aside>
  );
}
