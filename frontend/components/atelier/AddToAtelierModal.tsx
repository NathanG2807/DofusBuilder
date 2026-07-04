"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useAtelierStore } from "@/store/atelier-store";
import { useBuildStore } from "@/store/build-store";

type AddToAtelierModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AddToAtelierModal({ open, onClose }: AddToAtelierModalProps) {
  const { lists, loadLists, createList, addEntry, activeListId, setActiveList } =
    useAtelierStore();
  const currentBuild = useBuildStore((s) => s.currentBuild);
  const buildName = useBuildStore((s) => s.buildName);

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [createNew, setCreateNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const equippedCount = Object.values(currentBuild).filter((id) => id != null).length;

  useEffect(() => {
    if (open) {
      void loadLists();
      setSelectedListId(activeListId);
      setNewListName(buildName.trim() || "Mon build");
      setCreateNew(false);
      setMsg(null);
    }
  }, [open, loadLists, activeListId, buildName]);

  if (!open || !mounted) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (equippedCount === 0) {
      setMsg("Équipe au moins un item avant d'ajouter à l'atelier.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      let listId = selectedListId;
      if (createNew) {
        const created = await createList(newListName.trim() || "Craft build");
        listId = created.id;
      }
      if (!listId) {
        setMsg("Choisis une CraftList.");
        return;
      }
      await addEntry(listId, {
        entry_type: "build",
        ref_id: listId,
        quantity: 1,
        label: buildName.trim() || "Build",
        slots: { ...currentBuild },
      });
      setActiveList(listId);
      setMsg("Build ajouté à l'atelier !");
      setTimeout(onClose, 800);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#383838] bg-[#1a1a1a] p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#f0d78c]">Ajouter à l&apos;atelier</h3>
          <button type="button" onClick={onClose} className="text-[#666] hover:text-white">✕</button>
        </div>

        <p className="mb-3 text-xs text-[#888]">
          {equippedCount} item{equippedCount !== 1 ? "s" : ""} équipé{equippedCount !== 1 ? "s" : ""} — recette agrégée du build complet.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-[#aaa]">
            <input
              type="radio"
              checked={!createNew}
              onChange={() => setCreateNew(false)}
            />
            Liste existante
          </label>
          {!createNew && (
            <select
              value={selectedListId ?? ""}
              onChange={(e) => setSelectedListId(e.target.value || null)}
              className="w-full rounded-lg border border-[#383838] bg-[#111] px-3 py-2 text-sm text-[#e0e0e0]"
            >
              <option value="">— Choisir —</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          )}

          <label className="flex items-center gap-2 text-xs text-[#aaa]">
            <input
              type="radio"
              checked={createNew}
              onChange={() => setCreateNew(true)}
            />
            Nouvelle CraftList
          </label>
          {createNew && (
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Nom de la liste…"
              className="w-full rounded-lg border border-[#383838] bg-[#111] px-3 py-2 text-sm text-[#e0e0e0]"
            />
          )}

          {msg && (
            <p className={`text-xs ${msg.includes("ajouté") ? "text-emerald-400" : "text-amber-400"}`}>
              {msg}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="btn-dofus-green flex-1 rounded-lg py-2 text-sm disabled:opacity-50"
            >
              Ajouter
            </button>
            <Link
              href="/atelier"
              onClick={onClose}
              className="rounded-lg border border-[#383838] px-3 py-2 text-xs text-[#888] hover:text-white"
            >
              Ouvrir l&apos;atelier
            </Link>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
