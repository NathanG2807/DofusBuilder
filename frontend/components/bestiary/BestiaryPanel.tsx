"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ItemHoverCard, useItemHoverCard } from "@/components/items/ItemHoverCard";
import { Chip } from "@/components/ui/Chip";
import { resolveDropItemForHover } from "@/lib/dofusDbItemMapper";
import type { ItemOut } from "@/types/api";
import {
  ALWAYS_HIDDEN_EFFECT_IDS,
  DAMAGE_ELEMENT_INFO,
  ELEMENT_ICONS,
  computeEffectDamage,
  detectDescElements,
  formatEffectValue,
  gEffectCache,
  getEffectLabel,
  loadEffectInfo,
  resolveEffectElementIcon,
  spellUsesBestElement,
  fetchSpellLevels,
  type CombatStats,
  type SpellEffect,
  type SpellLevelData,
} from "@/lib/spellEffects";

import {
  collectDropObjectIds,
  enrichDungeonsWithBosses,
  fetchAllSubareas,
  fetchAllDungeons,
  fetchAreas,
  fetchDropItem,
  fetchDropItems,
  fetchMonster,
  fetchMonsterRace,
  fetchMonstersByIds,
  fetchMonstersBySubareas,
  fetchSpells,
  fetchSubareas,
  filterDungeons,
  monsterImgUrl,
  monsterGradeToCombatStats,
  searchMonsters,
  searchZones,
  DUNGEON_LEVEL_FILTERS,
  type AreaOut,
  type DropItemOut,
  type DungeonCardOut,
  type DungeonLevelRange,
  type DungeonOut,
  type MonsterBase,
  type MonsterDetail,
  type MonsterGrade,
  type MonsterRaceOut,
  type SpellOut,
  type SubareaOut,
  type ZoneSearchHit,
} from "@/lib/bestiaryApi";

/* ── Assets ─────────────────────────────────────────────────────────────── */
const ELEM_ASSETS = {
  pa:  { src: "/assets/build/pa.png",     color: "#4a90d9", label: "PA"           },
  pm:  { src: "/assets/build/pm.png",     color: "#98c030", label: "PM"           },
  lvl: { src: "/assets/elements/lvl.png", color: "#f0d78c", label: "Niveau"       },
  ter: { src: "/assets/elements/ter.png", color: "#c8843a", label: "Force"        },
  feu: { src: "/assets/elements/feu.png", color: "#e05838", label: "Intelligence" },
  eau: { src: "/assets/elements/eau.png", color: "#3a8fd9", label: "Chance"       },
  air: { src: "/assets/elements/air.png", color: "#98c030", label: "Agilité"      },
  sa:  { src: "/assets/elements/sa.png",  color: "#c8c0a8", label: "Sagesse"      },
  rn:  { src: "/assets/elements/rn.png",  color: "#c8c0a8", label: "Neutre" },
  rt:  { src: "/assets/elements/rt.png",  color: "#c8843a", label: "Terre"  },
  rf:  { src: "/assets/elements/rf.png",  color: "#e05838", label: "Feu"    },
  re:  { src: "/assets/elements/re.png",  color: "#3a8fd9", label: "Eau"    },
  ra:  { src: "/assets/elements/ra.png",  color: "#98c030", label: "Air"    },
} as const;
type AssetKey = keyof typeof ELEM_ASSETS;

const RESISTANCES: { key: keyof MonsterGrade; icon: AssetKey }[] = [
  { key: "neutralResistance", icon: "rn" },
  { key: "earthResistance",   icon: "rt" },
  { key: "fireResistance",    icon: "rf" },
  { key: "waterResistance",   icon: "re" },
  { key: "airResistance",     icon: "ra" },
];
const CHARACTERISTICS: { key: keyof MonsterGrade; icon: AssetKey }[] = [
  { key: "strength",     icon: "ter" },
  { key: "intelligence", icon: "feu" },
  { key: "chance",       icon: "eau" },
  { key: "agility",      icon: "air" },
  { key: "wisdom",       icon: "sa"  },
];

const TAG_COLORS: Record<string, string> = {
  earth:"#c8843a",fire:"#e05838",water:"#3a8fd9",air:"#98c030",neutral:"#c8c0a8",
  debuff:"#b06090",heal:"#6dbf67",summon:"#a080d0",retPA:"#f0d78c",retPM:"#f0d78c",
  shield:"#80d8f0",pushback:"#e0a060",teleport:"#80d8f0",dodge:"#98c030",
  boostMP:"#98c030",lifeSteal:"#6dbf67",pull:"#e0a060",
};
const TAG_LABELS: Record<string, string> = {
  earth:"Terre",fire:"Feu",water:"Eau",air:"Air",neutral:"Neutre",debuff:"Débuff",
  heal:"Soin",summon:"Invocation",retPA:"Retrait PA",retPM:"Retrait PM",
  shield:"Bouclier",pushback:"Poussée",teleport:"Téléport",dodge:"Dérobade",
  boostMP:"Boost PM",lifeSteal:"Vol de vie",pull:"Attraction",
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function resColor(v: number) { return v > 0 ? "#6dbf67" : v < 0 ? "#e05838" : "#3a3a3a"; }
function fmtRes(v: number)   { return v > 0 ? `+${v}%` : v < 0 ? `${v}%` : "0%"; }
function gradeNum(g: MonsterGrade, key: keyof MonsterGrade): number {
  return (g[key] as number) ?? 0;
}
function levelRange(grades: MonsterGrade[]) {
  const ls = grades.map((g) => g.level);
  const mn = Math.min(...ls), mx = Math.max(...ls);
  return mn === mx ? String(mn) : `${mn}–${mx}`;
}

/* ── Primitives UI ────────────────────────────────────────────────────────── */
function ElemIcon({ k, size = 16 }: { k: AssetKey; size?: number }) {
  const a = ELEM_ASSETS[k];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={a.src} alt={a.label} width={size} height={size}
      className="shrink-0 object-contain" style={{ width:size, height:size }} />
  );
}

function PvIcon({ size = 28 }: { size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width:size, height:size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/build/pv.png" alt="PV" width={size} height={size}
        className="absolute inset-0 h-full w-full object-contain" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/build/pvedge.png" alt="" width={size} height={size}
        className="absolute inset-0 h-full w-full object-contain" />
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5">
      {icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" width={14} height={14} className="h-[14px] w-[14px] shrink-0 object-contain opacity-70" />
      )}
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#454545]">{children}</p>
    </div>
  );
}

