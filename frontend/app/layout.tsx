import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="dofus-app flex min-h-full flex-col">
        {children}
        <footer className="mt-auto border-t border-white/[0.04] py-3 text-center text-[11px] text-[#444444]">
          Zaap Builder est un outil communautaire non officiel.
          Dofus, les images et tous les contenus du jeu sont la propriété exclusive d&apos;{" "}
          <span className="text-[#555555]">Ankama Games</span> — tous droits réservés.
          Ce site n&apos;est ni affilié ni approuvé par Ankama.
        </footer>
      </body>
    </html>
  );
}
