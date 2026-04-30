"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ItemHoverCard,
  useItemHoverCard,
} from "@/components/items/ItemHoverCard";
import {
  BOOK_DOFUS_SLOTS,
  BOOK_LEFT_SLOTS,
  BOOK_RIGHT_SLOTS,
  SLOT_SHORT_LABEL,
} from "@/components/dashboard/inventoryLayout";
import { SLOT_DEFS } from "@/lib/slots";
import type { SlotId } from "@/lib/slots";
import type { ItemOut } from "@/types/api";
import { useBuildStore } from "@/store/build-store";
import { DOFUS_CLASS_OPTIONS } from "@/lib/dofusClasses";
import { classImageFallback, classImageUrl } from "@/lib/classImage";
import { isConditionMet } from "@/lib/conditionCheck";

function applyCharacterInvestments(baseStats: Record<string, number>, charStats: Record<string, number>) {
  const result = { ...baseStats };
  for (const [key, value] of Object.entries(charStats)) {
    if (value > 0) {
      result[key] = (result[key] ?? 0) + value;
    }
  }

  const totalElementalStats = (result.strength ?? 0)
    + (result.chance ?? 0)
    + (result.agility ?? 0)
    + (result.intelligence ?? 0);
  const stuffInitiativeBonus = baseStats.initiative ?? 0;
  result.initiative = stuffInitiativeBonus + totalElementalStats;

  return result;
}

/* ─── Cellule d'emplacement ─── */
function SlotCell({
  slotId,
  compact = false,
  selected,
  item,
  rawItemId,
  conditionOk = true,
  onSelect,
  onUnequip,
  onHoverEnter,
  onHoverMove,
  onHoverLeave,
}: {
  slotId: SlotId;
  compact?: boolean;
  selected: boolean;
  item: ItemOut | undefined;
  rawItemId: number | null | undefined;
  conditionOk?: boolean;
  onSelect: () => void;
  onUnequip: () => void;
  onHoverEnter: (e: React.MouseEvent) => void;
  onHoverMove: (e: React.MouseEvent) => void;
  onHoverLeave: () => void;
}) {
  const label = SLOT_SHORT_LABEL[slotId];
  const boxSize = compact ? "h-[48px] w-[48px]" : "h-[54px] w-[54px]";
  const imgPx = compact ? 32 : 38;

  return (
    <button
      type="button"
      onClick={onSelect}
      title={label}
      className={`group flex flex-col items-center gap-0.5 rounded-lg border p-1.5 transition ${
        selected
          ? "border-amber-400/90 bg-[#3a3430] shadow-[0_0_0_2px_rgba(245,180,60,0.3)]"
          : !conditionOk
          ? "border-red-600/80 bg-[#2a1010] shadow-[0_0_0_2px_rgba(220,50,50,0.25)] hover:border-red-500"
          : "border-[#4a433c] bg-[#1e1a17] hover:border-[#6a5d52] hover:bg-[#2a2520]"
      }`}
    >
      <span className="max-w-[72px] truncate text-[9px] font-semibold uppercase tracking-wide text-[#7a7068]">
        {label}
      </span>

      {/* Image ou placeholder */}
      <div
        className={`relative flex ${boxSize} items-center justify-center overflow-hidden rounded border border-[#3d3834] bg-[#14120f]`}
        onMouseEnter={(e) => item && onHoverEnter(e)}
        onMouseMove={onHoverMove}
        onMouseLeave={onHoverLeave}
      >
        {item?.image_url_icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url_icon}
            alt={item.name}
            width={imgPx}
            height={imgPx}
            className="max-h-[88%] max-w-[88%] object-contain"
          />
        ) : rawItemId != null ? (
          <span className="text-[9px] text-[#6a6258]">#{rawItemId}</span>
        ) : (
          <span className="text-[18px] font-extralight text-[#3a3530]">+</span>
        )}
        {item && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onUnequip(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onUnequip(); }
            }}
            className="absolute -right-0.5 -top-0.5 hidden h-[14px] w-[14px] items-center justify-center rounded-sm bg-[#5c3d38] text-[10px] leading-none text-[#f0d0c8] hover:bg-[#7a4a44] group-hover:flex"
            title="Retirer"
          >
            ×
          </span>
        )}
      </div>

      {/* Nom raccourci */}
      {item && (
        <p
          className="max-w-[72px] truncate text-[8px] leading-tight text-[#c0b8b0]"
          title={item.name}
        >
          {item.name}
        </p>
      )}
    </button>
  );
}

