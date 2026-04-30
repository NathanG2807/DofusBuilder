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
};

export function ItemHoverCard({ item, anchor }: Props) {
  const [setInfo, setSetInfo] = useState<ItemSetOut | null>(null);
  const [setErr, setSetErr] = useState<string | null>(null);
  const [showSetModal, setShowSetModal] = useState(false);
  const pid = item.parent_set_id;
  const stats = useBuildStore((s) => s.stats);
  const conditionMet = isConditionMet(item.conditions, stats);

  useEffect(() => {
    if (pid == null) {
      setSetInfo(null);
      setSetErr(null);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const s = await fetchItemSet(pid);
        if (!cancel) setSetInfo(s);
      } catch (e) {
        if (!cancel)
          setSetErr(e instanceof Error ? e.message : "Panoplie introuvable");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [pid]);

  const rawEffects =
    item.effects?.filter((e) => e != null) as Record<string, unknown>[] ?? [];
  const conditionText = formatConditionString(item.conditions);

  if (typeof document === "undefined") return null;

  const left = Math.min(anchor.x + 16, window.innerWidth - 340);
  // On positionne en dessous du curseur ; si on est dans le tiers bas de l'écran,
  // on préfère afficher au-dessus pour éviter de sortir du viewport.
  const fromBottom = window.innerHeight - anchor.y;
  const top = fromBottom < 300 ? Math.max(8, anchor.y - 16) : anchor.y + 16;

  return (
    <>
      {createPortal(
        <div
          className="pointer-events-none fixed z-[300] max-h-[calc(100vh-24px)] w-[min(100vw-24px,320px)] overflow-y-auto rounded-xl border-2 border-[#c9a227]/80 bg-[#1e1814] p-3 text-[13px] shadow-[0_8px_32px_rgba(0,0,0,0.55)]"
          style={{ left, top }}
          role="tooltip"
        >
          <div className="pointer-events-auto flex gap-3">
            {item.image_url_icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url_icon}
                alt=""
                width={72}
                height={72}
                className="h-[72px] w-[72px] shrink-0 rounded-lg border border-[#5c4a32] bg-black/40 object-contain"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight text-[#f5e6c8]">
                {item.name}
              </p>
              <p className="mt-0.5 text-[11px] text-[#b8a88c]">
                Niv. {item.level} · {typeLabel(item.type_name_id)}
                {item.is_weapon ? " · Arme" : ""}
              </p>
            </div>
          </div>

          {item.description ? (
            <p className="pointer-events-auto mt-2 text-[12px] leading-snug text-[#d4c4a8]">
              {item.description}
            </p>
          ) : null}

      {rawEffects.length > 0 && (
        <ul className="pointer-events-auto mt-2 space-y-0.5 border-t border-[#3d3428] pt-2 text-[11px] text-[#e8d4a8]">
          {rawEffects.map((eff, i) => (
            <EffectLine key={i} eff={eff} />
          ))}
        </ul>
      )}

          {conditionText && (
            <div className={`pointer-events-auto mt-2 rounded-lg border pt-2 px-2 pb-1.5 ${
              conditionMet
                ? "border-[#3d3428]"
                : "border-red-700/60 bg-red-950/30"
            }`}>
              <p className={`mb-0.5 text-[10px] font-medium uppercase tracking-wide ${
                conditionMet ? "text-[#e07a30]" : "text-red-400"
              }`}>
                {conditionMet ? "Conditions" : "⚠ Conditions non respectées"}
              </p>
              <p className={`text-[11px] leading-snug font-semibold ${
                conditionMet ? "text-[#e8c4a0]" : "text-red-300"
              }`}>
                {conditionText}
              </p>
            </div>
          )}

          {pid != null && (
            <div className="pointer-events-auto mt-2 border-t border-[#3d3428] pt-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#c9a227]">
                Panoplie
              </p>
              {setErr ? (
                <p className="text-[11px] text-red-400/90">{setErr}</p>
              ) : setInfo ? (
                <button
                  type="button"
                  onClick={() => setShowSetModal(true)}
                  className="mt-0.5 text-left text-[12px] font-medium text-[#e8c96e] underline decoration-dotted underline-offset-2 hover:text-[#f5d980]"
                >
                  {setInfo.name ?? `Panoplie #${setInfo.ankama_id}`} →
                </button>
              ) : (
                <p className="text-[11px] text-[#8a7a62]">Chargement…</p>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}

      {showSetModal && pid != null &&
        createPortal(
          <SetDetailModal setId={pid} onClose={() => setShowSetModal(false)} />,
          document.body,
        )}
    </>
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
