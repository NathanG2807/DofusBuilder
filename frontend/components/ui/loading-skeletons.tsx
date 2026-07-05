import type { ReactNode } from "react";

import { DofusSpinner } from "@/components/ui/DofusSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Skeleton + spinner Dofus centré par-dessus. */
export function LoadingShell({
  children,
  spinnerSize = 48,
  label,
  className,
  minHeight = "min-h-[280px]",
}: {
  children: ReactNode;
  spinnerSize?: number;
  label?: string;
  className?: string;
  minHeight?: string;
}) {
  return (
    <div className={cn("relative", minHeight, className)}>
      <div className="opacity-70">{children}</div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <DofusSpinner size={spinnerSize} label={label} />
      </div>
    </div>
  );
}

/* ── Stuffs publics — carte build ─────────────────────────────────────────── */
export function BuildCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d0a]", className)}>
      <div className="space-y-2 px-3 pt-3 pb-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex justify-center px-2 py-4">
        <div className="flex items-start gap-1">
          <div className="flex flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-[5px]" />
            ))}
          </div>
          <Skeleton className="mx-1 h-[168px] w-[55px] rounded-lg" />
          <div className="flex flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-[5px]" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  );
}

export function BuildCardsSkeletonGrid({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <BuildCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ── Catalogue items (builder) ────────────────────────────────────────────── */
export function ItemCatalogRowSkeleton() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#181818]/80 px-2 py-1.5">
      <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-2.5 w-12" />
      </div>
    </div>
  );
}

export function ItemCatalogSkeletonGrid({ count = 12, className }: { count?: number; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-1 gap-1.5 sm:grid-cols-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <ItemCatalogRowSkeleton />
        </li>
      ))}
    </ul>
  );
}

/* ── Panoplies (liste) ────────────────────────────────────────────────────── */
export function SetListRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-2.5 w-16" />
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Skeleton className="h-7 w-14 rounded-[7px]" />
        <Skeleton className="h-7 w-16 rounded-[7px]" />
      </div>
    </div>
  );
}

export function SetListSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <ul className={cn("space-y-1.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <SetListRowSkeleton />
        </li>
      ))}
    </ul>
  );
}

/* ── Buildroom — inventaire ───────────────────────────────────────────────── */
export function InventoryGridSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-[#282828] bg-[#181818] p-3", className)}>
      <div className="mb-3 flex gap-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-14" />
        <Skeleton className="h-7 w-12" />
      </div>
      <div className="flex justify-center py-2">
        <div className="flex items-start gap-1.5">
          <div className="flex flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-10 rounded-lg" />
            ))}
          </div>
          <Skeleton className="mx-2 h-[220px] w-[100px] rounded-lg" />
          <div className="flex flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-10 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-[5px]" />
        ))}
      </div>
    </div>
  );
}

export function BuilderPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto grid max-w-[1600px] gap-4 p-4 lg:grid-cols-[1fr_320px]", className)}>
      <InventoryGridSkeleton />
      <div className="space-y-3 rounded-xl border border-[#282828] bg-[#181818] p-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <ItemCatalogSkeletonGrid count={8} />
      </div>
    </div>
  );
}

/* ── Atelier — liste d'objectifs ──────────────────────────────────────────── */
export function AtelierEntrySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0d0a] px-4 py-3", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-4 shrink-0" />
        <Skeleton className="h-4 flex-1 max-w-[180px]" />
        <Skeleton className="h-5 w-12 rounded-[5px]" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function AtelierPanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 px-6 py-5", className)}>
      <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0c0d0a] p-4 space-y-2">
        <Skeleton className="h-3 w-24" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <AtelierEntrySkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
