import { create } from "zustand";

import { aggregateBuildStats, fetchItem, fetchItemsBySet, fetchItemSet } from "@/lib/api";
import { SLOT_DEFS, emptyBuild, mergeFullBuildSlots, type SlotId } from "@/lib/slots";
import type { ActiveSetDetail, BuildOut, FullBuild, ItemOut } from "@/types/api";

export type ExoType = "pa" | "pm";

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
  /** Parchotage (parchemins) : bonus permanents indépendants du stuff et des points. Max 100/stat. */
  parchoStats: Record<string, number>;
  /** Forgemagie exo : emplacement → type d'exo (pa ou pm). */
  exoFm: Partial<Record<SlotId, ExoType>>;

  setSelectedSlot: (slot: SlotId | null) => void;
  setClassId: (id: number) => void;
  setSex: (sex: "male" | "female") => void;
  setBuildName: (name: string) => void;
  setLevel: (level: number) => void;
  setCharStat: (key: string, value: number) => void;
  setParchoStat: (key: string, value: number) => void;
  /** Toggle un exo FM sur un slot (re-clic sur le même type = suppression). */
  setExoFm: (slot: SlotId, type: ExoType) => void;
  removeExoFm: (slot: SlotId) => void;
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
  parchoStats: {},
  exoFm: {},

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

  setParchoStat: (key, value) => set((s) => ({
    parchoStats: { ...s.parchoStats, [key]: Math.min(100, Math.max(0, value)) },
  })),

  setExoFm: (slot, type) =>
    set((s) => ({
      exoFm: {
        ...s.exoFm,
        [slot]: s.exoFm[slot] === type ? undefined : type,
      },
    })),

  removeExoFm: (slot) =>
    set((s) => {
      const next = { ...s.exoFm };
      delete next[slot];
      return { exoFm: next };
    }),

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
    set((s) => {
      const next = { ...s.exoFm };
      if (itemId === null) delete next[slot as SlotId];
      return {
        currentBuild: {
          ...s.currentBuild,
          [slot]: itemId,
        } as Record<SlotId, number | null>,
        exoFm: next,
      };
    });
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
      parchoStats: {},
      exoFm: {},
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
    const newBuild = mergeFullBuildSlots(fb);

    // Placement automatique de l'exo FM sur les anneaux (ring1 → ring2)
    const newExoFm: Partial<Record<SlotId, ExoType>> = {};
    if (fb.exo_pa) {
      const slot: SlotId = newBuild["ring1"] != null ? "ring1" : "ring2";
      newExoFm[slot] = "pa";
    }
    if (fb.exo_pm) {
      // Évite de mettre les deux exo sur le même anneau
      const slot: SlotId =
        newBuild["ring1"] != null && !newExoFm["ring1"] ? "ring1"
        : newBuild["ring2"] != null ? "ring2"
        : "ring1";
      newExoFm[slot] = "pm";
    }

    set({
      currentBuild: newBuild,
      stats: { ...fb.total_stats },
      activeSetBonuses: [...fb.active_set_bonuses],
      selectedSlot: null,
      exoFm: newExoFm,
    });
    // Rafraîchit les détails de panoplies et stats complets via le backend.
    void refreshStatsFromSlots();
  },

  hydrateFromPersistedBuild: (b) => {
    set({
      currentBuild: mergeFullBuildSlots({
        slots: (b.slots ?? {}) as FullBuild["slots"],
        total_stats: b.total_stats ?? {},
        active_set_bonuses: b.active_set_bonuses ?? [],
      }),
      stats: { ...(b.total_stats ?? {}) },
      activeSetBonuses: [...(b.active_set_bonuses ?? [])],
      selectedSlot: null,
      charStats: { ...(b.char_stats ?? {}) },
      parchoStats: { ...(b.parcho_stats ?? {}) },
      exoFm: { ...(b.exo_fm ?? {}) } as Partial<Record<import("@/lib/slots").SlotId, ExoType>>,
      ...(b.level != null ? { level: b.level } : {}),
      ...(b.class_id != null ? { classId: b.class_id } : {}),
      ...(b.sex === "male" || b.sex === "female" ? { sex: b.sex } : {}),
      ...(b.name ? { buildName: b.name } : {}),
    });
  },

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
