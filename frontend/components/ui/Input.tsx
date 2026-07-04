import React from "react";

import { cn } from "@/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, containerClassName, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-[11px] font-semibold uppercase tracking-wide text-[#6f6f6f]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-[10px] border border-[color:var(--atelier-plaque-border)] bg-black/30 px-3 py-2 text-sm text-[#e4e4e4] placeholder:text-[#5a5a5a] transition focus:border-[color:var(--atelier-plaque-border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--dofus-ui-selected-glow)]",
            error && "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20",
            className,
          )}
          {...props}
        />
        {hint && !error && <p className="text-[11px] text-[#555]">{hint}</p>}
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
