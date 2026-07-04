"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { DashboardApp } from "@/components/dashboard/DashboardApp";
import { DofusSpinner } from "@/components/ui/DofusSpinner";
import { getBuildById } from "@/lib/api";
import { useBuildStore } from "@/store/build-store";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function SharedBuildPage() {
  const params = useParams();
  const raw = params.buildId;
  const buildId = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";

  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!buildId || !UUID_RE.test(buildId)) {
      setPhase("error");
      setMessage("Identifiant de build invalide.");
      return;
    }

    (async () => {
      try {
        const b = await getBuildById(buildId);
        if (cancelled) return;
        const { hydrateFromPersistedBuild, prefetchEquippedItems } =
          useBuildStore.getState();
        hydrateFromPersistedBuild(b);
        await prefetchEquippedItems();
        if (!cancelled) setPhase("ready");
      } catch (e) {
        if (cancelled) return;
        setPhase("error");
        setMessage(
          e instanceof Error ? e.message : "Impossible de charger le build.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [buildId]);

  if (phase === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <DofusSpinner size={72} label="Chargement du build partagé…" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-lg p-8">
        <p className="text-sm text-red-400/90">{message ?? "Erreur"}</p>
        <a href="/" className="mt-4 inline-block text-sm text-amber-500 hover:underline">
          Retour à l’accueil
        </a>
      </div>
    );
  }

  return <DashboardApp />;
}
