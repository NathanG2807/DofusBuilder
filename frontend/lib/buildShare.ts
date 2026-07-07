/** URL permanente de consultation d'un build (lecture seule). */
export function getBuildShareUrl(buildId: string): string {
  if (typeof window === "undefined") return `/build/${buildId}`;
  return `${window.location.origin}/build/${buildId}`;
}

export async function copyBuildShareLink(buildId: string): Promise<void> {
  const url = getBuildShareUrl(buildId);
  await navigator.clipboard.writeText(url);
}