/* ─── Image de classe centrale ─── */
function ClassPortrait({
  classId,
  sex,
}: {
  classId: number;
  sex: "male" | "female";
}) {
  const url = classImageUrl(classId, sex);
  const [errored, setErrored] = useState(false);

  // Reset l'erreur dès que la combinaison classe/sexe change.
  useEffect(() => { setErrored(false); }, [classId, sex]);

  if (errored) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
        <span className="text-[40px] opacity-20">?</span>
        <span className="text-[10px] text-[#5a5248]">Image non disponible</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={url}
      src={url}
      alt=""
      onError={() => setErrored(true)}
      className="h-full w-full object-contain object-bottom drop-shadow-xl"
    />
  );
}

/* ─── Résumé PA / PM / Invocations / Vitalité sous le portrait ─── */
function StatGem({
  src,
  label,
  value,
  size = 64,
  fontSize = "text-[15px]",
}: {
  src: string;
  label: string;
  value: number;
  size?: number;
  fontSize?: string;
}) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        width={size}
        height={size}
        className="h-full w-full object-contain drop-shadow-lg"
      />
      <span
        className={`absolute ${fontSize} font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)]`}
      >
        {value}
      </span>
    </div>
  );
}

function BuildStatsSummary() {
  const stats = useBuildStore((s) => s.stats);
  const charStats = useBuildStore((s) => s.charStats);
  const effectiveStats = useMemo(
    () => applyCharacterInvestments(stats, charStats),
    [stats, charStats],
  );
  const pa    = effectiveStats.pa      ?? 0;
  const pm    = effectiveStats.pm      ?? 0;
  const invoc = effectiveStats.summons ?? 0;
  const pv    = effectiveStats.vitality ?? 0;

  return (
    <div className="mt-2 flex flex-col items-center gap-1">
      {/* Ligne : PA — Cœur (vitalité) — PM */}
      <div className="flex items-center gap-2">
        <StatGem src="/assets/build/pa.png"  label="PA" value={pa} size={58} fontSize="text-[14px]" />
        <StatGem src="/assets/build/pv.png"  label="Vitalité" value={pv} size={76} fontSize="text-[16px]" />
        <StatGem src="/assets/build/pm.png"  label="PM" value={pm} size={58} fontSize="text-[14px]" />
      </div>

      {/* Invocation — plus petite, centrée en dessous */}
      <StatGem src="/assets/build/invoc.png" label="Invocations" value={invoc} size={44} fontSize="text-[12px]" />
    </div>
  );
}

/* ─── Badge niveau du stuff ─── */
function StuffLevelBadge() {
  const currentBuild = useBuildStore((s) => s.currentBuild);
  const itemById = useBuildStore((s) => s.itemById);
  const stuffLevel = useMemo(() => {
    const levels = Object.values(currentBuild)
      .filter((id): id is number => id != null)
      .map((id) => itemById[id]?.level ?? 0);
    return levels.length ? Math.max(...levels) : 0;
  }, [currentBuild, itemById]);

  if (stuffLevel === 0) return null;
  return (
    <div className="flex items-center gap-0.5 rounded border border-[#5c4a32] bg-[#14120f] px-1.5 py-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/elements/lvl.png" alt="lvl" width={13} height={13} className="h-[13px] w-[13px] object-contain" />
      <span className="text-[12px] font-semibold text-[#c9a227]">{stuffLevel}</span>
    </div>
  );
}

