"use client";

import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ItemHoverCard, useItemHoverCard } from "@/components/items/ItemHoverCard";
import { SpellsPanel } from "@/components/dashboard/SpellsPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plaque } from "@/components/ui/Plaque";
import { createBuild, fetchItem, getBuildById, listPublicBuilds } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { BUILD_TAGS, getBuildTag } from "@/lib/buildTags";
import { classHeadUrl, classImageUrl } from "@/lib/classImage";
import { DOFUS_CLASS_OPTIONS } from "@/lib/dofusClasses";
import { BOOK_DOFUS_SLOTS, BOOK_LEFT_SLOTS, BOOK_RIGHT_SLOTS, SLOT_SHORT_LABEL } from "@/components/dashboard/inventoryLayout";
import { STAT_GROUPS } from "@/lib/statLabels";
import { computeDisplayStats } from "@/lib/buildDisplayStats";
import { DisplayStatsContext, useDisplayStats } from "@/hooks/useDisplayStats";
import { useBuildStore, type ExoType } from "@/store/build-store";
import type { BuildOut, ItemOut, PublicBuildOut } from "@/types/api";

/* ── Tag chip ────────────────────────────────────────────────────────────── */
function TagChip({ tagId }: { tagId: string }) {
  const tag = getBuildTag(tagId);
  if (!tag) return <span className="rounded-full bg-[#2a2a2a] px-2 py-0.5 text-[10px] text-[#888]">{tagId}</span>;
  return (
    <span
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: `${tag.color}22`, color: tag.color, border: `1px solid ${tag.color}44` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tag.icon} alt="" width={11} height={11} className="shrink-0" />
      {tag.label}
    </span>
  );
}

/* ── Couleur de bordure exo ─────────────────────────────────────────────── */
function exoBorderStyle(exoType: string | undefined): string {
  if (exoType === "pa") return "border-[#4a90d9] shadow-[0_0_0_2px_rgba(74,144,217,0.40)]";
  if (exoType === "pm") return "border-[var(--dofus-ui-selected-border)] shadow-[0_0_0_2px_var(--dofus-ui-selected-glow-strong)]";
  return "border-[#2e2e2e]";
}

