"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { fetchItemSet } from "@/lib/api";
import { typeLabel } from "@/lib/equipmentTypes";
import { EffectLine } from "@/components/items/EffectLine";
import { formatConditionString } from "@/lib/conditionFormat";
import { isConditionMet } from "@/lib/conditionCheck";
import { SetDetailModal } from "@/components/items/SetDetailModal";
import { useBuildStore } from "@/store/build-store";
import type { ItemOut, ItemSetOut } from "@/types/api";

type Props = {
  item: ItemOut;
  anchor: { x: number; y: number };
  /** Item actuellement équipé dans le slot — affiché à gauche pour comparaison. */
  compareItem?: ItemOut;
};

/* ── Carte d'un item (corps réutilisable) ─────────────────────────────────── */
function ItemCardBody({ item, label }: { item: ItemOut; label?: string }) {
  const [setInfo, setSetInfo] = useState<ItemSetOut | null>(null);
  const [setErr, setSetErr] = useState<string | null>(null);
  const [showSetModal, setShowSetModal] = useState(false);
  const pid = item.parent_set_id;
  const stats = useBuildStore((s) => s.stats);
  const conditionMet = isConditionMet(item.conditions, stats);

  useEffect(() => {
    if (pid == null) { setSetInfo(null); setSetErr(null); return; }
    let cancel = false;
    (async () => {
      try { const s = await fetchItemSet(pid); if (!cancel) setSetInfo(s); }
      catch (e) { if (!cancel) setSetErr(e instanceof Error ? e.message : "Panoplie introuvable"); }
    })();
    return () => { cancel = true; };
  }, [pid]);

  const rawEffects = (
    item.effects?.filter((e) => e != null) as Record<string, unknown>[] ?? []
  ).sort((a, b) => {
    const aActive = (a.type as { is_active?: boolean } | null)?.is_active === true;
    const bActive = (b.type as { is_active?: boolean } | null)?.is_active === true;
    if (aActive === bActive) return 0;
    return aActive ? -1 : 1;
  });
  const conditionText = formatConditionString(item.conditions);

  return (
    <>
      {label && (
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-[#555555]">
          {label}
        </p>
      )}
      <div className="pointer-events-auto flex gap-2">
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
        <p className="pointer-events-auto mt-1.5 text-[11px] leading-snug text-[#c0c0c0] italic">
          {item.description}
        </p>
      ) : null}

      {rawEffects.length > 0 && (
        <>
          <p className="pointer-events-auto mt-1.5 text-[9px] font-semibold uppercase tracking-widest text-[#666666]">Effets</p>
          <ul className="pointer-events-auto mt-0.5 space-y-0.5 text-[11px] text-[#e0e0e0]">
            {rawEffects.map((eff, i) => <EffectLine key={i} eff={eff} />)}
          </ul>
        </>
      )}

      {conditionText && (
        <div className={`pointer-events-auto mt-1.5 rounded-lg border px-2 pt-1.5 pb-1 ${
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
        <div className="pointer-events-auto mt-1.5 border-t border-[#282828] pt-1.5">
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

export function ItemHoverCard({ item, anchor, compareItem }: Props) {
  if (typeof document === "undefined") return null;

  const hasCompare = compareItem != null && compareItem.ankama_id !== item.ankama_id;
  const SINGLE_W = 320;
  const COMPARE_W = 580;
  const CARD_W = hasCompare ? COMPARE_W : SINGLE_W;
  const MARGIN = 8;
  const OFFSET = 16;

  // Horizontal : à droite du curseur, repli à gauche si débordement
  let left = anchor.x + OFFSET;
  if (left + CARD_W + MARGIN > window.innerWidth) {
    left = anchor.x - CARD_W - OFFSET;
  }
  left = Math.max(MARGIN, left);

  // Vertical : en dessous par défaut, au-dessus si trop proche du bas
  const spaceBelow = window.innerHeight - anchor.y - OFFSET;
  const spaceAbove = anchor.y - OFFSET;
  const showAbove = spaceBelow < 280 && spaceAbove > spaceBelow;
  const posStyle: React.CSSProperties = showAbove
    ? { left, bottom: window.innerHeight - anchor.y + OFFSET, maxHeight: Math.min(spaceAbove - MARGIN, window.innerHeight - 32) }
    : { left, top: anchor.y + OFFSET, maxHeight: Math.min(spaceBelow - MARGIN, window.innerHeight - 32) };

  return createPortal(
    <div
      className="pointer-events-none fixed z-[300] overflow-y-auto rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] p-3 text-[13px] shadow-[0_8px_32px_rgba(0,0,0,0.7)]"
      style={{ ...posStyle, width: Math.min(CARD_W, window.innerWidth - MARGIN * 2) }}
      role="tooltip"
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
          <div className="min-w-0 flex-1 rounded-lg border border-[#4a8000]/40 bg-[#0e1a06] p-2">
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

  return { hover, show, move, scheduleHide };
}
