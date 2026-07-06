"use client";

import { useEffect } from "react";

import { sendHeartbeat } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

const HEARTBEAT_MS = 30_000;

/**
 * Envoie un heartbeat toutes les 30 s tant que l'onglet est visible
 * et que l'utilisateur est authentifié. Utilisé pour alimenter le
 * compteur "membres en ligne" sur la page d'accueil.
 */
export function useHeartbeat(): void {
  useEffect(() => {
    if (!getAccessToken()) return;

    let intervalId: ReturnType<typeof setInterval>;

    function ping() {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    }

    ping();
    intervalId = setInterval(ping, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
