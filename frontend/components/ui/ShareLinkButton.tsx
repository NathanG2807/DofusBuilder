"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

import { copyBuildShareLink } from "@/lib/buildShare";
import { cn } from "@/lib/cn";

type ShareLinkButtonProps = {
  buildId: string;
  /** Style compact (icône seule) pour cartes / listes denses. */
  compact?: boolean;
  className?: string;
  /** Empêche le clic de remonter (cartes cliquables). */
  stopPropagation?: boolean;
  label?: string;
};

export function ShareLinkButton({
  buildId,
  compact = false,
  className,
  stopPropagation = false,
  label = "Partager",
}: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    if (stopPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      await copyBuildShareLink(buildId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => void handleClick(e)}
      title={copied ? "Lien copié !" : "Copier le lien de partage"}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 transition",
        compact
          ? "rounded-md border border-white/[0.08] bg-white/[0.03] p-1.5 text-[#888] hover:border-[var(--dofus-green-active)]/35 hover:text-[var(--dofus-green-active)]"
          : "rounded-lg border border-[var(--dofus-green-active)]/30 bg-[var(--dofus-green-active)]/10 px-3 py-1.5 text-[12px] font-medium text-[var(--dofus-green-active)] hover:bg-[var(--dofus-green-active)]/20",
        copied && "border-emerald-400/40 text-emerald-400",
        className,
      )}
    >
      {copied ? <Check size={compact ? 12 : 13} /> : <Link2 size={compact ? 12 : 13} />}
      {!compact && <span>{copied ? "Lien copié !" : label}</span>}
    </button>
  );
}
