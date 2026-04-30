"use client";

import { useState } from "react";

import { DOFUS_CLASS_OPTIONS } from "@/lib/dofusClasses";
import { OPTIMIZE_FOCUS_OPTIONS } from "@/lib/statLabels";
import { runOptimize } from "@/lib/api";
import { useBuildStore } from "@/store/build-store";

const ELEMENT_OPTIONS = [
  { id: "strength", label: "Force" },
  { id: "intelligence", label: "Intelligence" },
  { id: "chance", label: "Chance" },
  { id: "agility", label: "Agilité" },
] as const;

export function OptimizePanel({ bare = false }: { bare?: boolean }) {
  const applyFullBuild = useBuildStore((s) => s.applyFullBuild);
  const prefetchEquippedItems = useBuildStore((s) => s.prefetchEquippedItems);
  const resetBuild = useBuildStore((s) => s.resetBuild);
  const classId = useBuildStore((s) => s.classId);
  const setClassId = useBuildStore((s) => s.setClassId);

  const [level, setLevel] = useState(200);
  const [elements, setElements] = useState<string[]>([
    "strength",
    "intelligence",
  ]);
  const [minPa, setMinPa] = useState(11);
  const [minPm, setMinPm] = useState(6);
  const [focusKeys, setFocusKeys] = useState<string[]>([
    "damage_earth",
    "critical_percent",
  ]);
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
    if (elements.length === 0) {
      setError("Choisis au moins un élément principal.");
      return;
    }
    if (focusKeys.length === 0) {
      setError("Choisis au moins une priorité de stats.");
      return;
    }
    setLoading(true);
    try {
      const fb = await runOptimize({
        level,
        class_id: classId,
        elements,
        min_pa: minPa,
        min_pm: minPm,
        focus_stats: focusKeys,
        mode: "solver",
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
    <form onSubmit={onSubmit} className="flex flex-col gap-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-[#b8a88c]">
            Niveau max
            <input
              type="number"
              min={1}
              max={200}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="rounded-lg border border-[#5c4a32] bg-[#120e0a] px-2 py-1.5 text-[#f5e6c8]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[#b8a88c]">
            Classe
            <select
              value={classId}
              onChange={(e) => setClassId(Number(e.target.value))}
              className="rounded-lg border border-[#5c4a32] bg-[#120e0a] px-2 py-1.5 text-[#f5e6c8]"
            >
              {DOFUS_CLASS_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <span className="mb-1 block text-[#b8a88c]">Éléments principaux</span>
          <div className="flex flex-wrap gap-2">
            {ELEMENT_OPTIONS.map((o) => (
              <label
                key={o.id}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3d3428] bg-[#120e0a] px-2 py-1 text-[#e8dcc8] has-[:checked]:border-[#c9a227]/70 has-[:checked]:bg-[#2a2218]"
              >
                <input
                  type="checkbox"
                  checked={elements.includes(o.id)}
                  onChange={() => toggleElement(o.id)}
                  className="rounded border-[#5c4a32]"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-[#b8a88c]">
            PA minimum
            <input
              type="number"
              min={1}
              value={minPa}
              onChange={(e) => setMinPa(Number(e.target.value))}
              className="rounded-lg border border-[#5c4a32] bg-[#120e0a] px-2 py-1.5 text-[#f5e6c8]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[#b8a88c]">
            PM minimum
            <input
              type="number"
              min={0}
              value={minPm}
              onChange={(e) => setMinPm(Number(e.target.value))}
              className="rounded-lg border border-[#5c4a32] bg-[#120e0a] px-2 py-1.5 text-[#f5e6c8]"
            />
          </label>
        </div>

        <div>
          <span className="mb-1 block text-[#b8a88c]">
            Stats à privilégier (plusieurs choix possibles)
          </span>
          <div className="flex flex-wrap gap-2">
            {OPTIMIZE_FOCUS_OPTIONS.map((o) => (
              <label
                key={o.key}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3d3428] bg-[#120e0a] px-2 py-1 text-xs text-[#e8dcc8] has-[:checked]:border-[#c9a227]/70 has-[:checked]:bg-[#2a2218]"
              >
                <input
                  type="checkbox"
                  checked={focusKeys.includes(o.key)}
                  onChange={() => toggleFocus(o.key)}
                  className="rounded border-[#5c4a32]"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-2 py-1.5 text-xs text-red-200">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-to-b from-[#e8b84a] to-[#b8891c] px-4 py-2 font-medium text-[#1a1208] shadow hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Calcul en cours…" : "Lancer l’optimisation"}
          </button>
          <button
            type="button"
            onClick={() => {
              resetBuild();
              setError(null);
            }}
            className="rounded-lg border border-[#5c4a32] px-4 py-2 text-[#e8dcc8] hover:bg-[#2a2218]"
          >
            Vider le stuff
          </button>
        </div>
    </form>
  );

  if (bare) return inner;
  return (
    <section className="dofus-panel rounded-xl border-2 border-[#6b5428]/90 bg-[#1a1510]/95 p-4 shadow-inner">
      <h2 className="mb-1 font-serif text-lg font-semibold tracking-wide text-[#f0d78c]">
        Optimisation automatique
      </h2>
      <p className="mb-3 text-[12px] text-[#a89878]">
        Le moteur cherche le meilleur ensemble d&apos;objets selon tes critères.
      </p>
      {inner}
    </section>
  );
}
