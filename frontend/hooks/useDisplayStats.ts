"use client";

import { useMemo } from "react";

import { computeDisplayStats } from "@/lib/buildDisplayStats";
import { useBuildStore } from "@/store/build-store";

/** Total carac (stuff + points + parchos + exo), aligné sur le panneau Stats. */
export function useDisplayStats(): Record<string, number> {
  const rawStats = useBuildStore((s) => s.stats);
  const level = useBuildStore((s) => s.level);
  const charStats = useBuildStore((s) => s.charStats);
  const parchoStats = useBuildStore((s) => s.parchoStats);
  const exoFm = useBuildStore((s) => s.exoFm);

  return useMemo(
    () => computeDisplayStats(rawStats, level, charStats, parchoStats, exoFm),
    [rawStats, level, charStats, parchoStats, exoFm],
  );
}
