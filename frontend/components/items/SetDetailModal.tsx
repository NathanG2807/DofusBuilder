"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { fetchItemsBySet, fetchItemSet } from "@/lib/api";
import { typeLabel } from "@/lib/equipmentTypes";
import { EffectLine } from "@/components/items/EffectLine";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
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
}: {
  item: ItemOut;
  onEquip?: (item: ItemOut) => void;
}) {
  const rawEffects =
    (item.effects?.filter((e) => e != null) as Record<string, unknown>[]) ?? [];

  return (
    <article className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-gradient-to-b from-[#1c1c1c] to-[#141414]">
      <div className="flex items-start gap-3 p-3">
        {item.image_url_icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url_icon}
            alt=""
            width={52}
            height={52}
            className="h-[52px] w-[52px] shrink-0 rounded-lg border border-[#383838] bg-black/50 object-contain p-0.5"
          />
        ) : (
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg border border-[#383838] bg-black/40 text-lg text-[#555555]">
            ?
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate text-[13px] font-semibold leading-snug text-[#e8c96e]">
                {item.name}
              </h4>
              <p className="mt-0.5 text-[11px] text-[#777]">
                Niv. {item.level}
                <span className="mx-1 text-[#444]">·</span>
                {typeLabel(item.type_name_id)}
              </p>
            </div>
            {onEquip && (
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="shrink-0"
                onClick={() => onEquip(item)}
              >
                Équiper
              </Button>
            )}
          </div>
        </div>
      </div>

      {rawEffects.length > 0 && (
        <ul className="space-y-0.5 border-t border-[#222] bg-[#101010]/80 px-3 py-2 text-[11px] text-[#d0d0d0]">
          {rawEffects.map((eff, i) => (
            <EffectLine key={i} eff={eff} />
          ))}
        </ul>
      )}
    </article>
  );
}

/* ─── Props du modal ─── */
type SetDetailModalProps = {
  setId: number;
  onClose: () => void;
  /** Affiche les actions « Équiper » (uniquement en création de build). */
  allowEquip?: boolean;
};

export function SetDetailModal({ setId, onClose, allowEquip = false }: SetDetailModalProps) {
  const [setInfo, setSetInfo] = useState<ItemSetOut | null>(null);
  const [items, setItems] = useState<ItemOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [equipMsg, setEquipMsg] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const equipSet = useBuildStore((s) => s.equipSet);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    setEquipMsg(null);
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

  const totalTiers = setInfo?.equipment_ids?.length ?? items.length;
  const bonusTiers =
    setInfo?.bonus_effects && totalTiers > 1
      ? Array.from({ length: totalTiers - 1 }, (_, i) => i + 2)
          .map((tier) => ({ tier, effects: tierEffects(setInfo.bonus_effects, tier) }))
          .filter((t) => t.effects.length > 0)
      : [];

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 p-4 backdrop-blur-[3px]"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#121212] shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
        <div className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-[#e8c96e]/50 to-transparent" />

        {/* En-tête */}
        <header className="shrink-0 border-b border-[#222] bg-[#161616]/95 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {loading ? (
                <Skeleton className="h-6 w-48" />
              ) : (
                <h2 className="font-display text-[22px] font-semibold leading-tight tracking-tight text-[#f0d78c]">
                  {setInfo?.name ?? `Panoplie #${setId}`}
                </h2>
              )}
              {!loading && (
                <p className="mt-1 text-[12px] text-[#777]">
                  {items.length > 0
                    ? `${items.length} objet${items.length > 1 ? "s" : ""}`
                    : totalTiers > 0
                      ? `${totalTiers} objets`
                      : "Panoplie"}
                  {items[0]?.level != null && (
                    <>
                      <span className="mx-1.5 text-[#3a3a3a]">·</span>
                      Niv. {Math.min(...items.map((i) => i.level))}
                      {Math.max(...items.map((i) => i.level)) !== Math.min(...items.map((i) => i.level)) && (
                        <>–{Math.max(...items.map((i) => i.level))}</>
                      )}
                    </>
                  )}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-[#666] transition hover:bg-white/[0.06] hover:text-[#e0e0e0]"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Bandeau icônes */}
          {!loading && items.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {items.map((it) => (
                <div
                  key={it.ankama_id}
                  title={it.name}
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-[#2e2e2e] bg-[#0c0c0c]"
                >
                  {it.image_url_icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.image_url_icon}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-[#555]">?</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {allowEquip && !loading && !err && (
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <Button type="button" size="sm" onClick={() => void handleEquipAll()}>
                Équiper la panoplie
              </Button>
              {equipMsg && (
                <span className="text-[12px] text-emerald-400/90">{equipMsg}</span>
              )}
            </div>
          )}
        </header>

        {/* Corps */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          )}

          {err && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {err}
            </p>
          )}

          {!loading && !err && (
            <div className="space-y-6">
              {/* Items + stats */}
              <section>
                <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#666]">
                  Pièces
                </h3>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {items.map((it) => (
                    <SetItemCard
                      key={it.ankama_id}
                      item={it}
                      onEquip={allowEquip ? handleSingleEquip : undefined}
                    />
                  ))}
                </div>
                {items.length === 0 && (
                  <p className="text-[13px] text-[#666]">Aucun objet trouvé pour cette panoplie.</p>
                )}
              </section>

              {/* Bonus par palier */}
              {bonusTiers.length > 0 && (
                <section>
                  <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#666]">
                    Bonus de panoplie
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {bonusTiers.map(({ tier, effects }) => (
                      <div
                        key={tier}
                        className="rounded-xl border border-[var(--dofus-ui-olive-border-30)] bg-[var(--dofus-ui-deep-panel)] px-3 py-2.5"
                      >
                        <p className="mb-1.5 text-[11px] font-semibold text-[var(--dofus-green-active)]">
                          {tier} pièces
                        </p>
                        <ul className="space-y-1">
                          {effects.map((eff, i) => {
                            const icon = bonusEffectIcon(eff);
                            return (
                              <li
                                key={i}
                                className="flex items-center gap-1.5 text-[12px] text-[#c8c8c8]"
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
                                  <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--dofus-color-ref-end)]" />
                                )}
                                {eff}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