function MonsterBadge({ isBoss, isMiniBoss }: { isBoss: boolean; isMiniBoss: boolean }) {
  if (isBoss) return (
    <span className="rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wider"
      style={{ background:"rgba(220,50,50,0.15)",color:"#f87171",border:"1px solid rgba(220,50,50,0.25)" }}>Boss</span>
  );
  if (isMiniBoss) return (
    <span className="rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wider"
      style={{ background:"rgba(245,158,11,0.12)",color:"#fbbf24",border:"1px solid rgba(245,158,11,0.22)" }}>Archi</span>
  );
  return null;
}

/* ── Hover timer partagé ──────────────────────────────────────────────────── */
function useHoverDelay(delayMs = 180) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);
  const schedule = useCallback((fn: () => void) => {
    clear();
    timer.current = setTimeout(fn, delayMs);
  }, [clear, delayMs]);
  return { clear, schedule };
}

/* ── Sort détail — style SpellsPanel ─────────────────────────────────────── */
function SpellEffectRow({
  eff,
  stats,
  isCrit,
  useBestElement,
}: {
  eff: SpellEffect;
  stats: CombatStats;
  isCrit: boolean;
  useBestElement: boolean;
}) {
  const label = getEffectLabel(eff);
  const val   = formatEffectValue(eff);
  const calc  = computeEffectDamage(eff, stats, { isCrit, useBestElement });
  const elIdx = calc?.element ?? eff.effectElement;
  const cacheInfo = gEffectCache.get(eff.effectId);
  const el =
    cacheInfo?.isElemental && elIdx >= 1 && elIdx <= 4
      ? ELEMENT_ICONS[elIdx]
      : resolveEffectElementIcon(eff);
  const colorClass = calc ? DAMAGE_ELEMENT_INFO[calc.element]?.colorClass ?? "" : "";

  return (
    <li className="flex items-center gap-1.5 text-[11px]">
      <span className="shrink-0 text-[var(--dofus-green-active)] text-[8px]">◆</span>
      {el && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/assets/elements/${el.icon}.png`} alt={el.label} width={12} height={12}
          className="h-[12px] w-[12px] shrink-0 object-contain" />
      )}
      <span className="flex-1 text-[#9a9a9a]">{label}</span>
      {val && <span className="shrink-0 font-semibold tabular-nums text-[#f0e0a0]">{val}</span>}
      {calc && (
        <span
          className={`shrink-0 font-semibold tabular-nums ${colorClass}`}
          title={isCrit ? "Dégâts réels en CC (stats du monstre)" : "Dégâts réels (stats du monstre)"}
        >
          ({calc.min === calc.max ? calc.min : `${calc.min}-${calc.max}`})
        </span>
      )}
      {eff.duration > 0 && <span className="shrink-0 text-[9px] text-[#555]">{eff.duration}t</span>}
    </li>
  );
}

function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-0.5 rounded bg-[#1e1e1e] px-1.5 py-0.5 text-[10px] text-[#7a7a7a]">
      {children}
    </span>
  );
}

function SpellTooltipBody({ spell, combatStats }: { spell: SpellOut; combatStats: CombatStats }) {
  const [levels, setLevels]       = useState<SpellLevelData[]>([]);
  const [loading, setLoading]     = useState(true);
  const [grade, setGrade]         = useState(1);
  const [effectVer, setEffectVer] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLevels([]);
    fetchSpellLevels(spell.id)
      .then((data) => {
        if (cancelled) return;
        setLevels(data);
        setGrade(data[0]?.grade ?? 1);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [spell.id]);

  useEffect(() => {
    if (!levels.length) return;
    const unknownIds = new Set<number>();
    for (const lvl of levels) {
      for (const eff of [...lvl.effects, ...lvl.criticalEffect]) {
        if (!gEffectCache.has(eff.effectId)) unknownIds.add(eff.effectId);
      }
    }
    if (!unknownIds.size) return;
    let cancelled = false;
    void Promise.all([...unknownIds].map(loadEffectInfo)).then(() => {
      if (!cancelled) setEffectVer((v) => v + 1);
    });
    return () => { cancelled = true; };
  }, [levels]);

  const currentLevel = levels.find((l) => l.grade === grade) ?? levels[0] ?? null;
  const isVisible = (e: SpellEffect) => e.visibleInTooltip && !ALWAYS_HIDDEN_EFFECT_IDS.has(e.effectId);
  const visibleEffects = currentLevel?.effects.filter(isVisible) ?? [];
  const visibleCrit    = currentLevel?.criticalEffect.filter(isVisible) ?? [];
  const elements       = detectDescElements(spell.description?.fr ?? "");
  const useBestElement = spellUsesBestElement(spell.description?.fr ?? "");

  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={spell.img} alt={spell.name.fr} width={44} height={44}
          className="h-11 w-11 shrink-0 rounded-lg border border-[#383838] bg-black/40 object-contain"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.15"; }} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-[#f0e0a0]">{spell.name.fr}</p>
          {elements.length > 0 && (
            <div className="mt-1 flex gap-1">
              {elements.map((el) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={el.icon} src={`/assets/elements/${el.icon}.png`} alt={el.label}
                  width={14} height={14} className="h-[14px] w-[14px] object-contain" />
              ))}
            </div>
          )}
        </div>
      </div>

      {spell.description?.fr && (
        <p className="whitespace-pre-line text-[11px] leading-snug text-[#777]">{spell.description.fr}</p>
      )}

      {loading && <p className="text-[10px] text-[#444]">Chargement…</p>}

      {currentLevel && (
        <>
          {levels.length > 1 && (
            <div className="flex gap-1">
              {levels.map((l) => (
                <button key={l.grade} type="button" onClick={() => setGrade(l.grade)}
                  className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold transition ${
                    grade === l.grade
                      ? "border border-[var(--dofus-ui-olive-border-60)] bg-[var(--dofus-ui-select-bg)] text-[var(--dofus-green-active)]"
                      : "border border-[#282828] bg-[#222] text-[#555] hover:text-[#aaa]"
                  }`}>
                  {l.grade}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-[#252525] pt-2">
            <StatChip>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/elements/pa.png" alt="PA" width={12} height={12} className="h-[12px] w-[12px] object-contain" />
              {currentLevel.apCost} PA
            </StatChip>
            <StatChip>
              Portée&nbsp;{currentLevel.minRange > 0 ? `${currentLevel.minRange}–${currentLevel.range}` : currentLevel.range}
              {currentLevel.rangeCanBeBoosted && " ↑"}
            </StatChip>
            {currentLevel.criticalHitProbability > 0 && <StatChip>CC {currentLevel.criticalHitProbability}%</StatChip>}
            {currentLevel.maxCastPerTurn > 0 && <StatChip>{currentLevel.maxCastPerTurn}×/tour</StatChip>}
            {currentLevel.castInLine && <StatChip>Ligne</StatChip>}
            {currentLevel.castTestLos && <StatChip>LDV</StatChip>}
          </div>

          {visibleEffects.length > 0 && (
            <div className="border-t border-[#252525] pt-1.5">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-[#555]">Effets</p>
              <ul key={effectVer} className="space-y-0.5">
                {visibleEffects.map((eff, i) => (
                  <SpellEffectRow key={i} eff={eff} stats={combatStats} isCrit={false} useBestElement={useBestElement} />
                ))}
              </ul>
            </div>
          )}

          {visibleCrit.length > 0 && (
            <div className="border-t border-[#c09040]/15 pt-1.5">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-[#c09040]/80">⚡ Coup Critique</p>
              <ul key={effectVer} className="space-y-0.5">
                {visibleCrit.map((eff, i) => (
                  <SpellEffectRow key={i} eff={eff} stats={combatStats} isCrit useBestElement={useBestElement} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SpellHoverTooltip({
  spell,
  combatStats,
  anchor,
  onMouseEnter,
  onMouseLeave,
}: {
  spell: SpellOut;
  combatStats: CombatStats;
  anchor: { x: number; y: number };
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999, visible: false });
  const CARD_W = 320;
  const MARGIN = 8;
  const OFFSET = 14;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cardH = el.scrollHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(CARD_W, vw - MARGIN * 2);

    let left = anchor.x + OFFSET;
    if (left + w + MARGIN > vw) left = anchor.x - w - OFFSET;
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));

    let top = anchor.y + OFFSET;
    if (top + cardH + MARGIN > vh) {
      const above = anchor.y - cardH - OFFSET;
      top = above >= MARGIN ? above : Math.max(MARGIN, vh - cardH - MARGIN);
    }
    setPos({ top, left, visible: true });
  }, [anchor.x, anchor.y, spell.id]);

  if (typeof document === "undefined") return null;

  const cardW = Math.min(CARD_W, window.innerWidth - MARGIN * 2);

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="fixed z-[300] rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.75)]"
      style={{ top: pos.top, left: pos.left, width: cardW, visibility: pos.visible ? "visible" : "hidden" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <SpellTooltipBody spell={spell} combatStats={combatStats} />
    </div>,
    document.body,
  );
}

function SpellsSection({ spells, monsterGrade }: { spells: SpellOut[]; monsterGrade: MonsterGrade }) {
  const [hover, setHover] = useState<{ spell: SpellOut; x: number; y: number } | null>(null);
  const { clear, schedule } = useHoverDelay();
  const combatStats = monsterGradeToCombatStats(monsterGrade);

  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#181818]/95 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <SectionTitle icon="/assets/global/UI/spells.png">Sorts ({spells.length})</SectionTitle>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
        {spells.map((spell) => (
          <div
            key={spell.id}
            role="button"
            tabIndex={0}
            className="flex cursor-default flex-col items-center gap-1 rounded-lg border border-[#282828] bg-[#111] p-2 transition hover:border-[var(--dofus-ui-olive-border-70)] hover:bg-[#141414]"
            onMouseEnter={(e) => {
              clear();
              setHover({ spell, x: e.clientX, y: e.clientY });
            }}
            onMouseMove={(e) => {
              if (hover?.spell.id === spell.id) {
                setHover({ spell, x: e.clientX, y: e.clientY });
              }
            }}
            onMouseLeave={() => schedule(() => setHover(null))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setHover({ spell, x: (e.currentTarget as HTMLElement).getBoundingClientRect().right, y: (e.currentTarget as HTMLElement).getBoundingClientRect().top });
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spell.img} alt={spell.name.fr} width={40} height={40}
              className="h-10 w-10 object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.15"; }} />
            <p className="w-full truncate text-center text-[9px] text-[#888]">{spell.name.fr}</p>
          </div>
        ))}
      </div>
      {hover && (
        <SpellHoverTooltip
          spell={hover.spell}
          combatStats={combatStats}
          anchor={{ x: hover.x, y: hover.y }}
          onMouseEnter={clear}
          onMouseLeave={() => schedule(() => setHover(null))}
        />
      )}
    </div>
  );
}

function DropsSection({
  drops,
  itemMap,
  gradeIdx,
  accent,
  grades,
  onGradeChange,
}: {
  drops: { objectId: number; pct: number }[];
  itemMap: Record<number, DropItemOut>;
  gradeIdx: number;
  accent: string;
  grades: MonsterGrade[];
  onGradeChange: (idx: number) => void;
}) {
  const { hover, show, move, scheduleHide, cancelHide } = useItemHoverCard();
  const itemCache = useRef<Map<number, ItemOut>>(new Map());
  const [extraItems, setExtraItems] = useState<Record<number, DropItemOut>>({});

  const dropIdsKey = drops.map((d) => d.objectId).sort((a, b) => a - b).join(",");
  const resolvedMap = { ...itemMap, ...extraItems };

  useEffect(() => {
    setExtraItems({});
  }, [dropIdsKey]);

  useEffect(() => {
    const missing = drops
      .map((d) => d.objectId)
      .filter((id) => !itemMap[id]);
    if (!missing.length) return;

    let cancelled = false;
    void (async () => {
      for (const id of missing) {
        if (cancelled) return;
        const item = await fetchDropItem(id);
        if (item && !cancelled) {
          setExtraItems((prev) => (prev[id] ? prev : { ...prev, [id]: item }));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [drops, itemMap]);

  const handleHover = useCallback(async (objectId: number, e: React.MouseEvent) => {
    let item = itemCache.current.get(objectId);
    if (!item) {
      const resolved = await resolveDropItemForHover(objectId, resolvedMap[objectId]);
      if (!resolved) return;
      itemCache.current.set(objectId, resolved);
      item = resolved;
    }
    show(item, e);
  }, [show, resolvedMap]);

  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#181818]/95 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <SectionTitle icon="/assets/global/UI/iconsRef/kama.png">Butin ({drops.length})</SectionTitle>

      {grades.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {grades.slice(0, 5).map((g, i) => (
            <button key={g.grade} type="button" onClick={() => onGradeChange(i)}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-all ${
                gradeIdx === i ? "text-[#0a0a0a]" : "border border-[#282828] bg-[#111] text-[#505050] hover:text-[#888]"
              }`}
              style={gradeIdx === i ? { background:accent, border:`1px solid ${accent}` } : {}}>
              <ElemIcon k="lvl" size={10} />
              {g.level}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {drops.map(({ objectId, pct }) => {
          const drop = resolvedMap[objectId];
          return (
            <div
              key={objectId}
              role="button"
              tabIndex={0}
              className="relative flex cursor-default items-center gap-2 rounded-lg border border-[#252525] bg-[#111] px-2.5 py-2 transition hover:border-[#353535] hover:bg-[#141414]"
              onMouseEnter={(e) => void handleHover(objectId, e)}
              onMouseMove={move}
              onMouseLeave={scheduleHide}
            >
              {drop ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={drop.img} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded object-contain" />
              ) : (
                <div className="h-7 w-7 shrink-0 rounded bg-[#1a1a1a]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-[#c0b880]">{drop?.name.fr ?? `#${objectId}`}</p>
                <p className="text-[10px] font-semibold tabular-nums text-[#6db824]">{pct.toFixed(1)}%</p>
              </div>
            </div>
          );
        })}
      </div>

      {hover && (
        <ItemHoverCard
          item={hover.item}
          anchor={{ x: hover.x, y: hover.y }}
          preferSide="left"
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        />
      )}
    </div>
  );
}

/* ── Card monstre ─────────────────────────────────────────────────────────── */
function MonsterCard({ monster, onClick }: { monster: MonsterBase; onClick: () => void }) {
  const accent = monster.isBoss ? "#f87171" : monster.isMiniBoss ? "#fbbf24" : "#6db824";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ "--atelier-corner": `${accent}80` } as React.CSSProperties}
      className="plaque plaque-ornate plaque-interactive flex flex-col items-center gap-2.5 p-4 text-center"
    >
      <div className="relative flex h-[72px] w-[72px] items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={monsterImgUrl(monster)} alt={monster.name.fr} width={72} height={72}
          className="h-[72px] w-[72px] object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.1"; }} />
      </div>
      <div className="flex flex-col items-center gap-1 w-full min-w-0">
        <div className="flex flex-wrap items-center justify-center gap-1">
          <span className="text-[12px] font-semibold leading-tight text-[#d4c898]">{monster.name.fr}</span>
          <MonsterBadge isBoss={monster.isBoss} isMiniBoss={monster.isMiniBoss} />
        </div>
        <div className="flex items-center gap-1">
          <ElemIcon k="lvl" size={11} />
          <span className="text-[10px] text-[#505050]">{levelRange(monster.grades)}</span>
        </div>
      </div>
      {monster.tags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1">
          {monster.tags.slice(0, 2).map((t) => (
            <span key={t} className="rounded px-1.5 py-px text-[9px] font-medium"
              style={{ background:`${TAG_COLORS[t] ?? "#555"}20`,color:TAG_COLORS[t] ?? "#666",border:`1px solid ${TAG_COLORS[t] ?? "#555"}35` }}>
              {TAG_LABELS[t] ?? t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function DungeonCard({
  dungeon,
  selected,
  onClick,
}: {
  dungeon: DungeonCardOut;
  selected?: boolean;
  onClick: () => void;
}) {
  const accent = "#c09040";
  const boss = dungeon.boss;
  const level = dungeon.optimalPlayerLevel;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ "--atelier-corner": `${accent}80` } as React.CSSProperties}
      className={`plaque plaque-ornate plaque-interactive group relative flex flex-col p-3 text-center ${
        selected ? "border-[#c09040]/70" : ""
      }`}
    >
      {level != null && (
        <span className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-md border border-[#333] bg-[#0f0f0f]/95 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#f0d78c] shadow-sm">
          <ElemIcon k="lvl" size={10} />
          {level}
        </span>
      )}

      <div
        className="relative flex h-[108px] w-full items-center justify-center overflow-hidden rounded-lg border bg-[#111] px-1"
        style={{ borderColor: selected ? `${accent}55` : "#282828", boxShadow: `inset 0 0 24px ${accent}10` }}
      >
        {boss ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={monsterImgUrl(boss)}
            alt={boss.name.fr}
            width={160}
            height={108}
            className="h-full w-full max-h-[104px] object-contain object-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] transition-transform duration-200 group-hover:scale-105"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.1"; }}
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-[#222]" />
        )}
      </div>

      <div className="mt-2.5 flex w-full min-w-0 flex-col items-center gap-0.5 px-0.5">
        <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-[#d4c898]">
          {dungeon.name.fr}
        </span>
        {boss && (
          <span className="truncate text-[10px] text-[#666]">{boss.name.fr}</span>
        )}
      </div>
    </button>
  );
}

/* ── Stats d'un grade ─────────────────────────────────────────────────────── */
function GradeStats({ grade }: { grade: MonsterGrade }) {
  return (
    <div className="space-y-3">
      {/* PV PA PM Niveau */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 min-w-[120px] items-center gap-2.5 rounded-xl border border-[#282828] bg-[#111] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <PvIcon size={32} />
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[#454545]">PV</p>
            <p className="text-[18px] font-bold tabular-nums leading-tight text-[#6dbf67]">
              {grade.lifePoints.toLocaleString("fr-FR")}
            </p>
          </div>
        </div>
        <div className="flex flex-1 min-w-[80px] items-center gap-2 rounded-xl border border-[#282828] bg-[#111] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <ElemIcon k="pa" size={26} />
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[#454545]">PA</p>
            <p className="text-[18px] font-bold tabular-nums leading-tight text-[#4a90d9]">{grade.actionPoints}</p>
          </div>
        </div>
        <div className="flex flex-1 min-w-[80px] items-center gap-2 rounded-xl border border-[#282828] bg-[#111] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <ElemIcon k="pm" size={26} />
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[#454545]">PM</p>
            <p className="text-[18px] font-bold tabular-nums leading-tight text-[#98c030]">{grade.movementPoints}</p>
          </div>
        </div>
        <div className="flex flex-1 min-w-[80px] items-center gap-2 rounded-xl border border-[#282828] bg-[#111] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <ElemIcon k="lvl" size={20} />
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[#454545]">Niv.</p>
            <p className="text-[18px] font-bold tabular-nums leading-tight text-[#f0d78c]">{grade.level}</p>
          </div>
        </div>
      </div>

      {/* Résistances */}
      <div className="rounded-xl border border-[#282828] bg-[#111] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <SectionTitle>Résistances</SectionTitle>
        <div className="grid grid-cols-5 gap-3">
          {RESISTANCES.map(({ key, icon }) => {
            const v = gradeNum(grade, key);
            const a = ELEM_ASSETS[icon];
            return (
              <div key={String(key)} className="flex flex-col items-center gap-1">
                <ElemIcon k={icon} size={16} />
                <span className="text-[13px] font-bold tabular-nums" style={{ color:resColor(v) }}>{fmtRes(v)}</span>
                <span className="text-[9px]" style={{ color:`${a.color}60` }}>{a.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Caractéristiques */}
      <div className="rounded-xl border border-[#282828] bg-[#111] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <SectionTitle>Caractéristiques</SectionTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {CHARACTERISTICS.map(({ key, icon }) => {
            const a = ELEM_ASSETS[icon];
            const v = gradeNum(grade, key);
            return (
              <div key={String(key)} className="flex items-center gap-1.5">
                <ElemIcon k={icon} size={13} />
                <span className="flex-1 text-[11px] text-[#484848]">{a.label}</span>
                <span className="text-[12px] font-semibold tabular-nums" style={{ color:a.color }}>{v}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/global/UI/iconsRef/xp.png" alt="XP" width={13} height={13}
              className="h-[13px] w-[13px] shrink-0 object-contain" />
            <span className="flex-1 text-[11px] text-[#484848]">XP</span>
            <span className="text-[12px] font-semibold tabular-nums text-[#f0d78c]">{grade.gradeXp.toLocaleString("fr-FR")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sélecteur de grade ───────────────────────────────────────────────────── */
function GradeSection({ monster, accent }: { monster: MonsterBase; accent: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [monster.id]);
  const grade = monster.grades[idx];
  if (!grade) return null;
  return (
    <div>
      {monster.grades.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {monster.grades.map((g, i) => (
            <button key={g.grade} type="button" onClick={() => setIdx(i)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                idx === i ? "text-[#0a0a0a]" : "border border-[#282828] bg-[#181818] text-[#505050] hover:text-[#888]"
              }`}
              style={idx === i ? { background:accent, border:`1px solid ${accent}` } : {}}>
              <ElemIcon k="lvl" size={11} />
              {g.level}
            </button>
          ))}
        </div>
      )}
      <GradeStats grade={grade} />
    </div>
  );
}

/* ── Panneau de détail ────────────────────────────────────────────────────── */
type DetailData = {
  monster: MonsterDetail;
  spells: SpellOut[];
  subareas: SubareaOut[];
  race: MonsterRaceOut | null;
  itemMap: Record<number, DropItemOut>;
};

function MonsterDetailPanel({ data }: { data: DetailData }) {
  const { monster, spells, subareas, race, itemMap } = data;
  const [gradeIdx, setGradeIdx] = useState(0);
  const [archiOpen, setArchiOpen] = useState(false);
  useEffect(() => { setGradeIdx(0); setArchiOpen(false); }, [monster.id]);

  const archi  = monster.correspondingMiniBoss;
  const accent = monster.isBoss ? "#f87171" : "#6db824";

  const drops = monster.drops
    .filter((d) => !d.isGlobal && !d.disableDropModificator)
    .map((d) => {
      const pct = (d as unknown as Record<string, number>)[`percentDropForGrade${gradeIdx + 1}`] ?? d.percentDropForGrade1;
      return { objectId: d.objectId, pct };
    })
    .filter((d) => d.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="space-y-3">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#181818]/95 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        style={{ boxShadow:`inset 0 1px 0 rgba(255,255,255,0.04), 0 0 40px ${accent}06` }}>
        <div className="pointer-events-none absolute inset-0"
          style={{ background:`radial-gradient(ellipse at 20% 0%, ${accent}0d 0%, transparent 50%)` }} />
        <div className="relative flex items-start gap-5">
          <div className="flex h-[90px] w-[90px] shrink-0 items-center justify-center rounded-xl border border-[#282828] bg-[#111]"
            style={{ boxShadow:`inset 0 0 20px ${accent}10` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={monsterImgUrl(monster)} alt={monster.name.fr} width={90} height={90}
              className="h-[90px] w-[90px] object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.1"; }} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-bold leading-tight text-[#f0e0a0]">{monster.name.fr}</h2>
              <MonsterBadge isBoss={monster.isBoss} isMiniBoss={monster.isMiniBoss} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              <span className="flex items-center gap-1 text-[#555]">
                <ElemIcon k="lvl" size={11} />
                <span className="font-semibold text-[#f0d78c]">{levelRange(monster.grades)}</span>
              </span>
              {race && <span className="text-[#555]">Famille&nbsp;<span className="font-medium text-[#888]">{race.name.fr}</span></span>}
              {subareas.length > 0 && (
                <span className="text-[#555]">Zone&nbsp;<span className="font-medium text-[#888]">{subareas.map((z) => z.name.fr).join(", ")}</span></span>
              )}
            </div>
            {monster.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {monster.tags.map((t) => (
                  <span key={t} className="rounded px-2 py-0.5 text-[10px] font-medium"
                    style={{ background:`${TAG_COLORS[t] ?? "#555"}18`,color:TAG_COLORS[t] ?? "#666",border:`1px solid ${TAG_COLORS[t] ?? "#555"}30` }}>
                    {TAG_LABELS[t] ?? t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Grille 2 colonnes ── */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">

        {/* Colonne gauche : Stats */}
        <div className="rounded-xl border border-[#2a2a2a] bg-[#181818]/95 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <SectionTitle icon="/assets/global/UI/characteristic.png">Stats par grade</SectionTitle>
          {monster.grades.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {monster.grades.map((g, i) => (
                <button key={g.grade} type="button" onClick={() => setGradeIdx(i)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                    gradeIdx === i ? "text-[#0a0a0a]" : "border border-[#282828] bg-[#111] text-[#505050] hover:text-[#888]"
                  }`}
                  style={gradeIdx === i ? { background:accent, border:`1px solid ${accent}` } : {}}>
                  <ElemIcon k="lvl" size={11} />
                  {g.level}
                </button>
              ))}
            </div>
          )}
          {monster.grades[gradeIdx] && <GradeStats grade={monster.grades[gradeIdx]!} />}
        </div>

        {/* Colonne droite : Butin + Sorts */}
        <div className="space-y-3">
          {drops.length > 0 && (
            <DropsSection
              drops={drops}
              itemMap={itemMap}
              gradeIdx={gradeIdx}
              accent={accent}
              grades={monster.grades}
              onGradeChange={setGradeIdx}
            />
          )}
          {spells.length > 0 && monster.grades[gradeIdx] && (
            <SpellsSection spells={spells} monsterGrade={monster.grades[gradeIdx]!} />
          )}
        </div>
      </div>

      {/* ── Archi-monstre ── */}
      {archi && (
        <div className="overflow-hidden rounded-xl border"
          style={{ borderColor:"rgba(245,158,11,0.2)", background:"rgba(245,158,11,0.03)" }}>
          <button type="button" onClick={() => setArchiOpen((v) => !v)}
            className="flex w-full items-center gap-4 px-5 py-4 text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
              style={{ borderColor:"rgba(245,158,11,0.15)", background:"rgba(245,158,11,0.06)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={monsterImgUrl(archi)} alt={archi.name.fr} width={48} height={48}
                className="h-12 w-12 object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-[#fbbf24]">{archi.name.fr}</span>
                <span className="rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wider"
                  style={{ background:"rgba(245,158,11,0.12)",color:"#fbbf24",border:"1px solid rgba(245,158,11,0.22)" }}>Archi</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1" style={{ color:"rgba(251,191,36,0.45)" }}>
                <ElemIcon k="lvl" size={11} />
                <span className="text-[11px]">Niv. {levelRange(archi.grades)}</span>
              </div>
            </div>
            <svg className="h-4 w-4 shrink-0 transition-transform duration-200"
              style={{ color:"rgba(251,191,36,0.4)", transform:archiOpen ? "rotate(180deg)" : "none" }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {archiOpen && (
            <div className="border-t px-5 pb-6 pt-4" style={{ borderColor:"rgba(245,158,11,0.1)" }}>
              <GradeSection monster={archi} accent="#fbbf24" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Panel principal ─────────────────────────────────────────────────────── */
type SearchMode = "monster" | "zone" | "dungeon";

type LocationSelection =
  | { mode: "zone"; hit: ZoneSearchHit }
  | { mode: "dungeon"; dungeon: DungeonOut };

const SEARCH_MODES: { id: SearchMode; label: string }[] = [
  { id: "monster", label: "Nom" },
  { id: "zone", label: "Zone" },
  { id: "dungeon", label: "Donjon" },
];

function locationLabel(selection: LocationSelection): string {
  if (selection.mode === "dungeon") return selection.dungeon.name.fr;
  if (selection.hit.kind === "area") return selection.hit.name;
  return selection.hit.name;
}

function BackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mt-3 flex w-full items-center gap-2 rounded-xl border border-[#282828] bg-[#141414] px-3.5 py-2.5 text-left text-[12px] font-medium text-[#888] transition hover:border-[#383838] hover:bg-[#1a1a1a] hover:text-[#d4c898]"
    >
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className="truncate">{label}</span>
    </button>
  );
}

function ZoneSuggestionRow({ hit }: { hit: ZoneSearchHit }) {
  if (hit.kind === "area") {
    return (
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-[#d4c898]">{hit.name}</p>
        <p className="text-[10px] text-[#555]">Région complète</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="truncate text-[13px] font-medium text-[#d4c898]">{hit.name}</p>
        {hit.isDungeon && (
          <span className="shrink-0 rounded px-1 py-px text-[8px] font-bold uppercase tracking-wider text-[#c09040]"
            style={{ background:"rgba(192,144,64,0.12)", border:"1px solid rgba(192,144,64,0.22)" }}>
            Donjon
          </span>
        )}
      </div>
      <p className="truncate text-[10px] text-[#555]">
        {hit.parentName ? `${hit.parentName}` : "Sous-zone"}
        {hit.level ? ` · Niv. ${hit.level}` : ""}
      </p>
    </div>
  );
}

export function BestiaryPanel() {
  const [searchMode, setSearchMode]         = useState<SearchMode>("monster");
  const [query, setQuery]                   = useState("");
  const [debouncedQ, setDebouncedQ]         = useState("");
  const [monsters, setMonsters]             = useState<MonsterBase[]>([]);
  const [total, setTotal]                   = useState(0);
  const [loading, setLoading]               = useState(false);
  const [listError, setListError]           = useState<string | null>(null);
  const [detailData, setDetailData]         = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading]   = useState(false);
  const [locationSelection, setLocationSelection] = useState<LocationSelection | null>(null);
  const [zoneSuggestions, setZoneSuggestions]     = useState<ZoneSearchHit[]>([]);
  const [dungeonCards, setDungeonCards]           = useState<DungeonCardOut[]>([]);
  const [dungeonDataLoading, setDungeonDataLoading] = useState(false);
  const [dungeonLevelFilter, setDungeonLevelFilter] = useState<DungeonLevelRange | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [areas, setAreas]                   = useState<AreaOut[]>([]);
  const [subareas, setSubareas]             = useState<SubareaOut[]>([]);
  const [zoneDataLoading, setZoneDataLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const zoneDataRequested = useRef(false);
  const dungeonDataRequested = useRef(false);

  const hasMonsterSearch = searchMode === "monster" && debouncedQ.trim().length > 0;
  const hasLocationSearch = locationSelection != null;
  const hasSearched = hasMonsterSearch || hasLocationSearch;
  const filteredDungeonCards = filterDungeons(query, dungeonCards, dungeonLevelFilter);
  const showDungeonBrowse = searchMode === "dungeon" && !locationSelection && !detailData;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    if (searchMode !== "zone" || zoneDataRequested.current) return;
    zoneDataRequested.current = true;
    let cancelled = false;
    setZoneDataLoading(true);
    void Promise.all([fetchAreas(), fetchAllSubareas()])
      .then(([areaData, subareaData]) => {
        if (cancelled) return;
        setAreas(areaData);
        setSubareas(subareaData);
      })
      .catch(() => {
        if (!cancelled) setListError("Impossible de charger les zones");
      })
      .finally(() => {
        if (!cancelled) setZoneDataLoading(false);
      });
    return () => { cancelled = true; };
  }, [searchMode]);

  useEffect(() => {
    if (searchMode !== "zone" || locationSelection) {
      setZoneSuggestions([]);
      return;
    }
    setZoneSuggestions(searchZones(query, areas, subareas));
  }, [searchMode, query, areas, subareas, locationSelection]);

  useEffect(() => {
    if (searchMode !== "dungeon" || dungeonDataRequested.current) return;
    dungeonDataRequested.current = true;
    let cancelled = false;
    setDungeonDataLoading(true);
    void fetchAllDungeons()
      .then((dungeons) => enrichDungeonsWithBosses(dungeons))
      .then((cards) => {
        if (!cancelled) setDungeonCards(cards);
      })
      .catch(() => {
        if (!cancelled) setListError("Impossible de charger les donjons");
      })
      .finally(() => {
        if (!cancelled) setDungeonDataLoading(false);
      });
    return () => { cancelled = true; };
  }, [searchMode]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!searchBoxRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const switchMode = useCallback((mode: SearchMode) => {
    setSearchMode(mode);
    setQuery("");
    setDebouncedQ("");
    setLocationSelection(null);
    setDetailData(null);
    setMonsters([]);
    setTotal(0);
    setListError(null);
    setShowSuggestions(false);
    setZoneSuggestions([]);
    setDungeonLevelFilter(null);
    inputRef.current?.focus();
  }, []);

  const fetchMonsterList = useCallback(async (q: string) => {
    if (!q.trim()) { setMonsters([]); setTotal(0); return; }
    setLoading(true);
    setListError(null);
    try {
      const res = await searchMonsters({ q });
      setTotal(res.total);
      setMonsters(res.data);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchZoneMonsters = useCallback(async (hit: ZoneSearchHit) => {
    setLoading(true);
    setListError(null);
    try {
      let data: MonsterBase[] = [];
      if (hit.kind === "area") {
        const area = areas.find((a) => a.id === hit.id);
        const subareaIds = area?.subareaIds?.length
          ? area.subareaIds
          : subareas.filter((s) => s.areaId === hit.id).map((s) => s.id);
        data = await fetchMonstersBySubareas(subareaIds);
      } else {
        data = await fetchMonstersBySubareas([hit.id]);
      }
      setMonsters(data);
      setTotal(data.length);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Erreur");
      setMonsters([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [areas, subareas]);

  const fetchDungeonMonsters = useCallback(async (dungeon: DungeonOut) => {
    setLoading(true);
    setListError(null);
    try {
      const data = await fetchMonstersByIds(dungeon.monsters ?? []);
      setMonsters(data);
      setTotal(data.length);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Erreur");
      setMonsters([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchMode !== "monster") return;
    void fetchMonsterList(debouncedQ);
  }, [debouncedQ, fetchMonsterList, searchMode]);

  const selectZone = useCallback((hit: ZoneSearchHit) => {
    setLocationSelection({ mode: "zone", hit });
    setQuery(hit.name);
    setDebouncedQ(hit.name);
    setShowSuggestions(false);
    setDetailData(null);
    void fetchZoneMonsters(hit);
  }, [fetchZoneMonsters]);

  const selectDungeon = useCallback((dungeon: DungeonOut) => {
    setLocationSelection({ mode: "dungeon", dungeon });
    setQuery(dungeon.name.fr);
    setDebouncedQ(dungeon.name.fr);
    setShowSuggestions(false);
    setDetailData(null);
    void fetchDungeonMonsters(dungeon);
  }, [fetchDungeonMonsters]);

  const openDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    setDetailData(null);
    try {
      const monster = await fetchMonster(id);
      const [spells, subareas, race, dropItems] = await Promise.all([
        fetchSpells(monster.spells ?? []),
        fetchSubareas(monster.subareas ?? []),
        monster.race ? fetchMonsterRace(monster.race) : Promise.resolve(null),
        fetchDropItems(collectDropObjectIds(monster.drops ?? [])),
      ]);
      const itemMap: Record<number, DropItemOut> = {};
      for (const item of dropItems) itemMap[item.id] = item;
      setDetailData({ monster, spells, subareas, race, itemMap });
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailData(null);
  }, []);

  const backFromList = useCallback(() => {
    setLocationSelection(null);
    setMonsters([]);
    setTotal(0);
    setDetailData(null);
    setQuery("");
    setDebouncedQ("");
    setShowSuggestions(false);
  }, []);

  const handleBack = useCallback(() => {
    if (detailData) {
      closeDetail();
      return;
    }
    backFromList();
  }, [detailData, closeDetail, backFromList]);

  const backLabel = (() => {
    if (detailData) {
      if (locationSelection?.mode === "dungeon") {
        return `Retour à ${locationSelection.dungeon.name.fr}`;
      }
      if (locationSelection?.mode === "zone") {
        return `Retour à ${locationLabel(locationSelection)}`;
      }
      if (debouncedQ.trim()) {
        return `Retour aux résultats « ${debouncedQ.trim()} »`;
      }
      return "Retour à la liste";
    }
    if (locationSelection?.mode === "dungeon") return "Retour aux donjons";
    if (locationSelection?.mode === "zone") return "Retour aux zones";
    return null;
  })();

  const showBack = detailData != null || locationSelection != null;

  const clearQuery = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, []);

  const inputPlaceholder =
    searchMode === "zone"
      ? "Rechercher une zone ou sous-zone…"
      : searchMode === "dungeon"
        ? "Filtrer les donjons…"
        : "Rechercher un monstre…";

  const resultLabel = (() => {
    if (!hasSearched || loading) return null;
    if (hasLocationSearch && locationSelection) {
      const prefix = locationSelection.mode === "dungeon" ? "Donjon" : "Zone";
      const label = locationLabel(locationSelection);
      return total > 0
        ? `${total} monstre${total > 1 ? "s" : ""} · ${prefix} : ${label}`
        : `Aucun monstre · ${prefix} : ${label}`;
    }
    if (hasMonsterSearch) {
      return total > 0
        ? `${total} résultat${total > 1 ? "s" : ""} · « ${debouncedQ} »`
        : `Aucun résultat pour « ${debouncedQ} »`;
    }
    return null;
  })();

  const suggestionsVisible =
    showSuggestions &&
    !locationSelection &&
    searchMode === "zone" &&
    query.trim().length >= 2 &&
    !zoneDataLoading &&
    zoneSuggestions.length > 0;

  const dungeonResultLabel = (() => {
    if (!showDungeonBrowse || dungeonDataLoading) return null;
    if (query.trim()) {
      return filteredDungeonCards.length > 0
        ? `${filteredDungeonCards.length} donjon${filteredDungeonCards.length > 1 ? "s" : ""} · « ${query.trim()} »`
        : `Aucun donjon pour « ${query.trim()} »`;
    }
    return `${filteredDungeonCards.length} donjon${filteredDungeonCards.length > 1 ? "s" : ""}`;
  })();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* Barre de recherche */}
      <div className="sticky top-0 z-10 border-b border-[#1e1e1e] bg-[#0a0a0a]/95 px-6 py-4 backdrop-blur-xl md:px-10">
        <div className="mx-auto max-w-[720px]">
          <div className="mb-3 flex justify-center gap-1 rounded-xl border border-[#222] bg-[#141414] p-1">
            {SEARCH_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => switchMode(mode.id)}
                className={`rounded-lg px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition ${
                  searchMode === mode.id
                    ? "bg-[var(--dofus-ui-select-bg)] text-[var(--dofus-green-active)] shadow-[inset_0_0_0_1px_var(--dofus-ui-olive-border-60)]"
                    : "text-[#555] hover:text-[#999]"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div ref={searchBoxRef} className="relative">
            {loading ? (
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2a2a2a] border-t-[var(--dofus-green-active)]" />
              </div>
            ) : (
              <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3a3a3a]"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder={inputPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setDetailData(null);
                if (locationSelection) {
                  setLocationSelection(null);
                  setMonsters([]);
                  setTotal(0);
                }
                if (searchMode === "zone") setShowSuggestions(true);
              }}
              onFocus={() => {
                if (searchMode === "zone" && query.trim().length >= 2) setShowSuggestions(true);
              }}
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#181818]/95 py-3 pl-11 pr-10 text-[14px] text-[#d0c8b8] placeholder-[#333] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition focus:border-[var(--dofus-green-active)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--dofus-green-active)]/15"
            />
            {query && (
              <button type="button"
                onClick={clearQuery}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#404040] transition hover:text-[#888]"
                aria-label="Effacer la recherche">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}

            {suggestionsVisible && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#181818] shadow-[0_12px_40px_rgba(0,0,0,0.65)]">
                {searchMode === "zone" && zoneSuggestions.map((hit) => (
                  <button
                    key={`${hit.kind}-${hit.id}`}
                    type="button"
                    onClick={() => selectZone(hit)}
                    className="flex w-full items-center gap-3 border-b border-[#222] px-4 py-3 text-left transition last:border-b-0 hover:bg-[#202020]"
                  >
                    <ZoneSuggestionRow hit={hit} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {showDungeonBrowse && dungeonResultLabel && (
            <p className="mt-1.5 text-center text-[11px] text-[#2e2e2e]">{dungeonResultLabel}</p>
          )}
          {!showDungeonBrowse && resultLabel && (
            <p className="mt-1.5 text-center text-[11px] text-[#2e2e2e]">{resultLabel}</p>
          )}

          {showBack && backLabel && (
            <BackBar label={backLabel} onBack={handleBack} />
          )}
        </div>
      </div>

      <div className="flex-1 px-6 py-8 md:px-10">
        {/* État initial */}
        {!hasSearched && !detailData && !showDungeonBrowse && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl border border-[#222] bg-[#181818]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/global/UI/bestiary.png" alt="" width={32} height={32}
                className="h-8 w-8 object-contain opacity-20" />
            </div>
            <p className="text-[15px] font-semibold text-[#2a2a2a]">Bestiaire</p>
            <p className="mt-1.5 text-[11px] text-[#202020]">Par nom, zone ou donjon — stats, résistances, sorts et butin</p>
          </div>
        )}

        {showDungeonBrowse && dungeonDataLoading && (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2a2a2a] border-t-[#c09040]" />
          </div>
        )}
        {showDungeonBrowse && !dungeonDataLoading && (
          <div className="mb-5 flex flex-wrap justify-center gap-1.5">
            <Chip
              active={dungeonLevelFilter == null}
              accentColor="#c09040"
              onClick={() => setDungeonLevelFilter(null)}
            >
              Tous
            </Chip>
            {DUNGEON_LEVEL_FILTERS.map((filter) => (
              <Chip
                key={filter.id}
                active={dungeonLevelFilter === filter.id}
                accentColor="#c09040"
                onClick={() => setDungeonLevelFilter((prev) => prev === filter.id ? null : filter.id)}
              >
                {filter.label}
              </Chip>
            ))}
          </div>
        )}
        {showDungeonBrowse && !dungeonDataLoading && filteredDungeonCards.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredDungeonCards.map((dungeon) => (
              <DungeonCard
                key={dungeon.id}
                dungeon={dungeon}
                onClick={() => selectDungeon(dungeon)}
              />
            ))}
          </div>
        )}
        {showDungeonBrowse && !dungeonDataLoading && filteredDungeonCards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[13px] text-[#2a2a2a]">Aucun donjon trouvé</p>
          </div>
        )}

        {loading && hasSearched && (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2a2a2a] border-t-[var(--dofus-green-active)]" />
          </div>
        )}
        {listError && <p className="py-10 text-center text-[13px] text-red-400">{listError}</p>}
        {detailLoading && (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2a2a2a] border-t-[var(--dofus-green-active)]" />
          </div>
        )}
        {!detailLoading && detailData && (
          <MonsterDetailPanel data={detailData} />
        )}
        {!loading && !detailData && !detailLoading && hasSearched && monsters.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {monsters.map((m) => (
              <MonsterCard key={m.id} monster={m} onClick={() => void openDetail(m.id)} />
            ))}
          </div>
        )}
        {!loading && hasSearched && monsters.length === 0 && !listError && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[13px] text-[#2a2a2a]">Aucun monstre trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}