/* ── Disposition Dofusbook avec hover cards, indicateurs d'exo et labels ── */
function InventoryPreview({
  slotsPreview,
  slots,
  exoFm,
  classId,
  sex,
  slotSize,
  dofusSlotSize,
  /** Largeur fixe du portrait central. Défaut = slotSize * 2.2 */
  centerWidth,
  /** Affiche les libellés de slot au-dessus de chaque icône (style buildroom) */
  showLabels = false,
}: {
  slotsPreview: Record<string, string | null> | null;
  slots?: Record<string, number | null> | null;
  exoFm?: Record<string, string> | null;
  classId: number;
  sex: "male" | "female";
  slotSize: number;
  dofusSlotSize?: number;
  centerWidth?: number;
  showLabels?: boolean;
}) {
  const gap = 4;
  const dofusSize = dofusSlotSize ?? Math.round(slotSize * 0.82);
  const spriteWidth = centerWidth ?? Math.round(slotSize * 2.2);

  // Hauteur de colonne = 5 slots + 4 gaps (sans labels)
  // Avec labels : chaque slot prend slotSize + 12px (label 8px + gap)
  const slotCellH = showLabels ? slotSize + 12 : slotSize;
  const colHeight = 5 * slotCellH + 4 * gap;

  const imgSize = Math.round(slotSize * 0.75);

  const { hover, show, move, scheduleHide, cancelHide, hide } = useItemHoverCard();
  const localItemCacheRef = useRef<Record<number, ItemOut>>({});
  const pendingSlotRef = useRef<string | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  function handleHoverEnter(slotKey: string, e: React.MouseEvent) {
    if (!slots) return;
    const itemId = slots[slotKey];
    if (itemId == null) return;
    const cached = useBuildStore.getState().itemById[itemId] ?? localItemCacheRef.current[itemId];
    if (cached) { show(cached, e); return; }
    pendingSlotRef.current = slotKey;
    pendingPosRef.current = { x: e.clientX, y: e.clientY };
    void fetchItem(itemId).then((item) => {
      localItemCacheRef.current[itemId] = item;
      if (pendingSlotRef.current === slotKey) {
        show(item, { clientX: pendingPosRef.current.x, clientY: pendingPosRef.current.y } as React.MouseEvent);
      }
    }).catch(() => {});
  }

  function handleHoverLeave() {
    pendingSlotRef.current = null;
    scheduleHide();
  }

  /** Un slot avec optionnellement le label de type en-dessous du titre */
  function SlotTile({ slotKey, size }: { slotKey: string; size: number }) {
    const url = slotsPreview?.[slotKey] ?? null;
    const exoType = exoFm?.[slotKey];
    const hasItem = !!(slots?.[slotKey]);
    const tileImgSize = Math.round(size * 0.75);
    const label = SLOT_SHORT_LABEL[slotKey as keyof typeof SLOT_SHORT_LABEL];

    if (showLabels) {
      // Mode buildroom : label + icône dans un conteneur "carte"
      return (
        <div
          className={`relative flex shrink-0 flex-col items-center gap-0.5 rounded-lg border p-1 transition ${exoBorderStyle(exoType)} bg-[#111111]`}
          style={{ width: size + 10, minHeight: slotCellH }}
          onMouseEnter={hasItem ? (e) => handleHoverEnter(slotKey, e) : undefined}
          onMouseMove={hasItem ? move : undefined}
          onMouseLeave={hasItem ? handleHoverLeave : undefined}
        >
          <span className="max-w-[72px] truncate text-[7px] font-semibold uppercase tracking-wide text-[#555]">
            {label}
          </span>
          <div
            className="flex items-center justify-center overflow-hidden rounded border border-[#303030] bg-[#0e0e0e]"
            style={{ width: size, height: size }}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" width={tileImgSize} height={tileImgSize}
                style={{ width: tileImgSize, height: tileImgSize }}
                className="object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="rounded-sm bg-[#232323] opacity-50"
                style={{ width: Math.round(size * 0.35), height: Math.round(size * 0.35) }} />
            )}
          </div>
          {exoType && (
            <div className="pointer-events-none absolute bottom-1 right-1 z-10 flex h-[11px] w-[11px] items-center justify-center rounded-sm text-[7px] font-bold"
              style={{ backgroundColor: exoType === "pa" ? "#4a90d9" : "var(--dofus-ui-selected-border)", color: "#fff" }}>
              {exoType === "pa" ? "PA" : "PM"}
            </div>
          )}
        </div>
      );
    }

    // Mode compact (cards) : juste l'icône
    return (
      <div
        className={`relative flex shrink-0 items-center justify-center rounded-[5px] border bg-[#111111] ${exoBorderStyle(exoType)}`}
        style={{ width: size, height: size }}
        onMouseEnter={hasItem ? (e) => handleHoverEnter(slotKey, e) : undefined}
        onMouseMove={hasItem ? move : undefined}
        onMouseLeave={hasItem ? handleHoverLeave : undefined}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" width={tileImgSize} height={tileImgSize}
            style={{ width: tileImgSize, height: tileImgSize }}
            className="object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="rounded-sm bg-[#232323] opacity-50"
            style={{ width: Math.round(size * 0.35), height: Math.round(size * 0.35) }} />
        )}
        {exoType && (
          <div className="pointer-events-none absolute bottom-0 right-0 z-10 flex h-[9px] w-[9px] items-center justify-center rounded-tl-[3px] text-[6px] font-bold"
            style={{ backgroundColor: exoType === "pa" ? "#4a90d9" : "var(--dofus-ui-selected-border)", color: "#fff" }}>
            {exoType === "pa" ? "PA" : "PM"}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Centrage du bloc */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center">
          {/* Rangée principale : gauche | portrait | droite */}
          <div className="flex items-start" style={{ gap }}>
            {/* Colonne gauche */}
            <div className="flex flex-col" style={{ gap }}>
              {BOOK_LEFT_SLOTS.map((s) => <SlotTile key={s} slotKey={s} size={slotSize} />)}
            </div>

            {/* Portrait de classe */}
            <div
              className="flex shrink-0 items-end justify-center overflow-hidden"
              style={{ height: colHeight, width: spriteWidth }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={classImageUrl(classId, sex)}
                alt=""
                style={{ height: "100%", width: "100%" }}
                className="object-contain object-bottom drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>

            {/* Colonne droite */}
            <div className="flex flex-col" style={{ gap }}>
              {BOOK_RIGHT_SLOTS.map((s) => <SlotTile key={s} slotKey={s} size={slotSize} />)}
            </div>
          </div>

          {/* Rangée Dofus / Trophées */}
          <div className="mt-2 flex items-center" style={{ gap }}>
            {BOOK_DOFUS_SLOTS.map((s) => {
              const url = slotsPreview?.[s] ?? null;
              const dofusImgSize = Math.round(dofusSize * 0.75);
              const hasItem = !!(slots?.[s]);
              return (
                <div key={s}
                  className={`relative flex shrink-0 items-center justify-center rounded-[5px] border bg-[#111111] ${exoBorderStyle(exoFm?.[s])}`}
                  style={{ width: dofusSize, height: dofusSize }}
                  onMouseEnter={hasItem ? (e) => handleHoverEnter(s, e) : undefined}
                  onMouseMove={hasItem ? move : undefined}
                  onMouseLeave={hasItem ? handleHoverLeave : undefined}
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" width={dofusImgSize} height={dofusImgSize}
                      style={{ width: dofusImgSize, height: dofusImgSize }}
                      className="object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="rounded-sm bg-[#232323] opacity-50"
                      style={{ width: Math.round(dofusSize * 0.35), height: Math.round(dofusSize * 0.35) }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {hover && (
        <ItemHoverCard item={hover.item} anchor={{ x: hover.x, y: hover.y }}
          onMouseEnter={cancelHide} onMouseLeave={scheduleHide} onForceHide={hide} />
      )}
    </>
  );
}

/* ── Build card ─────────────────────────────────────────────────────────── */
function BuildCard({
  build,
  onOpen,
}: {
  build: PublicBuildOut;
  onOpen: (build: PublicBuildOut) => void;
}) {
  const classId = build.class_id ?? 8;
  const sex = (build.sex === "female" ? "female" : "male") as "male" | "female";

  return (
    <button
      type="button"
      onClick={() => onOpen(build)}
      className="plaque plaque-interactive group flex w-full flex-col text-left"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[14px] font-medium text-[#e0d0a0] group-hover:text-[#f0d78c]">
            {build.name}
          </p>
          {build.level != null && (
            <p className="text-[11px] text-[#555]">Niv. {build.level}</p>
          )}
        </div>
        <div className="shrink-0 rounded-md bg-white/[0.06] p-1 text-[#666] opacity-0 transition group-hover:opacity-100">
          <ArrowRight size={12} />
        </div>
      </div>

      {/* Tags */}
      {(build.tags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-2">
          {(build.tags ?? []).map((t) => (
            <TagChip key={t} tagId={t} />
          ))}
        </div>
      )}

      {/* Inventory preview — layout Dofusbook */}
      <div className="flex justify-center px-2 pb-3">
        <InventoryPreview
          slotsPreview={build.slots_preview}
          slots={build.slots}
          exoFm={build.exo_fm}
          classId={classId}
          sex={sex}
          slotSize={32}
          dofusSlotSize={26}
          centerWidth={55}
        />
      </div>

      {/* Footer: classe + auteur + date */}
      <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={classHeadUrl(classId, sex)}
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] shrink-0 rounded-sm object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <span className="truncate text-[11px] text-[#666]">
            {DOFUS_CLASS_OPTIONS.find((c) => c.id === classId)?.label ?? `Classe ${classId}`}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {build.updated_at && (
            <span className="text-[10px] text-[#3a3a3a]">
              {new Date(build.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </span>
          )}
          {build.username && (
            <span className="max-w-[80px] truncate text-[10px] text-[#444]">
              {build.username}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Panneau stats read-only ────────────────────────────────────────────── */
function ReadOnlyStatsPanel() {
  const stats = useDisplayStats();
  const pa = stats.pa ?? 6;
  const pm = stats.pm ?? 3;
  const pv = stats.vitality ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* PA / PM / PV gems */}
      <div className="flex items-center justify-center gap-2">
        <div className="relative flex h-[46px] w-[46px] items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/build/pa.png" alt="PA" className="h-full w-full object-contain drop-shadow-lg" />
          <span className="absolute text-[13px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">{pa}</span>
        </div>
        <div className="relative flex h-[58px] w-[58px] items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/build/pv.png" alt="PV" className="h-full w-full object-contain drop-shadow-lg" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/build/pvedge.png" alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
          <span className="absolute text-[13px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">{pv}</span>
        </div>
        <div className="relative flex h-[46px] w-[46px] items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/build/pm.png" alt="PM" className="h-full w-full object-contain drop-shadow-lg" />
          <span className="absolute text-[13px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">{pm}</span>
        </div>
      </div>

      {/* Groupes de stats (valeurs non nulles uniquement) */}
      {STAT_GROUPS.map((group) => {
        const rows = group.stats.filter((s) => (stats[s.key] ?? 0) !== 0);
        if (rows.length === 0) return null;
        return (
          <div key={group.title}>
            <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#444]">{group.title}</p>
            <div className="space-y-0.5">
              {rows.map((s) => {
                const v = stats[s.key] ?? 0;
                return (
                  <div key={s.key} className="flex items-center gap-1.5 rounded bg-[#1e1e1e] px-2 py-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/assets/elements/${s.icon}.png`}
                      alt=""
                      width={14}
                      height={14}
                      className="h-[14px] w-[14px] shrink-0 object-contain"
                    />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-[#888]">{s.label}</span>
                    <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${v > 0 ? "text-[#f0d78c]" : "text-red-400"}`}>
                      {v > 0 ? `+${v}` : v}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Vue plein écran build (read-only, comme la buildroom) ──────────────── */
function BuildFullscreenView({
  build,
  fullBuild,
  onClose,
}: {
  build: PublicBuildOut;
  fullBuild: BuildOut;
  onClose: () => void;
}) {
  const [copying, setCopying] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const hydrateFromPersistedBuild = useBuildStore((s) => s.hydrateFromPersistedBuild);
  const prefetchEquippedItems = useBuildStore((s) => s.prefetchEquippedItems);

  const classId = build.class_id ?? 8;
  const sex = (build.sex === "female" ? "female" : "male") as "male" | "female";

  // Stats complètes du build consulté (items + char + parcho + exo PA/PM)
  const displayStats = useMemo(
    () =>
      computeDisplayStats(
        fullBuild.total_stats ?? {},
        fullBuild.level ?? 200,
        fullBuild.char_stats ?? {},
        fullBuild.parcho_stats ?? {},
        (fullBuild.exo_fm ?? {}) as Partial<Record<string, ExoType>>,
      ),
    [fullBuild],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleCopy() {
    if (!getAccessToken()) {
      setCopyMsg("Connectez-vous pour copier ce build.");
      return;
    }
    setCopying(true);
    setCopyMsg(null);
    try {
      await createBuild({
        name: `Copie — ${fullBuild.name}`,
        slots: fullBuild.slots,
        total_stats: fullBuild.total_stats,
        active_set_bonuses: fullBuild.active_set_bonuses,
        char_stats: fullBuild.char_stats,
        parcho_stats: fullBuild.parcho_stats,
        exo_fm: fullBuild.exo_fm,
        locked_slots: fullBuild.locked_slots,
        level: fullBuild.level,
        class_id: fullBuild.class_id,
        sex: fullBuild.sex,
        is_public: false,
        tags: [],
        slots_preview: fullBuild.slots_preview,
      });
      hydrateFromPersistedBuild(fullBuild);
      await prefetchEquippedItems();
      window.dispatchEvent(new CustomEvent("switch-tab", { detail: { tab: "buildroom" } }));
    } catch (e) {
      setCopyMsg(e instanceof Error ? e.message : "Erreur lors de la copie.");
      setCopying(false);
    }
  }

  return (
    <DisplayStatsContext.Provider value={displayStats}>
    <div className="fixed inset-0 z-50 flex flex-col overflow-auto bg-[#0f0f0f]">
      {/* ── Barre de titre ── */}
      <div className="sticky top-0 z-10 border-b border-[#1e1e1e] bg-[#141414] px-5 py-3">
        <div className="mx-auto flex max-w-[1400px] items-start gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={classHeadUrl(classId, sex)}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 rounded-md object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <h1 className="text-[16px] font-bold text-[#f0d78c] leading-none">{build.name}</h1>
              {build.level != null && (
                <span className="rounded-md bg-[#1e1e1e] px-2 py-0.5 text-[11px] text-[#666]">Niv. {build.level}</span>
              )}
              {build.username && (
                <span className="text-[12px] text-[#555]">
                  par <span className="text-[#777]">{build.username}</span>
                </span>
              )}
            </div>
            {(build.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {(build.tags ?? []).map((t) => <TagChip key={t} tagId={t} />)}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              {copyMsg && (
                <span className={`text-[12px] ${copyMsg.includes("Connectez") ? "text-amber-400" : "text-red-400"}`}>
                  {copyMsg}
                </span>
              )}
              <button
                type="button"
                disabled={copying}
                onClick={() => void handleCopy()}
                className="flex items-center gap-1.5 rounded-lg bg-[#f0d78c]/10 px-3 py-1.5 text-[12px] font-medium text-[#f0d78c] border border-[#f0d78c]/30 transition hover:bg-[#f0d78c]/20 disabled:opacity-50"
              >
                {copying ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border border-[#f0d78c]/40 border-t-[#f0d78c]" />
                    Copie…
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copier dans mes builds
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#282828] p-1.5 text-[#555] transition hover:border-[#444] hover:text-[#aaa]"
                title="Fermer (Échap)"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <span className="text-[10px] text-[#333]">Lecture seule — Échap pour fermer</span>
          </div>
        </div>
      </div>

      {/* ── Contenu principal ── */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-6 p-5">
        {/* Zone inventaire + sorts */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Inventaire */}
          <div className="rounded-xl border border-[#282828] bg-[#181818] p-5">
            <div className="mb-4 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={classHeadUrl(classId, sex)}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 rounded-md object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <div>
                <p className="text-[13px] font-semibold text-[#d0d0d0]">{build.name}</p>
                <p className="text-[11px] text-[#555]">
                  {DOFUS_CLASS_OPTIONS.find((c) => c.id === classId)?.label}
                  {build.level != null && ` • Niv. ${build.level}`}
                </p>
              </div>
            </div>

            <InventoryPreview
              slotsPreview={fullBuild.slots_preview}
              slots={fullBuild.slots as Record<string, number | null> | null}
              exoFm={fullBuild.exo_fm}
              classId={classId}
              sex={sex}
              slotSize={58}
              dofusSlotSize={48}
              centerWidth={160}
              showLabels
            />
            <p className="mt-3 text-center text-[9px] font-semibold uppercase tracking-widest text-[#484848]">
              Dofus &amp; Trophées
            </p>
          </div>

          {/* Sorts de classe */}
          <SpellsPanel classId={classId} />
        </div>

        {/* Panneau stats */}
        <div className="w-[240px] shrink-0">
          <div className="rounded-xl border border-[#282828] bg-[#181818] p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#555]">Statistiques</p>
            <ReadOnlyStatsPanel />
          </div>
        </div>
      </div>
    </div>
    </DisplayStatsContext.Provider>
  );
}

/* ── Filter sidebar ─────────────────────────────────────────────────────── */
function FilterSidebar({
  selectedClass, onClassChange, selectedTags, onTagsChange, search, onSearchChange,
}: {
  selectedClass: number | null;
  onClassChange: (id: number | null) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  function toggleTag(id: string) {
    onTagsChange(selectedTags.includes(id) ? selectedTags.filter((t) => t !== id) : [...selectedTags, id]);
  }

  return (
    <aside className="w-[200px] shrink-0 space-y-5">
      <Plaque className="space-y-4 p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#555]">Filtres</p>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#444]">Recherche</p>
          <Input
            placeholder="Nom du build..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#444]">Classe</p>
          <div className="grid grid-cols-5 gap-1">
            {DOFUS_CLASS_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onClassChange(selectedClass === c.id ? null : c.id)}
                title={c.label}
                className={`rounded-md p-0.5 transition ${
                  selectedClass === c.id
                    ? "bg-[var(--dofus-ui-accent-tint-20)] ring-1 ring-[var(--dofus-green-active)]"
                    : "hover:bg-[#222]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={classHeadUrl(c.id, "male")} alt={c.label} width={26} height={26}
                  className="h-[26px] w-[26px] rounded-sm object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#444]">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {BUILD_TAGS.map((tag) => {
              const active = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  title={tag.label}
                  className={`flex h-[30px] w-[30px] items-center justify-center rounded-lg border transition ${
                    active ? "border-transparent" : "border-[#282828] bg-[#0e0e0e] hover:bg-[#1e1e1e]"
                  }`}
                  style={active ? { backgroundColor: `${tag.color}33`, borderColor: `${tag.color}88` } : {}}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tag.icon} alt={tag.label} width={18} height={18} className="h-[18px] w-[18px] object-contain" />
                </button>
              );
            })}
          </div>
        </div>

        {(selectedClass !== null || selectedTags.length > 0 || search) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => { onClassChange(null); onTagsChange([]); onSearchChange(""); }}
          >
            Réinitialiser
          </Button>
        )}
      </Plaque>
    </aside>
  );
}

/* ── Loading overlay ────────────────────────────────────────────────────── */
function BuildLoadingOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Plaque className="flex flex-col items-center gap-3 px-8 py-6">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3a3a3a] border-t-[var(--dofus-green-active)]" />
        <p className="text-sm text-[#aaa]">Chargement du build…</p>
        <button type="button" onClick={onClose} className="mt-1 text-[11px] text-[#555] hover:text-[#999]">Annuler</button>
      </Plaque>
    </div>
  );
}

/* ── Main StuffsPanel ───────────────────────────────────────────────────── */
export function StuffsPanel() {
  const [builds, setBuilds] = useState<PublicBuildOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingBuild, setLoadingBuild] = useState(false);
  const [viewedBuild, setViewedBuild] = useState<{ summary: PublicBuildOut; full: BuildOut } | null>(null);

  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  const fetchBuilds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPublicBuilds({
        q: debouncedSearch || undefined,
        class_id: selectedClass ?? undefined,
        tags: selectedTags.length ? selectedTags : undefined,
      });
      setBuilds(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedClass, selectedTags]);

  useEffect(() => { void fetchBuilds(); }, [fetchBuilds]);

  async function handleOpenBuild(build: PublicBuildOut) {
    setLoadingBuild(true);
    try {
      const full = await getBuildById(build.id);
      setViewedBuild({ summary: build, full });
    } catch (e) {
      console.error("Failed to load build", e);
    } finally {
      setLoadingBuild(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-6 p-4 md:p-5">
      <FilterSidebar
        selectedClass={selectedClass}
        onClassChange={setSelectedClass}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        search={search}
        onSearchChange={setSearch}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="font-display text-[19px] font-medium text-[#e0d0a0]">Stuffs publics</h2>
          {!loading && (
            <span className="text-[12px] text-[#555]">{builds.length} build{builds.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {loading && (
          <div className="flex flex-1 items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3a3a3a] border-t-[var(--dofus-green-active)]" />
              <p className="text-sm text-[#555]">Chargement…</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        {!loading && !error && builds.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
            <p className="text-[#444] text-[15px]">Aucun build public trouvé</p>
            <p className="mt-1 text-[12px] text-[#333]">
              Modifiez les filtres ou publiez vos propres builds depuis le Buildroom.
            </p>
          </div>
        )}

        {!loading && !error && builds.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {builds.map((b) => (
              <BuildCard key={b.id} build={b} onOpen={(build) => void handleOpenBuild(build)} />
            ))}
          </div>
        )}
      </div>

      {loadingBuild && <BuildLoadingOverlay onClose={() => setLoadingBuild(false)} />}

      {viewedBuild && (
        <BuildFullscreenView
          build={viewedBuild.summary}
          fullBuild={viewedBuild.full}
          onClose={() => setViewedBuild(null)}
        />
      )}
    </div>
  );
}
