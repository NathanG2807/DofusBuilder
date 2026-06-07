"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getBuildById, listPublicBuilds } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { BUILD_TAGS, getBuildTag } from "@/lib/buildTags";
import { classHeadUrl, classImageUrl } from "@/lib/classImage";
import { DOFUS_CLASS_OPTIONS } from "@/lib/dofusClasses";
import { useBuildStore } from "@/store/build-store";
import type { PublicBuildOut } from "@/types/api";

/* ── Slot order for item preview grid ───────────────────────────────────── */
const PREVIEW_SLOTS = [
  "hat", "amulet", "weapon",
  "ring1", "belt", "ring2",
  "boots", "cloak", "shield",
  "dofus1", "dofus2", "dofus3",
  "dofus4", "dofus5", "dofus6",
  "pet",
] as const;

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

/* ── Compact item preview grid ──────────────────────────────────────────── */
function SlotPreviewGrid({ slotsPreview }: { slotsPreview: Record<string, string | null> | null }) {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {PREVIEW_SLOTS.map((slot) => {
        const imgUrl = slotsPreview?.[slot] ?? null;
        return (
          <div
            key={slot}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[4px] bg-[#1a1a1a] border border-[#2a2a2a]"
          >
            {imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgUrl}
                alt=""
                width={26}
                height={26}
                className="h-[26px] w-[26px] object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="h-[14px] w-[14px] rounded-sm bg-[#2a2a2a] opacity-40" />
            )}
          </div>
        );
      })}
    </div>
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
      className="group flex w-full flex-col rounded-xl border border-[#282828] bg-[#141414] text-left transition hover:border-[#3a3a3a] hover:bg-[#1a1a1a]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[#e0d0a0] group-hover:text-[#f0d78c]">
            {build.name}
          </p>
          {build.level != null && (
            <p className="text-[11px] text-[#555]">Niv. {build.level}</p>
          )}
        </div>
        <div className="shrink-0 rounded-md bg-[#1e1e1e] p-1 opacity-0 transition group-hover:opacity-100">
          <svg className="h-3 w-3 text-[#666]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
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

      {/* Content: items + class sprite */}
      <div className="flex items-end justify-between gap-2 px-3 pb-3">
        <SlotPreviewGrid slotsPreview={build.slots_preview} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={classImageUrl(classId, sex)}
          alt=""
          width={72}
          height={72}
          className="h-[72px] w-[72px] shrink-0 object-contain object-bottom drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      </div>

      {/* Class head chip */}
      <div className="flex items-center gap-1.5 border-t border-[#1e1e1e] px-3 py-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={classHeadUrl(classId, sex)}
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] shrink-0 rounded-sm object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        <span className="text-[11px] text-[#666]">
          {DOFUS_CLASS_OPTIONS.find((c) => c.id === classId)?.label ?? `Classe ${classId}`}
        </span>
      </div>
    </button>
  );
}

/* ── Filter sidebar ─────────────────────────────────────────────────────── */
function FilterSidebar({
  selectedClass,
  onClassChange,
  selectedTags,
  onTagsChange,
  search,
  onSearchChange,
}: {
  selectedClass: number | null;
  onClassChange: (id: number | null) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  function toggleTag(id: string) {
    onTagsChange(
      selectedTags.includes(id)
        ? selectedTags.filter((t) => t !== id)
        : [...selectedTags, id],
    );
  }

  return (
    <aside className="w-[200px] shrink-0 space-y-5">
      <div className="rounded-xl border border-[#222] bg-[#141414] p-4 space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#555]">Filtres</p>

        {/* Search */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#444]">Recherche</p>
          <input
            className="w-full rounded-lg border border-[#282828] bg-[#0e0e0e] px-2.5 py-1.5 text-[12px] text-[#d0d0d0] placeholder:text-[#444] focus:border-[#3a3a3a] focus:outline-none"
            placeholder="Nom du build..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Classes */}
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
                <img
                  src={classHeadUrl(c.id, "male")}
                  alt={c.label}
                  width={26}
                  height={26}
                  className="h-[26px] w-[26px] rounded-sm object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
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
                    active
                      ? "border-transparent"
                      : "border-[#282828] bg-[#0e0e0e] hover:bg-[#1e1e1e]"
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

        {/* Reset filters */}
        {(selectedClass !== null || selectedTags.length > 0 || search) && (
          <button
            type="button"
            onClick={() => {
              onClassChange(null);
              onTagsChange([]);
              onSearchChange("");
            }}
            className="w-full rounded-lg border border-[#282828] py-1.5 text-[11px] text-[#666] hover:border-[#444] hover:text-[#aaa] transition"
          >
            Réinitialiser
          </button>
        )}
      </div>
    </aside>
  );
}

/* ── Fullscreen build viewer (opens a saved build in buildroom) ─────────── */
function BuildLoadingOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-[#282828] bg-[#141414] px-8 py-6">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3a3a3a] border-t-[var(--dofus-green-active)]" />
        <p className="text-sm text-[#aaa]">Chargement du build…</p>
        <button type="button" onClick={onClose} className="mt-1 text-[11px] text-[#555] hover:text-[#999]">
          Annuler
        </button>
      </div>
    </div>
  );
}

/* ── Main StuffsPanel ───────────────────────────────────────────────────── */
export function StuffsPanel() {
  const [builds, setBuilds] = useState<PublicBuildOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingBuild, setLoadingBuild] = useState(false);

  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const hydrateFromPersistedBuild = useBuildStore((s) => s.hydrateFromPersistedBuild);
  const prefetchEquippedItems = useBuildStore((s) => s.prefetchEquippedItems);

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
      hydrateFromPersistedBuild(full);
      await prefetchEquippedItems();

      // Determine if this build belongs to the current user
      // We can't know the owner username easily, but we can check if the user
      // is logged in. If they're not, or if they want a copy, the banner appears.
      // We mark it as "foreign" if the user is logged in (they can copy it)
      // or not logged in (read-only notice).
      const isForeign = true; // always show the banner — user can dismiss if it's their own

      window.dispatchEvent(
        new CustomEvent("switch-tab", {
          detail: {
            tab: "buildroom",
            foreign: isForeign ? { id: build.id, name: build.name } : undefined,
          },
        }),
      );
    } catch (e) {
      console.error("Failed to load build", e);
    } finally {
      setLoadingBuild(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 p-4 md:p-5">
      <FilterSidebar
        selectedClass={selectedClass}
        onClassChange={setSelectedClass}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        search={search}
        onSearchChange={setSearch}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="text-[17px] font-bold text-[#e0d0a0]">Stuffs publics</h2>
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
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
            {builds.map((b) => (
              <BuildCard key={b.id} build={b} onOpen={(build) => void handleOpenBuild(build)} />
            ))}
          </div>
        )}
      </div>

      {loadingBuild && <BuildLoadingOverlay onClose={() => setLoadingBuild(false)} />}
    </div>
  );
}
