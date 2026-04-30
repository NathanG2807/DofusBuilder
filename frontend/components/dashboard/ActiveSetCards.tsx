"use client";

import { useMemo } from "react";
import { useBuildStore } from "@/store/build-store";

export function ActiveSetCards() {
  const currentBuild = useBuildStore((s) => s.currentBuild);
  const itemById = useBuildStore((s) => s.itemById);
  const activeSetDetails = useBuildStore((s) => s.activeSetDetails);

  // Regroupe les items équipés par parent_set_id.
  const equippedBySet = useMemo(() => {
    const map: Record<number, { ankama_id: number; name: string; image_url_icon: string | null }[]> = {};
    for (const itemId of Object.values(currentBuild)) {
      if (itemId == null) continue;
      const item = itemById[itemId];
      if (!item?.parent_set_id) continue;
      const sid = item.parent_set_id;
      map[sid] ??= [];
      map[sid].push({
        ankama_id: item.ankama_id,
        name: item.name,
        image_url_icon: item.image_url_icon ?? null,
      });
    }
    return map;
  }, [currentBuild, itemById]);

  // Seules les panoplies avec ≥ 2 pièces équipées et reconnues par activeSetDetails.
  const activeSets = useMemo(
    () => activeSetDetails.filter((s) => (equippedBySet[s.set_id]?.length ?? 0) >= 2),
    [activeSetDetails, equippedBySet],
  );

  if (activeSets.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#c9a227]">
        Panoplies actives
      </p>
      {activeSets.map((set) => {
        const items = equippedBySet[set.set_id] ?? [];
        return (
          <div
            key={set.set_id}
            className="dofus-panel rounded-xl border border-[#c9a227]/40 bg-[#1a1510]/95 p-3 shadow-inner"
          >
            {/* En-tête */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#f0d78c]">
                {set.name}
              </span>
              <span className="rounded-full border border-[#c9a227]/30 bg-[#c9a227]/10 px-2 py-0.5 text-[10px] font-medium text-[#c9a227]">
                {set.piece_count}{set.total_pieces > 0 ? `/${set.total_pieces}` : ""} pièces
              </span>
            </div>

            {/* Items équipés */}
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {items.map((it) => (
                <div
                  key={it.ankama_id}
                  className="flex items-center gap-1.5 rounded-md border border-[#3d3428] bg-[#231e18] px-2 py-1"
                  title={it.name}
                >
                  {it.image_url_icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.image_url_icon}
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain"
                    />
                  ) : null}
                  <span className="max-w-[120px] truncate text-[11px] text-[#d4c4a8]">
                    {it.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Bonus */}
            {set.effects.length > 0 ? (
              <ul className="space-y-0.5 border-t border-[#3d3428] pt-2">
                {set.effects.map((eff, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1 text-[11px] leading-snug text-[#c4b888]"
                  >
                    <span className="mt-0.5 shrink-0 text-[#c9a227]">•</span>
                    {eff}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] italic text-[#5a5248] border-t border-[#3d3428] pt-2">
                Aucun bonus pour ce palier.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
