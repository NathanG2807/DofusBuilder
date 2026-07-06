"use client";

import { useEffect } from "react";

import { sendHeartbeat } from "@/lib/api";

const HEARTBEAT_MS = 30_000;

/**
 * Envoie un heartbeat toutes les 30 s tant que l'onglet est visible
 * et que l'utilisateur est authentifié. Utilisé pour alimenter le
 * compteur "membres en ligne" sur la page d'accueil.
 *
 * Le check du token est délégué à sendHeartbeat() (no-op si absent),
 * ce qui permet de démarrer le compteur même si l'utilisateur se
 * connecte après le premier rendu de la page.
 */
export function useHeartbeat(): void {
  useEffect(() => {
    function ping() {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    }

    ping();
    const intervalId = setInterval(ping, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", ping);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
}
