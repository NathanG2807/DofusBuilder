import React from "react";

import { cn } from "@/lib/cn";

type SectionHeadingProps = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
};

/** Titre de section en police display (Fraunces), avec kicker optionnel. */
export function SectionHeading({ eyebrow, title, description, align = "left", className }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col", align === "center" && "items-center text-center", className)}>
      {eyebrow && (
        <span className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--dofus-green-active)]/80">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-[28px] font-medium leading-tight text-white/95 sm:text-[34px]">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-[560px] text-[14px] leading-relaxed text-[#767676]">{description}</p>
      )}
    </div>
  );
}
