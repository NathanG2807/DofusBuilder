import { cache } from "react";

import { isValidBuildId } from "@/lib/buildId";
import { dofusClassLabel } from "@/lib/dofusClasses";
import type { BuildOut } from "@/types/api";

export { isValidBuildId };

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "https://zaap-builder.vercel.app";
}

function getApiBase(): string {
  const b = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
  return b.replace(/\/$/, "");
}

/** Fetch memoïsé pour metadata + opengraph-image. */
export const fetchBuildForOg = cache(async (buildId: string): Promise<BuildOut | null> => {
  if (!isValidBuildId(buildId)) return null;
  try {
    const r = await fetch(`${getApiBase()}/api/v1/builds/${buildId}`, {
      next: { revalidate: 60 },
    });
    if (!r.ok) return null;
    return (await r.json()) as BuildOut;
  } catch {
    return null;
  }
});

export function buildOgTitle(build: BuildOut): string {
  return `${build.name} — Zaap Builder`;
}

export function buildOgDescription(build: BuildOut): string {
  const parts: string[] = [];

  if (build.class_id != null) {
    parts.push(dofusClassLabel(build.class_id));
  }
  if (build.level != null) {
    parts.push(`Niveau ${build.level}`);
  }
  if (build.username) {
    parts.push(`par ${build.username}`);
  }

  const line = parts.join(" · ");
  const tags = (build.tags ?? [])
    .filter(Boolean)
    .slice(0, 6)
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .join(" ");

  if (line && tags) return `${line} — ${tags}`;
  if (line) return line;
  if (tags) return tags;
  return "Build partagé sur Zaap Builder";
}
