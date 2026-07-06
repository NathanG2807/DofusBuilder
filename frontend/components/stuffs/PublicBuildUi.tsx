"use client";

import { ArrowRight, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { InventoryPreview } from "@/components/build/InventoryPreview";
import { SpellsPanel } from "@/components/dashboard/SpellsPanel";
import { InventoryGridSkeleton, LoadingShell } from "@/components/ui/loading-skeletons";
import { createBuild, getBuildById, toggleBuildUpvote } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { getBuildTag } from "@/lib/buildTags";
import { classHeadUrl } from "@/lib/classImage";
import { DOFUS_CLASS_OPTIONS } from "@/lib/dofusClasses";
import { STAT_GROUPS } from "@/lib/statLabels";
import { computeDisplayStats } from "@/lib/buildDisplayStats";
import { DisplayStatsContext, useDisplayStats } from "@/hooks/useDisplayStats";
import { useBuildStore, type ExoType } from "@/store/build-store";
import type { BuildOut, PublicBuildOut, UpvoteResponse } from "@/types/api";

export function publicUserProfileUrl(username: string): string {
  return `/user/${encodeURIComponent(username)}`;
}

/* ── Upvote button ──────────────────────────────────────────────────────── */
export function UpvoteButton({
  buildId,
  upvoteCount: initialCount,
  userHasUpvoted: initialVoted,
  onChange,
  compact = false,
}: {
  buildId: string;
  upvoteCount: number;
  userHasUpvoted: boolean;
  onChange?: (result: UpvoteResponse) => void;
  compact?: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initialVoted);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setCount(initialCount);
    setVoted(initialVoted);
  }, [initialCount, initialVoted, buildId]);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (loading) return;
    if (!getAccessToken()) {
      setHint("Connectez-vous pour voter");
      window.setTimeout(() => setHint(null), 2500);
      return;
    }
    setLoading(true);
    try {
      const result = await toggleBuildUpvote(buildId);
      setCount(result.upvote_count);
      setVoted(result.user_has_upvoted);
      onChange?.(result);
    } catch (err) {
      setHint(err instanceof Error ? err.message : "Erreur");
      window.setTimeout(() => setHint(null), 2500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={(e) => void handleClick(e)}
        disabled={loading}
        title={voted ? "Retirer mon upvote" : "Upvoter ce build"}
        className={`flex items-center gap-1 rounded-md border transition disabled:opacity-50 ${
          compact ? "px-1.5 py-0.5" : "px-2 py-1"
        } ${
          voted
            ? "border-[#f0d78c]/40 bg-[#f0d78c]/15 text-[#f0d78c]"
            : "border-white/[0.08] bg-white/[0.03] text-[#666] hover:border-[#f0d78c]/30 hover:text-[#f0d78c]"
        }`}
      >
        <ThumbsUp size={compact ? 11 : 13} className={voted ? "fill-current" : ""} />
        <span className={`font-semibold tabular-nums ${compact ? "text-[10px]" : "text-[11px]"}`}>
          {count}
        </span>
      </button>
      {hint && (
        <span className="pointer-events-none absolute bottom-full right-0 z-10 mb-1 whitespace-nowrap rounded bg-[#1a1a1a] px-2 py-0.5 text-[10px] text-amber-400 shadow-lg">
          {hint}
        </span>
      )}
    </div>
  );
}

