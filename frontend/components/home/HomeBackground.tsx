import { ZaapRuneSparkles } from "@/components/home/ZaapRuneSparkles";

/** Fond homepage — illustration générée, semi-transparente sur le noir de l'app. */
export function HomeBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0a]" />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/home/homepage-bg.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.42]"
      />

      <ZaapRuneSparkles />

      {/* Assombrit les bords + bas pour le texte et les cards */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/55 via-[#0a0a0a]/15 to-[#0a0a0a]/95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_40%,transparent_0%,#0a0a0a_88%)]" />
    </div>
  );
}
