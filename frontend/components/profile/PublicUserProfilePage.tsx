"use client";

import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PublicBuildCard, usePublicBuildViewer } from "@/components/stuffs/PublicBuildUi";
import { BuildCardsSkeletonGrid, LoadingShell } from "@/components/ui/loading-skeletons";
import { Plaque } from "@/components/ui/Plaque";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { getPublicUserProfile } from "@/lib/api";
import type { UserProfilePublic } from "@/types/api";

export function PublicUserProfilePage({ username }: { username: string }) {
  const [profile, setProfile] = useState<UserProfilePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { openBuild, viewerOverlay } = usePublicBuildViewer();

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicUserProfile(username);
      setProfile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-4 px-4 md:px-6">
            <Link
              href="/stuffs"
              className="flex items-center gap-1.5 text-[12px] text-[#555] transition hover:text-[#999]"
            >
              <ArrowLeft size={14} />
              Stuffs publics
            </Link>
          </div>
        </header>
        <LoadingShell spinnerSize={48} label="Chargement du profil…" minHeight="min-h-[420px]">
          <BuildCardsSkeletonGrid count={4} />
        </LoadingShell>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-4 px-4 md:px-6">
            <Link
              href="/stuffs"
              className="flex items-center gap-1.5 text-[12px] text-[#555] transition hover:text-[#999]"
            >
              <ArrowLeft size={14} />
              Stuffs publics
            </Link>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <p className="text-[15px] text-red-400/90">{error ?? "Profil introuvable"}</p>
          <Link href="/stuffs" className="mt-4 text-[12px] text-[#f0d78c] hover:underline">
            Retour aux stuffs publics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-4 px-4 md:px-6">
          <Link
            href="/stuffs"
            className="flex items-center gap-1.5 text-[12px] text-[#555] transition hover:text-[#999]"
          >
            <ArrowLeft size={14} />
            Stuffs publics
          </Link>
          <span className="text-[#2a2a2a]">/</span>
          <span className="truncate text-[12px] font-medium text-[#666]">{profile.username}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8 md:px-6">
        <Plaque ornate className="mb-8 flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          <UserAvatar username={profile.username} size="lg" />

          <div className="flex flex-1 flex-col gap-3">
            <h1 className="font-display text-[28px] font-medium text-[#f0d78c]">{profile.username}</h1>

            <div className="flex flex-wrap gap-4 text-[12px]">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-[#444]" />
                <span className="text-[#666]">
                  Membre depuis{" "}
                  {new Date(profile.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="mt-1 flex flex-wrap gap-3">
              <Plaque flat className="flex flex-col items-center justify-center px-6 py-4">
                <span className="font-display text-[26px] font-medium text-[#f0d78c]">
                  {profile.public_builds_count}
                </span>
                <span className="mt-0.5 text-[11px] uppercase tracking-wide text-[#555]">
                  Build{profile.public_builds_count !== 1 ? "s" : ""} public{profile.public_builds_count !== 1 ? "s" : ""}
                </span>
              </Plaque>
              <Plaque flat className="flex flex-col items-center justify-center px-6 py-4">
                <span className="font-display text-[26px] font-medium text-[#f0d78c]">
                  {profile.total_upvotes ?? 0}
                </span>
                <span className="mt-0.5 text-[11px] uppercase tracking-wide text-[#555]">
                  Upvote{(profile.total_upvotes ?? 0) !== 1 ? "s" : ""} reçu{(profile.total_upvotes ?? 0) !== 1 ? "s" : ""}
                </span>
              </Plaque>
            </div>
          </div>
        </Plaque>

        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="font-display text-[19px] font-medium text-[#e0d0a0]">Builds publics</h2>
          <span className="text-[12px] text-[#555]">
            {profile.builds.length} build{profile.builds.length !== 1 ? "s" : ""}
          </span>
        </div>

        {profile.builds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[15px] text-[#444]">Aucun build public pour le moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {profile.builds.map((b) => (
              <PublicBuildCard key={b.id} build={b} onOpen={(build) => void openBuild(build)} />
            ))}
          </div>
        )}
      </main>

      {viewerOverlay}
    </div>
  );
}