/* ── Tag chip ────────────────────────────────────────────────────────────── */
export function TagChip({ tagId }: { tagId: string }) {
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

/* ── Build card ─────────────────────────────────────────────────────────── */
export function PublicBuildCard({
  build,
  onOpen,
  onUpvoteChange,
}: {
  build: PublicBuildOut;
  onOpen: (build: PublicBuildOut) => void;
  onUpvoteChange?: (buildId: string, result: UpvoteResponse) => void;
}) {
  const classId = build.class_id ?? 8;
  const sex = (build.sex === "female" ? "female" : "male") as "male" | "female";

  return (
    <button
      type="button"
      onClick={() => onOpen(build)}
      className="plaque plaque-interactive group flex w-full flex-col text-left"
    >
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

      {(build.tags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-2">
          {(build.tags ?? []).map((t) => (
            <TagChip key={t} tagId={t} />
          ))}
        </div>
      )}

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
          <UpvoteButton
            buildId={build.id}
            upvoteCount={build.upvote_count ?? 0}
            userHasUpvoted={build.user_has_upvoted ?? false}
            compact
            onChange={(result) => onUpvoteChange?.(build.id, result)}
          />
          {build.updated_at && (
            <span className="text-[10px] text-[#3a3a3a]">
              {new Date(build.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </span>
          )}
          {build.username && (
            <Link
              href={publicUserProfileUrl(build.username)}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[80px] truncate text-[10px] text-[#666] transition hover:text-[#f0d78c]"
            >
              {build.username}
            </Link>
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

/* ── Vue plein écran build (read-only) ──────────────────────────────────── */
export function PublicBuildFullscreenView({
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
  const [upvoteCount, setUpvoteCount] = useState(build.upvote_count ?? 0);
  const [userHasUpvoted, setUserHasUpvoted] = useState(build.user_has_upvoted ?? false);

  const hydrateFromPersistedBuild = useBuildStore((s) => s.hydrateFromPersistedBuild);
  const prefetchEquippedItems = useBuildStore((s) => s.prefetchEquippedItems);

  const classId = build.class_id ?? 8;
  const sex = (build.sex === "female" ? "female" : "male") as "male" | "female";

  useEffect(() => {
    setUpvoteCount(build.upvote_count ?? 0);
    setUserHasUpvoted(build.user_has_upvoted ?? false);
  }, [build.id, build.upvote_count, build.user_has_upvoted]);

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
                    par{" "}
                    <Link
                      href={publicUserProfileUrl(build.username)}
                      className="text-[#777] transition hover:text-[#f0d78c]"
                    >
                      {build.username}
                    </Link>
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
                <UpvoteButton
                  buildId={build.id}
                  upvoteCount={upvoteCount}
                  userHasUpvoted={userHasUpvoted}
                  onChange={(result) => {
                    setUpvoteCount(result.upvote_count);
                    setUserHasUpvoted(result.user_has_upvoted);
                  }}
                />
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

        <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-6 p-5">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
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

            <SpellsPanel classId={classId} />
          </div>

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

function BuildLoadingOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d0a] p-4">
        <LoadingShell spinnerSize={56} label="Chargement du build…" minHeight="min-h-[360px]">
          <InventoryGridSkeleton />
        </LoadingShell>
        <div className="mt-3 flex justify-center border-t border-white/[0.06] pt-3">
          <button type="button" onClick={onClose} className="text-[11px] text-[#555] hover:text-[#999]">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hook + overlay pour ouvrir un build public en lecture seule. */
export function usePublicBuildViewer() {
  const [loadingBuild, setLoadingBuild] = useState(false);
  const [viewedBuild, setViewedBuild] = useState<{ summary: PublicBuildOut; full: BuildOut } | null>(null);

  const openBuild = useCallback(async (build: PublicBuildOut) => {
    setLoadingBuild(true);
    try {
      const full = await getBuildById(build.id);
      setViewedBuild({ summary: build, full });
    } catch (e) {
      console.error("Failed to load build", e);
    } finally {
      setLoadingBuild(false);
    }
  }, []);

  const viewerOverlay = (
    <>
      {loadingBuild && <BuildLoadingOverlay onClose={() => setLoadingBuild(false)} />}
      {viewedBuild && (
        <PublicBuildFullscreenView
          build={viewedBuild.summary}
          fullBuild={viewedBuild.full}
          onClose={() => setViewedBuild(null)}
        />
      )}
    </>
  );

  return { openBuild, viewerOverlay };
}
