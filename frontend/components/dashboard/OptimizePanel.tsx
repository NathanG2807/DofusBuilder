"use client";

import { useState } from "react";

import { DOFUS_CLASS_OPTIONS } from "@/lib/dofusClasses";
import { runOptimize } from "@/lib/api";
import { useBuildStore } from "@/store/build-store";


/* ── Éléments avec icône ─────────────────────────────────────────────────── */
const ELEMENT_OPTIONS = [
  { id: "strength",     label: "Force",   icon: "ter" },
  { id: "intelligence", label: "Intel.",  icon: "feu" },
  { id: "chance",       label: "Chance",  icon: "eau" },
  { id: "agility",      label: "Agil.",   icon: "air" },
] as const;

/* ── Stats prioritaires avec icône ──────────────────────────────────────── */
const FOCUS_OPTIONS = [
  // Dommages élémentaires
  { key: "damage_earth",          label: "Do Terre",   icon: "dtf" },
  { key: "damage_fire",           label: "Do Feu",     icon: "dff" },
  { key: "damage_water",          label: "Do Eau",     icon: "def" },
  { key: "damage_air",            label: "Do Air",     icon: "daf" },
  { key: "damage_neutral",        label: "Do Neutre",  icon: "dnf" },
  { key: "critical_damage",       label: "Do Crit.",   icon: "dc"  },
  { key: "damage",                label: "Dommages",   icon: "dmg" },
  { key: "damage_spell_percent",  label: "% Sorts",    icon: "ds"  },
  { key: "damage_weapon_percent", label: "% Armes",    icon: "dw"  },
  // Caractéristiques élémentaires
  { key: "strength",     label: "Force",   icon: "ter" },
  { key: "intelligence", label: "Intel.",  icon: "feu" },
  { key: "chance",       label: "Chance",  icon: "eau" },
  { key: "agility",      label: "Agil.",   icon: "air" },
  // Caractéristiques
  { key: "critical_percent", label: "% CC",    icon: "cc"  },
  { key: "vitality",         label: "Vita.",   icon: "vi"  },
  { key: "wisdom",           label: "Sagesse", icon: "sa"  },
  { key: "power",            label: "Puiss.",  icon: "pu"  },
  { key: "heals",            label: "Soins",   icon: "so"  },
  { key: "pa",               label: "PA",      icon: "pa"  },
  { key: "pm",               label: "PM",      icon: "pm"  },
  { key: "range",            label: "Portée",  icon: "po"  },
  { key: "summons",          label: "Invoc.",  icon: "ic"  },
  { key: "prospecting",      label: "Prosp.",  icon: "pp"  },
  { key: "initiative",       label: "Init.",   icon: "ii"  },
] as const;

