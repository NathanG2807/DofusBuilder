import { create } from "zustand";

import { aggregateBuildStats, fetchItem, fetchItemsBySet, fetchItemSet } from "@/lib/api";
import { SLOT_DEFS, emptyBuild, mergeFullBuildSlots, type SlotId } from "@/lib/slots";
import type { ActiveSetDetail, BuildOut, FullBuild, ItemOut } from "@/types/api";

export type BuildState = {
  currentBuild: Record<SlotId, number | null>;
  stats: Record<string, number>;
  activeSetBonuses: string[];
  activeSetDetails: ActiveSetDetail[];
  itemById: Record<number, ItemOut>;
  /** Emplacement sélectionné pour équiper depuis le catalogue. */
  selectedSlot: SlotId | null;
  /** Classe du personnage affiché (id Ankama). */
  classId: number;
  /** Sexe du personnage affiché. */
  sex: "male" | "female";
  /** Nom du build en cours. */
  buildName: string;
  /** Niveau du personnage (pour le bonus PA niveau 100). */
  level: number;
  /** Points de caractéristiques investis manuellement (hors équipement). */
  charStats: Record<string, number>;

  setSelectedSlot: (slot: SlotId | null) => void;
  setClassId: (id: number) => void;
  setSex: (sex: "male" | "female") => void;
  setBuildName: (name: string) => void;
  setLevel: (level: number) => void;
  setCharStat: (key: string, value: number) => void;
  equipItemOnSlot: (slot: SlotId, ankamaId: number) => Promise<void>;
  updateSlot: (slot: string, itemId: number | null) => void;
  syncWithAI: (newBuild: Record<string, number>) => void;
  resetBuild: () => void;
  /** Équipe tous les items d'une panoplie (ou un seul item si singleItemId est fourni).
   *  Retourne le nombre d'objets effectivement placés. */
  equipSet: (setId: number, singleItemId?: number) => Promise<number>;
  applyFullBuild: (fb: FullBuild) => void;
  hydrateFromPersistedBuild: (b: BuildOut) => void;
  cacheItems: (items: ItemOut[]) => void;
  prefetchEquippedItems: () => Promise<void>;
};

