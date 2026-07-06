import { HomeBackground } from "@/components/home/HomeBackground";
import { HomeCards } from "@/components/home/HomeCards";
import { HomeLiveStats } from "@/components/home/HomeLiveStats";
import { Navbar } from "@/components/layout/Navbar";

export const metadata = {
  title: "Zaap Builder — Création de stuff Dofus 3",
};

export type NavCard = {
  href: string;
  title: string;
  description: string;
  label: string;
  accent: string;
  image?: string;
  imageOpacity?: number;
  imagePosition?: string;
};

const CARDS: NavCard[] = [
  {
    href: "/builder",
    title: "Buildroom",
    description:
      "Compose tes builds et optimise ton stuff avec le builder intelligent.",
    label: "Buildroom",
    accent: "var(--dofus-green-active)",
    image: "/assets/homepage/SixDofus.jpg",
  },
  {
    href: "/stuffs",
    title: "Stuffs publics",
    description:
      "Parcours les builds partagés par la communauté et importe les builds qui t'inspirent.",
    label: "Builds",
    accent: "#f0d78c",
    image: "/assets/homepage/sutffs.png",
    imagePosition: "center 35%",
  },
  {
    href: "/bestiaire",
    title: "Bestiaire",
    description:
      "Consulte les stats, les sorts et les drops de tous les monstres pour préparer tes combats.",
    label: "Bestiaire",
    accent: "#e05838",
    image: "/assets/homepage/bestiaire.png",
  },
  {
    href: "/atelier",
    title: "L'Atelier",
    description:
      "Suis l'avancement de tes crafts : listes d'ingrédients, builds et validation progressive.",
    label: "Atelier",
    accent: "#98c030",
    image: "/assets/homepage/atelier.png",
  },
];

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <HomeBackground />
      <Navbar />

      {/* ── Hero ── */}
      <div className="flex w-full flex-col items-center px-4 pt-20 text-center mt-30 sm:mt-34">
        <h1 className="font-display text-[38px] font-medium italic tracking-tight text-white sm:text-[52px]">
          {/* Zaap Builder */}
        </h1>
        <p className="mt-4 max-w-[480px] text-[18px] leading-relaxed text-[#6b6b6b]">
          Bienvenue sur Zaap, votre outil communautaire pour&nbsp;
          <span className="text-[#8a8a8a]">Dofus&nbsp;3</span>.
        </p>
        <span className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--dofus-green-active)]/80">
          Outil communautaire non officiel
        </span>
      </div>

      <div className="mt-28 sm:mt-32">
        <HomeCards cards={CARDS} />
      </div>

      <HomeLiveStats />
    </div>
  );
}