/* ── Stepper compact ─────────────────────────────────────────────────────── */
function Stepper({
  label,
  icon,
  value,
  min = 0,
  max = 99,
  onChange,
}: {
  label: string;
  icon: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-[#252525] bg-[#111111] px-2.5 py-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/assets/elements/${icon}.png`} alt={label} width={14} height={14}
        className="h-[14px] w-[14px] shrink-0 object-contain" />
      <span className="text-[11px] text-[#888888]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-5 w-5 items-center justify-center rounded text-[14px] font-bold leading-none text-[#888888] hover:bg-[#222222] hover:text-[#cccccc] disabled:opacity-30"
      >
        −
      </button>
      <span className="w-5 text-center text-[13px] font-semibold tabular-nums text-[#e0e0e0]">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-5 w-5 items-center justify-center rounded text-[14px] font-bold leading-none text-[#888888] hover:bg-[#222222] hover:text-[#cccccc] disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

/* ── Panel principal ─────────────────────────────────────────────────────── */
export function OptimizePanel({ bare = false }: { bare?: boolean }) {
  const applyFullBuild = useBuildStore((s) => s.applyFullBuild);
  const prefetchEquippedItems = useBuildStore((s) => s.prefetchEquippedItems);
  const resetBuild = useBuildStore((s) => s.resetBuild);
  const classId = useBuildStore((s) => s.classId);
  const setClassId = useBuildStore((s) => s.setClassId);
  const level = useBuildStore((s) => s.level);
  const setLevel = useBuildStore((s) => s.setLevel);
  const [elements, setElements] = useState<string[]>(["strength", "intelligence"]);
  const [minPa, setMinPa] = useState(11);
  const [minPm, setMinPm] = useState(6);
  const [allowExoPa, setAllowExoPa] = useState(false);
  const [allowExoPm, setAllowExoPm] = useState(false);
  const [focusKeys, setFocusKeys] = useState<string[]>(["damage_earth", "critical_percent"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleElement(id: string) {
    setElements((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleFocus(k: string) {
    setFocusKeys((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (elements.length === 0) { setError("Choisis au moins un élément."); return; }
    if (focusKeys.length === 0) { setError("Choisis au moins une stat prioritaire."); return; }
    setLoading(true);
    try {
      const fb = await runOptimize({
        level, class_id: classId, elements,
        min_pa: minPa, min_pm: minPm,
        allow_exo_pa: allowExoPa, allow_exo_pm: allowExoPm,
        focus_stats: focusKeys, mode: "solver",
      });
      applyFullBuild(fb);
      await prefetchEquippedItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const inner = (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">

      {/* ── Classe + Niveau ── */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#666666]">Classe</span>
          <select
            value={classId}
            onChange={(e) => setClassId(Number(e.target.value))}
            className="rounded-lg border border-[#383838] bg-[#111111] px-2 py-1.5 text-xs text-[#e0e0e0] focus:border-[#4a4a4a] focus:outline-none"
          >
            {DOFUS_CLASS_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#666666]">Niveau</span>
          <input
            type="number"
            min={1}
            max={200}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="rounded-lg border border-[#383838] bg-[#111111] px-2 py-1.5 text-xs text-[#e0e0e0] focus:border-[#4a4a4a] focus:outline-none"
          />
        </div>
      </div>

      {/* ── Éléments ── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#666666]">
          Éléments principaux
        </span>
        <div className="flex flex-wrap gap-1.5">
          {ELEMENT_OPTIONS.map((o) => {
            const active = elements.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggleElement(o.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition ${
                  active
                    ? "border-[var(--dofus-ui-olive-border-70)] bg-[var(--dofus-ui-select-bg)] text-[var(--dofus-green-active)]"
                    : "border-[#303030] bg-[#181818] text-[#888888] hover:border-[#404040] hover:text-[#cccccc]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/assets/elements/${o.icon}.png`} alt="" width={14} height={14}
                  className="h-[14px] w-[14px] shrink-0 object-contain" />
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── PA / PM ── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#666666]">
          Contraintes min.
        </span>
        <div className="flex gap-2">
          <Stepper label="PA" icon="pa" value={minPa} min={1} max={20} onChange={setMinPa} />
          <Stepper label="PM" icon="pm" value={minPm} min={0} max={12} onChange={setMinPm} />
        </div>

        {/* Exo FM */}
        <div className="flex gap-2">
          {/* Exo PA */}
          <button
            type="button"
            onClick={() => setAllowExoPa((v) => !v)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
              allowExoPa
                ? "border-[#2a5090]/80 bg-[#061225] text-[#4a90d9]"
                : "border-[#252525] bg-[#111111] text-[#666666] hover:border-[#383838] hover:text-[#aaaaaa]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/build/pa.png" alt="" width={12} height={12} className="h-[12px] w-[12px] object-contain" />
            Exo PA
            <span className={`ml-auto text-[9px] ${allowExoPa ? "text-[#4a90d9]" : "text-[#3a3a3a]"}`}>
              {allowExoPa ? "✓" : "○"}
            </span>
          </button>

          {/* Exo PM */}
          <button
            type="button"
            onClick={() => setAllowExoPm((v) => !v)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
              allowExoPm
                ? "border-[var(--dofus-ui-exo-pm-border)] bg-[var(--dofus-ui-exo-pm-bg)] text-[var(--dofus-green-active)]"
                : "border-[#252525] bg-[#111111] text-[#666666] hover:border-[#383838] hover:text-[#aaaaaa]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/build/pm.png" alt="" width={12} height={12} className="h-[12px] w-[12px] object-contain" />
            Exo PM
            <span className={`ml-auto text-[9px] ${allowExoPm ? "text-[var(--dofus-green-active)]" : "text-[#3a3a3a]"}`}>
              {allowExoPm ? "✓" : "○"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Stats prioritaires ── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#666666]">
          Stats prioritaires
        </span>
        <div className="flex flex-wrap gap-1">
          {FOCUS_OPTIONS.map((o) => {
            const active = focusKeys.includes(o.key);
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => toggleFocus(o.key)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
                  active
                    ? "border-[var(--dofus-ui-olive-border-70)] bg-[var(--dofus-ui-select-bg)] text-[var(--dofus-green-active)]"
                    : "border-[#252525] bg-[#111111] text-[#777777] hover:border-[#383838] hover:text-[#bbbbbb]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/assets/elements/${o.icon}.png`} alt="" width={12} height={12}
                  className="h-[12px] w-[12px] shrink-0 object-contain" />
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Erreur ── */}
      {error && (
        <p className="rounded border border-red-900/60 bg-red-950/40 px-2 py-1.5 text-[11px] text-red-200">
          {error}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-2 border-t border-[#1e1e1e] pt-3">
        <button
          type="submit"
          disabled={loading}
          className="btn-dofus-green flex-1 rounded-lg px-3 py-2 text-[12px]"
        >
          {loading ? "Calcul en cours…" : "⚡ Lancer l'optimisation"}
        </button>
        <button
          type="button"
          onClick={() => { resetBuild(); setError(null); }}
          className="btn-dofus-gray rounded-lg px-3 py-2 text-[12px]"
        >
          Vider
        </button>
      </div>
    </form>
  );

  if (bare) return <div className="h-full overflow-y-auto">{inner}</div>;

  return (
    <section className="dofus-panel rounded-xl border border-[#2e2e2e] bg-[#181818]/95 p-4">
      <h2 className="mb-3 font-serif text-lg font-semibold tracking-wide text-[#f0d78c]">
        Optimisation automatique
      </h2>
      {inner}
    </section>
  );
}
