"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

import { useDisplayStats } from "@/hooks/useDisplayStats";
import { useBuildStore } from "@/store/build-store";
import { CLASS_TO_BREED_ID, CLASS_TO_SPELL_TYPE_ID } from "@/lib/dofusClasses";

import {
  ALWAYS_HIDDEN_EFFECT_IDS,
  DESC_ELEMENT_PATTERNS,
  DAMAGE_ELEMENT_INFO,
  ELEMENT_ICONS,
  MAX_DISPLAY_VALUE,
  computeEffectDamage,
  detectDescElements,
  formatEffectValue,
  gEffectCache,
  gEffectPending,
  getEffectLabel,
  loadEffectInfo,
  parseApiEffectLabel,
  resolveEffectElementIcon,
  spellUsesBestElement,
  type SpellEffect,
  type SpellLevelData,
} from "@/lib/spellEffects";

/* ══════════════════════════════════════════════════════════════════════════════
   Types
══════════════════════════════════════════════════════════════════════════════ */
interface SpellFullData {
  id: number;
  order: number;
  img: string;
  name: { fr: string };
  description: { fr: string };
  typeId: number; // 8 = sort de base, 598 = variante
}

interface SpellVariantGroup {
  id: number;
  breedId: number;
  spellIds: number[];
  spells: SpellFullData[];
}

/* ── Alias local pour compat (SpellsPanel utilise resolveEffectElement) ───── */
function resolveEffectElement(eff: SpellEffect): { icon: string; label: string } | undefined {
  return resolveEffectElementIcon(eff);
}

/* ══════════════════════════════════════════════════════════════════════════════
   Helpers variants
══════════════════════════════════════════════════════════════════════════════ */
function pickBase(spells: SpellFullData[], classId: number): SpellFullData {
  const baseTypeId = CLASS_TO_SPELL_TYPE_ID[classId];
  return spells.find((s) => s.typeId === baseTypeId) ?? spells[0];
}

function pickVariant(spells: SpellFullData[], classId: number): SpellFullData {
  const baseTypeId = CLASS_TO_SPELL_TYPE_ID[classId];
  return spells.find((s) => s.typeId !== baseTypeId) ?? spells[1] ?? spells[0];
}

/* ══════════════════════════════════════════════════════════════════════════════
   Sous-composants partagés
══════════════════════════════════════════════════════════════════════════════ */
function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-0.5 text-[11px] text-[#aaaaaa]">
      {children}
    </span>
  );
}

