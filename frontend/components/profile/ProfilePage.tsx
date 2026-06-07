"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  authLogout,
  authMe,
  deleteBuild,
  getBuildById,
  listMyBuilds,
  updateBuild,
  updateMe,
} from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import { BUILD_TAGS } from "@/lib/buildTags";
import { classHeadUrl } from "@/lib/classImage";
import { DOFUS_CLASS_OPTIONS } from "@/lib/dofusClasses";
import { useBuildStore } from "@/store/build-store";
import type { BuildOut, UserPublic } from "@/types/api";

/* ── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[#222] bg-[#141414] px-6 py-4">
      <span className="text-[28px] font-bold" style={{ color }}>{value}</span>
      <span className="mt-0.5 text-[11px] text-[#555]">{label}</span>
    </div>
  );
}

/* ── Visibility icon ────────────────────────────────────────────────────── */
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ── Build row ──────────────────────────────────────────────────────────── */
function BuildRow({
  build,
  onLoad,
  onDelete,
  onToggleVisibility,
  onUpdateTags,
  toggling,
}: {
  build: BuildOut;
  onLoad: (b: BuildOut) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (b: BuildOut) => void;
  onUpdateTags: (id: string, tags: string[]) => Promise<void>;
  toggling: boolean;
}) {
  const classId = build.class_id ?? 8;
  const sex = build.sex === "female" ? "female" : "male";
  const className = DOFUS_CLASS_OPTIONS.find((c) => c.id === classId)?.label ?? `#${classId}`;

  const [editingTags, setEditingTags] = useState(false);
  const [draftTags, setDraftTags] = useState<string[]>(build.tags ?? []);
  const [savingTags, setSavingTags] = useState(false);

  function toggleDraftTag(id: string) {
    setDraftTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function handleSaveTags() {
    setSavingTags(true);
    try {
      await onUpdateTags(build.id, draftTags);
      setEditingTags(false);
    } finally {
      setSavingTags(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#222] bg-[#141414] transition hover:border-[#2e2e2e]">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Class icon */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={classHeadUrl(classId, sex)}
          alt={className}
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-lg object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-semibold text-[#e0d0a0]">{build.name}</p>
            {build.level != null && (
              <span className="shrink-0 rounded-full bg-[#1e1e1e] px-1.5 py-0.5 text-[10px] text-[#555]">
                Niv. {build.level}
              </span>
            )}
            <span className="shrink-0 text-[11px] text-[#444]">{className}</span>
          </div>
          {/* Tags display */}
          {!editingTags && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {(build.tags?.length ?? 0) > 0 ? (
                (build.tags ?? []).map((tagId) => {
                  const tag = BUILD_TAGS.find((t) => t.id === tagId);
                  return tag ? (
                    <span
                      key={tagId}
                      className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                      style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={tag.icon} alt="" width={9} height={9} className="shrink-0" />
                      {tag.label}
                    </span>
                  ) : null;
                })
              ) : (
                <span className="text-[10px] text-[#333]">Aucun tag</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Edit tags */}
          <button
            type="button"
            title="Modifier les tags"
            onClick={() => { setDraftTags(build.tags ?? []); setEditingTags((v) => !v); }}
            className={`rounded-lg border px-2.5 py-1 text-[11px] transition ${
              editingTags
                ? "border-[#f0d78c]/40 bg-[#f0d78c]/10 text-[#f0d78c]"
                : "border-[#2a2a2a] bg-[#111] text-[#555] hover:border-[#444] hover:text-[#ccc]"
            }`}
          >
            Tags
          </button>
          {/* Visibility toggle */}
          <button
            type="button"
            title={build.is_public ? "Rendre privé" : "Rendre public"}
            disabled={toggling}
            onClick={() => onToggleVisibility(build)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-40 ${
              build.is_public
                ? "border-[var(--dofus-green-active)]/40 bg-[var(--dofus-green-active)]/10 text-[var(--dofus-green-active)] hover:bg-[var(--dofus-green-active)]/20"
                : "border-[#2a2a2a] bg-[#111] text-[#555] hover:border-[#444] hover:text-[#999]"
            }`}
          >
            <EyeIcon open={build.is_public} />
            {build.is_public ? "Public" : "Privé"}
          </button>
          {/* Load */}
          <button
            type="button"
            onClick={() => onLoad(build)}
            className="rounded-lg border border-[#2a2a2a] bg-[#111] px-2.5 py-1 text-[11px] text-[#888] transition hover:border-[#444] hover:text-[#ccc]"
          >
            Charger
          </button>
          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(build.id)}
            className="rounded-lg border border-transparent px-2 py-1 text-[11px] text-red-500/50 transition hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-400"
            title="Supprimer"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Inline tag editor */}
      {editingTags && (
        <div className="border-t border-[#1e1e1e] px-4 py-3">
          <p className="mb-2 text-[11px] text-[#555]">Sélectionner les tags</p>
          <div className="flex flex-wrap gap-2">
            {BUILD_TAGS.map((tag) => {
              const active = draftTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleDraftTag(tag.id)}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition"
                  style={
                    active
                      ? { backgroundColor: `${tag.color}33`, borderColor: `${tag.color}88`, color: tag.color }
                      : { borderColor: "#2a2a2a", backgroundColor: "#0e0e0e", color: "#555" }
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tag.icon} alt="" width={12} height={12} className="shrink-0" />
                  {tag.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={savingTags}
              onClick={() => void handleSaveTags()}
              className="rounded-lg bg-[var(--dofus-green-active)]/80 px-3 py-1.5 text-[11px] font-medium text-[#0a0a0a] transition hover:bg-[var(--dofus-green-active)] disabled:opacity-50"
            >
              {savingTags ? "Sauvegarde…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => setEditingTags(false)}
              className="text-[11px] text-[#555] hover:text-[#999]"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Username editor ────────────────────────────────────────────────────── */
function UsernameEditor({
  current,
  onSave,
}: {
  current: string;
  onSave: (newName: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || trimmed === current) { setEditing(false); return; }
    if (trimmed.length < 2) { setError("Minimum 2 caractères."); return; }
    setBusy(true);
    setError(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[22px] font-bold text-[#f0d78c]">{current}</span>
        <button
          type="button"
          onClick={() => { setValue(current); setEditing(true); }}
          className="rounded-lg border border-[#2a2a2a] px-2 py-0.5 text-[10px] text-[#555] transition hover:border-[#444] hover:text-[#999]"
        >
          Modifier
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          className="rounded-lg border border-[#383838] bg-[#111] px-3 py-1.5 text-[15px] font-bold text-[#f0d78c] focus:border-[var(--dofus-green-active)] focus:outline-none"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          autoFocus
          minLength={2}
          maxLength={100}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--dofus-green-active)]/80 px-3 py-1.5 text-[12px] font-medium text-[#0a0a0a] transition hover:bg-[var(--dofus-green-active)] disabled:opacity-50"
        >
          {busy ? "…" : "OK"}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setError(null); }}
          className="text-[11px] text-[#555] hover:text-[#999]"
        >
          Annuler
        </button>
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </form>
  );
}

/* ── Main ProfilePage ───────────────────────────────────────────────────── */
export function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [builds, setBuilds] = useState<BuildOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const hydrateFromPersistedBuild = useBuildStore((s) => s.hydrateFromPersistedBuild);
  const prefetchEquippedItems = useBuildStore((s) => s.prefetchEquippedItems);

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { router.replace("/"); return; }
    try {
      const [me, myBuilds] = await Promise.all([authMe(), listMyBuilds()]);
      setUser(me);
      setBuilds(myBuilds);
    } catch {
      clearAccessToken();
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function handleUpdateUsername(newUsername: string) {
    const updated = await updateMe({ username: newUsername });
    setUser(updated);
  }

  async function handleLoad(b: BuildOut) {
    try {
      const full = await getBuildById(b.id);
      hydrateFromPersistedBuild(full);
      await prefetchEquippedItems();
      router.push("/");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible de charger le build.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce build définitivement ?")) return;
    try {
      await deleteBuild(id);
      setBuilds((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible de supprimer.");
    }
  }

  async function handleUpdateTags(id: string, tags: string[]) {
    setActionError(null);
    try {
      const updated = await updateBuild(id, { tags });
      setBuilds((prev) => prev.map((bld) => (bld.id === id ? { ...bld, tags: updated.tags } : bld)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible de sauvegarder les tags.");
      throw e;
    }
  }

  async function handleToggleVisibility(b: BuildOut) {
    const newPublic = !b.is_public;
    if (newPublic && (b.tags == null || b.tags.length === 0)) {
      setActionError("Ce build n'a pas de tags. Sauvegardez-le à nouveau avec des tags avant de le publier.");
      return;
    }
    setTogglingId(b.id);
    setActionError(null);
    try {
      const updated = await updateBuild(b.id, { is_public: newPublic });
      setBuilds((prev) => prev.map((bld) => (bld.id === b.id ? { ...bld, ...updated } : bld)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible de changer la visibilité.");
    } finally {
      setTogglingId(null);
    }
  }

  function handleLogout() {
    authLogout();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3a3a3a] border-t-[var(--dofus-green-active)]" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-red-400">{error ?? "Non connecté"}</p>
      </div>
    );
  }

  const publicCount = builds.filter((b) => b.is_public).length;
  const privateCount = builds.length - publicCount;

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 border-b border-[#1a1a1a] bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-4 px-4 md:px-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[12px] text-[#555] transition hover:text-[#999]"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Buildroom
          </Link>
          <span className="text-[#2a2a2a]">/</span>
          <span className="text-[12px] font-medium text-[#666]">Mon profil</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleLogout}
            className="text-[12px] text-[#555] transition hover:text-red-400"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8 md:px-6">
        {/* ── Profile card ── */}
        <div className="mb-8 flex flex-col gap-6 rounded-2xl border border-[#1e1e1e] bg-[#141414] p-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--dofus-ui-accent-tint-20)] text-3xl font-bold uppercase text-[var(--dofus-green-active)]">
            {user.username[0]}
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col gap-3">
            <UsernameEditor current={user.username} onSave={handleUpdateUsername} />

            <div className="flex flex-wrap gap-4 text-[12px]">
              <div className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-[#444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span className="text-[#666]">{user.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-[#444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="text-[#666]">
                  Membre depuis{" "}
                  {new Date(user.created_at).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <StatCard label="Builds créés" value={builds.length} color="#f0d78c" />
          <StatCard label="Publics" value={publicCount} color="var(--dofus-green-active)" />
          <StatCard label="Privés" value={privateCount} color="#555" />
        </div>

        {/* ── Action error ── */}
        {actionError && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-[12px] text-amber-400">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="ml-3 text-[#555] hover:text-[#999]">✕</button>
          </div>
        )}

        {/* ── Builds list ── */}
        <div>
          <div className="mb-4 flex items-baseline gap-3">
            <h2 className="text-[16px] font-bold text-[#c0b080]">Mes builds</h2>
            <span className="text-[12px] text-[#555]">{builds.length} build{builds.length !== 1 ? "s" : ""}</span>
          </div>

          {builds.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#222] py-12 text-center">
              <p className="text-[#444]">Aucun build sauvegardé.</p>
              <Link href="/" className="mt-2 inline-block text-[12px] text-[var(--dofus-green-active)] hover:underline">
                Créer un build →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {builds.map((b) => (
                <BuildRow
                  key={b.id}
                  build={b}
                  onLoad={(build) => void handleLoad(build)}
                  onDelete={(id) => void handleDelete(id)}
                  onToggleVisibility={(build) => void handleToggleVisibility(build)}
                  onUpdateTags={handleUpdateTags}
                  toggling={togglingId === b.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
