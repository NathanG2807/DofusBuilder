"use client";

import { ChevronDown, Eye, EyeOff, Pencil, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { DofusSpinner } from "@/components/ui/DofusSpinner";
import { Input } from "@/components/ui/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  authForgotPassword,
  authLogin,
  authLogout,
  authMe,
  authRegister,
  deleteBuild,
  getApiBase,
  listMyBuilds,
  updateBuild,
} from "@/lib/api";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth";
import { classHeadUrl } from "@/lib/classImage";
import { useBuildStore } from "@/store/build-store";
import type { BuildOut, UserPublic } from "@/types/api";

type AuthMode = "login" | "register" | "forgot";

export function AccountButton() {
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<UserPublic | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [builds, setBuilds] = useState<BuildOut[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const authBusy = busy && !user;

  const hydrateFromPersistedBuild = useBuildStore((s) => s.hydrateFromPersistedBuild);
  const prefetchEquippedItems = useBuildStore((s) => s.prefetchEquippedItems);

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

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setBusy(true);
    try {
      if (authMode === "forgot") {
        const res = await authForgotPassword({ email: email.trim() });
        setAuthSuccess(res.message);
        return;
      }
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
    try {
      await navigator.clipboard.writeText(url);
      setActionMsg("Lien copié !");
      setTimeout(() => setActionMsg(null), 2000);
    } catch {
      setActionMsg(url);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* ─── Bouton déclencheur ─── */}
      <PopoverTrigger
        render={
          <button
            type="button"
            className="plaque-flat flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11px] font-medium text-[#c9c9c9] transition hover:border-white/20"
          />
        }
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
            <UserIcon size={13} className="shrink-0 text-[#888]" />
            Connexion
          </>
        )}
        <ChevronDown size={11} className={`shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </PopoverTrigger>

      {/* ─── Panneau ─── positionné automatiquement sous le bouton par Base UI */}
      <PopoverContent side="bottom" align="end" className="w-[340px]">
        {!user ? (
          /* ── Formulaire connexion / inscription ── */
          <div className="p-4">
            <div className="mb-3 flex gap-3 border-b border-white/[0.06] pb-3">
              {authMode !== "forgot" ? (
                (["login", "register"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setAuthMode(m); setAuthError(null); setAuthSuccess(null); }}
                    className={`text-sm font-medium transition ${
                      authMode === m ? "text-[var(--dofus-green-active)]" : "text-[#555555] hover:text-[#aaaaaa]"
                    }`}
                  >
                    {m === "login" ? "Connexion" : "Inscription"}
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(null); setAuthSuccess(null); }}
                  className="text-sm font-medium text-[var(--dofus-green-active)]"
                >
                  ← Retour à la connexion
                </button>
              )}
            </div>
            <form className="space-y-2" onSubmit={handleAuth}>
              {authMode === "forgot" ? (
                <>
                  <p className="text-xs text-[#888]">
                    Saisissez l&apos;email de votre compte. Si un compte existe, vous recevrez un lien de réinitialisation.
                  </p>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </>
              ) : (
                <>
                  <Input
                    placeholder="Nom d'utilisateur"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                  {authMode === "register" && (
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  )}
                  <Input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={authMode === "register" ? "new-password" : "current-password"}
                    required
                  />
                  {authMode === "login" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => { setAuthMode("forgot"); setAuthError(null); setAuthSuccess(null); }}
                        className="text-[11px] text-[#666] transition hover:text-[var(--dofus-green-active)]"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  )}
                </>
              )}
              {authError && <p className="text-xs text-red-400">{authError}</p>}
              {authSuccess && <p className="text-xs text-emerald-400">{authSuccess}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-[10px] bg-gradient-to-b from-[var(--dofus-color-ref-end)] to-[var(--dofus-color-ref-start)] py-2 text-sm font-semibold text-[#ecf4e4] transition hover:brightness-110 disabled:opacity-50"
              >
                {authMode === "register"
                  ? "Créer le compte"
                  : authMode === "forgot"
                    ? "Envoyer le lien"
                    : "Se connecter"}
              </button>
            </form>
          </div>
        ) : (
          /* ── Panel connecté ── */
          <>
            {/* En-tête utilisateur */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
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

            {/* Liste des builds */}
            <div className="px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#666666]">
                Mes builds
              </p>
              {listError && <p className="mb-1 text-xs text-red-400">{listError}</p>}
              {actionMsg && <p className="mb-1 text-xs text-emerald-400">{actionMsg}</p>}
              <div className="max-h-[300px] overflow-y-auto [scrollbar-color:#2c2c2c_transparent] [scrollbar-width:thin]">
                <ul className="space-y-1.5 pr-1">
                  {builds.length === 0 && (
                    <li className="text-xs text-[#444444]">Aucun build enregistré.</li>
                  )}
                  {builds.map((b) => (
                    <li key={b.id} className="plaque-flat px-2 py-1.5">
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
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-xs font-medium text-[#d0d0d0]">
                            {b.name}
                          </span>
                          {b.updated_at && (
                            <span className="text-[9px] text-[#3a3a3a]">
                              {new Date(b.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          title={b.is_public ? "Rendre privé" : "Rendre public"}
                          disabled={togglingId === b.id}
                          onClick={() => void handleToggleVisibility(b)}
                          className={`shrink-0 rounded p-0.5 transition ${
                            b.is_public ? "text-[var(--dofus-green-active)] hover:text-[#aaa]" : "text-[#555] hover:text-[var(--dofus-green-active)]"
                          } ${togglingId === b.id ? "opacity-40" : ""}`}
                        >
                          {b.is_public ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button type="button" onClick={() => void handleLoad(b)} title="Éditer ce build dans le builder" className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--dofus-green-active)] hover:underline">
                          <Pencil size={10} />
                          Éditer
                        </button>
                        <button type="button" onClick={() => void copyLink(b.id)} className="shrink-0 text-[11px] text-[#888888] hover:underline">
                          Lien
                        </button>
                        <button type="button" onClick={() => void handleDelete(b.id)} className="shrink-0 text-[11px] text-red-400/80 hover:underline">
                          ×
                        </button>
                      </div>
                      {(b.tags?.length ?? 0) > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1 pl-[34px]">
                          {(b.tags ?? []).map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-[#666]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </PopoverContent>

      {mounted && authBusy && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <DofusSpinner
            size={72}
            label={
              authMode === "register"
                ? "Création du compte…"
                : authMode === "forgot"
                  ? "Envoi en cours…"
                  : "Connexion en cours…"
            }
          />
        </div>,
        document.body,
      )}
    </Popover>
  );
}
