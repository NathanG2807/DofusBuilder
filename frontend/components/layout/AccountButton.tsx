"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  authLogin,
  authLogout,
  authMe,
  authRegister,
  createBuild,
  deleteBuild,
  getApiBase,
  listMyBuilds,
  updateBuild,
} from "@/lib/api";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth";
import { BUILD_TAGS } from "@/lib/buildTags";
import { classHeadUrl } from "@/lib/classImage";
import { useBuildStore } from "@/store/build-store";
import type { BuildOut, UserPublic } from "@/types/api";

type AuthMode = "login" | "register";

/* ── Visibility toggle icon ─────────────────────────────────────────────── */
function VisibilityIcon({ isPublic }: { isPublic: boolean }) {
  return isPublic ? (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function AccountButton() {
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<UserPublic | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveName, setSaveName] = useState("Mon build");
  const [isPublic, setIsPublic] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [builds, setBuilds] = useState<BuildOut[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  const buildName = useBuildStore((s) => s.buildName);
  const hydrateFromPersistedBuild = useBuildStore((s) => s.hydrateFromPersistedBuild);
  const prefetchEquippedItems = useBuildStore((s) => s.prefetchEquippedItems);
  const currentBuild = useBuildStore((s) => s.currentBuild);
  const stats = useBuildStore((s) => s.stats);
  const activeSetBonuses = useBuildStore((s) => s.activeSetBonuses);
  const charStats = useBuildStore((s) => s.charStats);
  const parchoStats = useBuildStore((s) => s.parchoStats);
  const exoFm = useBuildStore((s) => s.exoFm);
  const lockedSlots = useBuildStore((s) => s.lockedSlots);
  const level = useBuildStore((s) => s.level);
  const classId = useBuildStore((s) => s.classId);
  const sex = useBuildStore((s) => s.sex);
  const itemById = useBuildStore((s) => s.itemById);

  useEffect(() => {
    setSaveName(buildName);
  }, [buildName]);

  const refreshBuilds = useCallback(async () => {
    if (!getAccessToken()) { setBuilds([]); return; }
    setListError(null);
    try { setBuilds(await listMyBuilds()); }
    catch (e) { setListError(e instanceof Error ? e.message : "Impossible"); }
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!getAccessToken()) { setUser(null); return; }
      try {
        const me = await authMe();
        if (!cancel) setUser(me);
        await refreshBuilds();
      } catch {
        if (!cancel) { setUser(null); clearAccessToken(); }
      }
    })();
    return () => { cancel = true; };
  }, [refreshBuilds]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setBusy(true);
    try {
      if (authMode === "register") {
        await authRegister({ username: username.trim(), email: email.trim(), password });
      }
      const { access_token } = await authLogin({ username: username.trim(), password });
      setAccessToken(access_token);
      const me = await authMe();
      setUser(me);
      setPassword("");
      await refreshBuilds();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    authLogout();
    setUser(null);
    setBuilds([]);
  }

  function buildSlotsPreview(): Record<string, string | null> {
    const preview: Record<string, string | null> = {};
    for (const [slot, itemId] of Object.entries(currentBuild)) {
      if (itemId == null) continue;
      const item = itemById[itemId];
      preview[slot] = item?.image_url_icon ?? null;
    }
    return preview;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg(null);
    if (!getAccessToken()) return;
    if (isPublic && selectedTags.length === 0) {
      setSaveMsg("Choisissez au moins un tag pour publier.");
      return;
    }
    setBusy(true);
    try {
      const lockedSlotsMap: Record<string, number> = {};
      for (const slot of lockedSlots) {
        const id = currentBuild[slot];
        if (id != null) lockedSlotsMap[slot] = id;
      }
      await createBuild({
        name: saveName.trim() || "Sans titre",
        slots: { ...currentBuild },
        total_stats: { ...stats },
        active_set_bonuses: [...activeSetBonuses],
        char_stats: Object.keys(charStats).length > 0 ? { ...charStats } : null,
        parcho_stats: Object.keys(parchoStats).length > 0 ? { ...parchoStats } : null,
        exo_fm: Object.keys(exoFm).length > 0 ? (exoFm as Record<string, string>) : null,
        locked_slots: Object.keys(lockedSlotsMap).length > 0 ? lockedSlotsMap : null,
        level,
        class_id: classId,
        sex,
        is_public: isPublic,
        tags: isPublic ? selectedTags : [],
        slots_preview: buildSlotsPreview(),
      });
      setSaveMsg("Build sauvegardé !");
      await refreshBuilds();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Échec");
    } finally {
      setBusy(false);
    }
  }

  async function handleLoad(b: BuildOut) {
    setListError(null);
    try {
      hydrateFromPersistedBuild(b);
      await prefetchEquippedItems();
      setOpen(false);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Impossible");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce build ?")) return;
    setBusy(true);
    try { await deleteBuild(id); await refreshBuilds(); }
    catch (err) { setListError(err instanceof Error ? err.message : "Impossible"); }
    finally { setBusy(false); }
  }

  async function handleToggleVisibility(b: BuildOut) {
    setTogglingId(b.id);
    try {
      const newPublic = !b.is_public;
      const needsTags = newPublic && (b.tags == null || b.tags.length === 0);
      if (needsTags) {
        setListError("Ce build n'a pas de tags. Ajoutez des tags avant de le publier.");
        return;
      }
      await updateBuild(b.id, { is_public: newPublic });
      await refreshBuilds();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Impossible");
    } finally {
      setTogglingId(null);
    }
  }

  function shareUrl(buildId: string) {
    if (typeof window === "undefined") return `${getApiBase()}/build/${buildId}`;
    return `${window.location.origin}/build/${buildId}`;
  }

  async function copyLink(buildId: string) {
    const url = shareUrl(buildId);
    try { await navigator.clipboard.writeText(url); setSaveMsg("Lien copié !"); }
    catch { setSaveMsg(url); }
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* ─── Bouton principal ─── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-dofus-gray flex items-center gap-1.5 rounded px-2 py-1 text-[11px]"
      >
        {user ? (
          <>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--dofus-ui-accent-tint-20)] text-[10px] font-bold uppercase text-[var(--dofus-green-active)]">
              {user.username[0]}
            </span>
            <span className="max-w-[90px] truncate">{user.username}</span>
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/global/UI/player.png" width={13} height={13} alt="" className="shrink-0" />
            Connexion
          </>
        )}
        <svg className={`h-2.5 w-2.5 shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* ─── Dropdown ─── */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-xl border border-[#383838] bg-[#1a1a1a] shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
          {!user ? (
            /* ── Formulaire connexion / inscription ── */
            <div className="p-4">
              <div className="mb-3 flex gap-3 border-b border-[#252525] pb-3">
                {(["login", "register"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setAuthMode(m); setAuthError(null); }}
                    className={`text-sm font-medium transition ${
                      authMode === m ? "text-[var(--dofus-green-active)]" : "text-[#555555] hover:text-[#aaaaaa]"
                    }`}
                  >
                    {m === "login" ? "Connexion" : "Inscription"}
                  </button>
                ))}
              </div>
              <form className="space-y-2" onSubmit={handleAuth}>
                <input
                  className="w-full rounded-lg border border-[#383838] bg-[#111111] px-3 py-2 text-sm text-[#e0e0e0] placeholder:text-[#555555] focus:border-[#4a4a4a] focus:outline-none"
                  placeholder="Nom d'utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
                {authMode === "register" && (
                  <input
                    className="w-full rounded-lg border border-[#383838] bg-[#111111] px-3 py-2 text-sm text-[#e0e0e0] placeholder:text-[#555555] focus:border-[#4a4a4a] focus:outline-none"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                )}
                <input
                  className="w-full rounded-lg border border-[#383838] bg-[#111111] px-3 py-2 text-sm text-[#e0e0e0] placeholder:text-[#555555] focus:border-[#4a4a4a] focus:outline-none"
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={authMode === "register" ? "new-password" : "current-password"}
                  required
                />
                {authError && <p className="text-xs text-red-400">{authError}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-dofus-green w-full rounded-lg py-2 text-sm disabled:opacity-50"
                >
                  {authMode === "register" ? "Créer le compte" : "Se connecter"}
                </button>
              </form>
            </div>
          ) : (
            /* ── Panel connecté ── */
            <div>
              {/* En-tête utilisateur */}
              <div className="flex items-center justify-between border-b border-[#252525] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dofus-ui-accent-tint-20)] text-sm font-bold uppercase text-[var(--dofus-green-active)]">
                    {user.username[0]}
                  </span>
                  <div>
                    <p className="font-medium text-[#f0d78c] leading-none">{user.username}</p>
                    <p className="mt-0.5 text-[10px] text-[#555]">{builds.length} build{builds.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="text-[11px] text-[#555] transition hover:text-[var(--dofus-green-active)]"
                  >
                    Mon profil
                  </Link>
                  <span className="text-[#333]">|</span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs text-[#666666] hover:text-[#aaaaaa]"
                  >
                    Déco
                  </button>
                </div>
              </div>

              {/* ── Builds section ── */}
              <>
                  {/* Sauvegarder */}
                  <form className="border-b border-[#252525] px-4 py-3" onSubmit={handleSave}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#666666]">
                      Sauvegarder le build actuel
                    </p>
                    <div className="flex gap-2">
                      <input
                        className="min-w-0 flex-1 rounded-lg border border-[#383838] bg-[#111111] px-2 py-1.5 text-sm text-[#e0e0e0] focus:outline-none"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="Nom du build"
                      />
                      <button
                        type="submit"
                        disabled={busy}
                        className="btn-dofus-green shrink-0 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
                      >
                        Sauver
                      </button>
                    </div>

                    {/* Public toggle */}
                    <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12px] text-[#888888]">
                      <div
                        onClick={() => setIsPublic((v) => !v)}
                        className={`relative h-4 w-7 cursor-pointer rounded-full transition-colors ${isPublic ? "bg-[var(--dofus-green-active)]" : "bg-[#333]"}`}
                      >
                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-3" : "translate-x-0.5"}`} />
                      </div>
                      <span className={isPublic ? "text-[#d0d0d0]" : ""}>
                        {isPublic ? "Public (visible dans Stuffs)" : "Privé"}
                      </span>
                    </label>

                    {/* Tags selector (only when public) */}
                    {isPublic && (
                      <div className="mt-2">
                        <p className="mb-1 text-[10px] text-[#555]">Tags <span className="text-[#888]">(requis)</span></p>
                        <div className="flex flex-wrap gap-1.5">
                          {BUILD_TAGS.map((tag) => {
                            const active = selectedTags.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleTag(tag.id)}
                                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border transition ${
                                  active
                                    ? ""
                                    : "border-[#333] bg-[#0e0e0e] text-[#666] hover:border-[#555]"
                                }`}
                                style={active ? { backgroundColor: `${tag.color}33`, borderColor: `${tag.color}88`, color: tag.color } : {}}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={tag.icon} alt="" width={11} height={11} className="shrink-0" />
                                {tag.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {saveMsg && (
                      <p className={`mt-1.5 text-xs ${saveMsg.startsWith("Choisissez") || saveMsg === "Échec" ? "text-amber-400" : "text-emerald-400"}`}>
                        {saveMsg}
                      </p>
                    )}
                  </form>

                  {/* Liste des builds */}
                  <div className="px-4 py-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#666666]">
                      Mes builds
                    </p>
                    {listError && <p className="mb-1 text-xs text-red-400">{listError}</p>}
                    <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
                      {builds.length === 0 && (
                        <li className="text-xs text-[#444444]">Aucun build enregistré.</li>
                      )}
                      {builds.map((b) => (
                        <li
                          key={b.id}
                          className="rounded-lg border border-[#282828] bg-[#111111]/80 px-2 py-1.5"
                        >
                          <div className="flex items-center gap-1.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={classHeadUrl(b.class_id ?? 8, (b.sex === "female" ? "female" : "male"))}
                              alt=""
                              width={28}
                              height={28}
                              className="h-7 w-7 shrink-0 rounded-md object-cover"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#d0d0d0]">
                              {b.name}
                            </span>
                            {/* Visibility toggle */}
                            <button
                              type="button"
                              title={b.is_public ? "Rendre privé" : "Rendre public"}
                              disabled={togglingId === b.id}
                              onClick={() => void handleToggleVisibility(b)}
                              className={`shrink-0 rounded p-0.5 transition ${
                                b.is_public ? "text-[var(--dofus-green-active)] hover:text-[#aaa]" : "text-[#555] hover:text-[var(--dofus-green-active)]"
                              } ${togglingId === b.id ? "opacity-40" : ""}`}
                            >
                              <VisibilityIcon isPublic={b.is_public} />
                            </button>
                            <button type="button" onClick={() => void handleLoad(b)} className="shrink-0 text-[11px] text-[var(--dofus-green-active)] hover:underline">
                              Charger
                            </button>
                            <button type="button" onClick={() => void copyLink(b.id)} className="shrink-0 text-[11px] text-[#888888] hover:underline">
                              Lien
                            </button>
                            <button type="button" onClick={() => void handleDelete(b.id)} className="shrink-0 text-[11px] text-red-400/80 hover:underline">
                              ×
                            </button>
                          </div>
                          {/* Tags of the build */}
                          {(b.tags?.length ?? 0) > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1 pl-[34px]">
                              {(b.tags ?? []).map((t) => {
                                const tag = BUILD_TAGS.find((tg) => tg.id === t);
                                return tag ? (
                                  <span
                                    key={t}
                                    className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px]"
                                    style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={tag.icon} alt="" width={8} height={8} />
                                    {tag.label}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
              </>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
