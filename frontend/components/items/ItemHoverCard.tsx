"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { fetchItemSet } from "@/lib/api";
import { computeWeaponEffectDamage } from "@/lib/combatDamageCalc";
import { typeLabel } from "@/lib/equipmentTypes";
import { EffectLine } from "@/components/items/EffectLine";
import { isWeaponDamagesBucketEffect } from "@/lib/effectFormat";
import { formatConditionString } from "@/lib/conditionFormat";
import { isConditionMet } from "@/lib/conditionCheck";
import { WeaponCombatProvider } from "@/components/items/weaponCombatContext";
import { SetDetailModal } from "@/components/items/SetDetailModal";
import { useDisplayStats } from "@/hooks/useDisplayStats";
import type { ItemOut, ItemSetOut } from "@/types/api";

type Props = {
  item: ItemOut;
  anchor: { x: number; y: number };
  /** Item actuellement équipé dans le slot — affiché à gauche pour comparaison. */
  compareItem?: ItemOut;
  /** Force l'affichage d'un côté. "left" = toujours à gauche du curseur (ex: catalogue côté droit). */
  preferSide?: "left" | "right";
  /** Appelé quand la souris entre sur la carte (pour annuler le timer de fermeture). */
  onMouseEnter?: () => void;
  /** Appelé quand la souris quitte la carte (pour déclencher le timer de fermeture). */
  onMouseLeave?: () => void;
};

function fmtRange(lo: number, hi: number): string {
  return lo === hi ? String(lo) : `${lo}–${hi}`;
}

/** Petite puce ● + contenu pour le bloc Caractéristiques. */
function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5 text-[#c0c0c0]">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#555]" />
      <span>{children}</span>
    </li>
  );
}

