"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

import { PlaqueLink } from "@/components/ui/Plaque";
import type { NavCard } from "@/app/page";

export function HomeCards({ cards }: { cards: NavCard[] }) {
  return (
    <div className="mx-auto grid w-full max-w-[960px] grid-cols-1 gap-3.5 px-4 pb-16 sm:grid-cols-2 sm:gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.href}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
          className="h-full"
        >
          <PlaqueLink
            href={card.href}
            ornate
            className="group relative flex min-h-[260px] flex-col overflow-hidden p-0 sm:min-h-[290px]"
          >
            {card.image ? (
              <>
                <Image
                  src={card.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 280px"
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
                  style={{
                    opacity: card.imageOpacity ?? 1,
                    objectPosition: card.imagePosition ?? "center center",
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-[#0c0d0a]/15 transition-colors duration-300 group-hover:bg-[#0c0d0a]/5" />
              </>
            ) : null}

            <div className="relative mt-auto w-full border-t border-white/[0.08] bg-[#0c0d0a]/60 px-4 py-3 backdrop-blur-md transition-[background-color,padding] duration-300 ease-out group-hover:bg-[#0c0d0a]/72 group-hover:py-3.5 group-focus-within:bg-[#0c0d0a]/72 group-focus-within:py-3.5">
              <h2 className="font-display text-[17px] font-medium text-white/95">{card.title}</h2>

              <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]">
                <div className="overflow-hidden">
                  <div className="translate-y-1 pt-2 opacity-0 transition-[opacity,transform] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-hover:delay-75 group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    <p className="text-[13px] leading-relaxed text-white/65">{card.description}</p>

                    <div
                      className="mt-3 flex items-center gap-1.5 text-[13px] font-medium"
                      style={{ color: card.accent }}
                    >
                      {card.label}
                      <ArrowRight
                        size={15}
                        className="transition-transform duration-200 group-hover:translate-x-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PlaqueLink>
        </motion.div>
      ))}
    </div>
  );
}
