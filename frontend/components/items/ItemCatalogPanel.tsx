"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ItemHoverCard,
  useItemHoverCard,
} from "@/components/items/ItemHoverCard";
import { SetDetailModal } from "@/components/items/SetDetailModal";
import { Button } from "@/components/ui/Button";
import { DofusSpinner } from "@/components/ui/DofusSpinner";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { searchItems, searchSets } from "@/lib/api";
import { EQUIPMENT_TYPE_OPTIONS } from "@/lib/equipmentTypes";
import { effectTypeToStatKey, isWeaponDamagesBucketEffect } from "@/lib/effectFormat";
import { itemFitsSlot } from "@/lib/itemSlotMatch";
import { searchFiltersForSlot } from "@/lib/slotSearchFilter";
import { useBuildStore } from "@/store/build-store";
import type { ItemOut, ItemSetOut } from "@/types/api";
import type { SlotId } from "@/lib/slots";

/* ── Filtre élément d'attaque actif des armes ────────────────────────────── */
const WEAPON_ELEMENT_OPTIONS = [
  { value: "damage_earth",   label: "Terre",  icon: "dtf" },
  { value: "damage_fire",    label: "Feu",    icon: "dff" },
  { value: "damage_water",   label: "Eau",    icon: "def" },
  { value: "damage_air",     label: "Air",    icon: "daf" },
  { value: "damage_neutral", label: "Neutre", icon: "dnf" },
] as const;

/** Vérifie si une arme possède au moins un effet de dégâts actifs dans l'élément donné. */
function weaponHasActiveElement(item: ItemOut, statKey: string): boolean {
  if (!item.effects) return false;
  return (item.effects as Record<string, unknown>[]).some((eff) => {
    if (!eff || !isWeaponDamagesBucketEffect(eff)) return false;
    const type = (eff.type as { name?: string; id?: number } | null) ?? null;
    return effectTypeToStatKey(type) === statKey;
  });
}

/* ── Options du filtre stat (avec icônes) ────────────────────────────────── */
const STAT_FILTER_OPTIONS = [
  // PA / PM
  { value: "pa",  label: "PA", icon: "pa" },
  { value: "pm",  label: "PM", icon: "pm" },
  // Primaires
  { value: "vitality",         label: "Vita.",   icon: "vi"  },
  { value: "strength",         label: "Force",   icon: "ter" },
  { value: "intelligence",     label: "Intel.",  icon: "feu" },
  { value: "chance",           label: "Chance",  icon: "eau" },
  { value: "agility",          label: "Agil.",   icon: "air" },
  { value: "wisdom",           label: "Sagesse", icon: "sa"  },
  { value: "power",            label: "Puiss.",  icon: "pu"  },
  // CC / Dommages
  { value: "critical_percent",        label: "% CC",       icon: "cc"  },
  { value: "critical_damage",         label: "Do Crit.",   icon: "dc"  },
  { value: "damage",                  label: "Dommages",   icon: "dmg" },
  { value: "damage_earth",            label: "Do Terre",   icon: "dtf" },
  { value: "damage_fire",             label: "Do Feu",     icon: "dff" },
  { value: "damage_water",            label: "Do Eau",     icon: "def" },
  { value: "damage_air",              label: "Do Air",     icon: "daf" },
  { value: "damage_neutral",          label: "Do Neutre",  icon: "dnf" },
  { value: "damage_spell_percent",    label: "% Sorts",    icon: "ds"  },
  { value: "damage_weapon_percent",   label: "% Armes",    icon: "dw"  },
  // Divers
  { value: "heals",       label: "Soins",   icon: "so"  },
  { value: "prospecting", label: "Prosp.",  icon: "pp"  },
  { value: "range",       label: "Portée",  icon: "po"  },
  { value: "summons",     label: "Invoc.",  icon: "ic"  },
  { value: "initiative",  label: "Init.",   icon: "ii"  },
] as const;

/* ── Options type spécifiques par mode de slot ──────────────────────────── */
const WEAPON_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Toutes les armes" },
  ...EQUIPMENT_TYPE_OPTIONS.filter((o) =>
    ["sword", "wand", "staff", "dagger", "bow", "hammer", "shovel", "axe", "lance", "scythe", "pickaxe"].includes(o.value),
  ),
];

