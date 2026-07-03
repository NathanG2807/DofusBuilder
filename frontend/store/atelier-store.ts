import { create } from "zustand";

import {
  clearGuestCraftLists,
  createCraftList,
  deleteCraftList,
  loadGuestCraftLists,
  saveGuestCraftLists,
  updateCraftList,
  listMyCraftLists,
} from "@/lib/atelierApi";
import { newEntryId, newLocalListId } from "@/lib/craftRecipe";
import { getAccessToken } from "@/lib/auth";
import type { CraftEntry, CraftListOut, IngredientProgress } from "@/types/api";

type AtelierState = {
  lists: CraftListOut[];
  activeListId: string | null;
  loading: boolean;
  error: string | null;
  isGuest: boolean;

  loadLists: () => Promise<void>;
  setActiveList: (id: string | null) => void;
  createList: (name: string) => Promise<CraftListOut>;
  renameList: (id: string, name: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  addEntry: (listId: string, entry: Omit<CraftEntry, "id">) => Promise<void>;
  removeEntry: (listId: string, entryId: string) => Promise<void>;
  setProgress: (
    listId: string,
    progress: Record<string, IngredientProgress>,
  ) => Promise<void>;
  getActiveList: () => CraftListOut | null;
  persistList: (list: CraftListOut) => Promise<void>;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persistGuestLists(lists: CraftListOut[]) {
  saveGuestCraftLists(lists);
}

export const useAtelierStore = create<AtelierState>((set, get) => ({
  lists: [],
  activeListId: null,
  loading: false,
  error: null,
  isGuest: true,

  loadLists: async () => {
    set({ loading: true, error: null });
    try {
      if (getAccessToken()) {
        const guest = loadGuestCraftLists();
        if (guest.length > 0) {
          for (const g of guest) {
            await createCraftList({
              name: g.name,
              entries: g.entries,
              progress: g.progress,
            });
          }
          clearGuestCraftLists();
        }
        const lists = await listMyCraftLists();
        set({
          lists,
          activeListId: lists[0]?.id ?? get().activeListId,
          isGuest: false,
          loading: false,
        });
      } else {
        const lists = loadGuestCraftLists();
        set({
          lists,
          activeListId: lists[0]?.id ?? null,
          isGuest: true,
          loading: false,
        });
      }
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Erreur de chargement",
        loading: false,
      });
    }
  },

  setActiveList: (id) => set({ activeListId: id }),

  createList: async (name) => {
    const trimmed = name.trim() || "Sans titre";
    if (getAccessToken()) {
      const created = await createCraftList({ name: trimmed });
      set((s) => ({
        lists: [created, ...s.lists],
        activeListId: created.id,
        isGuest: false,
      }));
      return created;
    }
    const local: CraftListOut = {
      id: newLocalListId(),
      name: trimmed,
      entries: [],
      progress: {},
    };
    set((s) => {
      const lists = [local, ...s.lists];
      persistGuestLists(lists);
      return { lists, activeListId: local.id, isGuest: true };
    });
    return local;
  },

  renameList: async (id, name) => {
    const list = get().lists.find((l) => l.id === id);
    if (!list) return;
    const updated = { ...list, name: name.trim() || list.name };
    if (get().isGuest) {
      set((s) => {
        const lists = s.lists.map((l) => (l.id === id ? updated : l));
        persistGuestLists(lists);
        return { lists };
      });
      return;
    }
    const saved = await updateCraftList(id, { name: updated.name });
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? saved : l)),
    }));
  },

  deleteList: async (id) => {
    if (get().isGuest) {
      set((s) => {
        const lists = s.lists.filter((l) => l.id !== id);
        persistGuestLists(lists);
        const activeListId =
          s.activeListId === id ? (lists[0]?.id ?? null) : s.activeListId;
        return { lists, activeListId };
      });
      return;
    }
    await deleteCraftList(id);
    set((s) => {
      const lists = s.lists.filter((l) => l.id !== id);
      const activeListId =
        s.activeListId === id ? (lists[0]?.id ?? null) : s.activeListId;
      return { lists, activeListId };
    });
  },

  addEntry: async (listId, entry) => {
    const list = get().lists.find((l) => l.id === listId);
    if (!list) return;
    const newEntry: CraftEntry = { ...entry, id: newEntryId() };
    const updated = { ...list, entries: [...list.entries, newEntry] };
    await get().persistList(updated);
  },

  removeEntry: async (listId, entryId) => {
    const list = get().lists.find((l) => l.id === listId);
    if (!list) return;
    const updated = {
      ...list,
      entries: list.entries.filter((e) => e.id !== entryId),
    };
    await get().persistList(updated);
  },

  setProgress: async (listId, progress) => {
    const list = get().lists.find((l) => l.id === listId);
    if (!list) return;
    const updated = { ...list, progress };
    set((s) => ({
      lists: s.lists.map((l) => (l.id === listId ? updated : l)),
    }));
    if (get().isGuest) {
      persistGuestLists(get().lists);
      return;
    }
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await updateCraftList(listId, { progress });
      } catch {
        /* ignore debounced save errors */
      }
    }, 400);
  },

  getActiveList: () => {
    const { lists, activeListId } = get();
    return lists.find((l) => l.id === activeListId) ?? null;
  },

  persistList: async (list) => {
    if (get().isGuest) {
      set((s) => {
        const lists = s.lists.map((l) => (l.id === list.id ? list : l));
        persistGuestLists(lists);
        return { lists };
      });
      return;
    }
    if (list.id.startsWith("local_")) {
      const created = await createCraftList({
        name: list.name,
        entries: list.entries,
        progress: list.progress,
      });
      set((s) => ({
        lists: s.lists.map((l) => (l.id === list.id ? created : l)),
        activeListId: s.activeListId === list.id ? created.id : s.activeListId,
      }));
      return;
    }
    const saved = await updateCraftList(list.id, {
      entries: list.entries,
      progress: list.progress,
      name: list.name,
    });
    set((s) => ({
      lists: s.lists.map((l) => (l.id === list.id ? saved : l)),
    }));
  },
}));
