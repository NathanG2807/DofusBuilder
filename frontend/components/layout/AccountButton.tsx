"use client";

import { ArrowLeft, ChevronDown, Eye, EyeOff, Link2, Pencil, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { DofusSpinner } from "@/components/ui/DofusSpinner";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Input } from "@/components/ui/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  authForgotPassword,
  authLogin,
  authLogout,
  authMe,
  authRegister,
  deleteBuild,
  listMyBuilds,
  updateBuild,
} from "@/lib/api";
import { cn } from "@/lib/cn";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth";
import { copyBuildShareLink } from "@/lib/buildShare";
import { classHeadUrl } from "@/lib/classImage";
import { useBuildStore } from "@/store/build-store";
import type { BuildOut, UserPublic } from "@/types/api";

type AuthMode = "login" | "register" | "forgot";

function getConfirmPasswordError(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) return null;
  if (password !== confirmPassword) return "Les mots de passe ne correspondent pas.";
  return null;
}

export function AccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
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

  function resetPasswordFields() {
    setPassword("");
    setConfirmPassword("");
    setConfirmPasswordError(null);
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (authMode === "register") {
      if (password.length < 8) {
        setAuthError("Le mot de passe doit contenir au moins 8 caractères.");
        return;
      }
      const mismatch = getConfirmPasswordError(password, confirmPassword);
      if (mismatch) {
        setConfirmPasswordError(mismatch);
        return;
      }
    }
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
      resetPasswordFields();
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
      router.push("/builder");
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

  async function handleShare(b: BuildOut) {
    try {
      if (!b.is_public) {
        if (b.tags == null || b.tags.length === 0) {
          setListError("Ajoutez des tags avant de partager ce build.");
          return;
        }
        await updateBuild(b.id, { is_public: true });
        await refreshBuilds();
      }
      await copyBuildShareLink(b.id);
      setActionMsg("Lien de partage copié !");
      setTimeout(() => setActionMsg(null), 2000);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Impossible de partager");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* ─── Bouton déclencheur ─── */}
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-all duration-150",
              open
                ? "border-[color:var(--atelier-plaque-border-hover)] bg-white/[0.07] text-white/90 shadow-[0_0_0_1px_rgba(200,217,176,0.08)]"
                : "border-white/[0.08] bg-white/[0.03] text-white/55 hover:border-white/15 hover:bg-white/[0.06] hover:text-white/80",
            )}
          />
        }
      >
        {user ? (
          <>
            <UserAvatar username={user.username} size="xs" />
            <span className="max-w-[90px] truncate">{user.username}</span>
          </>
        ) : (
          <>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.05] ring-1 ring-white/[0.06]">
              <UserIcon size={13} className="text-[var(--dofus-green-active)]/80" />
            </span>
            Connexion
          </>
        )}
        <ChevronDown
          size={12}
          className={cn(
            "shrink-0 text-white/35 transition-transform duration-200",
            open && "rotate-180 text-white/55",
          )}
        />
      </PopoverTrigger>

      {/* ─── Panneau ─── positionné automatiquement sous le bouton par Base UI */}
      <PopoverContent side="bottom" align="end" className="w-[360px]">
        {!user ? (
          /* ── Formulaire connexion / inscription ── */
          <div>
            <div className="border-b border-white/[0.06] px-5 pb-4 pt-5">
              <p className="font-display text-[18px] font-medium text-white/92">
                {authMode === "forgot"
                  ? "Mot de passe oublié"
                  : authMode === "register"
                    ? "Créer un compte"
                    : "Bon retour"}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/40">
                {authMode === "forgot"
                  ? "Un lien de réinitialisation vous sera envoyé par email si le compte existe."
                  : authMode === "register"
                    ? "Rejoignez Zaap pour sauvegarder et partager vos builds."
                    : "Connectez-vous pour accéder à vos builds sauvegardés."}
              </p>
            </div>

            <div className="p-5">
              {authMode !== "forgot" ? (
                <div className="mb-4 flex rounded-lg border border-white/[0.06] bg-black/25 p-1">
                  {(["login", "register"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setAuthMode(m);
                        setAuthError(null);
                        setAuthSuccess(null);
                        resetPasswordFields();
                      }}
                      className={cn(
                        "flex-1 cursor-pointer rounded-md py-1.5 text-[12px] font-semibold transition-all duration-150",
                        authMode === m
                          ? "bg-white/[0.08] text-[var(--dofus-green-active)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                          : "text-white/38 hover:text-white/65",
                      )}
                    >
                      {m === "login" ? "Connexion" : "Inscription"}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(null); setAuthSuccess(null); }}
                  className="mb-4 flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-white/45 transition hover:text-[var(--dofus-green-active)]"
                >
                  <ArrowLeft size={14} />
                  Retour à la connexion
                </button>
              )}

              <form className="space-y-3" onSubmit={handleAuth}>
                {authMode === "forgot" ? (
                  <Input
                    type="email"
                    label="Email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                ) : (
                  <>
                    <Input
                      label="Nom d'utilisateur"
                      placeholder="Votre pseudo"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      required
                    />
                    {authMode === "register" && (
                      <Input
                        type="email"
                        label="Email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    )}
                    <Input
                      type="password"
                      label="Mot de passe"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        const next = e.target.value;
                        setPassword(next);
                        if (authMode === "register") {
                          setConfirmPasswordError(getConfirmPasswordError(next, confirmPassword));
                        }
                      }}
                      autoComplete={authMode === "register" ? "new-password" : "current-password"}
                      showPasswordToggle
                      minLength={authMode === "register" ? 8 : undefined}
                      required
                    />
                    {authMode === "register" && (
                      <Input
                        type="password"
                        label="Confirmer le mot de passe"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => {
                          const next = e.target.value;
                          setConfirmPassword(next);
                          setConfirmPasswordError(getConfirmPasswordError(password, next));
                        }}
                        autoComplete="new-password"
                        showPasswordToggle
                        minLength={8}
                        error={confirmPasswordError ?? undefined}
                        required
                      />
                    )}
                    {authMode === "login" && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => { setAuthMode("forgot"); setAuthError(null); setAuthSuccess(null); }}
                          className="cursor-pointer text-[11px] text-white/38 transition hover:text-[var(--dofus-green-active)]"
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                    )}
                  </>
                )}
                {authError && (
                  <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {authError}
                  </p>
                )}
                {authSuccess && (
                  <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    {authSuccess}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className={cn(
                    "mt-2 w-full cursor-pointer rounded-[10px] border border-[color:var(--atelier-plaque-border)] bg-white/[0.02] px-4 py-2 text-[13px] font-semibold text-[#d0d0d0]",
                    "transition-[border-color,color,background-color] duration-150",
                    "hover:border-[color:var(--atelier-plaque-border-hover)] hover:bg-white/[0.04] hover:text-[var(--dofus-green-active)]",
                    "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[color:var(--atelier-plaque-border)] disabled:hover:bg-white/[0.02] disabled:hover:text-[#d0d0d0]",
                  )}
                >
                  {busy
                    ? authMode === "register"
                      ? "Création…"
                      : authMode === "forgot"
                        ? "Envoi…"
                        : "Connexion…"
                    : authMode === "register"
                      ? "Créer le compte"
                      : authMode === "forgot"
                        ? "Envoyer le lien"
                        : "Se connecter"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ── Panel connecté ── */
          <>
            {/* En-tête utilisateur */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2">
                <UserAvatar username={user.username} size="sm" />
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
                        <button
                          type="button"
                          onClick={() => void handleShare(b)}
                          title="Copier le lien de partage (Discord, etc.)"
                          className="flex shrink-0 items-center gap-1 text-[11px] text-[#888888] hover:text-[var(--dofus-green-active)] hover:underline"
                        >
                          <Link2 size={11} />
                          Partager
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
