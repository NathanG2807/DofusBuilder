"use client";

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
} from "@/lib/api";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth";
import { classHeadUrl } from "@/lib/classImage";
import { useBuildStore } from "@/store/build-store";
import type { BuildOut, UserPublic } from "@/types/api";

type AuthMode = "login" | "register";

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
  const [isPublic, setIsPublic] = useState(true);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [builds, setBuilds] = useState<BuildOut[]>([]);
  const [listError, setListError] = useState<string | null>(null);

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
  const level = useBuildStore((s) => s.level);
  const classId = useBuildStore((s) => s.classId);
  const sex = useBuildStore((s) => s.sex);

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg(null);
    if (!getAccessToken()) return;
    setBusy(true);
    try {
      await createBuild({
        name: saveName.trim() || "Sans titre",
        slots: { ...currentBuild },
        total_stats: { ...stats },
        active_set_bonuses: [...activeSetBonuses],
        char_stats: Object.keys(charStats).length > 0 ? { ...charStats } : null,
        parcho_stats: Object.keys(parchoStats).length > 0 ? { ...parchoStats } : null,
        exo_fm: Object.keys(exoFm).length > 0 ? (exoFm as Record<string, string>) : null,
        level,
        class_id: classId,
        sex,
        is_public: isPublic,
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

  function shareUrl(buildId: string) {
    if (typeof window === "undefined") return `${getApiBase()}/build/${buildId}`;
    return `${window.location.origin}/build/${buildId}`;
  }

  async function copyLink(buildId: string) {
    const url = shareUrl(buildId);
    try { await navigator.clipboard.writeText(url); setSaveMsg("Lien copié !"); }
    catch { setSaveMsg(url); }
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
        <div className="absolute right-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-xl border border-[#383838] bg-[#1a1a1a] shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
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
                  <span className="font-medium text-[#f0d78c]">{user.username}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-[#666666] hover:text-[#aaaaaa]"
                >
                  Déconnexion
                </button>
              </div>

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
                <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-[12px] text-[#888888]">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded"
                  />
                  Partage public (lien)
                </label>
                {saveMsg && (
                  <p className="mt-1 text-xs text-emerald-400">{saveMsg}</p>
                )}
              </form>

              {/* Liste des builds */}
              <div className="px-4 py-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#666666]">
                  Mes builds
                </p>
                {listError && <p className="mb-1 text-xs text-red-400">{listError}</p>}
                <ul className="max-h-52 space-y-1.5 overflow-y-auto">
                  {builds.length === 0 && (
                    <li className="text-xs text-[#444444]">Aucun build enregistré.</li>
                  )}
                  {builds.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-1.5 rounded-lg border border-[#282828] bg-[#111111]/80 px-2 py-1.5"
                    >
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
                      <button type="button" onClick={() => void handleLoad(b)} className="shrink-0 text-[11px] text-[var(--dofus-green-active)] hover:underline">
                        Charger
                      </button>
                      <button type="button" onClick={() => void copyLink(b.id)} className="shrink-0 text-[11px] text-[#888888] hover:underline">
                        Lien
                      </button>
                      <button type="button" onClick={() => void handleDelete(b.id)} className="shrink-0 text-[11px] text-red-400/80 hover:underline">
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
