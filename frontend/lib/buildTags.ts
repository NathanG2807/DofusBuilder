/** Available tags for public builds in the Stuffs catalog. */

export type BuildTagId =
  | "eau"
  | "feu"
  | "terre"
  | "air"
  | "multi"
  | "do_crit";

export type BuildTag = {
  id: BuildTagId;
  label: string;
  icon: string;
  color: string;
};

export const BUILD_TAGS: BuildTag[] = [
  { id: "eau",     label: "Eau",      icon: "/assets/elements/eau.png",                    color: "#3b82f6" },
  { id: "feu",     label: "Feu",      icon: "/assets/elements/feu.png",                    color: "#ef4444" },
  { id: "terre",   label: "Terre",    icon: "/assets/elements/ter.png",                    color: "#84cc16" },
  { id: "air",     label: "Air",      icon: "/assets/elements/air.png",                    color: "#a78bfa" },
  { id: "multi",   label: "Multi",    icon: "/assets/global/UI/iconsRef/multiElement.png", color: "#f59e0b" },
  { id: "do_crit", label: "Do Crit",  icon: "/assets/elements/dc.png",                     color: "#ec4899" },
];

export const BUILD_TAG_MAP: Record<BuildTagId, BuildTag> = Object.fromEntries(
  BUILD_TAGS.map((t) => [t.id, t]),
) as Record<BuildTagId, BuildTag>;

export function getBuildTag(id: string): BuildTag | undefined {
  return BUILD_TAG_MAP[id as BuildTagId];
}
