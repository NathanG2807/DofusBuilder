"use client";

import { AccountButton } from "@/components/layout/AccountButton";
import { useBuildStore } from "@/store/build-store";

export function Navbar() {
  const buildName = useBuildStore((s) => s.buildName);
  const setBuildName = useBuildStore((s) => s.setBuildName);

  return (
    <header className="sticky top-0 z-40 border-b border-[#3d3428] bg-[#16120f]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 md:px-6">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xl leading-none">⚔️</span>
          <span className="font-serif text-lg font-semibold tracking-wide text-[#f0d78c]">
            Dofus Builder
          </span>
        </div>

        <div className="mx-4 h-5 w-px shrink-0 bg-[#3d3428]" />

        {/* Nom du build */}
        <input
          value={buildName}
          onChange={(e) => setBuildName(e.target.value)}
          className="min-w-0 max-w-[220px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-[#e8dcc8] placeholder:text-[#6a5c48] hover:border-[#3d3428] focus:border-[#5c4a32] focus:bg-[#1e1a16] focus:outline-none"
          placeholder="Nom du build…"
          aria-label="Nom du build"
        />

        <div className="flex-1" />

        {/* Compte */}
        <AccountButton />
      </div>
    </header>
  );
}
