"use client";

import { Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";

import { cn } from "@/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  showPasswordToggle?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      className,
      containerClassName,
      id,
      type,
      showPasswordToggle = false,
      ...props
    },
    ref,
  ) => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const inputId = id ?? props.name;
    const inputType = showPasswordToggle
      ? passwordVisible
        ? "text"
        : "password"
      : type;

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-[11px] font-semibold uppercase tracking-wide text-[#6f6f6f]">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              "w-full rounded-[10px] border border-[color:var(--atelier-plaque-border)] bg-black/30 px-3 py-2 text-sm text-[#e4e4e4] placeholder:text-[#5a5a5a] transition focus:border-[color:var(--atelier-plaque-border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--dofus-ui-selected-glow)]",
              showPasswordToggle && "pr-10",
              error && "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20",
              className,
            )}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              tabIndex={-1}
              aria-label={passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              onClick={() => setPasswordVisible((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-white/35 transition hover:text-white/65"
            >
              {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {hint && !error && <p className="text-[11px] text-[#555]">{hint}</p>}
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