const DOFUS_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Dofus, Trophées & Prysmaradites" },
  { value: "dofus", label: "Dofus" },
  { value: "trophy", label: "Trophée" },
  { value: "prysmaradite", label: "Prysmaradite" },
];

const PET_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Familiers, Montures & Montiliers" },
  { value: "pet", label: "Familier" },
  { value: "mount", label: "Monture" },
  { value: "petsmount", label: "Montilier" },
];

/** Détermine si le dropdown de type doit être affiché et quelles options proposer. */
function typeDropdownOptions(slot: SlotId | null): { visible: boolean; options: { value: string; label: string }[] } {
  if (!slot) return { visible: true, options: EQUIPMENT_TYPE_OPTIONS };
  if (slot === "weapon") return { visible: true, options: WEAPON_TYPE_OPTIONS };
  if (slot.startsWith("dofus")) return { visible: true, options: DOFUS_TYPE_OPTIONS };
  if (slot === "pet") return { visible: true, options: PET_TYPE_OPTIONS };
  // Slot régulier (chapeau, cape, etc.) : type imposé, pas de choix
  return { visible: false, options: [] };
}

/* ── Onglet Panoplies ────────────────────────────────────────────────────── */
function SetsCatalog() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sets, setSets] = useState<ItemSetOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openSetId, setOpenSetId] = useState<number | null>(null);

  const equipSet = useBuildStore((s) => s.equipSet);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 320);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await searchSets(debouncedQ, page, pageSize);
      setSets(res.sets);
      setTotal(res.total);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
      setSets([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, page]);

  useEffect(() => { void load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1); }}
        placeholder="Nom de panoplie…"
      />

      {err && (
        <p className="rounded border border-red-900/50 bg-red-950/40 px-2 py-1.5 text-[12px] text-red-200">
          {err}
        </p>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <DofusSpinner size={48} label="Chargement…" />
          </div>
        ) : sets.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#666666]">Aucune panoplie trouvée.</p>
        ) : (
          <ul className="space-y-1.5">
            {sets.map((s) => {
              const count = s.equipment_ids?.length ?? 0;
              return (
                <li key={s.ankama_id} className="plaque-flat flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#e8c96e]">
                      {s.name ?? `Panoplie #${s.ankama_id}`}
                    </p>
                    {count > 0 && (
                      <p className="text-[11px] text-[#666666]">{count} objets</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button type="button" variant="outline" size="xs" onClick={() => setOpenSetId(s.ankama_id)}>
                      Détail
                    </Button>
                    <Button type="button" size="xs" onClick={() => void equipSet(s.ankama_id)}>
                      ⚔ Équiper
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between border-t border-[#222222] pt-2 text-[12px] text-[#888888]">
          <span>{total} panoplies · page {page}/{pages}</span>
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Préc.</Button>
            <Button type="button" variant="outline" size="xs" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Suiv.</Button>
          </div>
        </div>
      )}

      {openSetId != null && (
        <SetDetailModal setId={openSetId} onClose={() => setOpenSetId(null)} />
      )}
    </div>
  );
}

/* ── Catalogue principal ─────────────────────────────────────────────────── */
export function ItemCatalogPanel() {
  const selectedSlot = useBuildStore((s) => s.selectedSlot);
  const equipItemOnSlot = useBuildStore((s) => s.equipItemOnSlot);
  const level = useBuildStore((s) => s.level);
  const { hover, show, move, scheduleHide, cancelHide, hide } = useItemHoverCard();

  const currentBuild = useBuildStore((s) => s.currentBuild);
  const itemById     = useBuildStore((s) => s.itemById);

  const [tab, setTab] = useState<"items" | "sets">("items");

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [minLv, setMinLv] = useState(1);
  const [maxLv, setMaxLv] = useState(level);
  const [typeId, setTypeId] = useState("");

  // Filtre élément d'attaque actif (armes uniquement)
  const [weaponElements, setWeaponElements] = useState<string[]>([]);

  // Filtre stat : multi-sélection + valeur min commune
  const [statKeys, setStatKeys] = useState<string[]>([]);
  const [minStat, setMinStat] = useState(1);

  const [page, setPage] = useState(1);
  const pageSize = 24;
  const [items, setItems] = useState<ItemOut[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Sync maxLv avec le niveau du personnage
  useEffect(() => {
    setMaxLv(level);
    setPage(1);
  }, [level]);

  // Reset du filtre type et élément quand le slot change
  useEffect(() => {
    setTypeId("");
    setWeaponElements([]);
    setPage(1);
  }, [selectedSlot]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 320);
    return () => clearTimeout(t);
  }, [q]);

  const { visible: typeVisible, options: typeOptions } = typeDropdownOptions(selectedSlot);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const slotF = selectedSlot ? searchFiltersForSlot(selectedSlot) : {};
      const type_name_id = (typeId || slotF.type_name_id) || undefined;
      const is_weapon = slotF.is_weapon === true ? true : undefined;

      // Quand un filtre d'élément actif est sélectionné, on charge un plus grand batch
      // et on filtre côté client (le backend ne supporte pas ce filtre).
      const useElementFilter = weaponElements.length > 0;
      const fetchPageSize = useElementFilter ? 500 : pageSize;
      const fetchPage = useElementFilter ? 1 : page;

      const res = await searchItems({
        q: debouncedQ || undefined,
        page: fetchPage,
        page_size: fetchPageSize,
        min_level: minLv,
        max_level: maxLv,
        type_name_id,
        is_weapon,
        stat_key: statKeys.length > 0 ? statKeys : undefined,
        min_stat_value: statKeys.length > 0 ? minStat : undefined,
      });

      if (useElementFilter) {
        const filtered = res.items.filter((it) =>
          weaponElements.every((el) => weaponHasActiveElement(it, el))
        );
        setItems(filtered);
        setTotal(filtered.length);
      } else {
        setItems(res.items);
        setTotal(res.total);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur de recherche");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, page, minLv, maxLv, typeId, statKeys, minStat, selectedSlot, weaponElements]);

  useEffect(() => { void load(); }, [load]);

  async function onEquip(it: ItemOut) {
    if (!selectedSlot) {
      setErr("Clique d'abord sur un emplacement à gauche (inventaire).");
      return;
    }
    if (!itemFitsSlot(selectedSlot, it)) {
      setErr(`Cet objet ne va pas dans « ${slotLabelFr(selectedSlot)} ». Choisis un autre emplacement.`);
      return;
    }
    setErr(null);
    try {
      await equipItemOnSlot(selectedSlot, it.ankama_id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Équipement impossible");
    }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="dofus-panel flex min-h-[420px] flex-col rounded-xl border border-[#2e2e2e] bg-[#181818]/95 p-4">
      {/* ── En-tête + onglets ── */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold tracking-wide text-[#f0d78c]">
          Catalogue
        </h2>
        <div className="flex overflow-hidden rounded-lg border border-[#383838]">
          {(["items", "sets"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-[12px] font-medium transition ${
                tab === t
                  ? "bg-[var(--dofus-ui-select-bg)] text-[var(--dofus-green-active)]"
                  : "bg-[#141414] text-[#888888] hover:bg-[#1e1e1e]"
              }`}
            >
              {t === "items" ? "Objets" : "Panoplies"}
            </button>
          ))}
        </div>
      </div>

      {tab === "sets" ? (
        <SetsCatalog />
      ) : (
        <>
          {/* ── Filtres ── */}
          <div className="flex flex-col gap-2.5 border-b border-[#222222] pb-3">

            {/* Recherche par nom */}
            <Input
              type="search"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Nom d'objet…"
            />

            {/* Niveau + Type */}
            <div className={`grid gap-2 ${typeVisible ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
              <label className="flex flex-col text-[10px] font-semibold uppercase tracking-wide text-[#666666]">
                Niv. min
                <input
                  type="number" min={1} max={200} value={minLv}
                  onChange={(e) => { setMinLv(Number(e.target.value)); setPage(1); }}
                  className="mt-0.5 rounded border border-[#383838] bg-[#111111] px-2 py-1 text-[12px] text-[#e0e0e0] focus:outline-none"
                />
              </label>
              <label className="flex flex-col text-[10px] font-semibold uppercase tracking-wide text-[#666666]">
                Niv. max
                <input
                  type="number" min={1} max={200} value={maxLv}
                  onChange={(e) => { setMaxLv(Number(e.target.value)); setPage(1); }}
                  className="mt-0.5 rounded border border-[#383838] bg-[#111111] px-2 py-1 text-[12px] text-[#e0e0e0] focus:outline-none"
                />
              </label>
              {typeVisible && (
                <label className="col-span-2 flex flex-col text-[10px] font-semibold uppercase tracking-wide text-[#666666]">
                  Type
                  <select
                    value={typeId}
                    onChange={(e) => { setTypeId(e.target.value); setPage(1); }}
                    className="mt-0.5 rounded border border-[#383838] bg-[#111111] px-2 py-1 text-[12px] text-[#e0e0e0] focus:outline-none"
                  >
                    {typeOptions.map((o) => (
                      <option key={o.value || "all"} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {/* Filtre élément d'attaque actif — visible quand le slot arme est sélectionné */}
            {selectedSlot === "weapon" && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#666666]">
                  Élément d'attaque
                </span>
                <div className="flex flex-wrap gap-1">
                  {WEAPON_ELEMENT_OPTIONS.map((o) => {
                    const active = weaponElements.includes(o.value);
                    return (
                      <Chip
                        key={o.value}
                        active={active}
                        accentColor="var(--dofus-green-active)"
                        onClick={() => {
                          setWeaponElements((prev) =>
                            active ? prev.filter((v) => v !== o.value) : [...prev, o.value]
                          );
                          setPage(1);
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/assets/elements/${o.icon}.png`}
                          alt=""
                          width={12}
                          height={12}
                          className="h-[12px] w-[12px] shrink-0 object-contain"
                        />
                        {o.label}
                      </Chip>
                    );
                  })}
                  {weaponElements.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setWeaponElements([]); setPage(1); }}
                      className="text-[9px] text-[#555555] hover:text-[#cc4444] transition px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {weaponElements.length > 0 && (
                  <p className="text-[9px] text-[#555555]">
                    Affiche les armes ayant des dégâts actifs dans {weaponElements.length > 1 ? "tous les éléments sélectionnés" : "cet élément"}.
                  </p>
                )}
              </div>
            )}

            {/* Filtre stat — pills avec icônes (multi-sélect) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#666666]">
                  Stats minimum {statKeys.length > 0 && <span className="text-[var(--dofus-green-active)]">({statKeys.length})</span>}
                </span>
                {statKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setStatKeys([]); setPage(1); }}
                    className="text-[9px] text-[#555555] hover:text-[#cc4444] transition"
                  >
                    ✕ tout effacer
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {STAT_FILTER_OPTIONS.map((o) => {
                  const active = statKeys.includes(o.value);
                  return (
                    <Chip
                      key={o.value}
                      active={active}
                      accentColor="var(--dofus-green-active)"
                      onClick={() => {
                        setStatKeys((prev) =>
                          prev.includes(o.value)
                            ? prev.filter((k) => k !== o.value)
                            : [...prev, o.value],
                        );
                        setPage(1);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/assets/elements/${o.icon}.png`}
                        alt=""
                        width={12}
                        height={12}
                        className="h-[12px] w-[12px] shrink-0 object-contain"
                      />
                      {o.label}
                    </Chip>
                  );
                })}
              </div>

              {/* Valeur min — affiché uniquement quand au moins une stat est sélectionnée */}
              {statKeys.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#888888]">Valeur ≥</span>
                  <div className="flex items-center gap-1 rounded-lg border border-[#252525] bg-[#111111] px-2 py-1">
                    <button
                      type="button"
                      onClick={() => setMinStat((v) => Math.max(0, v - 1))}
                      className="flex h-4 w-4 items-center justify-center rounded text-[13px] font-bold text-[#888888] hover:text-[#cccccc]"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={minStat}
                      onChange={(e) => setMinStat(Math.max(0, Number(e.target.value)))}
                      className="w-10 bg-transparent text-center text-[13px] font-semibold tabular-nums text-[#e0e0e0] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setMinStat((v) => v + 1)}
                      className="flex h-4 w-4 items-center justify-center rounded text-[13px] font-bold text-[#888888] hover:text-[#cccccc]"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Indicateur emplacement actif ── */}
          {selectedSlot && (
            <p className="mt-2 rounded-lg bg-[var(--dofus-ui-select-bg)] px-2 py-1.5 text-[12px] text-[var(--dofus-green-active)]">
              Emplacement : <strong>{slotLabelFr(selectedSlot)}</strong> — clique sur un objet pour équiper.
            </p>
          )}

          {err && (
            <p className="mt-2 rounded border border-red-900/50 bg-red-950/40 px-2 py-1.5 text-[12px] text-red-200">
              {err}
            </p>
          )}

          {/* ── Liste d'objets ── */}
          <div className="mt-2 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <DofusSpinner size={48} label="Chargement…" />
              </div>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#666666]">Aucun objet trouvé.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {items.map((it) => {
                  const ok = selectedSlot && itemFitsSlot(selectedSlot, it);
                  return (
                    <li key={it.ankama_id}>
                      <div
                        onMouseEnter={(e) => show(it, e)}
                        onMouseMove={move}
                        onMouseLeave={scheduleHide}
                      >
                        <button
                          type="button"
                          disabled={!selectedSlot}
                          onClick={() => void onEquip(it)}
                          className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition ${
                            ok
                              ? "border-[#383838] bg-[#1e1e1e] hover:border-[var(--dofus-ui-olive-border-60)] hover:bg-[var(--dofus-ui-select-bg)]"
                              : "border-[#282828] bg-[#181818]/80 opacity-80 hover:bg-[#1e1e1e]"
                          } ${!selectedSlot ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          {it.image_url_icon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={it.image_url_icon}
                              alt=""
                              width={36}
                              height={36}
                              className="h-9 w-9 shrink-0 rounded border border-[#383838] object-contain"
                            />
                          ) : (
                            <div className="h-9 w-9 shrink-0 rounded border border-dashed border-[#383838]" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium text-[#e0d0a0]">
                              {it.name}
                            </p>
                            <p className="text-[10px] text-[#666666]">
                              Niv. {it.level}
                              {selectedSlot && !ok && (
                                <span className="text-amber-600/90"> · incompatible</span>
                              )}
                            </p>
                          </div>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {hover && (() => {
            const equippedId = selectedSlot != null ? currentBuild[selectedSlot] : undefined;
            const equippedItem = equippedId != null ? itemById[equippedId] : undefined;
            return (
              <ItemHoverCard
                item={hover.item}
                anchor={{ x: hover.x, y: hover.y }}
                compareItem={equippedItem}
                preferSide="left"
                onMouseEnter={cancelHide}
                onMouseLeave={scheduleHide}
                onForceHide={hide}
              />
            );
          })()}

          {/* ── Pagination ── */}
          {total > pageSize && (
            <div className="mt-2 flex items-center justify-between border-t border-[#222222] pt-2 text-[12px] text-[#888888]">
              <span>{total} résultat{total > 1 ? "s" : ""} · page {page} / {pages}</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Préc.
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                >
                  Suiv.
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function slotLabelFr(id: SlotId): string {
  const labels: Partial<Record<SlotId, string>> = {
    hat: "Chapeau", cloak: "Cape", amulet: "Amulette",
    ring1: "Anneau 1", ring2: "Anneau 2", belt: "Ceinture",
    boots: "Bottes", weapon: "Arme", shield: "Bouclier",
    dofus1: "Dofus/Trophée 1", dofus2: "Dofus/Trophée 2",
    dofus3: "Dofus/Trophée 3", dofus4: "Dofus/Trophée 4",
    dofus5: "Dofus/Trophée 5", dofus6: "Dofus/Trophée 6",
    pet: "Familier",
  };
  return labels[id] ?? id;
}
