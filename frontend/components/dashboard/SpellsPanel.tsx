"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { useBuildStore } from "@/store/build-store";
import { CLASS_TO_SPELL_TYPE_ID } from "@/lib/dofusClasses";

/* ══════════════════════════════════════════════════════════════════════════════
   Types
══════════════════════════════════════════════════════════════════════════════ */
interface SpellData {
  id: number;
  order: number;
  img: string;
  name: { fr: string };
  description: { fr: string };
}

interface SpellEffect {
  effectId: number;
  effectElement: number;
  value: number;
  diceNum: number;
  diceSide: number;
  duration: number;
  visibleInTooltip: boolean;
}

interface SpellLevelData {
  id: number;
  grade: number;
  apCost: number;
  minRange: number;
  range: number;
  criticalHitProbability: number;
  maxCastPerTurn: number;
  minPlayerLevel: number;
  rangeCanBeBoosted: boolean;
  castInLine: boolean;
  castInDiagonal: boolean;
  castTestLos: boolean;
  effects: SpellEffect[];
  criticalEffect: SpellEffect[];
}

/* ══════════════════════════════════════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════════════════════════════════════ */
const ELEMENT_ICONS: Record<number, { icon: string; label: string }> = {
  1: { icon: "ter", label: "Terre" },
  2: { icon: "feu", label: "Feu"   },
  3: { icon: "eau", label: "Eau"   },
  4: { icon: "air", label: "Air"   },
};

/** Mapping partiel effectId → libellé affiché. */
const EFFECT_LABELS: Record<number, string> = {
  4:   "Soins",
  5:   "Repousse",
  78:  "Attire",
  81:  "Renvoie les dommages",
  91:  "Vol de vie Neutre",
  92:  "Vol de vie Terre",
  93:  "Vol de vie Feu",
  94:  "Vol de vie Eau",
  95:  "Vol de vie Air",
  96:  "Dommages Neutre",
  97:  "Dommages Terre",
  98:  "Dommages Feu",
  99:  "Dommages",
  100: "Vol de vie",
  101: "Soins",
  105: "Malus de PV",
  108: "Soins",
  110: "PA octroyés",
  111: "PA retirés (non esquivables)",
  112: "PA retirés",
  116: "PM octroyés",
  117: "PM retirés (non esquivables)",
  118: "PM retirés",
  120: "Portée ajoutée",
  121: "Portée retirée",
  123: "Téléportation",
  125: "Invocation",
  126: "Force ajoutée",
  127: "Force retirée",
  131: "Vitalité ajoutée",
  132: "Vitalité retirée",
  136: "Agilité ajoutée",
  137: "Agilité retirée",
  138: "Intelligence ajoutée",
  139: "Intelligence retirée",
  141: "Chance ajoutée",
  142: "Chance retirée",
  143: "Sagesse ajoutée",
  144: "Sagesse retirée",
  145: "Érosion",
  147: "Dommages ajoutés",
  150: "Initiative ajoutée",
  152: "Puissance ajoutée",
  153: "Puissance retirée",
  154: "Critique ajouté",
  158: "Invocation",
  163: "Invisibilité",
  168: "Esquive PA ajoutée",
  169: "Esquive PA retirée",
  171: "Tacle ajouté",
  184: "% CC ajouté",
  186: "Do. Poussée ajoutés",
  188: "Do. Critiques ajoutés",
  215: "Glyphe",
  281: "Bouclier",
  293: "Soins (% PV cible)",
  406: "État appliqué",
  951: "État spécial",
  1160: "État",
};

function getEffectLabel(eff: SpellEffect): string {
  const base = EFFECT_LABELS[eff.effectId] ?? `Effet #${eff.effectId}`;
  if ((eff.effectId === 99 || eff.effectId === 100) && ELEMENT_ICONS[eff.effectElement]) {
    return `${base} ${ELEMENT_ICONS[eff.effectElement].label}`;
  }
  return base;
}

function formatEffectValue(eff: SpellEffect): string {
  const { diceNum, diceSide, value } = eff;
  if (diceNum > 0 && diceSide > 0 && diceNum !== diceSide) return `${diceNum} à ${diceSide}`;
  if (diceNum > 0) return `${diceNum}`;
  if (diceSide > 0) return `${diceSide}`;
  if (value > 0 && value < 9000) return `${value}`;
  return "";
}

const DESC_ELEMENT_PATTERNS = [
  { word: "Terre", icon: "ter", label: "Terre" },
  { word: "Feu",   icon: "feu", label: "Feu"   },
  { word: "Eau",   icon: "eau", label: "Eau"   },
  { word: "Air",   icon: "air", label: "Air"   },
];

function detectDescElements(desc: string) {
  if (desc.includes("meilleur élément")) return DESC_ELEMENT_PATTERNS;
  return DESC_ELEMENT_PATTERNS.filter(({ word }) => desc.includes(word));
}

/* ══════════════════════════════════════════════════════════════════════════════
   Sous-composants de la tooltip
══════════════════════════════════════════════════════════════════════════════ */
function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-0.5 text-[11px] text-[#aaaaaa]">
      {children}
    </span>
  );
}

