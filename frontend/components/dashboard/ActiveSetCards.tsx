"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useBuildStore } from "@/store/build-store";
import { SetDetailModal } from "@/components/items/SetDetailModal";

type EquippedSetItem = {
  ankama_id: number;
  name: string;
  image_url_icon: string | null;
};

function detectBonusIcon(effect: string): string | null {
  const s = effect.toLowerCase();
  const rules: Array<{ test: RegExp; icon: string }> = [
    // Priorité haute : stats ambiguës / spécifiques
    { test: /r[ée]sistance[s]?\s+criti|r[ée]s\.\s*criti/, icon: "rc" },
    { test: /dommages?\s+criti|do\.?\s*criti/, icon: "dc" },
    // CC : coups critiques, « % critiques », chances, abréviations CC / C.C.
    {
      test:
        /\bcc\b|\bc\.?\s*c\.?\b|\b(?:chances?)\s+de\s+(?:faire\s+(?:des\s+|un\s+)?)?(?:coups?\s+|c\.?\s*)?critiques?\b|\b(aux\s+|en\s+)?coups?\s+critiques?\b|(?:%\s*|pourcent(?:age)?[^\s]*\s+)critiques?\b/i,
      icon: "cc",
    },

    { test: /initiative/, icon: "ii" },
    { test: /prospection/, icon: "pp" },

    // Dommages / résistances élémentaires (avant stats élémentaires génériques)
    { test: /dommages?\s+terre/, icon: "dtf" },
    { test: /dommages?\s+feu/, icon: "dff" },
    { test: /dommages?\s+eau/, icon: "def" },
    { test: /dommages?\s+air/, icon: "daf" },
    { test: /dommages?\s+neutr|neutre/, icon: "dnf" },
    { test: /dommages?\s+pouss[ée]e|do\.?\s*pouss/, icon: "dp" },
    { test: /dommages?\s+distance/, icon: "dd" },
    { test: /dommages?/, icon: "dmg" },

    { test: /r[ée]sistance[s]?\s+terre|r[ée]s\.\s*terre/, icon: "rt" },
    { test: /r[ée]sistance[s]?\s+feu|r[ée]s\.\s*feu/, icon: "rf" },
    { test: /r[ée]sistance[s]?\s+eau|r[ée]s\.\s*eau/, icon: "re" },
    { test: /r[ée]sistance[s]?\s+air|r[ée]s\.\s*air/, icon: "ra" },
    { test: /r[ée]sistance[s]?\s+neutr|r[ée]s\.\s*neutr/, icon: "rn" },
    { test: /r[ée]sistance[s]?\s+pouss[ée]e/, icon: "rp" },
    { test: /r[ée]sistance[s]?\s+distance/, icon: "rd" },
    { test: /r[ée]sistance[s]?\s+m[ée]l[ée]e/, icon: "rm" },

    // Retrait PA/PM avant les règles « PA » / « PM » seuls (« Retrait : 1 PM » ne doit pas matcher l’icône PM générique).
    {
      test: /\br[ée]traits?\b[\s\S]{0,56}?\bpa\b/i,
      icon: "rpa",
    },
    {
      test: /\br[ée]traits?\b[\s\S]{0,56}?\bpm\b/i,
      icon: "rpm",
    },

    // Stats génériques
    { test: /\bpa\b|point[s]?\s+d[' ]action/, icon: "pa" },
    { test: /\bpm\b|point[s]?\s+de?\s+mouvement/, icon: "pm" },
    { test: /vitalit|pv|point[s]?\s+de?\s+vie/, icon: "vi" },
    { test: /sagesse/, icon: "sa" },
    { test: /force|terre/, icon: "ter" },
    { test: /intelligence|feu/, icon: "feu" },
    { test: /chance|eau/, icon: "eau" },
    { test: /agilit|air/, icon: "air" },
    { test: /puissance/, icon: "pu" },
    { test: /port[ée]e|po\b/, icon: "po" },
    { test: /invocation|invo/, icon: "ic" },
    { test: /fuite/, icon: "fu" },
    { test: /tacle/, icon: "ta" },
    { test: /soins/, icon: "so" },
    { test: /esquive pa/, icon: "epa" },
    { test: /esquive pm/, icon: "epm" },
  ];
  const hit = rules.find(({ test }) => test.test(s));
  return hit?.icon ?? null;
}

export function ActiveSetCards() {
  const currentBuild = useBuildStore((s) => s.currentBuild);
  const itemById = useBuildStore((s) => s.itemById);
  const activeSetDetails = useBuildStore((s) => s.activeSetDetails);
  const [openSetId, setOpenSetId] = useState<number | null>(null);
  const [expandedItemsBySet, setExpandedItemsBySet] = useState<Record<number, boolean>>({});
  const [expandedBonusBySet, setExpandedBonusBySet] = useState<Record<number, boolean>>({});

  const equippedBySet = useMemo(() => {
    const map: Record<number, EquippedSetItem[]> = {};
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

  if (activeSets.length === 0) return null;

  return (
    <div className="space-y-3 p-3">
      {activeSets.map((set) => {
        const items = equippedBySet[set.set_id] ?? [];
        const itemsOpen = expandedItemsBySet[set.set_id] ?? false;
        const bonusOpen = expandedBonusBySet[set.set_id] ?? true;
        return (
          <div
            key={set.set_id}
            className="dofus-panel rounded-xl border border-[#3a3a3a] bg-[#181818]/95 p-3"
          >
            {/* En-tête */}
            <div className="mb-2 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setOpenSetId(set.set_id)}
                  className="text-left text-[13px] font-semibold leading-snug text-[#e8c96e] underline-offset-2 transition hover:text-[#f0d78c] hover:underline"
                  title="Voir la panoplie complète"
                >
                  {set.name}
                </button>
              </div>
              <div className="ml-2 flex shrink-0 items-center gap-1.5">
                <span className="rounded-full border border-[var(--dofus-ui-olive-border-30)] bg-[var(--dofus-ui-select-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--dofus-green-active)]">
                  {set.piece_count}{set.total_pieces > 0 ? `/${set.total_pieces}` : ""} items
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedItemsBySet((prev) => ({
                        ...prev,
                        [set.set_id]: !itemsOpen,
                      }));
                    }}
                    className="ml-1 inline-flex rounded p-0.5 text-[#7ea85a] transition hover:bg-[#234010] hover:text-[#d0f0a0]"
                    title={itemsOpen ? "Masquer les items équipés" : "Afficher les items équipés"}
                    aria-label={itemsOpen ? "Masquer les items équipés" : "Afficher les items équipés"}
                  >
                    {itemsOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedBonusBySet((prev) => ({
                      ...prev,
                      [set.set_id]: !bonusOpen,
                    }))
                  }
                  className="shrink-0 rounded p-0.5 text-[#666666] transition hover:bg-[#232323] hover:text-[#aaaaaa]"
                  title={bonusOpen ? "Masquer les bonus de panoplie" : "Afficher les bonus de panoplie"}
                  aria-label={bonusOpen ? "Masquer les bonus de panoplie" : "Afficher les bonus de panoplie"}
                >
                  {bonusOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              </div>
            </div>

            {/* Items équipés (accordion via icône en ligne d'en-tête) */}
            {itemsOpen && (
              <div className="mb-2.5 flex flex-wrap gap-1.5 rounded-lg border border-[#252525] bg-[#161616] px-2.5 py-2">
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
            )}

            {/* Bonus (accordion via icône à droite du badge) */}
            {bonusOpen && (set.effects.length > 0 ? (
              <ul className="space-y-0.5 border-t border-[#252525] pt-2">
                {set.effects.map((eff, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-[11px] leading-snug text-[#c0c0c0]"
                  >
                    <span className="mt-0.5 shrink-0 text-[var(--dofus-green-active)]">•</span>
                    {(() => {
                      const icon = detectBonusIcon(eff);
                      return (
                        <>
                          {icon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/assets/elements/${icon}.png`}
                              alt=""
                              width={13}
                              height={13}
                              className="mt-[1px] h-[13px] w-[13px] shrink-0 object-contain"
                            />
                          ) : (
                            <span className="mt-[1px] h-[13px] w-[13px] shrink-0" />
                          )}
                          <span>{eff}</span>
                        </>
                      );
                    })()}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] italic text-[#444444] border-t border-[#252525] pt-2">
                Aucun bonus pour ce palier.
              </p>
            ))}
          </div>
        );
      })}
      {openSetId != null && (
        <SetDetailModal setId={openSetId} onClose={() => setOpenSetId(null)} allowEquip />
      )}
    </div>
  );
}
