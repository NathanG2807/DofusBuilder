"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
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

  return (
    <Modal open={open} onClose={onClose} title="Ajouter à l'atelier">
      <p className="mb-3 text-xs text-[#888]">
        {equippedCount} item{equippedCount !== 1 ? "s" : ""} équipé{equippedCount !== 1 ? "s" : ""} — recette agrégée du build complet.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <label className="flex items-center gap-2 text-xs text-[#aaa]">
          <input
            type="radio"
            checked={!createNew}
            onChange={() => setCreateNew(false)}
            className="accent-[var(--dofus-green-active)]"
          />
          Liste existante
        </label>
        {!createNew && (
          <select
            value={selectedListId ?? ""}
            onChange={(e) => setSelectedListId(e.target.value || null)}
            className="w-full rounded-[10px] border border-[color:var(--atelier-plaque-border)] bg-black/30 px-3 py-2 text-sm text-[#e0e0e0] focus:border-[color:var(--atelier-plaque-border-hover)] focus:outline-none"
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
            className="accent-[var(--dofus-green-active)]"
          />
          Nouvelle CraftList
        </label>
        {createNew && (
          <Input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Nom de la liste…"
          />
        )}

        {msg && (
          <p className={`text-xs ${msg.includes("ajouté") ? "text-emerald-400" : "text-amber-400"}`}>
            {msg}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={busy} className="flex-1">
            Ajouter
          </Button>
          <Link
            href="/atelier"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-[10px] border border-[color:var(--atelier-plaque-border)] bg-white/[0.02] px-4 py-2 text-[13px] text-[#d0d0d0] transition hover:-translate-y-px hover:border-white/20 hover:bg-white/[0.05]"
          >
            Ouvrir l&apos;atelier
          </Link>
        </div>
      </form>
    </Modal>
  );
}
