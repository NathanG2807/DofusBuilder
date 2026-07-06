import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import { HeartbeatProvider } from "@/components/layout/HeartbeatProvider";
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
  title: "Dofus Builder — Création de stuff",
  description:
    "Compose ton équipement, optimise tes stats et partage tes builds (Dofus 3).",
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
          Zaap est un fan site communautaire non officiel.
          Dofus, les images et tous les contenus du jeu sont la propriété exclusive d&apos;{" "}
          <span className="text-[#555555]">Ankama Games</span> — tous droits réservés.
          Ce site n&apos;est ni affilié ni approuvé par Ankama.
        </footer>
      </body>
    </html>
  );
}
