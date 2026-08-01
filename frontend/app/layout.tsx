import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import { HeartbeatProvider } from "@/components/layout/HeartbeatProvider";
import { DiscordIcon, DISCORD_INVITE_URL } from "@/components/ui/DiscordIcon";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Police display "de caractère" pour les gros titres (identité Atelier d'artisan). */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://zaaap.vercel.app",
  ),
  title: "Dofus Builder — Création de stuff",
  description:
    "Compose ton équipement, optimise tes stats et partage tes builds (Dofus 3).",
  openGraph: {
    siteName: "Zaap Builder",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="dofus-app flex min-h-full flex-col">
        <HeartbeatProvider />
        {children}
        <footer className="mt-auto border-t border-white/[0.04] py-3 text-center text-[11px] text-[#444444]">
          <p>
            Zaap est un fan site communautaire non officiel.
            Dofus, les images et tous les contenus du jeu sont la propriété exclusive d&apos;{" "}
            <span className="text-[#555555]">Ankama Games</span> — tous droits réservés.
            Ce site n&apos;est ni affilié ni approuvé par Ankama.
          </p>
          <p className="mt-1.5">
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Rejoindre le Discord Zaap"
              className="inline-flex opacity-70 transition-opacity hover:opacity-100"
            >
              <DiscordIcon size={20} />
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
