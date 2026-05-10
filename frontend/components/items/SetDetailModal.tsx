"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { fetchItemsBySet, fetchItemSet } from "@/lib/api";
import { typeLabel } from "@/lib/equipmentTypes";
import { EffectLine } from "@/components/items/EffectLine";
import { bonusEffectIcon } from "@/lib/effectFormat";
import { useBuildStore } from "@/store/build-store";
import type { ItemOut, ItemSetOut } from "@/types/api";

/* ─── Utilitaire : formater les effets d'un palier ─── */
function tierEffects(
  bonusEffects: Record<string, unknown> | null,
  tier: number,
): string[] {
  if (!bonusEffects) return [];
  const raw = bonusEffects[String(tier)];
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((e: unknown) =>
      typeof e === "object" && e !== null && "formatted" in e
        ? String((e as { formatted: unknown }).formatted)
        : null,
    )
    .filter((s): s is string => s !== null);
}

/* ─── Carte d'un item dans le modal ─── */
function SetItemCard({
  item,
  onEquip,
  isExpanded,
  onToggle,
}: {
  item: ItemOut;
  onEquip?: (item: ItemOut) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const rawEffects =
    (item.effects?.filter((e) => e != null) as Record<string, unknown>[]) ?? [];

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-2.5">
      <div className="flex items-start gap-2.5">
        {item.image_url_icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url_icon}
            alt=""
            width={48}
            height={48}
            className="h-[48px] w-[48px] shrink-0 rounded-md border border-[#383838] bg-black/40 object-contain"
          />
        ) : (
          <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-md border border-[#383838] bg-black/40 text-xl text-[#555555]">
            ?
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-[#e0d0a0]">
            {item.name}
          </p>
          <p className="mt-0.5 text-[11px] text-[#888888]">
            Niv. {item.level} · {typeLabel(item.type_name_id)}
          </p>
          <div className="mt-1.5 flex gap-1.5">
            {rawEffects.length > 0 && (
              <button
                type="button"
                onClick={onToggle}
                className="btn-dofus-gray rounded px-2 py-0.5 text-[10px]"
              >
                {isExpanded ? "▲ Stats" : "▼ Stats"}
              </button>
            )}
            {onEquip && (
              <button
                type="button"
                onClick={() => onEquip(item)}
                className="btn-dofus-green rounded px-2 py-0.5 text-[10px]"
              >
                Équiper
              </button>
            )}
          </div>
        </div>
      </div>
      {isExpanded && rawEffects.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-[#222222] pt-2 text-[11px] text-[#d0d0d0]">
          {rawEffects.map((eff, i) => (
            <EffectLine key={i} eff={eff} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Props du modal ─── */
type SetDetailModalProps = {
  setId: number;
  onClose: () => void;
};

export function SetDetailModal({ setId, onClose }: SetDetailModalProps) {
  const [setInfo, setSetInfo] = useState<ItemSetOut | null>(null);
  const [items, setItems] = useState<ItemOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [equipMsg, setEquipMsg] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const equipSet = useBuildStore((s) => s.equipSet);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    Promise.all([fetchItemSet(setId), fetchItemsBySet(setId)])
      .then(([s, its]) => {
        setSetInfo(s);
        setItems(its.sort((a, b) => a.level - b.level));
      })
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "Erreur de chargement"),
      )
      .finally(() => setLoading(false));
  }, [setId]);

  async function handleEquipAll() {
    setEquipMsg(null);
    const equipped = await equipSet(setId);
    setEquipMsg(
      equipped === 0
        ? "Aucun emplacement libre disponible."
        : `${equipped} objet(s) équipé(s) depuis la panoplie.`,
    );
  }

  function handleSingleEquip(item: ItemOut) {
    void equipSet(setId, item.ankama_id);
    setEquipMsg(`${item.name} ajouté au build.`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalTiers = setInfo?.equipment_ids?.length ?? 0;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#181818] shadow-[0_16px_64px_rgba(0,0,0,0.8)]">

        {/* Liseré vert en haut */}
        <div className="h-[2px] w-full shrink-0 bg-gradient-to-r from-transparent via-[#5a9818]/70 to-transparent" />

        {/* En-tête */}
        <div className="flex items-start justify-between border-b border-[#222222] bg-[#1a1a1a] px-5 py-4">
          <div>
            {loading ? (
              <div className="h-5 w-40 animate-pulse rounded bg-[#282828]" />
            ) : (
              <h2 className="font-serif text-xl font-bold text-[#f0d78c]">
                {setInfo?.name ?? `Panoplie #${setId}`}
              </h2>
            )}
            {!loading && totalTiers > 0 && (
              <p className="mt-0.5 text-[12px] text-[#888888]">
                {totalTiers} objets dans la panoplie
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-[#666666] transition hover:bg-[#222222] hover:text-[#e0e0e0]"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-[#222222]"
                />
              ))}
            </div>
          )}

          {err && (
            <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">
              {err}
            </p>
          )}

          {!loading && !err && (
            <>
              {/* Bouton équiper tout */}
              <div className="mb-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleEquipAll()}
                  className="btn-dofus-green rounded-lg px-4 py-2 text-sm"
                >
                  ⚔ Équiper la panoplie entière
                </button>
                {equipMsg && (
                  <span className="text-[12px] text-emerald-400">{equipMsg}</span>
                )}
              </div>

              {/* Items */}
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((it) => (
                  <SetItemCard
                    key={it.ankama_id}
                    item={it}
                    onEquip={handleSingleEquip}
                    isExpanded={expandedItemId === it.ankama_id}
                    onToggle={() => setExpandedItemId(
                      expandedItemId === it.ankama_id ? null : it.ankama_id
                    )}
                  />
                ))}
              </div>

              {/* Bonus de panoplie par palier */}
              {setInfo?.bonus_effects && totalTiers > 0 && (
                <div className="mt-5 border-t border-[#222222] pt-4">
                  <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[#888888]">
                    Bonus de panoplie
                  </h3>
                  <div className="space-y-2">
                    {Array.from({ length: totalTiers - 1 }, (_, i) => i + 2).map(
                      (tier) => {
                        const effects = tierEffects(
                          setInfo.bonus_effects,
                          tier,
                        );
                        if (effects.length === 0) return null;
                        return (
                          <div
                            key={tier}
                            className="rounded-lg border border-[#282828] bg-[#161616] px-3 py-2"
                          >
                            <p className="mb-1 text-[11px] font-semibold text-[#9cce38]">
                              {tier} pièces
                            </p>
                            <ul className="space-y-0.5">
                              {effects.map((eff, i) => {
                                const icon = bonusEffectIcon(eff);
                                return (
                                  <li
                                    key={i}
                                    className="flex items-center gap-1.5 text-[12px] text-[#c0c0c0]"
                                  >
                                    {icon ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={`/assets/elements/${icon}.png`}
                                        alt=""
                                        width={13}
                                        height={13}
                                        className="h-[13px] w-[13px] shrink-0 object-contain"
                                      />
                                    ) : (
                                      <span className="mt-0.5 shrink-0 text-[#5a9818]">•</span>
                                    )}
                                    {eff}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
