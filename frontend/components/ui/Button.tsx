"use client";

import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

import { cn } from "@/lib/cn";

/**
 * Bouton "Atelier d'artisan" — reprend l'esprit biseauté des anciens
 * .btn-dofus-* (ombre interne, relief) sans en être une copie : casse
 * normale, coins plus arrondis, léger soulèvement au survol plutôt qu'un
 * simple changement de luminosité. Utilisé dans toute l'app, y compris
 * le Buildroom (tailles "xs"/"icon" pour les contextes denses).
 */
const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-1.5 rounded-[10px] font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45",
  {
    variants: {
      variant: {
        solid:
          "border border-[#0c100b] border-b-[#050705] bg-gradient-to-b from-[var(--dofus-color-ref-end)] to-[var(--dofus-color-ref-start)] text-[#ecf4e4] shadow-[0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.14)] hover:-translate-y-px hover:brightness-110 active:translate-y-0 active:brightness-90",
        outline:
          "border border-[color:var(--atelier-plaque-border)] bg-white/[0.02] text-[#d0d0d0] hover:-translate-y-px hover:border-white/20 hover:bg-white/[0.05]",
        ghost:
          "text-[#8a8a8a] hover:bg-white/[0.05] hover:text-[#e0e0e0]",
        danger:
          "text-[#e0796a] hover:bg-[#e0796a]/10 hover:text-[#f0a094]",
      },
      size: {
        xs: "rounded-[7px] px-2 py-1 text-[11px]",
        sm: "px-3 py-1.5 text-[12px]",
        md: "px-4 py-2 text-[13px]",
        lg: "px-5 py-2.5 text-[14px]",
        icon: "h-7 w-7 rounded-[7px] p-0",
      },
    },
    defaultVariants: { variant: "solid", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