export const useBuildStore = create<BuildState>((set, get) => {
  async function refreshStatsFromSlots() {
    try {
      const { total_stats, active_set_bonuses, active_set_details } =
        await aggregateBuildStats(
          get().currentBuild as Record<string, number | null>,
          get().level,
        );
      set({
        stats: { ...total_stats },
        activeSetBonuses: [...active_set_bonuses],
        activeSetDetails: [...active_set_details],
      });
    } catch (e) {
      console.error("refreshStatsFromSlots", e);
    }
  }

  return {
  currentBuild: emptyBuild(),
  // Base niveau 200 : PA 7 / PM 3 / Vitalité 1050 / Prospection 100 / Pods 2000
  stats: { pa: 7, pm: 3, vitality: 1050, prospecting: 100, pods: 2000 },
  activeSetBonuses: [],
  activeSetDetails: [],
  itemById: {},
  selectedSlot: null,
  classId: 8,
  sex: "male",
  buildName: "Mon build",
  level: 200,
  charStats: {},

  setSelectedSlot: (slot) => set({ selectedSlot: slot }),
  setClassId: (id) => set({ classId: id }),
  setSex: (sex) => set({ sex }),
  setBuildName: (name) => set({ buildName: name }),
  setLevel: (level) => {
    set({ level });
    void refreshStatsFromSlots();
  },

  setCharStat: (key, value) => set((s) => ({
    charStats: { ...s.charStats, [key]: Math.max(0, value) },
  })),

  equipItemOnSlot: async (slot, ankamaId) => {
    const item = await fetchItem(ankamaId);
    set((s) => ({
      currentBuild: {
        ...s.currentBuild,
        [slot]: ankamaId,
      } as Record<SlotId, number | null>,
      itemById: { ...s.itemById, [item.ankama_id]: item },
      selectedSlot: null,   // ferme automatiquement le catalogue
    }));
    await refreshStatsFromSlots();
  },

  updateSlot: (slot, itemId) => {
    set((s) => ({
      currentBuild: {
        ...s.currentBuild,
        [slot]: itemId,
      } as Record<SlotId, number | null>,
    }));
    void refreshStatsFromSlots();
  },

  syncWithAI: (newBuild) => {
    set((s) => ({
      currentBuild: {
        ...s.currentBuild,
        ...newBuild,
      } as Record<SlotId, number | null>,
    }));
    void refreshStatsFromSlots();
  },

  resetBuild: () =>
    set((s) => ({
      currentBuild: emptyBuild(),
      stats: {
        pa: 6 + (s.level >= 100 ? 1 : 0),
        pm: 3,
        vitality: 50 + s.level * 5,
        prospecting: 100,
        pods: 1000 + s.level * 5,
      },
      charStats: {},
      activeSetBonuses: [],
      activeSetDetails: [],
      itemById: {},
      selectedSlot: null,
      classId: s.classId,
      sex: s.sex,
      buildName: "Mon build",
      level: s.level,
    })),

  applyFullBuild: (fb) => {
    set({
      currentBuild: mergeFullBuildSlots(fb),
      stats: { ...fb.total_stats },
      activeSetBonuses: [...fb.active_set_bonuses],
      selectedSlot: null,
    });
    // Rafraîchit les détails de panoplies et stats complets via le backend.
    void refreshStatsFromSlots();
  },

  hydrateFromPersistedBuild: (b) =>
    set({
      currentBuild: mergeFullBuildSlots({
        slots: (b.slots ?? {}) as FullBuild["slots"],
        total_stats: b.total_stats ?? {},
        active_set_bonuses: b.active_set_bonuses ?? [],
      }),
      stats: { ...(b.total_stats ?? {}) },
      activeSetBonuses: [...(b.active_set_bonuses ?? [])],
      selectedSlot: null,
    }),

  cacheItems: (items) =>
    set((s) => {
      const next = { ...s.itemById };
      for (const it of items) {
        next[it.ankama_id] = it;
      }
      return { itemById: next };
    }),

  equipSet: async (setId, singleItemId) => {
    // Détermine les items à placer
    let itemsToPlace: import("@/types/api").ItemOut[];
    if (singleItemId != null) {
      const it = await fetchItem(singleItemId);
      itemsToPlace = [it];
    } else {
      itemsToPlace = await fetchItemsBySet(setId);
    }

    const currentBuild = { ...get().currentBuild } as Record<SlotId, number | null>;
    const newItemById = { ...get().itemById };
    let placed = 0;

    for (const item of itemsToPlace) {
      const t = item.type_name_id ?? "";
      newItemById[item.ankama_id] = item;

      // Détermine les slots candidats pour cet item
      const candidateSlots: SlotId[] = SLOT_DEFS.filter((s) => {
        const slot = s.id;
        if (t.includes("certificate") || t.startsWith("perceptor-")) return false;
        if (t === "tool" || t === "sidekick" || t === "prysmaradite") return false;
        if (["hat", "cloak", "amulet", "belt", "boots"].includes(slot)) return t === slot;
        if (slot === "ring1" || slot === "ring2") return t === "ring";
        if (slot === "weapon") return item.is_weapon;
        if (slot === "shield") return t === "shield";
        if (slot.startsWith("dofus")) return t === "dofus" || t === "trophy";
        if (slot === "pet") return t === "pet";
        return false;
      }).map((s) => s.id);

      // Préfère un slot vide, sinon prend le premier candidat
      const emptySlot = candidateSlots.find((s) => currentBuild[s] == null);
      const targetSlot = emptySlot ?? candidateSlots[0];
      if (targetSlot) {
        currentBuild[targetSlot] = item.ankama_id;
        placed++;
      }
    }

    set({ currentBuild, itemById: newItemById });
    await refreshStatsFromSlots();
    return placed;
  },

  prefetchEquippedItems: async () => {
    const { currentBuild, itemById, cacheItems } = get();
    const ids = [
      ...new Set(
        Object.values(currentBuild).filter(
          (x): x is number => typeof x === "number",
        ),
      ),
    ];
    const missing = ids.filter((id) => !itemById[id]);
    if (missing.length === 0) return;
    const loaded = await Promise.all(missing.map((id) => fetchItem(id)));
    cacheItems(loaded);
  },
  };
});
