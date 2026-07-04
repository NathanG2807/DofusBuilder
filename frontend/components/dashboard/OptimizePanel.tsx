"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
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
  const lockedSlots = useBuildStore((s) => s.lockedSlots);
  const currentBuild = useBuildStore((s) => s.currentBuild);
  const [elements, setElements] = useState<string[]>(["strength", "intelligence"]);
  const [minPa, setMinPa] = useState(11);
  const [minPm, setMinPm] = useState(6);
  const [allowExoPa, setAllowExoPa] = useState(false);
  const [allowExoPm, setAllowExoPm] = useState(false);
  const [allowDofus, setAllowDofus] = useState(false);
  const [allowPrysmaradite, setAllowPrysmaradite] = useState(false);
  const [focusKeys, setFocusKeys] = useState<string[]>(["damage_earth", "critical_percent"]);
  const [customPriorities, setCustomPriorities] = useState(false);
  const [statWeights, setStatWeights] = useState<Record<string, number>>({});
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

  function setWeight(key: string, value: number) {
    setStatWeights((prev) => ({ ...prev, [key]: value }));
  }

  function getWeight(key: string): number {
    return statWeights[key] ?? 5;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (elements.length === 0) { setError("Choisis au moins un élément."); return; }
    if (focusKeys.length === 0) { setError("Choisis au moins une stat prioritaire."); return; }
    setLoading(true);
    try {
      // Si les priorités custom sont activées, on construit le dict stat_weights
      // pour toutes les stats sélectionnées (éléments + focus).
      const resolvedWeights: Record<string, number> | undefined = customPriorities
        ? Object.fromEntries(
            [...elements, ...focusKeys].map((k) => [k, getWeight(k)]),
          )
        : undefined;

      // Construit la map des slots verrouillés à transmettre au solver
      const lockedSlotsMap: Record<string, number> = {};
      for (const slot of lockedSlots) {
        const id = currentBuild[slot];
        if (id != null) lockedSlotsMap[slot] = id;
      }

      const fb = await runOptimize({
        level, class_id: classId, elements,
        min_pa: minPa, min_pm: minPm,
        allow_exo_pa: allowExoPa, allow_exo_pm: allowExoPm,
        allow_dofus: allowDofus, allow_prysmaradite: allowPrysmaradite,
        focus_stats: focusKeys, mode: "solver",
        ...(resolvedWeights ? { stat_weights: resolvedWeights } : {}),
        ...(Object.keys(lockedSlotsMap).length > 0 ? { locked_slots: lockedSlotsMap } : {}),
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
              <Chip
                key={o.id}
                active={active}
                accentColor="var(--dofus-green-active)"
                onClick={() => toggleElement(o.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/assets/elements/${o.icon}.png`} alt="" width={14} height={14}
                  className="h-[14px] w-[14px] shrink-0 object-contain" />
                {o.label}
              </Chip>
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
          <Chip
            active={allowExoPa}
            accentColor="#4a90d9"
            onClick={() => setAllowExoPa((v) => !v)}
            className="flex-1 justify-center py-1.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/build/pa.png" alt="" width={12} height={12} className="h-[12px] w-[12px] object-contain" />
            Exo PA
            <span className={`ml-auto text-[9px] ${allowExoPa ? "text-[#4a90d9]" : "text-[#3a3a3a]"}`}>
              {allowExoPa ? "✓" : "○"}
            </span>
          </Chip>

          {/* Exo PM */}
          <Chip
            active={allowExoPm}
            accentColor="var(--dofus-green-active)"
            onClick={() => setAllowExoPm((v) => !v)}
            className="flex-1 justify-center py-1.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/build/pm.png" alt="" width={12} height={12} className="h-[12px] w-[12px] object-contain" />
            Exo PM
            <span className={`ml-auto text-[9px] ${allowExoPm ? "text-[var(--dofus-green-active)]" : "text-[#3a3a3a]"}`}>
              {allowExoPm ? "✓" : "○"}
            </span>
          </Chip>
        </div>

        {/* Dofus / Prysmaradites */}
        <div className="flex gap-2">
          <Chip
            active={allowDofus}
            accentColor="#e8c96e"
            onClick={() => setAllowDofus((v) => !v)}
            className="flex-1 justify-center py-1.5"
          >
            Dofus
            <span className={`ml-auto text-[9px] ${allowDofus ? "text-[#e8c96e]" : "text-[#3a3a3a]"}`}>
              {allowDofus ? "✓" : "○"}
            </span>
          </Chip>
          <Chip
            active={allowPrysmaradite}
            accentColor="#c8a0e8"
            onClick={() => setAllowPrysmaradite((v) => !v)}
            className="flex-1 justify-center py-1.5"
          >
            Prysmaradite
            <span className={`ml-auto text-[9px] ${allowPrysmaradite ? "text-[#c8a0e8]" : "text-[#3a3a3a]"}`}>
              {allowPrysmaradite ? "✓" : "○"}
            </span>
          </Chip>
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
              <Chip
                key={o.key}
                active={active}
                accentColor="var(--dofus-green-active)"
                onClick={() => toggleFocus(o.key)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/assets/elements/${o.icon}.png`} alt="" width={12} height={12}
                  className="h-[12px] w-[12px] shrink-0 object-contain" />
                {o.label}
              </Chip>
            );
          })}
        </div>
      </div>

      {/* ── Modifier les priorités ── */}
      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-center gap-2 select-none">
          <div
            role="checkbox"
            aria-checked={customPriorities}
            tabIndex={0}
            onClick={() => setCustomPriorities((v) => !v)}
            onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setCustomPriorities((v) => !v)}
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
              customPriorities
                ? "border-[var(--dofus-ui-olive-border-70)] bg-[var(--dofus-ui-select-bg)] text-[var(--dofus-green-active)]"
                : "border-[#383838] bg-[#111111] text-transparent"
            }`}
          >
            <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-current" aria-hidden>
              <path d="M1.5 5l2.5 2.5 4.5-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[11px] font-medium text-[#aaaaaa]">Modifier les priorités</span>
        </label>

        {customPriorities && (
          <div className="mt-1 flex flex-col gap-2 rounded-lg border border-[#2a2a2a] bg-[#0e0e0e] px-3 py-2.5">
            <p className="text-[10px] text-[#555555]">
              Glisse le curseur pour ajuster le poids de chaque stat dans le calcul. Défaut : 5.
            </p>

            {/* Éléments sélectionnés */}
            {elements.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#444444]">Éléments</span>
                {elements.map((eid) => {
                  const opt = ELEMENT_OPTIONS.find((o) => o.id === eid);
                  if (!opt) return null;
                  const w = getWeight(eid);
                  return (
                    <div key={eid} className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/assets/elements/${opt.icon}.png`} alt="" width={12} height={12} className="h-[12px] w-[12px] shrink-0 object-contain" />
                      <span className="w-[52px] text-[11px] text-[#cccccc]">{opt.label}</span>
                      <input
                        type="range" min={1} max={10} step={1} value={w}
                        onChange={(e) => setWeight(eid, Number(e.target.value))}
                        className="flex-1 accent-[var(--dofus-green-active)]"
                      />
                      <span className="w-4 text-right text-[11px] font-bold tabular-nums text-[var(--dofus-green-active)]">{w}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats focus sélectionnées */}
            {focusKeys.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#444444]">Stats prioritaires</span>
                {focusKeys.map((fk) => {
                  const opt = FOCUS_OPTIONS.find((o) => o.key === fk);
                  if (!opt) return null;
                  const w = getWeight(fk);
                  return (
                    <div key={fk} className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/assets/elements/${opt.icon}.png`} alt="" width={12} height={12} className="h-[12px] w-[12px] shrink-0 object-contain" />
                      <span className="w-[52px] text-[11px] text-[#cccccc]">{opt.label}</span>
                      <input
                        type="range" min={1} max={10} step={1} value={w}
                        onChange={(e) => setWeight(fk, Number(e.target.value))}
                        className="flex-1 accent-[var(--dofus-green-active)]"
                      />
                      <span className="w-4 text-right text-[11px] font-bold tabular-nums text-[var(--dofus-green-active)]">{w}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Items verrouillés ── */}
      {lockedSlots.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-[#3a2e00] bg-[#1a1400]/80 px-2.5 py-2">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#c8a030]">
            <svg xmlns="http://www.w3.org/2000/svg" width={10} height={10} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {lockedSlots.length} item{lockedSlots.length > 1 ? "s" : ""} verrouillé{lockedSlots.length > 1 ? "s" : ""} — conservé{lockedSlots.length > 1 ? "s" : ""} par l'optimiseur
          </span>
          <p className="text-[9px] text-[#666666]">
            Pour les modifier, déverrouillez-les dans l'inventaire (icône cadenas).
          </p>
        </div>
      )}

      {/* ── Erreur ── */}
      {error && (
        <p className="rounded border border-red-900/60 bg-red-950/40 px-2 py-1.5 text-[11px] text-red-200">
          {error}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-2 border-t border-[#1e1e1e] pt-3">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Calcul en cours…" : "⚡ Lancer l'optimisation"}
        </Button>
        <Button type="button" variant="outline" onClick={() => { resetBuild(); setError(null); }}>
          Vider
        </Button>
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