/* ── Carte d'un item (corps réutilisable) ─────────────────────────────────── */
function ItemCardBody({ item, label }: { item: ItemOut; label?: string }) {
  const [setInfo, setSetInfo] = useState<ItemSetOut | null>(null);
  const [setErr, setSetErr] = useState<string | null>(null);
  const [showSetModal, setShowSetModal] = useState(false);
  const pid = item.parent_set_id;
  const stats = useDisplayStats();
  const conditionMet = isConditionMet(item.conditions, stats);

  const wd = item.weapon_detail ?? null;
  const critBonusFlat =
    typeof wd?.critical_hit_bonus === "number" ? wd.critical_hit_bonus : 0;

  const maxCast =
    typeof wd?.max_cast_per_turn === "number" && Number.isFinite(wd.max_cast_per_turn)
      ? Math.max(1, Math.min(50, Math.floor(wd.max_cast_per_turn)))
      : 1;

  const [weaponHits, setWeaponHits] = useState(1);

  useEffect(() => {
    setWeaponHits(1);
  }, [item.ankama_id]);

  useEffect(() => {
    setWeaponHits((h) => Math.min(Math.max(1, h), maxCast));
  }, [maxCast]);

  useEffect(() => {
    if (pid == null) {
      startTransition(() => {
        setSetInfo(null);
        setSetErr(null);
      });
      return;
    }
    let cancel = false;
    startTransition(() => {
      setSetInfo(null);
      setSetErr(null);
    });
    (async () => {
      try {
        const s = await fetchItemSet(pid);
        if (!cancel) setSetInfo(s);
      } catch (e) {
        if (!cancel) setSetErr(e instanceof Error ? e.message : "Panoplie introuvable");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [pid]);

  const rawEffects = (
    item.effects?.filter((e) => {
      if (e == null) return false;
      const typeName = ((e as Record<string, unknown>).type as { name?: string } | null)?.name;
      // Effets cosmétiques/techniques sans intérêt pour le builder.
      if (typeName && ["fertile", "attitude"].includes(typeName.toLowerCase())) return false;
      return true;
    }) as Record<string, unknown>[] ?? []
  ).sort((a, b) => {
    const aActive = (a.type as { is_active?: boolean } | null)?.is_active === true;
    const bActive = (b.type as { is_active?: boolean } | null)?.is_active === true;
    if (aActive === bActive) return 0;
    return aActive ? -1 : 1;
  });

  const weaponDmg: Record<string, unknown>[] = [];
  const weaponOther: Record<string, unknown>[] = [];
  if (item.is_weapon) {
    for (const eff of rawEffects) {
      if (isWeaponDamagesBucketEffect(eff)) weaponDmg.push(eff);
      else weaponOther.push(eff);
    }
  }

  /** Totaux par coup (avant multiplication par weaponHits). */
  const weaponDamageTotals = useMemo(() => {
    if (!item.is_weapon) return null;
    const dmg = (item.effects?.filter((e) => e != null) as Record<string, unknown>[] ?? []).filter(
      isWeaponDamagesBucketEffect,
    );
    if (dmg.length === 0) return null;
    let nMin = 0, nMax = 0, cMin = 0, cMax = 0, lines = 0;
    for (const eff of dmg) {
      const n = computeWeaponEffectDamage(eff, stats, { isCrit: false, weaponCritBonusFlat: 0 });
      const c = computeWeaponEffectDamage(eff, stats, { isCrit: true, weaponCritBonusFlat: critBonusFlat });
      if (!n || !c) continue;
      nMin += n.min; nMax += n.max;
      cMin += c.min; cMax += c.max;
      lines += 1;
    }
    if (lines === 0) return null;
    return { normal: { min: nMin, max: nMax }, crit: { min: cMin, max: cMax } };
  }, [item.is_weapon, item.effects, stats, critBonusFlat]);

  const buildCC = stats.critical_percent ?? 0;
  const finalCC = wd?.critical_hit_probability != null
    ? Math.min(100, buildCC + wd.critical_hit_probability)
    : null;

  const conditionText = formatConditionString(item.conditions);

  return (
    <>
      {label && (
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-[#555555]">
          {label}
        </p>
      )}
      <div className="flex gap-2">
        {item.image_url_icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url_icon} alt="" width={56} height={56}
            className="h-[56px] w-[56px] shrink-0 rounded-lg border border-[#383838] bg-black/40 object-contain" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight text-[#f0e0a0] text-[12px]">{item.name}</p>
          <p className="mt-0.5 text-[10px] text-[#888888]">
            Niv. {item.level} · {typeLabel(item.type_name_id)}
            {item.is_weapon ? " · Arme" : ""}
          </p>
        </div>
      </div>

      {item.description ? (
        <p className="mt-1.5 text-[11px] leading-snug text-[#c0c0c0] italic">
          {item.description}
        </p>
      ) : null}

      {item.is_weapon ? (
        <WeaponCombatProvider weaponCritBonusFlat={critBonusFlat} weaponHits={weaponHits}>
          {/* ── Sélecteur de coups (sous le titre, haut de carte) ── */}
          {maxCast > 1 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {Array.from({ length: maxCast }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWeaponHits(n)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition ${
                    weaponHits === n
                      ? "bg-[#2a4810] text-[#c8f070] ring-1 ring-[#5a9820]"
                      : "bg-[#1e1e1e] text-[#909090] hover:bg-[#2a2a2a]"
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="text-[10px] text-[#606060]">
                coup{maxCast > 1 ? "s" : ""} par tour
              </span>
            </div>
          )}

          {/* ── Dégâts ── */}
          {rawEffects.length > 0 ? (
            <>
              {weaponDmg.length > 0 && (
                <div className="mt-1.5">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-[#666666]">
                    Dégâts{weaponHits > 1 ? ` (×${weaponHits})` : ""}
                  </p>
                  <ul className="mt-0.5 space-y-0.5 text-[11px] text-[#e0e0e0]">
                    {weaponDmg.map((eff, i) => (
                      <EffectLine key={`d-${i}`} eff={eff} />
                    ))}
                  </ul>

                  {weaponDamageTotals ? (
                    <div className="mt-1.5 flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5 border-t border-[#2a2a2a] pt-1.5 text-[10px]">
                      <span className="mr-auto shrink-0 text-[#707070]">Total</span>
                      <span className="font-semibold tabular-nums text-[#e0e0e0]" title="Hors CC">
                        ({fmtRange(
                          weaponDamageTotals.normal.min * weaponHits,
                          weaponDamageTotals.normal.max * weaponHits,
                        )})
                      </span>
                      <span className="font-semibold tabular-nums text-[#f0c060]" title="Critique">
                        CC ({fmtRange(
                          weaponDamageTotals.crit.min * weaponHits,
                          weaponDamageTotals.crit.max * weaponHits,
                        )})
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {weaponOther.length > 0 && (
                <div className={weaponDmg.length > 0 ? "mt-2" : "mt-1.5"}>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-[#666666]">
                    Effets
                  </p>
                  <ul className="mt-0.5 space-y-0.5 text-[11px] text-[#e0e0e0]">
                    {weaponOther.map((eff, i) => (
                      <EffectLine key={`r-${i}`} eff={eff} />
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}

          {/* ── Infos combat (bas, sous divider) ── */}
          {wd ? (
            <div className="mt-2 border-t border-[#252525] pt-1.5">
              <ul className="space-y-0.5 text-[11px]">
                {typeof wd.ap_cost === "number" && (
                  <StatRow>{wd.ap_cost} PA</StatRow>
                )}
                {wd.range?.min != null && wd.range?.max != null && (
                  <StatRow>{wd.range.min} - {wd.range.max} PO</StatRow>
                )}
                {typeof wd.critical_hit_probability === "number" && (
                  <StatRow>
                    {wd.critical_hit_probability}% CC
                    {typeof wd.critical_hit_bonus === "number"
                      ? ` (+${wd.critical_hit_bonus})`
                      : ""}
                  </StatRow>
                )}
                {finalCC != null && (
                  <StatRow>{finalCC}% CC finaux</StatRow>
                )}
                {maxCast === 1 && (
                  <StatRow>1 coup par tour</StatRow>
                )}
              </ul>
            </div>
          ) : null}
        </WeaponCombatProvider>
      ) : rawEffects.length > 0 ? (
        <>
          <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-widest text-[#666666]">Effets</p>
          <ul className="mt-0.5 space-y-0.5 text-[11px] text-[#e0e0e0]">
            {rawEffects.map((eff, i) => <EffectLine key={i} eff={eff} />)}
          </ul>
        </>
      ) : null}

      {conditionText && (
        <div className={`mt-1.5 rounded-lg border px-2 pt-1.5 pb-1 ${
          conditionMet ? "border-[#2a2a2a]" : "border-red-700/60 bg-red-950/30"
        }`}>
          <p className={`mb-0.5 text-[9px] font-medium uppercase tracking-wide ${conditionMet ? "text-[#e07a30]" : "text-red-400"}`}>
            {conditionMet ? "Conditions" : "⚠ Conditions non respectées"}
          </p>
          <p className={`text-[11px] leading-snug font-semibold ${conditionMet ? "text-[#d0b888]" : "text-red-300"}`}>
            {conditionText}
          </p>
        </div>
      )}

      {pid != null && (
        <div className="mt-1.5 border-t border-[#282828] pt-1.5">
          <p className="text-[9px] font-medium uppercase tracking-wide text-[#888888]">Panoplie</p>
          {setErr ? (
            <p className="text-[11px] text-red-400/90">{setErr}</p>
          ) : setInfo ? (
            <button type="button" onClick={() => setShowSetModal(true)}
              className="mt-0.5 text-left text-[11px] font-medium text-[#e8c96e] underline decoration-dotted underline-offset-2 hover:text-[#f5d980]">
              {setInfo.name ?? `Panoplie #${setInfo.ankama_id}`} →
            </button>
          ) : (
            <p className="text-[11px] text-[#555555]">Chargement…</p>
          )}
        </div>
      )}

      {showSetModal && pid != null &&
        createPortal(<SetDetailModal setId={pid} onClose={() => setShowSetModal(false)} />, document.body)}
    </>
  );
}

export function ItemHoverCard({ item, anchor, compareItem, preferSide, onMouseEnter, onMouseLeave }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; visible: boolean }>({
    top: -9999,
    left: -9999,
    visible: false,
  });

  const hasCompare = compareItem != null && compareItem.ankama_id !== item.ankama_id;
  const SINGLE_W = 320;
  const COMPARE_W = 580;
  const CARD_W = hasCompare ? COMPARE_W : SINGLE_W;
  const MARGIN = 8;
  const OFFSET = 16;

  const cardW = typeof window !== "undefined"
    ? Math.min(CARD_W, window.innerWidth - MARGIN * 2)
    : CARD_W;

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const cardH = el.scrollHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(CARD_W, vw - MARGIN * 2);

    let left: number;
    let top: number;

    if (preferSide === "left") {
      // Catalogue (droite de l'écran) : toujours à gauche du curseur — prioritaire sur compare
      left = anchor.x - w - OFFSET;
      if (left < MARGIN) left = MARGIN;
    } else if (hasCompare) {
      // Compare hors catalogue : épingler à droite du viewport
      left = Math.max(MARGIN, vw - w - MARGIN);
    } else {
      // Mode simple : à droite du curseur, repli à gauche si débordement
      left = anchor.x + OFFSET;
      if (left + w + MARGIN > vw) left = anchor.x - w - OFFSET;
      left = Math.max(MARGIN, left);
    }

    top = anchor.y + OFFSET;
    if (top + cardH + MARGIN > vh) {
      const topAbove = anchor.y - cardH - OFFSET;
      top = topAbove >= MARGIN ? topAbove : Math.max(MARGIN, vh - cardH - MARGIN);
    }

    setPos((prev) => {
      if (prev.visible && prev.top === top && prev.left === left) return prev;
      return { top, left, visible: true };
    });
  }, [anchor.x, anchor.y, item.ankama_id, hasCompare, preferSide, CARD_W, MARGIN, OFFSET]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={cardRef}
      className="fixed z-[300] rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] p-3 text-[13px] shadow-[0_8px_32px_rgba(0,0,0,0.7)]"
      style={{
        top: pos.top,
        left: pos.left,
        width: cardW,
        visibility: pos.visible ? "visible" : "hidden",
      }}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {hasCompare ? (
        <div className="flex gap-2">
          {/* Item équipé — gauche */}
          <div className="min-w-0 flex-1 rounded-lg border border-[#2a2a2a] bg-[#141414] p-2">
            <ItemCardBody item={compareItem!} label="Équipé" />
          </div>
          {/* Séparateur */}
          <div className="flex flex-col items-center justify-center gap-1 shrink-0">
            <div className="h-full w-px bg-[#2a2a2a]" />
            <span className="shrink-0 text-[10px] font-bold text-[#444444]">vs</span>
            <div className="h-full w-px bg-[#2a2a2a]" />
          </div>
          {/* Item survolé — droite */}
          <div className="min-w-0 flex-1 rounded-lg border border-[var(--dofus-ui-olive-border-45)] bg-[var(--dofus-ui-deep-panel)] p-2">
            <ItemCardBody item={item} label="Survol" />
          </div>
        </div>
      ) : (
        <ItemCardBody item={item} />
      )}
    </div>,
    document.body,
  );
}

/** Gère survol + position pour une carte détail. */
export function useItemHoverCard() {
  const [hover, setHover] = useState<{
    item: ItemOut;
    x: number;
    y: number;
  } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const show = useCallback(
    (item: ItemOut, e: React.MouseEvent) => {
      clearClose();
      setHover({ item, x: e.clientX, y: e.clientY });
    },
    [clearClose],
  );

  const move = useCallback(
    (e: React.MouseEvent) => {
      if (!hover) return;
      setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : null));
    },
    [hover],
  );

  const scheduleHide = useCallback(() => {
    clearClose();
    closeTimer.current = setTimeout(() => setHover(null), 180);
  }, [clearClose]);

  return { hover, show, move, scheduleHide, cancelHide: clearClose };
}