function SpellEffectRow({ eff }: { eff: SpellEffect }) {
  const label = getEffectLabel(eff);
  const val   = formatEffectValue(eff);
  const el    = ELEMENT_ICONS[eff.effectElement];

  return (
    <li className="flex items-center gap-1.5 text-[11px]">
      <span className="shrink-0 text-[#9cce38]">•</span>
      {el && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/assets/elements/${el.icon}.png`}
          alt={el.label}
          width={12}
          height={12}
          className="h-[12px] w-[12px] shrink-0 object-contain"
        />
      )}
      <span className="flex-1 text-[#c0c0c0]">{label}</span>
      {val && (
        <span className="shrink-0 font-semibold tabular-nums text-[#f0e0a0]">
          {val}
        </span>
      )}
      {eff.duration > 0 && (
        <span className="shrink-0 text-[10px] text-[#666666]">
          {eff.duration}t
        </span>
      )}
    </li>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Tooltip de sort avec spell-levels
══════════════════════════════════════════════════════════════════════════════ */
function SpellTooltip({
  spell,
  anchor,
  onMouseEnter,
  onMouseLeave,
}: {
  spell: SpellData;
  anchor: { x: number; y: number };
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999, visible: false });

  const [levels, setLevels]           = useState<SpellLevelData[]>([]);
  const [loadingLvl, setLoadingLvl]   = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(1);

  /* Fetch des niveaux du sort */
  useEffect(() => {
    setLoadingLvl(true);
    setLevels([]);
    setSelectedGrade(1);
    fetch(
      `https://api.dofusdb.fr/spell-levels?$skip=0&spellId=${spell.id}&$sort=grade&lang=fr`,
    )
      .then((r) => r.json())
      .then((data) => setLevels(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingLvl(false));
  }, [spell.id]);

  /* Repositionnement après chargement ou changement de grade */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const W      = 340;
    const MARGIN = 8;
    const OFFSET = 14;
    const cardH  = el.scrollHeight;
    const vw     = window.innerWidth;
    const vh     = window.innerHeight;

    let left = anchor.x + OFFSET;
    if (left + W + MARGIN > vw) left = anchor.x - W - OFFSET;
    left = Math.max(MARGIN, left);

    let top = anchor.y + OFFSET;
    if (top + cardH + MARGIN > vh) {
      const above = anchor.y - cardH - OFFSET;
      top = above >= MARGIN ? above : Math.max(MARGIN, vh - cardH - MARGIN);
    }
    setPos({ top, left, visible: true });
  }, [anchor.x, anchor.y, spell.id, levels, selectedGrade]);

  if (typeof document === "undefined") return null;

  const currentLevel =
    levels.find((l) => l.grade === selectedGrade) ?? levels[0] ?? null;
  const visibleEffects =
    currentLevel?.effects.filter((e) => e.visibleInTooltip) ?? [];
  const visibleCritEffects =
    currentLevel?.criticalEffect.filter((e) => e.visibleInTooltip) ?? [];
  const elements = detectDescElements(spell.description.fr);

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="fixed z-[300] w-[340px] rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.75)]"
      style={{
        top: pos.top,
        left: pos.left,
        visibility: pos.visible ? "visible" : "hidden",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* ── En-tête : icône + nom + sélecteur de grade ─────────────────── */}
      <div className="flex items-start gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={spell.img}
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-lg border border-[#383838] bg-black/40 object-contain"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold leading-tight text-[#f0e0a0]">
              {spell.name.fr}
            </p>

            {/* Sélecteur de grade */}
            {levels.length > 1 && (
              <div className="flex shrink-0 gap-0.5">
                {levels.map((l) => (
                  <button
                    key={l.grade}
                    type="button"
                    onClick={() => setSelectedGrade(l.grade)}
                    className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold transition ${
                      selectedGrade === l.grade
                        ? "border border-[#4a8000]/60 bg-[#1a2c0a] text-[#9cce38]"
                        : "border border-[#282828] bg-[#222222] text-[#555555] hover:text-[#aaaaaa]"
                    }`}
                  >
                    {l.grade}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Icônes élémentaires détectées */}
          {elements.length > 0 && (
            <div className="mt-1 flex gap-1.5">
              {elements.map((el) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={el.icon}
                  src={`/assets/elements/${el.icon}.png`}
                  alt={el.label}
                  title={el.label}
                  width={13}
                  height={13}
                  className="h-[13px] w-[13px] object-contain"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────────────────── */}
      <p className="mt-2 whitespace-pre-line text-[11px] leading-snug text-[#777777]">
        {spell.description.fr}
      </p>

      {loadingLvl && (
        <p className="mt-2 text-[10px] text-[#444444]">Chargement…</p>
      )}

      {currentLevel && (
        <>
          {/* ── Stats du niveau ─────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-[#252525] pt-2">
            <StatChip>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/elements/pa.png"
                alt="PA"
                width={11}
                height={11}
                className="h-[11px] w-[11px] object-contain"
              />
              {currentLevel.apCost} PA
            </StatChip>

            <StatChip>
              Portée&nbsp;
              {currentLevel.minRange > 0
                ? `${currentLevel.minRange}–${currentLevel.range}`
                : currentLevel.range}
              {currentLevel.rangeCanBeBoosted && " ↑"}
            </StatChip>

            {currentLevel.criticalHitProbability > 0 && (
              <StatChip>CC {currentLevel.criticalHitProbability}%</StatChip>
            )}

            {currentLevel.maxCastPerTurn > 0 && (
              <StatChip>{currentLevel.maxCastPerTurn}×/tour</StatChip>
            )}

            {currentLevel.minPlayerLevel > 1 && (
              <StatChip>Niv. {currentLevel.minPlayerLevel}</StatChip>
            )}

            {currentLevel.castInLine && <StatChip>Ligne</StatChip>}
            {currentLevel.castInDiagonal && <StatChip>Diagonale</StatChip>}
            {currentLevel.castTestLos && <StatChip>Ligne de vue</StatChip>}
          </div>

          {/* ── Effets normaux ──────────────────────────────────────────── */}
          {visibleEffects.length > 0 && (
            <div className="mt-2 border-t border-[#252525] pt-1.5">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-[#555555]">
                Effets
              </p>
              <ul className="space-y-0.5">
                {visibleEffects.map((eff, i) => (
                  <SpellEffectRow key={i} eff={eff} />
                ))}
              </ul>
            </div>
          )}

          {/* ── Effets critique ─────────────────────────────────────────── */}
          {visibleCritEffects.length > 0 && (
            <div className="mt-1.5 border-t border-[#f0c060]/15 pt-1.5">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-[#c09040]/80">
                ⚡ Coup Critique
              </p>
              <ul className="space-y-0.5">
                {visibleCritEffects.map((eff, i) => (
                  <SpellEffectRow key={i} eff={eff} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Panel principal
══════════════════════════════════════════════════════════════════════════════ */
export function SpellsPanel() {
  const classId = useBuildStore((s) => s.classId);

  const [spells, setSpells]   = useState<SpellData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [hover, setHover]     = useState<{
    spell: SpellData;
    x: number;
    y: number;
  } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Fetch des sorts (avec pagination complète) à chaque changement de classe */
  useEffect(() => {
    const typeId = CLASS_TO_SPELL_TYPE_ID[classId] ?? classId;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSpells([]);

    const PAGE = 50;

    async function fetchAll() {
      // Première page
      const first = await fetch(
        `https://api.dofusdb.fr/spells?lang=fr&typeId=${typeId}&$limit=${PAGE}&$skip=0`,
      );
      if (!first.ok) throw new Error(`Erreur HTTP ${first.status}`);
      const firstData = await first.json();
      const total: number = firstData.total ?? 0;
      const collected: SpellData[] = [...(firstData.data ?? [])];

      // Pages supplémentaires si nécessaire
      if (total > PAGE) {
        const extraFetches: Promise<SpellData[]>[] = [];
        for (let skip = PAGE; skip < total; skip += PAGE) {
          extraFetches.push(
            fetch(
              `https://api.dofusdb.fr/spells?lang=fr&typeId=${typeId}&$limit=${PAGE}&$skip=${skip}`,
            )
              .then((r) => r.json())
              .then((d) => (d.data ?? []) as SpellData[]),
          );
        }
        const batches = await Promise.all(extraFetches);
        for (const batch of batches) collected.push(...batch);
      }

      return collected;
    }

    fetchAll()
      .then((all) => {
        if (cancelled) return;
        const sorted = all.sort((a, b) => a.order - b.order);
        setSpells(sorted);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [classId]);

  const clearClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearClose();
    closeTimer.current = setTimeout(() => setHover(null), 200);
  }, [clearClose]);

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#181818]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_24px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between border-b border-[#222222] px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888888]">
          Sorts de classe
        </p>
        {loading && (
          <span className="text-[10px] text-[#555555]">Chargement…</span>
        )}
      </div>

      {error ? (
        <p className="p-4 text-[12px] text-red-400/90">{error}</p>
      ) : spells.length === 0 && !loading ? (
        <p className="p-4 text-[12px] text-[#444444]">Aucun sort trouvé.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 p-3">
          {spells.map((spell) => (
            <button
              key={spell.id}
              type="button"
              title={spell.name.fr}
              className="relative h-11 w-11 overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#141414] transition hover:border-[#4a8000]/70 hover:brightness-110 focus:outline-none focus:ring-1 focus:ring-[#4a8000]/50"
              onMouseEnter={(e) => {
                clearClose();
                setHover({ spell, x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                if (hover?.spell.id === spell.id) {
                  setHover((h) =>
                    h ? { ...h, x: e.clientX, y: e.clientY } : null,
                  );
                }
              }}
              onMouseLeave={scheduleHide}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={spell.img}
                alt={spell.name.fr}
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {hover && (
        <SpellTooltip
          spell={hover.spell}
          anchor={{ x: hover.x, y: hover.y }}
          onMouseEnter={clearClose}
          onMouseLeave={scheduleHide}
        />
      )}
    </section>
  );
}
