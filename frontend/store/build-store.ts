import { create } from "zustand";

import { aggregateBuildStats, fetchItem, fetchItemsBySet, fetchItemSet } from "@/lib/api";
import { isExcludedItemId } from "@/lib/excludedItems";
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
  /** Slots verrouillés : l'optimiseur/IA ne modifie pas ces emplacements. */
  lockedSlots: SlotId[];
  /** ID du build actuellement sauvegardé en base (null si jamais sauvegardé). */
  savedBuildId: string | null;
  /** Le build a été modifié depuis la dernière sauvegarde. */
  isDirty: boolean;

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
  /** Verrouille un emplacement (l'item ne sera pas modifié par l'optimiseur/IA). */
  lockSlot: (slot: SlotId) => void;
  /** Déverrouille un emplacement. */
  unlockSlot: (slot: SlotId) => void;
  /** Bascule le verrou d'un emplacement. */
  toggleLockSlot: (slot: SlotId) => void;
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
  setSavedBuildId: (id: string | null) => void;
  markClean: () => void;
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
  lockedSlots: [],
  savedBuildId: null,
  isDirty: false,

  setSelectedSlot: (slot) => set({ selectedSlot: slot }),
  setClassId: (id) => set({ classId: id, isDirty: true }),
  setSex: (sex) => set({ sex, isDirty: true }),
  setBuildName: (name) => set({ buildName: name, isDirty: true }),
  setLevel: (level) => {
    set({ level, isDirty: true });
    void refreshStatsFromSlots();
  },

  setCharStat: (key, value) => set((s) => ({
    charStats: { ...s.charStats, [key]: Math.max(0, value) },
    isDirty: true,
  })),

  setParchoStat: (key, value) => set((s) => ({
    parchoStats: { ...s.parchoStats, [key]: Math.min(100, Math.max(0, value)) },
    isDirty: true,
  })),

  setExoFm: (slot, type) =>
    set((s) => ({
      exoFm: {
        ...s.exoFm,
        [slot]: s.exoFm[slot] === type ? undefined : type,
      },
      isDirty: true,
    })),

  removeExoFm: (slot) =>
    set((s) => {
      const next = { ...s.exoFm };
      delete next[slot];
      return { exoFm: next, isDirty: true };
    }),

  lockSlot: (slot) =>
    set((s) => ({
      lockedSlots: s.lockedSlots.includes(slot) ? s.lockedSlots : [...s.lockedSlots, slot],
      isDirty: true,
    })),

  unlockSlot: (slot) =>
    set((s) => ({
      lockedSlots: s.lockedSlots.filter((sl) => sl !== slot),
      isDirty: true,
    })),

  toggleLockSlot: (slot) =>
    set((s) => ({
      lockedSlots: s.lockedSlots.includes(slot)
        ? s.lockedSlots.filter((sl) => sl !== slot)
        : [...s.lockedSlots, slot],
      isDirty: true,
    })),

  equipItemOnSlot: async (slot, ankamaId) => {
    if (isExcludedItemId(ankamaId)) {
      throw new Error("Cet objet n'est pas disponible dans le builder.");
    }
    const item = await fetchItem(ankamaId);
    set((s) => ({
      currentBuild: {
        ...s.currentBuild,
        [slot]: ankamaId,
      } as Record<SlotId, number | null>,
      itemById: { ...s.itemById, [item.ankama_id]: item },
      selectedSlot: null,
      isDirty: true,
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
        isDirty: true,
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
      isDirty: true,
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
      lockedSlots: [],
      activeSetBonuses: [],
      activeSetDetails: [],
      itemById: {},
      selectedSlot: null,
      classId: s.classId,
      sex: s.sex,
      buildName: "Mon build",
      level: s.level,
      savedBuildId: null,
      isDirty: false,
    })),

  applyFullBuild: (fb) => {
    const { lockedSlots, currentBuild, exoFm: currentExoFm } = get();
    const newBuild = mergeFullBuildSlots(fb);

    // Préserve les items des slots verrouillés
    for (const slot of lockedSlots) {
      const lockedId = currentBuild[slot as SlotId];
      if (lockedId != null) {
        (newBuild as Record<string, number | null>)[slot] = lockedId;
      }
    }

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
    // Conserve les exo FM des slots verrouillés
    for (const slot of lockedSlots) {
      const slotId = slot as SlotId;
      if (currentExoFm[slotId]) {
        newExoFm[slotId] = currentExoFm[slotId];
      }
    }

    set({
      currentBuild: newBuild,
      stats: { ...fb.total_stats },
      activeSetBonuses: [...fb.active_set_bonuses],
      selectedSlot: null,
      exoFm: newExoFm,
      isDirty: true,
    });
    // Rafraîchit les détails de panoplies et stats complets via le backend.
    void refreshStatsFromSlots();
  },

  hydrateFromPersistedBuild: (b) => {
    const restoredLockedSlots = Object.keys(b.locked_slots ?? {}) as SlotId[];
    set({
      currentBuild: mergeFullBuildSlots({
        slots: (b.slots ?? {}) as FullBuild["slots"],
        total_stats: b.total_stats ?? {},
        active_set_bonuses: b.active_set_bonuses ?? [],
      }),
      stats: { ...(b.total_stats ?? {}) },
      activeSetBonuses: [...(b.active_set_bonuses ?? [])],
      activeSetDetails: [],
      selectedSlot: null,
      charStats: { ...(b.char_stats ?? {}) },
      parchoStats: { ...(b.parcho_stats ?? {}) },
      exoFm: { ...(b.exo_fm ?? {}) } as Partial<Record<import("@/lib/slots").SlotId, ExoType>>,
      lockedSlots: restoredLockedSlots,
      ...(b.level != null ? { level: b.level } : {}),
      ...(b.class_id != null ? { classId: b.class_id } : {}),
      ...(b.sex === "male" || b.sex === "female" ? { sex: b.sex } : {}),
      ...(b.name ? { buildName: b.name } : {}),
      savedBuildId: b.id,
      isDirty: false,
    });
    // Recalcule les stats complètes (dont activeSetDetails) depuis le backend
    void refreshStatsFromSlots();
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
        if (slot.startsWith("dofus")) return t === "dofus" || t === "trophy" || t === "prysmaradite";
        if (slot === "pet") return t === "pet" || t === "mount" || t === "petsmount";
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

    set({ currentBuild, itemById: newItemById, isDirty: true });
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
    const missing = ids.filter((id) => !itemById[id] && !isExcludedItemId(id));
    if (missing.length === 0) return;
    const loaded = await Promise.all(missing.map((id) => fetchItem(id)));
    cacheItems(loaded);
  },

  setSavedBuildId: (id) => set({ savedBuildId: id }),
  markClean: () => set({ isDirty: false }),
  };
});
