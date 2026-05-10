"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { OptimizePanel } from "@/components/dashboard/OptimizePanel";

type ActiveTool = "optimize" | "chat";

interface ToolsDrawerProps {
  isOpen: boolean;
  activeTool: ActiveTool;
  setActiveTool: (t: ActiveTool) => void;
  onClose: () => void;
}

export function ToolsDrawer({
  isOpen,
  activeTool,
  setActiveTool,
  onClose,
}: ToolsDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Fond semi-transparent */}
      <div
        className={`fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panneau latéral (slide depuis la gauche) */}
      <div
        className={`fixed left-0 top-0 z-[151] flex h-full w-full flex-col bg-[#111111] shadow-2xl transition-transform duration-300 ease-out sm:max-w-[420px] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* En-tête */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2a2a2a] bg-[#181818] px-4 py-3">
          {/* Tabs intégrés */}
          <div className="relative grid flex-1 grid-cols-2 rounded-lg border border-[#222222] bg-[#0e0e0e] p-1">
            <span
              aria-hidden
              className={`absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-md border border-[#4a8000]/60 bg-[#1a2c0a] transition-transform duration-300 ease-out ${
                activeTool === "optimize"
                  ? "translate-x-0"
                  : "translate-x-[calc(100%+0.5rem)]"
              }`}
            />
            <button
              type="button"
              onClick={() => setActiveTool("optimize")}
              className={`relative z-10 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                activeTool === "optimize"
                  ? "text-[#9cce38]"
                  : "text-[#888888] hover:text-[#cccccc]"
              }`}
            >
              ⚙ Optim. auto
            </button>
            <button
              type="button"
              onClick={() => setActiveTool("chat")}
              className={`relative z-10 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                activeTool === "chat"
                  ? "text-[#9cce38]"
                  : "text-[#888888] hover:text-[#cccccc]"
              }`}
            >
              🤖 Conseiller IA
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[#666666] transition hover:bg-[#222222] hover:text-[#e0e0e0]"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Contenu : optimize scrollable, chat prend toute la hauteur */}
        <div className="flex min-h-0 flex-1 flex-col">
          {activeTool === "optimize" ? (
            <div className="flex-1 overflow-y-auto p-4">
              <OptimizePanel bare />
            </div>
          ) : (
            <ChatPanel bare />
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
