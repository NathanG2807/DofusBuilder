"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountButton } from "@/components/layout/AccountButton";

export type AppTab = "buildroom" | "stuffs";

const NAV_TABS: { label: string; href: string; tab: AppTab }[] = [
  { label: "Buildroom", href: "/builder", tab: "buildroom" },
  { label: "Stuffs", href: "/stuffs", tab: "stuffs" },
];

type NavbarProps = {
  /** Surcharge manuelle de l'onglet actif (facultatif, sinon détecté via la route). */
  activeTab?: AppTab;
  /** Callback optionnel pour la compatibilité ascendante (DashboardApp). */
  onTabChange?: (tab: AppTab) => void;
};

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const pathname = usePathname();

  function resolveActive(tab: AppTab): boolean {
    if (activeTab != null) return activeTab === tab;
    if (tab === "buildroom") return pathname === "/builder" || pathname.startsWith("/builder/");
    if (tab === "stuffs") return pathname === "/stuffs" || pathname.startsWith("/stuffs/");
    return false;
  }

  return (
    <header
      className="sticky top-8 z-40 mx-4 mt-6 rounded-2xl border border-white/[0.06] bg-[#0a0a0a]/70 backdrop-blur-xl md:mx-8"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset" }}
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 md:px-6">
        {/* Logo → accueil */}
        <Link href="/" className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/global/ZaapLogo4.png"
            alt="Zaap"
            width={100}
            height={100}
            className="h-[100px] w-[100px] object-contain drop-shadow-[0_0_8px_rgba(90,200,20,0.35)]"
          />
        </Link>

        {/* Séparateur vertical */}
        <div className="h-5 w-px shrink-0 bg-white/10" />

        {/* Navigation */}
        <nav className="hidden items-center gap-0.5 sm:flex">
          {NAV_TABS.map(({ label, href, tab }) => {
            const isActive = resolveActive(tab);
            return (
              <Link
                key={tab}
                href={href}
                onClick={() => onTabChange?.(tab)}
                className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition ${
                  isActive
                    ? "bg-white/[0.07] text-white/80"
                    : "text-white/30 hover:bg-white/[0.05] hover:text-white/60"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Compte */}
        <AccountButton />
      </div>
    </header>
  );
}
