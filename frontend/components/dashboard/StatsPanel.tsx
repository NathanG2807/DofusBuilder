"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import { STAT_GROUPS } from "@/lib/statLabels";
import { useDisplayStats } from "@/hooks/useDisplayStats";
import { useBuildStore } from "@/store/build-store";

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
      className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${zero ? "opacity-40" : "bg-[#1e1e1e]"}`}
      title={statKey}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/assets/elements/${icon}.png`} alt="" width={15} height={15}
        className="h-[15px] w-[15px] shrink-0 object-contain" />
      <span className="min-w-0 flex-1 truncate text-[11px] text-[#888888]">{label}</span>
      <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${
        value > 0 ? "text-[#f0d78c]" : value < 0 ? "text-red-400" : "text-[#444444]"
      }`}>{value}</span>
    </div>
  );
}

/* ── Ligne stat investissable (5 colonnes) ────────────────────────────────── */
function InvestableRow({ statKey, label, icon, equipValue, invested, availablePoints, onInvest, parcho, onParcho }: {
  statKey: string;
  label: string;
  icon: string;
  equipValue: number;
  invested: number;
  availablePoints: number;
  onInvest: (v: number) => void;
  parcho: number;
  onParcho: (v: number) => void;
}) {
  const total = equipValue + invested + parcho;

  return (
    <div className="grid grid-cols-[14px_1fr_48px_44px_36px] items-center gap-1 rounded bg-[#1e1e1e] px-1.5 py-0.5" title={statKey}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/assets/elements/${icon}.png`} alt="" width={15} height={15}
        className="h-[15px] w-[15px] shrink-0 object-contain" />
      <span className="min-w-0 truncate text-[11px] text-[#888888]">{label}</span>

      {/* Points investis */}
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
        className="w-full rounded border border-[#383838] bg-[#141414] px-1 py-0 text-center text-[11px] text-[var(--dofus-green-active)] outline-none focus:border-[var(--dofus-color-ref-end)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      {/* Parchotage */}
      <input
        type="number"
        min={0}
        max={100}
        value={parcho === 0 ? "" : parcho}
        placeholder="0"
        onChange={(e) => {
          const v = e.target.value === "" ? 0 : Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
          onParcho(v);
        }}
        className="w-full rounded border border-[#3a2a5a] bg-[#100a1a] px-1 py-0 text-center text-[11px] text-[#b07ce8] outline-none focus:border-[#7a4aaa] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <span className={`shrink-0 text-right text-[11px] font-semibold tabular-nums ${
        total > 0 ? "text-[#f0d78c]" : "text-[#444444]"
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
  parchoStats,
  availablePoints,
  onInvest,
  onParcho,
  onParchoAll,
  defaultOpen = true,
  readOnly = false,
}: {
  title: string;
  stats: { key: string; label: string; icon: string }[];
  displayStats: Record<string, number>;
  charStats: Record<string, number>;
  parchoStats: Record<string, number>;
  availablePoints: number;
  onInvest: (key: string, value: number) => void;
  onParcho: (key: string, value: number) => void;
  onParchoAll: () => void;
  defaultOpen?: boolean;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasPrimaries = stats.some((s) => INVESTABLE_KEYS.has(s.key));

  return (
    <div className="rounded-xl border border-[#282828] bg-[#181818]/95 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen((o) => !o); }}
        className="flex w-full cursor-pointer items-center justify-between px-2.5 py-1.5 hover:bg-[#1e1e1e]/60 transition"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {hasPrimaries && open && !readOnly && (
            <>
              <button
                type="button"
                title="Mettre tout le parchotage à 100"
                onClick={(e) => { e.stopPropagation(); onParchoAll(); }}
                className="rounded border border-[#3a2a5a] bg-[#100a1a] px-1.5 py-0.5 text-[9px] font-semibold text-[#b07ce8] transition hover:bg-[#1e1030] hover:border-[#7a4aaa]"
              >
                Parcho 100
              </button>
              <span className={`text-[10px] font-medium tabular-nums ${
                availablePoints > 0 ? "text-emerald-400" : "text-[#444444]"
              }`}>
                {availablePoints} pts dispo
              </span>
            </>
          )}
          <span className="text-[#444444]">{open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</span>
        </div>
      </div>

      {open && (
        <div className={`flex flex-col gap-0.5 px-2 pb-2 ${hasPrimaries ? "" : "grid grid-cols-2 gap-x-1"}`}
          style={hasPrimaries ? {} : { display: "grid" }}>
          {hasPrimaries && !readOnly ? (
            <>
              <div className="mb-0.5 grid grid-cols-[14px_1fr_48px_44px_36px] items-center gap-1 px-1.5 text-[9px] uppercase tracking-wide text-[#444444]">
                <span />
                <span>Carac.</span>
                <span className="text-center">Points</span>
                <span className="text-center text-[#7a4aaa]">Parcho</span>
                <span className="text-right">Total</span>
              </div>
              {stats.map(({ key, label, icon }) => (
                <InvestableRow
                  key={key}
                  statKey={key}
                  label={label}
                  icon={icon}
                  equipValue={(displayStats[key] ?? 0) - (charStats[key] ?? 0) - (parchoStats[key] ?? 0)}
                  invested={charStats[key] ?? 0}
                  availablePoints={availablePoints}
                  onInvest={(v) => onInvest(key, v)}
                  parcho={parchoStats[key] ?? 0}
                  onParcho={(v) => onParcho(key, v)}
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

/* ── Card Forgemagie ──────────────────────────────────────────────────────── */
function ForgemagieCard() {
  const exoFm       = useBuildStore((s) => s.exoFm);
  const currentBuild = useBuildStore((s) => s.currentBuild);
  const itemById    = useBuildStore((s) => s.itemById);
  const removeExoFm = useBuildStore((s) => s.removeExoFm);

  const entries = Object.entries(exoFm) as [import("@/lib/slots").SlotId, import("@/store/build-store").ExoType][];
  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#2a4a7a]/60 bg-[#080f1c]/95 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(74,144,217,0.08)]">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4a90d9]">
          ✦ Forgemagie
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {entries.map(([slotId, type]) => {
          const itemId = currentBuild[slotId];
          const item = itemId != null ? itemById[itemId] : undefined;
          return (
            <div key={slotId} className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-[#0d1a2e]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/assets/build/${type}.png`}
                alt={type.toUpperCase()}
                width={13}
                height={13}
                className="h-[13px] w-[13px] shrink-0 object-contain"
              />
              <span className="min-w-0 flex-1 truncate text-[11px] text-[#888888]">
                {item?.name ?? slotId}
              </span>
              <span className={`shrink-0 text-[11px] font-bold tabular-nums ${
                type === "pa" ? "text-[#4a90d9]" : "text-[var(--dofus-green-active)]"
              }`}>
                +1 {type.toUpperCase()}
              </span>
              <span
                role="button"
                tabIndex={0}
                title="Retirer l'exo"
                onClick={() => removeExoFm(slotId)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") removeExoFm(slotId); }}
                className="ml-1 cursor-pointer text-[10px] text-[#444444] hover:text-[#cc4444]"
              >
                ×
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Panel principal ──────────────────────────────────────────────────────── */
export function StatsPanel({ readOnly = false }: { readOnly?: boolean } = {}) {
  const stats            = useDisplayStats();
  const level            = useBuildStore((s) => s.level);
  const charStats        = useBuildStore((s) => s.charStats);
  const setCharStat      = useBuildStore((s) => s.setCharStat);
  const parchoStats      = useBuildStore((s) => s.parchoStats);
  const setParchoStat    = useBuildStore((s) => s.setParchoStat);
  const currentBuild     = useBuildStore((s) => s.currentBuild);
  const itemById         = useBuildStore((s) => s.itemById);
  const exoFm            = useBuildStore((s) => s.exoFm);

  const stuffLevel = useMemo(() => {
    const levels = Object.values(currentBuild)
      .filter((id): id is number => id != null)
      .map((id) => itemById[id]?.level ?? 0);
    return levels.length ? Math.max(...levels) : 0;
  }, [currentBuild, itemById]);

  const totalPoints = Math.max(0, (level - 1) * 5);
  const usedPoints  = useMemo(
    () => Object.entries(charStats).reduce((sum, [key, value]) => sum + getInvestCost(key, value), 0),
    [charStats],
  );
  const availablePoints = totalPoints - usedPoints;

  return (
    <aside className="flex flex-col gap-2">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between rounded-lg border border-[#282828] bg-[#181818]/95 px-3 py-1.5">
        <span className="flex items-center gap-2 font-serif text-sm font-semibold text-[#f0d78c]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/global/UI/characteristic.png" alt="" width={20} height={20} className="h-5 w-5 shrink-0 object-contain opacity-95" />
          Caractéristiques
        </span>
        <div className="flex items-center gap-2">
          {stuffLevel > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[#888888]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/elements/lvl.png" alt="" width={14} height={14}
                className="h-[14px] w-[14px] object-contain" />
              {stuffLevel}
            </span>
          )}
        </div>
      </div>

      {/* ── PA / PM hors groupe ── */}
      <div className="grid grid-cols-2 gap-x-1 rounded-xl border border-[#282828] bg-[#181818]/95 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        {[
          { key: "pa", label: "PA", icon: "pa" },
          { key: "pm", label: "PM", icon: "pm" },
        ].map(({ key, label, icon }) => (
          <StatRow key={key} statKey={key} label={label} icon={icon} value={stats[key] ?? 0} />
        ))}
      </div>

      {/* ── Carte Forgemagie (si exo FM présents) ── */}
      <ForgemagieCard />

      {/* ── Groupes ── */}
      {STAT_GROUPS.map((group, i) => (
        <StatGroup
          key={group.title}
          title={group.title}
          stats={group.stats}
          displayStats={stats}
          charStats={charStats}
          parchoStats={parchoStats}
          availablePoints={availablePoints}
          onInvest={setCharStat}
          onParcho={setParchoStat}
          onParchoAll={() => {
            for (const { key } of group.stats) {
              if (INVESTABLE_KEYS.has(key)) setParchoStat(key, 100);
            }
          }}
          defaultOpen={i === 0}
          readOnly={readOnly}
        />
      ))}
    </aside>
  );
}