function SpellEffectRow({
  eff,
  stats,
  isCrit,
  useBestElement,
}: {
  eff: SpellEffect;
  stats: Record<string, number>;
  /** True si l'effet provient de la liste critique (ajoute Dommages Critiques flat). */
  isCrit: boolean;
  /** True si le sort utilise la mécanique « meilleur élément » → carac dynamique. */
  useBestElement: boolean;
}) {
  const label = getEffectLabel(eff);
  const val   = formatEffectValue(eff);
  // Dégâts calculés avec le build courant (null pour les effets non-scalables).
  const calc  = computeEffectDamage(eff, stats, { isCrit, useBestElement });
  // L'élément affiché en icône suit le calcul (utile pour « meilleur élément »).
  const elIdx = calc?.element ?? eff.effectElement;
  const cacheInfo = gEffectCache.get(eff.effectId);
  const el =
    cacheInfo?.isElemental && elIdx >= 1 && elIdx <= 4
      ? ELEMENT_ICONS[elIdx]
      : undefined;
  const colorClass = calc ? DAMAGE_ELEMENT_INFO[calc.element]?.colorClass ?? "" : "";

  return (
    <li className="flex items-center gap-1.5 text-[11px]">
      <span className="shrink-0 text-[var(--dofus-green-active)]">•</span>
      {el && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/assets/elements/${el.icon}.png`}
          alt={el.label}
          width={13}
          height={13}
          className="h-[13px] w-[13px] shrink-0 object-contain"
        />
      )}
      <span className="flex-1 text-[#c0c0c0]">{label}</span>
      {val && (
        <span className="shrink-0 font-semibold tabular-nums text-[#f0e0a0]">
          {val}
        </span>
      )}
      {calc && (
        <span
          className={`shrink-0 font-semibold tabular-nums ${colorClass}`}
          title={
            isCrit
              ? "Dégâts réels en CC (build courant)"
              : "Dégâts réels (build courant)"
          }
        >
          ({calc.min === calc.max ? calc.min : `${calc.min}-${calc.max}`})
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
   SpellCardBody — corps réutilisable d'une carte de sort (avec fetch levels)
══════════════════════════════════════════════════════════════════════════════ */
function SpellCardBody({
  spell,
  label,
  isVariant,
}: {
  spell: SpellFullData;
  label?: string;
  isVariant?: boolean;
}) {
  /* Stats du build courant — l'affichage des dégâts calculés se met à jour
   * automatiquement quand on équipe / déséquipe un item ou modifie le niveau. */
  const stats = useDisplayStats();

  const [levels, setLevels]               = useState<SpellLevelData[]>([]);
  const [loadingLvl, setLoadingLvl]       = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(1);
  /** Incrémenté après que les labels d'effets inconnus ont été chargés → force un re-render. */
  const [effectVer, setEffectVer]         = useState(0);

  /* Fetch des niveaux du sort */
  useEffect(() => {
    setLoadingLvl(true);
    setLevels([]);
    setSelectedGrade(1);
    fetch(
      `https://api.dofusdb.fr/spell-levels?$skip=0&spellId=${spell.id}&$sort[grade]=1&lang=fr`,
    )
      .then((r) => r.json())
      .then((d) => setLevels(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingLvl(false));
  }, [spell.id]);

  /* Charge lazily les labels d'effets inconnus depuis l'API */
  useEffect(() => {
    if (levels.length === 0) return;

    const unknownIds = new Set<number>();
    for (const lvl of levels) {
      for (const eff of [...lvl.effects, ...lvl.criticalEffect]) {
        if (!gEffectCache.has(eff.effectId)) unknownIds.add(eff.effectId);
      }
    }
    if (unknownIds.size === 0) return;

    let cancelled = false;
    Promise.all([...unknownIds].map(loadEffectInfo)).then(() => {
      if (!cancelled) setEffectVer((v) => v + 1);
    });
    return () => { cancelled = true; };
  }, [levels]);

  const currentLevel       = levels.find((l) => l.grade === selectedGrade) ?? levels[0] ?? null;
  const isDisplayable = (e: SpellEffect) =>
    e.visibleInTooltip && !ALWAYS_HIDDEN_EFFECT_IDS.has(e.effectId);

  const visibleEffects     = currentLevel?.effects.filter(isDisplayable) ?? [];
  const visibleCritEffects = currentLevel?.criticalEffect.filter(isDisplayable) ?? [];
  const elements           = detectDescElements(spell.description.fr);
  const useBestElement     = spellUsesBestElement(spell.description.fr);

  return (
    <>
      {label && (
        <p
          className={`mb-1.5 text-[9px] font-semibold uppercase tracking-widest ${
            isVariant ? "text-[#7060a0]" : "text-[#555555]"
          }`}
        >
          {label}
        </p>
      )}

      {/* ── En-tête : icône + nom + sélecteur de grade ─────────────────── */}
      <div className="flex items-start gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={spell.img}
          alt=""
          width={44}
          height={44}
          className={`h-11 w-11 shrink-0 rounded-lg border bg-black/40 object-contain ${
            isVariant ? "border-[#5a4080]" : "border-[#383838]"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold leading-tight text-[#f0e0a0]">
              {spell.name.fr}
            </p>

            {levels.length > 1 && (
              <div className="flex shrink-0 gap-0.5">
                {levels.map((l) => (
                  <button
                    key={l.grade}
                    type="button"
                    onClick={() => setSelectedGrade(l.grade)}
                    className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold transition ${
                      selectedGrade === l.grade
                        ? isVariant
                          ? "border border-[#5a4080]/60 bg-[#1a0e2a] text-[#b090e0]"
                          : "border border-[var(--dofus-ui-olive-border-60)] bg-[var(--dofus-ui-select-bg)] text-[var(--dofus-green-active)]"
                        : "border border-[#282828] bg-[#222222] text-[#555555] hover:text-[#aaaaaa]"
                    }`}
                  >
                    {l.grade}
                  </button>
                ))}
              </div>
            )}
          </div>

          {elements.length > 0 && (
            <div className="mt-1 flex gap-1.5">
              {elements.map((el) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={el.icon}
                  src={`/assets/elements/${el.icon}.png`}
                  alt={el.label}
                  title={el.label}
                  width={14}
                  height={14}
                  className="h-[14px] w-[14px] object-contain"
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
                width={12}
                height={12}
                className="h-[12px] w-[12px] object-contain"
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
              {/* effectVer utilisé comme key pour forcer le re-render après chargement des labels */}
              <ul key={effectVer} className="space-y-0.5">
                {visibleEffects.map((eff, i) => (
                  <SpellEffectRow
                    key={i}
                    eff={eff}
                    stats={stats}
                    isCrit={false}
                    useBestElement={useBestElement}
                  />
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
              <ul key={effectVer} className="space-y-0.5">
                {visibleCritEffects.map((eff, i) => (
                  <SpellEffectRow
                    key={i}
                    eff={eff}
                    stats={stats}
                    isCrit
                    useBestElement={useBestElement}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SpellCompareTooltip — sort de base + variante côte à côte
══════════════════════════════════════════════════════════════════════════════ */
function SpellCompareTooltip({
  group,
  classId,
  anchor,
  onMouseEnter,
  onMouseLeave,
}: {
  group: SpellVariantGroup;
  classId: number;
  anchor: { x: number; y: number };
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999, visible: false });

  const baseSpell    = pickBase(group.spells, classId);
  const variantSpell = pickVariant(group.spells, classId);

  const CARD_W = 680;
  const MARGIN = 8;
  const OFFSET = 14;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cardH = el.scrollHeight;
    const vw    = window.innerWidth;
    const vh    = window.innerHeight;
    const w     = Math.min(CARD_W, vw - MARGIN * 2);

    // Toujours à droite du curseur, jamais vers la gauche (ne recouvre pas la grille de sorts)
    let left = anchor.x + OFFSET;
    if (left + w + MARGIN > vw) left = vw - w - MARGIN;
    left = Math.max(MARGIN, left);

    let top = anchor.y + OFFSET;
    if (top + cardH + MARGIN > vh) {
      const above = anchor.y - cardH - OFFSET;
      top = above >= MARGIN ? above : Math.max(MARGIN, vh - cardH - MARGIN);
    }
    setPos({ top, left, visible: true });
  }, [anchor.x, anchor.y, group.id, CARD_W, MARGIN, OFFSET]);

  if (typeof document === "undefined") return null;

  const cardW = typeof window !== "undefined"
    ? Math.min(CARD_W, window.innerWidth - MARGIN * 2)
    : CARD_W;

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="fixed z-[300] rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.75)]"
      style={{
        top: pos.top,
        left: pos.left,
        width: cardW,
        visibility: pos.visible ? "visible" : "hidden",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex gap-2">
        {/* ── Sort de base — gauche ──────────────────────────────────── */}
        <div className="min-w-0 flex-1 rounded-lg border border-[#2a2a2a] bg-[#141414] p-2">
          <SpellCardBody spell={baseSpell} label="Sort de base" />
        </div>

        {/* ── Séparateur ────────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-1">
          <div className="w-px flex-1 bg-[#2a2a2a]" />
          <span className="shrink-0 text-[10px] font-bold text-[#444444]">vs</span>
          <div className="w-px flex-1 bg-[#2a2a2a]" />
        </div>

        {/* ── Variante — droite ──────────────────────────────────────── */}
        <div className="min-w-0 flex-1 rounded-lg border border-[#5a4080]/40 bg-[#120e1a] p-2">
          <SpellCardBody spell={variantSpell} label="Variante" isVariant />
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Panel principal
══════════════════════════════════════════════════════════════════════════════ */

/** Taille des icônes affichées dans la grille (px). */
const ICON_SIZE = 48;

export function SpellsPanel({ classId: classIdProp }: { classId?: number } = {}) {
  const storeClassId = useBuildStore((s) => s.classId);
  const classId = classIdProp ?? storeClassId;

  const [groups, setGroups]             = useState<SpellVariantGroup[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [hover, setHover]               = useState<{
    group: SpellVariantGroup;
    x: number;
    y: number;
  } | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Fetch des variants à chaque changement de classe */
  useEffect(() => {
    const breedId = CLASS_TO_BREED_ID[classId] ?? classId;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setGroups([]);
    setSelectedGroupId(null);

    fetch(`https://api.dofusdb.fr/spell-variants?$limit=50&breedId=${breedId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Erreur HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        const data: SpellVariantGroup[] = d.data ?? [];
        data.sort((a, b) => {
          const aBase = pickBase(a.spells, classId);
          const bBase = pickBase(b.spells, classId);
          return (aBase?.order ?? 0) - (bBase?.order ?? 0);
        });
        setGroups(data);
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

  const handleGroupClick = useCallback((groupId: number) => {
    setSelectedGroupId((prev) => (prev === groupId ? null : groupId));
  }, []);

  const hasSelection = selectedGroupId !== null;

  /* Le tooltip suit toujours le curseur ; le "lock" est purement visuel */

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#181818]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_24px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between border-b border-[#222222] px-4 py-2.5">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#888888]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/global/UI/spells.png" alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 object-contain opacity-90" />
          Sorts de classe
        </p>
        {loading && (
          <span className="text-[10px] text-[#555555]">Chargement…</span>
        )}
        {hasSelection && (
          <button
            type="button"
            onClick={() => setSelectedGroupId(null)}
            className="flex items-center gap-1 text-[10px] text-[#555555] hover:text-[#888888] transition"
          >
            <X size={10} /> Déverrouiller
          </button>
        )}
      </div>

      {error ? (
        <p className="p-4 text-[12px] text-red-400/90">{error}</p>
      ) : groups.length === 0 && !loading ? (
        <p className="p-4 text-[12px] text-[#444444]">Aucun sort trouvé.</p>
      ) : (
        <div
          className="grid p-3"
          style={{
            gridTemplateColumns: `repeat(11, ${ICON_SIZE}px)`,
            gap: "4px",
            justifyContent: "center",
          }}
        >
          {groups.map((group) => {
            const baseSpell    = pickBase(group.spells, classId);
            const variantSpell = pickVariant(group.spells, classId);
            const isHovered    = hover?.group.id === group.id;
            const isSelected   = selectedGroupId === group.id;
            const isDimmed     = hasSelection && !isSelected;

            return (
              <div
                key={group.id}
                role="button"
                tabIndex={0}
                className={`flex flex-col gap-[3px] cursor-pointer rounded transition-opacity duration-150 ${
                  isDimmed ? "opacity-25" : "opacity-100"
                }`}
                onMouseEnter={(e) => {
                  clearClose();
                  setHover({ group, x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  if (hover?.group.id === group.id) {
                    setHover((h) =>
                      h ? { ...h, x: e.clientX, y: e.clientY } : null,
                    );
                  }
                }}
                onMouseLeave={scheduleHide}
                onClick={() => handleGroupClick(group.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleGroupClick(group.id);
                }}
              >
                {/* ── Sort de base ──────────────────────────────────── */}
                <div
                  title={baseSpell?.name.fr}
                  className={`overflow-hidden rounded-lg border bg-[#141414] transition-[border-color,box-shadow] ${
                    isSelected
                      ? "border-[var(--dofus-ui-selected-border)] shadow-[0_0_0_2px_var(--dofus-ui-selected-glow)]"
                      : isHovered
                        ? "border-[var(--dofus-ui-olive-border-70)]"
                        : "border-[#2a2a2a]"
                  }`}
                  style={{ width: ICON_SIZE, height: ICON_SIZE }}
                >
                  {baseSpell && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={baseSpell.img}
                      alt={baseSpell.name.fr}
                      width={ICON_SIZE}
                      height={ICON_SIZE}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  )}
                </div>

                {/* ── Variante ──────────────────────────────────────── */}
                <div
                  title={variantSpell?.name.fr}
                  className={`relative overflow-hidden rounded-lg border bg-[#141414] transition-[border-color,box-shadow] ${
                    isSelected
                      ? "border-[#9070d0] shadow-[0_0_0_2px_rgba(144,112,208,0.35)]"
                      : isHovered
                        ? "border-[#5a4080]/70"
                        : "border-[#2a2a2a]"
                  }`}
                  style={{ width: ICON_SIZE, height: ICON_SIZE }}
                >
                  {variantSpell && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={variantSpell.img}
                      alt={variantSpell.name.fr}
                      width={ICON_SIZE}
                      height={ICON_SIZE}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  )}
                  {/* Badge V — variante */}
                  <span className="absolute bottom-0 right-0 rounded-tl bg-[#2a1a40]/80 px-[3px] py-[1px] text-[7px] font-bold leading-none text-[#b090e0]">
                    V
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hover && (
        <SpellCompareTooltip
          group={hover.group}
          classId={classId}
          anchor={{ x: hover.x, y: hover.y }}
          onMouseEnter={clearClose}
          onMouseLeave={scheduleHide}
        />
      )}
    </section>
  );
}
