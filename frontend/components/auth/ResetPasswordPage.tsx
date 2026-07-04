"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plaque } from "@/components/ui/Plaque";
import { authResetPassword } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Lien invalide : token manquant.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setBusy(true);
    try {
      const res = await authResetPassword({ token, password });
      setSuccess(res.message);
      setTimeout(() => router.push("/stuffs"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <Plaque ornate className="p-6">
        <h1 className="mb-1 font-display text-[22px] font-medium text-[#f0d78c]">Nouveau mot de passe</h1>
        <p className="mb-5 text-sm text-[#888]">
          Choisissez un nouveau mot de passe pour votre compte Zaap Builder.
        </p>

        {!token ? (
          <div className="space-y-3">
            <p className="text-sm text-red-400">Ce lien de réinitialisation est invalide.</p>
            <Link href="/stuffs" className="text-sm text-[var(--dofus-green-active)] hover:underline">
              Retour à l&apos;accueil
            </Link>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <Input
              type="password"
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <Input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            {success && <p className="text-xs text-emerald-400">{success}</p>}
            <Button type="submit" disabled={busy || !!success} className="w-full">
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        )}
      </Plaque>
    </div>
  );
}

export function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#888]">
          Chargement…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
