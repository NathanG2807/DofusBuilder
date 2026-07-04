"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { IconMedallion } from "@/components/ui/IconMedallion";
import { PlaqueLink } from "@/components/ui/Plaque";
import type { NavCard } from "@/app/page";

export function HomeCards({ cards }: { cards: NavCard[] }) {
  return (
    <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-4 px-4 pb-16 sm:grid-cols-2 sm:gap-5 lg:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.href}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
        >
          <PlaqueLink href={card.href} ornate className="group flex h-full flex-col p-6">
            <IconMedallion color={card.accent} size="md" className="mb-4">
              {card.icon}
            </IconMedallion>

            <h2 className="mb-2 font-display text-[19px] font-medium text-white/90">{card.title}</h2>

            <p className="flex-1 text-[13px] leading-relaxed text-[#6b6b6b]">{card.description}</p>

            <div
              className="mt-5 flex items-center gap-1.5 text-[13px] font-medium"
              style={{ color: card.accent }}
            >
              {card.label}
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </div>
          </PlaqueLink>
        </motion.div>
      ))}
    </div>
  );
}
