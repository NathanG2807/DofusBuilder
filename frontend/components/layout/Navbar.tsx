"use client";

import { AccountButton } from "@/components/layout/AccountButton";

export function Navbar() {
  return (
    <header
      className="sticky top-8 z-40 mx-4 mt-6 rounded-2xl border border-white/[0.06] bg-[#0a0a0a]/70 backdrop-blur-xl md:mx-8"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset" }}
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 md:px-6">
        {/* Logo */}
        <div className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/global/ZaapLogo4.png"
            alt="Zaap"
            width={100}
            height={100}
            className="h-[100px] w-[100px] object-contain drop-shadow-[0_0_8px_rgba(90,200,20,0.35)]"
          />
        </div>

        {/* Séparateur vertical */}
        <div className="h-5 w-px shrink-0 bg-white/10" />

        {/* Navigation */}
        <nav className="hidden items-center gap-0.5 sm:flex">
          <button
            type="button"
            className="rounded-lg bg-white/[0.07] px-4 py-1.5 text-[13px] font-medium text-white/80 transition hover:bg-white/[0.10]"
          >
            Buildroom
          </button>
          <button
            type="button"
            className="rounded-lg px-4 py-1.5 text-[13px] font-medium text-white/30 transition hover:bg-white/[0.05] hover:text-white/60"
          >
            Encyclopédie
          </button>
        </nav>

        <div className="flex-1" />

        {/* Compte */}
        <AccountButton />
      </div>
    </header>
  );
}
