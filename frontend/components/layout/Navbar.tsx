"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountButton } from "@/components/layout/AccountButton";
import { DiscordIcon, DISCORD_INVITE_URL } from "@/components/ui/DiscordIcon";

export type AppTab = "buildroom" | "stuffs" | "bestiaire" | "atelier";

const NAV_TABS: { label: string; href: string; tab: AppTab }[] = [
  { label: "Buildroom",  href: "/builder",   tab: "buildroom"  },
  { label: "Stuffs",     href: "/stuffs",    tab: "stuffs"     },
  { label: "Bestiaire",  href: "/bestiaire", tab: "bestiaire"  },
  { label: "L'Atelier",  href: "/atelier",   tab: "atelier"    },
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
    if (tab === "stuffs")    return pathname === "/stuffs"    || pathname.startsWith("/stuffs/");
    if (tab === "bestiaire") return pathname === "/bestiaire" || pathname.startsWith("/bestiaire/");
    if (tab === "atelier")   return pathname === "/atelier"   || pathname.startsWith("/atelier/");
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
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_TABS.map(({ label, href, tab }) => {
            const isActive = resolveActive(tab);
            return (
              <Link
                key={tab}
                href={href}
                onClick={() => onTabChange?.(tab)}
                className={`relative rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  isActive ? "text-white/90" : "text-white/35 hover:text-white/65"
                }`}
              >
                {label}
                {isActive && (
                  <motion.span
                    layoutId="navbar-active-underline"
                    className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full"
                    style={{ backgroundColor: "var(--dofus-green-active)" }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Compte + Discord */}
        <div className="flex items-center gap-2">
          <AccountButton />
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Rejoindre le Discord Zaap"
            className="group flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] transition-all duration-150 hover:border-[#5865F2]/40 hover:bg-[#5865F2]/10"
          >
            <DiscordIcon size={20} className="opacity-90 transition-opacity group-hover:opacity-100" />
          </a>
        </div>
      </div>
    </header>
  );
}
