"use client";

import { createContext, useContext, useMemo } from "react";

import { computeDisplayStats } from "@/lib/buildDisplayStats";
import { useBuildStore } from "@/store/build-store";

/**
 * Contexte permettant de surcharger les stats affichées pour la vue lecture seule.
 * Quand une valeur est fournie via ce contexte, useDisplayStats() la retourne
 * directement (évitant de lire le store de l'utilisateur connecté).
 */
export const DisplayStatsContext = createContext<Record<string, number> | null>(null);

/** Total carac (stuff + points + parchos + exo), aligné sur le panneau Stats. */
export function useDisplayStats(): Record<string, number> {
  const override = useContext(DisplayStatsContext);

  const rawStats = useBuildStore((s) => s.stats);
  const level = useBuildStore((s) => s.level);
  const charStats = useBuildStore((s) => s.charStats);
  const parchoStats = useBuildStore((s) => s.parchoStats);
  const exoFm = useBuildStore((s) => s.exoFm);

  const computed = useMemo(
    () => computeDisplayStats(rawStats, level, charStats, parchoStats, exoFm),
    [rawStats, level, charStats, parchoStats, exoFm],
  );

  return override ?? computed;
}
