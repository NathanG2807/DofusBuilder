"use client";

import React from "react";

import { cn } from "@/lib/cn";

type ChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  accentColor?: string;
};

/** Pastille de filtre/tag — alternative aux rounded-full génériques. */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ active, accentColor, className, style, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        data-active={active ? "true" : "false"}
        className={cn("chip", className)}
        style={
          active && accentColor
            ? ({
                borderColor: `${accentColor}88`,
                backgroundColor: `${accentColor}22`,
                color: accentColor,
                ...style,
              } as React.CSSProperties)
            : style
        }
        {...props}
      >
        {children}
      </button>
    );
  },
);
Chip.displayName = "Chip";
