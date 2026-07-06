"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PublicBuildCard, usePublicBuildViewer } from "@/components/stuffs/PublicBuildUi";
import { Button } from "@/components/ui/Button";
import { BuildCardsSkeletonGrid, LoadingShell } from "@/components/ui/loading-skeletons";
import { Input } from "@/components/ui/Input";
import { Plaque } from "@/components/ui/Plaque";
import { listPublicBuilds } from "@/lib/api";
import { BUILD_TAGS } from "@/lib/buildTags";
import { classHeadUrl } from "@/lib/classImage";
import { DOFUS_CLASS_OPTIONS } from "@/lib/dofusClasses";
import type { PublicBuildOut } from "@/types/api";

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

/* ── Main StuffsPanel ───────────────────────────────────────────────────── */
export function StuffsPanel() {
  const [builds, setBuilds] = useState<PublicBuildOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { openBuild, viewerOverlay } = usePublicBuildViewer();

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

  const handleUpvoteChange = useCallback((buildId: string, result: { upvote_count: number; user_has_upvoted: boolean }) => {
    setBuilds((prev) =>
      prev.map((b) =>
        b.id === buildId
          ? { ...b, upvote_count: result.upvote_count, user_has_upvoted: result.user_has_upvoted }
          : b,
      ),
    );
  }, []);

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
          <LoadingShell spinnerSize={48} label="Chargement…" minHeight="min-h-[420px]">
            <BuildCardsSkeletonGrid count={8} />
          </LoadingShell>
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
              <PublicBuildCard
                key={b.id}
                build={b}
                onOpen={(build) => void openBuild(build)}
                onUpvoteChange={handleUpvoteChange}
              />
            ))}
          </div>
        )}
      </div>

      {viewerOverlay}
    </div>
  );
}
