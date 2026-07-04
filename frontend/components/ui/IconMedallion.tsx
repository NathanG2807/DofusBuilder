import React from "react";

import { cn } from "@/lib/cn";

type IconMedallionProps = {
  children: React.ReactNode;
  /** Couleur d'accent (texte + anneau gravé), ex. "var(--dofus-green-active)" ou un hex. */
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<IconMedallionProps["size"]>, string> = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

/** Badge circulaire gravé pour remplacer les pastilles "bg-white/[0.03] rounded-xl". */
export function IconMedallion({ children, color = "var(--dofus-green-active)", size = "md", className }: IconMedallionProps) {
  return (
    <div
      className={cn("medallion shrink-0", SIZE_CLASSES[size], className)}
      style={{ color }}
    >
      <span className="relative flex items-center justify-center" style={{ color }}>
        {children}
      </span>
    </div>
  );
}
