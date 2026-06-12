import Link from "next/link";

import { Navbar } from "@/components/layout/Navbar";

export const metadata = {
  title: "Zaap Builder — Création de stuff Dofus 3",
};

function IconBuilder() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-10 w-10" aria-hidden>
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
    <svg viewBox="0 0 48 48" fill="none" className="h-10 w-10" aria-hidden>
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

type NavCard = {
  href: string;
  title: string;
  description: string;
  label: string;
  accent: string;
  icon: React.ReactNode;
  badge?: string;
};

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
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <Navbar />

      {/* ── Hero ── */}
      <div className="flex w-full flex-col items-center px-4 pb-12 pt-16 text-center">
        <h1 className="text-[32px] font-bold tracking-tight text-white sm:text-[40px]">
          Zaap Builder
        </h1>
        <p className="mt-3 max-w-[480px] text-[15px] leading-relaxed text-[#555]">
          L&rsquo;outil communautaire de création de stuff pour&nbsp;
          <span className="text-[#888]">Dofus&nbsp;3</span>.
        </p>
      </div>

      {/* ── Cards ── */}
      <div className="mx-auto grid w-full max-w-[860px] grid-cols-1 gap-4 px-4 pb-16 sm:grid-cols-2 sm:gap-6">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#1e1e1e] bg-[#111] p-6 transition-all duration-200 hover:border-[#2e2e2e] hover:bg-[#141414]"
            style={
              {
                "--card-accent": card.accent,
              } as React.CSSProperties
            }
          >
            {/* Glow de fond au hover */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background: `radial-gradient(ellipse at 50% 0%, ${card.accent}12 0%, transparent 70%)`,
              }}
            />

            {/* Icône */}
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]"
              style={{ color: card.accent }}
            >
              {card.icon}
            </div>

            {/* Titre */}
            <h2 className="mb-2 text-[18px] font-bold text-white/90">{card.title}</h2>

            {/* Description */}
            <p className="flex-1 text-[13px] leading-relaxed text-[#555]">{card.description}</p>

            {/* CTA */}
            <div className="mt-5 flex items-center gap-1.5 text-[13px] font-medium" style={{ color: card.accent }}>
              {card.label}
              <svg
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            {/* Trait coloré en bas */}
            <div
              className="absolute bottom-0 left-0 h-[2px] w-0 rounded-b-2xl transition-all duration-300 group-hover:w-full"
              style={{ backgroundColor: card.accent, opacity: 0.5 }}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