/* ─── Grille principale ─── */
export function InventoryGrid() {
  const currentBuild = useBuildStore((s) => s.currentBuild);
  const itemById = useBuildStore((s) => s.itemById);
  const selectedSlot = useBuildStore((s) => s.selectedSlot);
  const setSelectedSlot = useBuildStore((s) => s.setSelectedSlot);
  const updateSlot = useBuildStore((s) => s.updateSlot);
  const classId = useBuildStore((s) => s.classId);
  const setClassId = useBuildStore((s) => s.setClassId);
  const sex = useBuildStore((s) => s.sex);
  const setSex = useBuildStore((s) => s.setSex);
  const level = useBuildStore((s) => s.level);
  const setLevel = useBuildStore((s) => s.setLevel);
  const stats = useBuildStore((s) => s.stats);
  const charStats = useBuildStore((s) => s.charStats);
  const effectiveStats = useMemo(
    () => applyCharacterInvestments(stats, charStats),
    [stats, charStats],
  );

  const { hover, show, move, scheduleHide } = useItemHoverCard();

  function slotProps(id: SlotId) {
    const itemId = currentBuild[id];
    const item = itemId != null ? itemById[itemId] : undefined;
    const selected = selectedSlot === id;
    const conditionOk = item ? isConditionMet(item.conditions, effectiveStats) : true;
    return {
      slotId: id,
      selected,
      item,
      rawItemId: itemId,
      conditionOk,
      onSelect: () => setSelectedSlot(selected ? null : id),
      onUnequip: () => updateSlot(id, null),
      onHoverEnter: (e: React.MouseEvent) => { if (item) show(item, e); },
      onHoverMove: move,
      onHoverLeave: scheduleHide,
    };
  }

  return (
    <section className="rounded-xl border border-[#4a433c] bg-[#1e1a17] p-3">
      {/* ─── Sélecteurs classe / sexe / niveau ─── */}
      <div className="mb-3 flex items-center gap-1.5">
        {/* Classe */}
        <select
          value={classId}
          onChange={(e) => setClassId(Number(e.target.value))}
          className="min-w-0 flex-1 rounded border border-[#5c4a32] bg-[#14120f] px-1.5 py-1 text-[12px] text-[#f0e4c4]"
        >
          {DOFUS_CLASS_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>

        {/* Sexe */}
        <div className="flex overflow-hidden rounded border border-[#5c4a32]">
          {(["male", "female"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSex(s)}
              className={`px-2 py-1 text-[11px] font-medium transition ${
                sex === s
                  ? "bg-[#c9a227]/20 text-[#e8c96e]"
                  : "bg-[#14120f] text-[#8a7a62] hover:bg-[#2a2218]"
              }`}
            >
              {s === "male" ? "♂" : "♀"}
            </button>
          ))}
        </div>

        {/* Niveau personnage */}
        <div className="flex items-center gap-0.5 rounded border border-[#5c4a32] bg-[#14120f] px-1.5 py-1">
          <span className="text-[10px] text-[#6a5c48]">Niv.</span>
          <input
            type="number"
            min={1}
            max={200}
            value={level}
            onChange={(e) => setLevel(Math.min(200, Math.max(1, Number(e.target.value))))}
            className="w-10 bg-transparent text-center text-[12px] text-[#f0e4c4] outline-none"
          />
        </div>

        {/* Niveau du stuff (calculé) */}
        <StuffLevelBadge />
      </div>

      {/* ─── Zone principale : gauche | portrait | droite ─── */}
      <div className="flex items-start justify-center gap-2">
        {/* Colonne gauche */}
        <div className="flex flex-col gap-1.5">
          {BOOK_LEFT_SLOTS.map((id) => <SlotCell key={id} {...slotProps(id)} />)}
        </div>

        {/* Portrait de classe + résumé stats */}
        <div className="relative flex flex-1 flex-col items-center justify-start pt-6">
          <div className="relative h-[360px] w-full max-w-[260px] overflow-hidden">
            <ClassPortrait classId={classId} sex={sex} />
          </div>
          <BuildStatsSummary />
        </div>

        {/* Colonne droite */}
        <div className="flex flex-col gap-1.5">
          {BOOK_RIGHT_SLOTS.map((id) => <SlotCell key={id} {...slotProps(id)} />)}
        </div>
      </div>

        {/* ─── Rangée Dofus / Trophées (6 emplacements combinés) ─── */}
      <div className="mt-3 border-t border-[#3d3834] pt-3">
        <p className="mb-2 text-center text-[9px] font-semibold uppercase tracking-widest text-[#6a6258]">
          Dofus &amp; Trophées
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {BOOK_DOFUS_SLOTS.map((id) => <SlotCell key={id} {...slotProps(id)} compact />)}
        </div>
      </div>

      {hover && <ItemHoverCard item={hover.item} anchor={{ x: hover.x, y: hover.y }} />}
    </section>
  );
}
