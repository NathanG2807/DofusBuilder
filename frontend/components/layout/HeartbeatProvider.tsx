"use client";

import { useHeartbeat } from "@/hooks/useHeartbeat";

/** Branche le heartbeat d'activité (compteur membres en ligne). */
export function HeartbeatProvider() {
  useHeartbeat();
  return null;
}
