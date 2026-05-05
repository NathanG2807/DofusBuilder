"use client";

import { useMemo } from "react";
import { useBuildStore } from "@/store/build-store";

export function ActiveSetCards() {
  const currentBuild = useBuildStore((s) => s.currentBuild);
  const itemById = useBuildStore((s) => s.itemById);
  const activeSetDetails = useBuildStore((s) => s.activeSetDetails);

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

  const activeSets = useMemo(
    () => activeSetDetails.filter((s) => (equippedBySet[s.set_id]?.length ?? 0) >= 2),
    [activeSetDetails, equippedBySet],
  );

  if (activeSets.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <p className="text-center text-[12px] text-[#3a3a3a]">
          Aucune panoplie active.<br />
          <span className="text-[11px]">Équipe 2 pièces d&apos;un même set.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {activeSets.map((set) => {
        const items = equippedBySet[set.set_id] ?? [];
        return (
          <div
            key={set.set_id}
            className="dofus-panel rounded-xl border border-[#3a3a3a] bg-[#181818]/95 p-3"
          >
            {/* En-tête */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#e8c96e]">
                {set.name}
              </span>
              <span className="rounded-full border border-[#4a8000]/30 bg-[#1a2c0a] px-2 py-0.5 text-[10px] font-medium text-[#9cce38]">
                {set.piece_count}{set.total_pieces > 0 ? `/${set.total_pieces}` : ""} pièces
              </span>
            </div>

            {/* Items équipés */}
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {items.map((it) => (
                <div
                  key={it.ankama_id}
                  className="flex items-center gap-1.5 rounded-md border border-[#282828] bg-[#1e1e1e] px-2 py-1"
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
                  <span className="max-w-[120px] truncate text-[11px] text-[#c0c0c0]">
                    {it.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Bonus */}
            {set.effects.length > 0 ? (
              <ul className="space-y-0.5 border-t border-[#252525] pt-2">
                {set.effects.map((eff, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1 text-[11px] leading-snug text-[#c0c0c0]"
                  >
                    <span className="mt-0.5 shrink-0 text-[#9cce38]">•</span>
                    {eff}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] italic text-[#444444] border-t border-[#252525] pt-2">
                Aucun bonus pour ce palier.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
