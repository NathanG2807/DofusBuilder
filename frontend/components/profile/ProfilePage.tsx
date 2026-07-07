"use client";

import { ArrowLeft, Calendar, ChevronDown, Eye, EyeOff, Mail, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { InventoryPreview } from "@/components/build/InventoryPreview";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DofusSpinner } from "@/components/ui/DofusSpinner";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plaque } from "@/components/ui/Plaque";
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
    <Plaque flat className="flex flex-col items-center justify-center px-6 py-5">
      <span className="font-display text-[30px] font-medium" style={{ color }}>{value}</span>
      <span className="mt-0.5 text-[11px] uppercase tracking-wide text-[#555]">{label}</span>
    </Plaque>
  );
}

/* ── Build row ──────────────────────────────────────────────────────────── */
function BuildRow({
  build,
  expanded,
  onToggleExpand,
  onEdit,
  onRequestDelete,
  onToggleVisibility,
  onUpdateTags,
  onRenameBuild,
  toggling,
}: {
  build: BuildOut;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: (b: BuildOut) => void;
  onRequestDelete: (b: BuildOut) => void;
  onToggleVisibility: (b: BuildOut) => void;
  onUpdateTags: (id: string, tags: string[]) => Promise<void>;
  onRenameBuild: (id: string, name: string) => Promise<void>;
  toggling: boolean;
}) {
  const classId = build.class_id ?? 8;
  const sex = build.sex === "female" ? "female" : "male";
  const className = DOFUS_CLASS_OPTIONS.find((c) => c.id === classId)?.label ?? `#${classId}`;

  const [editingTags, setEditingTags] = useState(false);
  const [draftTags, setDraftTags] = useState<string[]>(build.tags ?? []);
  const [savingTags, setSavingTags] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(build.name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === build.name) { setEditingName(false); return; }
    setSavingName(true);
    setNameError(null);
    try {
      await onRenameBuild(build.id, trimmed);
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingName(false);
    }
  }

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
    } catch {
      // L'erreur est affichée via actionError dans ProfilePage
    } finally {
      setSavingTags(false);
    }
  }

  return (
    <Plaque flat interactive>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center gap-3 text-left transition hover:opacity-90"
          aria-expanded={expanded}
        >
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
              {editingName ? (
                <form
                  onSubmit={(e) => void handleSaveName(e)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex min-w-0 flex-1 items-center gap-1.5"
                >
                  <Input
                    containerClassName="min-w-0 flex-1"
                    className="h-6 py-0 text-[13px] font-semibold text-[#e0d0a0]"
                    value={draftName}
                    onChange={(e) => { setDraftName(e.target.value); setNameError(null); }}
                    autoFocus
                    minLength={1}
                    maxLength={255}
                    disabled={savingName}
                  />
                  <Button type="submit" size="xs" disabled={savingName}>
                    {savingName ? "…" : "OK"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setEditingName(false); setDraftName(build.name); setNameError(null); }}
                    className="shrink-0 text-[11px] text-[#555] hover:text-[#999]"
                  >
                    Annuler
                  </button>
                  {nameError && <span className="shrink-0 text-[10px] text-red-400">{nameError}</span>}
                </form>
              ) : (
                <>
                  <p className="truncate text-[13px] font-semibold text-[#e0d0a0]">{build.name}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDraftName(build.name); setEditingName(true); }}
                    className="shrink-0 rounded p-0.5 text-[#444] transition hover:text-[#999]"
                    title="Renommer"
                  >
                    <Pencil size={11} />
                  </button>
                </>
              )}
              {!editingName && build.level != null && (
                <span className="shrink-0 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-[#666]">
                  Niv. {build.level}
                </span>
              )}
              {!editingName && <span className="shrink-0 text-[11px] text-[#4a4a4a]">{className}</span>}
            </div>
            {/* Tags display + date */}
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
                {build.updated_at && (
                  <span className="ml-1 text-[10px] text-[#3a3a3a]">
                    · Du {new Date(build.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                )}
              </div>
            )}
          </div>

          <ChevronDown
            size={16}
            className={`shrink-0 text-[#555] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Edit tags */}
          <button
            type="button"
            title="Modifier les tags"
            onClick={() => { setDraftTags(build.tags ?? []); setEditingTags((v) => !v); }}
            className={`rounded-[8px] border px-2.5 py-1 text-[11px] transition ${
              editingTags
                ? "border-[#f0d78c]/40 bg-[#f0d78c]/10 text-[#f0d78c]"
                : "border-[color:var(--atelier-plaque-border)] bg-white/[0.02] text-[#666] hover:border-white/20 hover:text-[#ccc]"
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
            className={`flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-40 ${
              build.is_public
                ? "border-[var(--dofus-green-active)]/40 bg-[var(--dofus-green-active)]/10 text-[var(--dofus-green-active)] hover:bg-[var(--dofus-green-active)]/20"
                : "border-[color:var(--atelier-plaque-border)] bg-white/[0.02] text-[#666] hover:border-white/20 hover:text-[#999]"
            }`}
          >
            {build.is_public ? <Eye size={13} /> : <EyeOff size={13} />}
            {build.is_public ? "Public" : "Privé"}
          </button>
          {/* Edit (load into builder for editing, save will PATCH the same build) */}
          <button
            type="button"
            onClick={() => onEdit(build)}
            title="Éditer dans le builder"
            className="flex items-center gap-1.5 rounded-[8px] border border-[color:var(--atelier-plaque-border)] bg-white/[0.02] px-2.5 py-1 text-[11px] text-[#888] transition hover:border-white/20 hover:text-[#ccc]"
          >
            <Pencil size={12} />
            Éditer
          </button>
          {/* Delete */}
          <button
            type="button"
            onClick={() => onRequestDelete(build)}
            className="rounded-[8px] border border-transparent px-2 py-1 text-[11px] text-red-500/50 transition hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-400"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Build preview accordion */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-5">
          <InventoryPreview
            slotsPreview={build.slots_preview}
            slots={build.slots}
            exoFm={build.exo_fm}
            classId={classId}
            sex={sex}
            slotSize={40}
            dofusSlotSize={32}
            centerWidth={70}
          />
          <div className="mt-4 flex justify-center">
            <Link
              href={`/build/${build.id}`}
              className="text-[11px] text-[var(--dofus-green-active)] transition hover:underline"
            >
              Voir le build complet →
            </Link>
          </div>
        </div>
      )}

      {/* Inline tag editor */}
      {editingTags && (
        <div className="border-t border-white/[0.06] px-4 py-3">
          <p className="mb-2 text-[11px] text-[#555]">Sélectionner les tags</p>
          <div className="flex flex-wrap gap-2">
            {BUILD_TAGS.map((tag) => {
              const active = draftTags.includes(tag.id);
              return (
                <Chip
                  key={tag.id}
                  active={active}
                  accentColor={tag.color}
                  onClick={() => toggleDraftTag(tag.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tag.icon} alt="" width={12} height={12} className="shrink-0" />
                  {tag.label}
                </Chip>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={savingTags}
              onClick={() => void handleSaveTags()}
            >
              {savingTags ? "Sauvegarde…" : "Enregistrer"}
            </Button>
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
    </Plaque>
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
        <span className="font-display text-[24px] font-medium text-[#f0d78c]">{current}</span>
        <button
          type="button"
          onClick={() => { setValue(current); setEditing(true); }}
          className="rounded-[8px] border border-[color:var(--atelier-plaque-border)] px-2 py-0.5 text-[10px] text-[#555] transition hover:border-white/20 hover:text-[#999]"
        >
          Modifier
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          containerClassName="min-w-0"
          className="font-display text-[15px] font-medium text-[#f0d78c]"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          autoFocus
          minLength={2}
          maxLength={100}
        />
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "…" : "OK"}
        </Button>
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
  const [expandedBuildId, setExpandedBuildId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BuildOut | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function handleEdit(b: BuildOut) {
    try {
      const full = await getBuildById(b.id);
      hydrateFromPersistedBuild(full);  // positionne aussi savedBuildId → save va PATCH
      await prefetchEquippedItems();
      router.push("/builder");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible de charger le build.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteBuild(deleteTarget.id);
      setBuilds((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      if (expandedBuildId === deleteTarget.id) setExpandedBuildId(null);
      setDeleteTarget(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible de supprimer.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleRenameBuild(id: string, name: string) {
    setActionError(null);
    try {
      const updated = await updateBuild(id, { name });
      setBuilds((prev) => prev.map((b) => (b.id === id ? { ...b, name: updated.name } : b)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible de renommer le build.");
      throw e;
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
        <DofusSpinner size={72} label="Chargement du profil…" />
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
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-4 px-4 md:px-6">
          <Link
            href="/builder"
            className="flex items-center gap-1.5 text-[12px] text-[#555] transition hover:text-[#999]"
          >
            <ArrowLeft size={14} />
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
        <Plaque ornate className="mb-8 flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <UserAvatar username={user.username} size="lg" />

          {/* Info */}
          <div className="flex flex-1 flex-col gap-3">
            <UsernameEditor current={user.username} onSave={handleUpdateUsername} />

            <div className="flex flex-wrap gap-4 text-[12px]">
              <div className="flex items-center gap-1.5">
                <Mail size={14} className="text-[#444]" />
                <span className="text-[#666]">{user.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-[#444]" />
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
        </Plaque>

        {/* ── Stats ── */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Builds créés" value={builds.length} color="#f0d78c" />
          <StatCard label="Publics" value={publicCount} color="var(--dofus-green-active)" />
          <StatCard label="Privés" value={privateCount} color="#666" />
          <StatCard label="Upvotes reçus" value={user.total_upvotes ?? 0} color="#f0d78c" />
        </div>

        {/* ── Action error ── */}
        {actionError && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-[12px] text-amber-400">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="ml-3 text-[#555] hover:text-[#999]">
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── Builds list ── */}
        <div>
          <div className="mb-4 flex items-baseline gap-3">
            <h2 className="font-display text-[18px] font-medium text-[#c0b080]">Mes builds</h2>
            <span className="text-[12px] text-[#555]">{builds.length} build{builds.length !== 1 ? "s" : ""}</span>
          </div>

          {builds.length === 0 ? (
            <Plaque flat className="py-12 text-center">
              <p className="text-[#444]">Aucun build sauvegardé.</p>
              <Link href="/builder" className="mt-2 inline-block text-[12px] text-[var(--dofus-green-active)] hover:underline">
                Créer un build →
              </Link>
            </Plaque>
          ) : (
            <div className="space-y-2">
              {builds.map((b) => (
                <BuildRow
                  key={b.id}
                  build={b}
                  expanded={expandedBuildId === b.id}
                  onToggleExpand={() => setExpandedBuildId((prev) => (prev === b.id ? null : b.id))}
                  onEdit={(build) => void handleEdit(build)}
                  onRequestDelete={setDeleteTarget}
                  onToggleVisibility={(build) => void handleToggleVisibility(build)}
                  onUpdateTags={handleUpdateTags}
                  onRenameBuild={handleRenameBuild}
                  toggling={togglingId === b.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Modal
        open={deleteTarget != null}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        title="Supprimer le build"
        widthClassName="max-w-sm"
      >
        <p className="text-[13px] leading-relaxed text-[#999]">
          Êtes-vous sûr de vouloir supprimer{" "}
          <span className="font-medium text-[#e0d0a0]">« {deleteTarget?.name} »</span> ?
          Cette action est définitive et ne peut pas être annulée.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={deleting}
            onClick={() => setDeleteTarget(null)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={deleting}
            onClick={() => void confirmDelete()}
          >
            {deleting ? "Suppression…" : "Supprimer"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
