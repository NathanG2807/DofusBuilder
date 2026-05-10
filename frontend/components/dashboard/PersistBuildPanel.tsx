"use client";

import { useCallback, useEffect, useState } from "react";

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

type Mode = "login" | "register";

export function PersistBuildPanel() {
  const [mode, setMode] = useState<Mode>("login");
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

  const hydrateFromPersistedBuild = useBuildStore(
    (s) => s.hydrateFromPersistedBuild,
  );
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

  const refreshBuilds = useCallback(async () => {
    if (!getAccessToken()) {
      setBuilds([]);
      return;
    }
    setListError(null);
    try {
      const list = await listMyBuilds();
      setBuilds(list);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Liste impossible");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getAccessToken()) {
        setUser(null);
        return;
      }
      try {
        const me = await authMe();
        if (!cancelled) setUser(me);
        await refreshBuilds();
      } catch {
        if (!cancelled) {
          setUser(null);
          clearAccessToken();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshBuilds]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        await authRegister({
          username: username.trim(),
          email: email.trim(),
          password,
        });
      }
      const { access_token } = await authLogin({
        username: username.trim(),
        password,
      });
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
      const created = await createBuild({
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
      setSaveMsg(`Enregistré — lien : ${shareUrl(created.id)}`);
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
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Chargement impossible");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce build ?")) return;
    setBusy(true);
    try {
      await deleteBuild(id);
      await refreshBuilds();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Suppression impossible");
    } finally {
      setBusy(false);
    }
  }

  function shareUrl(buildId: string): string {
    if (typeof window === "undefined") return `${getApiBase()}/build/${buildId}`;
    return `${window.location.origin}/build/${buildId}`;
  }

  async function copyLink(buildId: string) {
    const url = shareUrl(buildId);
    try {
      await navigator.clipboard.writeText(url);
      setSaveMsg("Lien copié dans le presse-papiers.");
    } catch {
      setSaveMsg(url);
    }
  }

  return (
    <section className="dofus-panel rounded-xl border-2 border-[#6b5428]/90 bg-[#1a1510]/95 p-4 shadow-inner">
      <h2 className="font-serif text-lg font-semibold tracking-wide text-[#f0d78c]">
        Compte & sauvegarde
      </h2>
      <p className="mt-1 text-[12px] text-[#a89878]">
        Connecte-toi pour enregistrer tes stuffs. Un build public peut être
        ouvert avec un simple lien.
      </p>

      {!user ? (
        <form className="mt-4 space-y-3" onSubmit={handleAuth}>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setAuthError(null);
              }}
              className={
                mode === "login"
                  ? "font-medium text-[#e8c96e]"
                  : "text-[#6a5c48] hover:text-[#c4b498]"
              }
            >
              Connexion
            </button>
            <span className="text-[#3d3428]">|</span>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setAuthError(null);
              }}
              className={
                mode === "register"
                  ? "font-medium text-[#e8c96e]"
                  : "text-[#6a5c48] hover:text-[#c4b498]"
              }
            >
              Inscription
            </button>
          </div>
          <input
            className="w-full rounded-lg border border-[#5c4a32] bg-[#120e0a] px-3 py-2 text-sm text-[#f5e6c8]"
            placeholder="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          {mode === "register" && (
            <input
              className="w-full rounded-lg border border-[#5c4a32] bg-[#120e0a] px-3 py-2 text-sm text-[#f5e6c8]"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          )}
          <input
            className="w-full rounded-lg border border-[#5c4a32] bg-[#120e0a] px-3 py-2 text-sm text-[#f5e6c8]"
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            required
          />
          {authError && (
            <p className="text-xs text-red-400/90">{authError}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-gradient-to-b from-[#e8b84a] to-[#b8891c] px-4 py-2 text-sm font-medium text-[#1a1208] hover:brightness-110 disabled:opacity-50"
          >
            {mode === "register" ? "Créer le compte et se connecter" : "Se connecter"}
          </button>
        </form>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#e8dcc8]">
            <span>
              Connecté : <strong className="text-[#f0d78c]">{user.username}</strong>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-[#8a7a62] underline hover:text-[#d4c4a8]"
            >
              Déconnexion
            </button>
          </div>

          <form className="space-y-2 border-t border-[#3d3428] pt-3" onSubmit={handleSave}>
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-[160px] flex-1 rounded-lg border border-[#5c4a32] bg-[#120e0a] px-3 py-2 text-sm text-[#f5e6c8]"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Nom du build"
              />
              <label className="flex items-center gap-2 text-xs text-[#a89878]">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                Public (partage par lien)
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg border border-[#5c4a32] px-3 py-1.5 text-sm text-[#e8dcc8] hover:bg-[#2a2218] disabled:opacity-50"
            >
              Sauvegarder l’inventaire actuel
            </button>
            {saveMsg && (
              <p className="break-all text-xs text-emerald-400/90">{saveMsg}</p>
            )}
          </form>

          <div className="border-t border-[#3d3428] pt-3">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-[#8a7a62]">
              Mes builds
            </h3>
            {listError && (
              <p className="mt-1 text-xs text-red-400/90">{listError}</p>
            )}
            <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-sm">
              {builds.length === 0 && (
                <li className="text-xs text-[#6a5c48]">Aucun build enregistré.</li>
              )}
              {builds.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-[#3d3428] bg-[#120e0a]/80 px-2 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-[#f0e4c4]">
                    {b.name}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-[#e8c96e] hover:underline"
                    onClick={() => void handleLoad(b)}
                  >
                    Charger
                  </button>
                  <button
                    type="button"
                    className="text-xs text-[#8a7a62] hover:underline"
                    onClick={() => void copyLink(b.id)}
                  >
                    Copier le lien
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-400/80 hover:underline"
                    onClick={() => void handleDelete(b.id)}
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
