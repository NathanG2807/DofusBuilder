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

  // Sync saveName with build name
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

  // Close on outside click
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
        className="flex items-center gap-2 rounded-lg border border-[#5c4a32] bg-[#241f1c] px-3 py-1.5 text-sm transition hover:bg-[#2e2925]"
      >
        {user ? (
          <>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c9a227]/20 text-[11px] font-bold uppercase text-[#e8c96e]">
              {user.username[0]}
            </span>
            <span className="max-w-[100px] truncate text-[#f0e4c4]">{user.username}</span>
          </>
        ) : (
          <>
            <span className="text-[#c9a227]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </span>
            <span className="text-[#d4c4a8]">Connexion</span>
          </>
        )}
        <svg className={`h-3 w-3 text-[#8a7a62] transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* ─── Dropdown ─── */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-xl border border-[#5c4a32] bg-[#1e1a16] shadow-[0_8px_32px_rgba(0,0,0,0.55)]">
          {!user ? (
            /* ── Formulaire connexion / inscription ── */
            <div className="p-4">
              <div className="mb-3 flex gap-3 border-b border-[#3d3428] pb-3">
                {(["login", "register"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setAuthMode(m); setAuthError(null); }}
                    className={`text-sm font-medium transition ${
                      authMode === m ? "text-[#e8c96e]" : "text-[#6a5c48] hover:text-[#c4b498]"
                    }`}
                  >
                    {m === "login" ? "Connexion" : "Inscription"}
                  </button>
                ))}
              </div>
              <form className="space-y-2" onSubmit={handleAuth}>
                <input
                  className="w-full rounded-lg border border-[#5c4a32] bg-[#120e0a] px-3 py-2 text-sm text-[#f5e6c8] placeholder:text-[#6a5c48]"
                  placeholder="Nom d'utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
                {authMode === "register" && (
                  <input
                    className="w-full rounded-lg border border-[#5c4a32] bg-[#120e0a] px-3 py-2 text-sm text-[#f5e6c8] placeholder:text-[#6a5c48]"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                )}
                <input
                  className="w-full rounded-lg border border-[#5c4a32] bg-[#120e0a] px-3 py-2 text-sm text-[#f5e6c8] placeholder:text-[#6a5c48]"
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
                  className="w-full rounded-lg bg-gradient-to-b from-[#e8b84a] to-[#b8891c] py-2 text-sm font-medium text-[#1a1208] hover:brightness-110 disabled:opacity-50"
                >
                  {authMode === "register" ? "Créer le compte" : "Se connecter"}
                </button>
              </form>
            </div>
          ) : (
            /* ── Panel connecté ── */
            <div>
              {/* En-tête utilisateur */}
              <div className="flex items-center justify-between border-b border-[#3d3428] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c9a227]/20 text-sm font-bold uppercase text-[#e8c96e]">
                    {user.username[0]}
                  </span>
                  <span className="font-medium text-[#f0d78c]">{user.username}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-[#8a7a62] hover:text-[#d4c4a8]"
                >
                  Déconnexion
                </button>
              </div>

              {/* Sauvegarder */}
              <form className="border-b border-[#3d3428] px-4 py-3" onSubmit={handleSave}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a7a62]">
                  Sauvegarder le build actuel
                </p>
                <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-[#5c4a32] bg-[#120e0a] px-2 py-1.5 text-sm text-[#f5e6c8]"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Nom du build"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="shrink-0 rounded-lg bg-gradient-to-b from-[#e8b84a] to-[#b8891c] px-3 py-1.5 text-sm font-medium text-[#1a1208] disabled:opacity-50"
                  >
                    Sauver
                  </button>
                </div>
                <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-[12px] text-[#a89878]">
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
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a7a62]">
                  Mes builds
                </p>
                {listError && <p className="mb-1 text-xs text-red-400">{listError}</p>}
                <ul className="max-h-52 space-y-1.5 overflow-y-auto">
                  {builds.length === 0 && (
                    <li className="text-xs text-[#6a5c48]">Aucun build enregistré.</li>
                  )}
                  {builds.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-1.5 rounded-lg border border-[#3d3428] bg-[#120e0a]/80 px-2 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#f0e4c4]">
                        {b.name}
                      </span>
                      <button type="button" onClick={() => void handleLoad(b)} className="shrink-0 text-[11px] text-[#e8c96e] hover:underline">
                        Charger
                      </button>
                      <button type="button" onClick={() => void copyLink(b.id)} className="shrink-0 text-[11px] text-[#8a7a62] hover:underline">
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
