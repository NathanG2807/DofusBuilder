"use client";

import { AccountButton } from "@/components/layout/AccountButton";
import { useBuildStore } from "@/store/build-store";

export function Navbar() {
  const buildName = useBuildStore((s) => s.buildName);
  const setBuildName = useBuildStore((s) => s.setBuildName);

  return (
    <header
      className="sticky top-0 z-40 border-b border-[#2a3a18] bg-[#141414]/96 backdrop-blur-sm"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(90,160,20,0.18)" }}
    >
      {/* Liseré vert en haut */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#5a9818]/60 to-transparent" />

      <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-3 md:gap-4 md:px-6">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-lg leading-none sm:text-xl">⚔️</span>
          <span className="font-serif text-base font-semibold tracking-wide text-[#f0d78c] sm:text-lg">
            <span className="hidden xs:inline">Dofus </span>Builder
          </span>
        </div>

        {/* Séparateur + Nom du build — masqué sur très petit écran */}
        <div className="hidden items-center gap-3 sm:flex">
          <div className="h-5 w-px shrink-0 bg-[#2a2a2a]" />
          <input
            value={buildName}
            onChange={(e) => setBuildName(e.target.value)}
            className="min-w-0 w-[160px] rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-[#d0d0d0] placeholder:text-[#484848] hover:border-[#2a2a2a] focus:border-[#3a3a3a] focus:bg-[#1a1a1a] focus:outline-none md:w-[220px]"
            placeholder="Nom du build…"
            aria-label="Nom du build"
          />
        </div>

        <div className="flex-1" />

        {/* Compte */}
        <AccountButton />
      </div>
    </header>
  );
}
