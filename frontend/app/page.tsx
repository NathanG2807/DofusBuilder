import Link from "next/link";

import { Navbar } from "@/components/layout/Navbar";
import { HomeCards } from "@/components/home/HomeCards";

export const metadata = {
  title: "Zaap Builder — Création de stuff Dofus 3",
};

export type NavCard = {
  href: string;
  title: string;
  description: string;
  label: string;
  accent: string;
  icon: React.ReactNode;
};

function IconBuilder() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-6 w-6" aria-hidden>
      <rect x="6" y="6" width="16" height="16" rx="3" fill="currentColor" opacity=".18" />
      <rect x="26" y="6" width="16" height="16" rx="3" fill="currentColor" opacity=".12" />
      <rect x="6" y="26" width="16" height="16" rx="3" fill="currentColor" opacity=".12" />
      <rect x="26" y="26" width="16" height="16" rx="3" fill="currentColor" opacity=".08" />
      <path d="M10 14h8M14 10v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="34" cy="14" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="14" cy="34" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M30 34h8M34 30v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

function IconStuffs() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-6 w-6" aria-hidden>
      <path
        d="M24 6l4.5 9.5 10.5 1.5-7.5 7.5 1.8 10.5L24 30l-9.3 5 1.8-10.5L9 17l10.5-1.5L24 6z"
        fill="currentColor"
        opacity=".15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="6" fill="currentColor" opacity=".25" />
    </svg>
  );
}

function IconBestiary() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-6 w-6" aria-hidden>
      <circle cx="24" cy="20" r="11" fill="currentColor" opacity=".12" stroke="currentColor" strokeWidth="2" />
      <circle cx="19" cy="18" r="2" fill="currentColor" opacity=".7" />
      <circle cx="29" cy="18" r="2" fill="currentColor" opacity=".7" />
      <path d="M19.5 24.5s1.2 2 4.5 2 4.5-2 4.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".6" />
      <path d="M16 12c-2-3-5-3-6-1M32 12c2-3 5-3 6-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".4" />
      <path d="M12 28c-4 2-4 8 0 8h24c4 0 4-6 0-8" fill="currentColor" opacity=".1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconAtelier() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-6 w-6" aria-hidden>
      <rect x="8" y="10" width="32" height="28" rx="3" fill="currentColor" opacity=".1" stroke="currentColor" strokeWidth="2" />
      <path d="M14 18h20M14 24h14M14 30h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".55" />
      <path
        d="M30 28l4 4 6-8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 6v4M30 6v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".45" />
    </svg>
  );
}

const CARDS: NavCard[] = [
  {
    href: "/builder",
    title: "Buildroom",
    description:
      "Compose ton équipement slot par slot, consulte tes stats en temps réel et optimise ton stuff avec le solveur intelligent.",
    label: "Ouvrir le builder",
    accent: "var(--dofus-green-active)",
    icon: <IconBuilder />,
  },
  {
    href: "/stuffs",
    title: "Stuffs publics",
    description:
      "Parcours les builds partagés par la communauté, filtre par classe et par tag, et importe directement ceux qui t'inspirent.",
    label: "Explorer les stuffs",
    accent: "#f0d78c",
    icon: <IconStuffs />,
  },
  {
    href: "/bestiaire",
    title: "Bestiaire",
    description:
      "Consulte les stats, les résistances et les archis-monstres de tous les monstres Dofus 3 pour préparer tes combats.",
    label: "Ouvrir le bestiaire",
    accent: "#e05838",
    icon: <IconBestiary />,
  },
  {
    href: "/atelier",
    title: "L'Atelier",
    description:
      "Suis l'avancement de tes crafts : listes d'ingrédients, panoplies, builds complets et validation progressive.",
    label: "Ouvrir l'atelier",
    accent: "#98c030",
    icon: <IconAtelier />,
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <Navbar />

      {/* ── Hero ── */}
      <div className="flex w-full flex-col items-center px-4 pb-14 pt-20 text-center">
        <span className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--dofus-green-active)]/80">
          Outil communautaire non officiel
        </span>
        <h1 className="font-display text-[38px] font-medium italic tracking-tight text-white sm:text-[52px]">
          Zaap Builder
        </h1>
        <p className="mt-4 max-w-[480px] text-[15px] leading-relaxed text-[#6b6b6b]">
          Forge ton équipement,{" "}
          <Link href="/builder" className="text-[#8a8a8a] underline decoration-white/15 underline-offset-4 hover:text-white/80">
            optimise ton stuff
          </Link>{" "}
          et partage tes créations pour&nbsp;
          <span className="text-[#8a8a8a]">Dofus&nbsp;3</span>.
        </p>
      </div>

      <HomeCards cards={CARDS} />
    </div>
  );
}
