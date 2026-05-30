"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ItemCatalogPanel } from "@/components/items/ItemCatalogPanel";
import { useBuildStore } from "@/store/build-store";

export function CatalogDrawer() {
  const selectedSlot = useBuildStore((s) => s.selectedSlot);
  const setSelectedSlot = useBuildStore((s) => s.setSelectedSlot);
  const isOpen = selectedSlot !== null;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedSlot(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, setSelectedSlot]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Fond semi-transparent */}
      <div
        className={`fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSelectedSlot(null)}
      />

      {/* Panneau latéral (slide depuis la droite) */}
      <div
        className={`fixed right-0 top-0 z-[151] flex h-full w-full flex-col bg-[#111111] shadow-2xl transition-transform duration-300 ease-out sm:max-w-2xl ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* En-tête du tiroir */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#2a2a2a] bg-[#181818] px-5 py-3">
          <p className="text-[13px] font-medium text-[var(--dofus-green-active)]">
            Choisir un objet pour l&apos;emplacement sélectionné
          </p>
          <button
            type="button"
            onClick={() => setSelectedSlot(null)}
            className="rounded-lg p-1.5 text-[#666666] transition hover:bg-[#222222] hover:text-[#e0e0e0]"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ItemCatalogPanel />
        </div>
      </div>
    </>,
    document.body,
  );
}
