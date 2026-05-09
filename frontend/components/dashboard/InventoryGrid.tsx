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
import { useDisplayStats } from "@/hooks/useDisplayStats";
import { SLOT_DEFS } from "@/lib/slots";
import type { SlotId } from "@/lib/slots";
import type { ItemOut } from "@/types/api";
import { useBuildStore, type ExoType } from "@/store/build-store";
import { DOFUS_CLASS_BY_ID, DOFUS_CLASS_OPTIONS } from "@/lib/dofusClasses";
import { classImageFallback, classImageUrl } from "@/lib/classImage";
import { isConditionMet } from "@/lib/conditionCheck";

/* ─── Cellule d'emplacement ─── */
function SlotCell({
  slotId,
  compact = false,
  selected,
  item,
  rawItemId,
  conditionOk = true,
  exoType,
  onSelect,
  onUnequip,
  onToggleExo,
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
  exoType?: ExoType;
  onSelect: () => void;
  onUnequip: () => void;
  onToggleExo: (type: ExoType) => void;
  onHoverEnter: (e: React.MouseEvent) => void;
  onHoverMove: (e: React.MouseEvent) => void;
  onHoverLeave: () => void;
}) {
  const label = SLOT_SHORT_LABEL[slotId];
  const boxSize = compact
    ? "h-[50px] w-[50px] sm:h-[58px] sm:w-[58px]"
    : "h-[58px] w-[58px] sm:h-[68px] sm:w-[68px]";
  const imgPx = compact ? 36 : 48;

  const borderClass = exoType === "pa"
    ? "border-[#4a90d9] bg-[#060e1a]/90 shadow-[0_0_0_2px_rgba(74,144,217,0.45)]"
    : exoType === "pm"
    ? "border-[#72bc1e] bg-[#071200]/90 shadow-[0_0_0_2px_rgba(114,188,30,0.45)]"
    : selected
    ? "border-[#72bc1e]/90 bg-[#182808]/90 shadow-[0_0_0_2px_rgba(114,188,30,0.35)]"
    : !conditionOk
    ? "border-red-600/90 bg-[#250e0e]/90 shadow-[0_0_0_2px_rgba(220,50,50,0.35)] hover:border-red-500"
    : "border-[#383838] bg-[#111111]/90 shadow-[0_2px_8px_rgba(0,0,0,0.6)] hover:border-[#505050] hover:bg-[#1c1c1c]/90";

  return (
    <button
      type="button"
      onClick={onSelect}
      title={label}
      className={`group flex flex-col items-center gap-0.5 rounded-lg border p-1 sm:p-1.5 transition ${borderClass}`}
    >
      <span className="max-w-[64px] truncate text-[8px] font-semibold uppercase tracking-wide text-[#555555]">
        {label}
      </span>

      {/* Image ou placeholder */}
      <div
        className={`relative flex ${boxSize} items-center justify-center overflow-hidden rounded border border-[#303030] bg-[#0e0e0e]/90`}
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
          <span className="text-[9px] text-[#555555]">#{rawItemId}</span>
        ) : (
          <span className="text-[18px] font-extralight text-[#2a2a2a]">+</span>
        )}

        {/* Bouton retirer */}
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

        {/* Boutons exo FM — apparaissent au hover (pas sur dofus/trophées/familier) */}
        {item && !slotId.startsWith("dofus") && slotId !== "pet" && (
          <div className="absolute bottom-0 left-0 right-0 hidden justify-center gap-0.5 bg-[#0a0a0a]/85 py-0.5 group-hover:flex">
            <span
              role="button"
              tabIndex={0}
              title={exoType === "pa" ? "Retirer exo PA" : "Ajouter exo +1 PA"}
              onClick={(e) => { e.stopPropagation(); onToggleExo("pa"); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onToggleExo("pa"); }
              }}
              className={`flex cursor-pointer items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-bold transition ${
                exoType === "pa"
                  ? "bg-[#051225] text-[#4a90d9]"
                  : "bg-[#1a1a1a] text-[#555555] hover:text-[#4a90d9]"
              }`}
            >
              +{/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/build/pa.png" alt="PA" width={9} height={9} className="h-[9px] w-[9px] object-contain" />
            </span>
            <span
              role="button"
              tabIndex={0}
              title={exoType === "pm" ? "Retirer exo PM" : "Ajouter exo +1 PM"}
              onClick={(e) => { e.stopPropagation(); onToggleExo("pm"); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onToggleExo("pm"); }
              }}
              className={`flex cursor-pointer items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-bold transition ${
                exoType === "pm"
                  ? "bg-[#1a3300] text-[#9cce38]"
                  : "bg-[#1a1a1a] text-[#555555] hover:text-[#9cce38]"
              }`}
            >
              +{/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/build/pm.png" alt="PM" width={9} height={9} className="h-[9px] w-[9px] object-contain" />
            </span>
          </div>
        )}
      </div>

      {/* Nom raccourci */}
      {item && (
        <p
          className="max-w-[64px] truncate text-[8px] leading-tight text-[#aaaaaa]"
          title={item.name}
        >
          {item.name}
        </p>
      )}
    </button>
  );
}

/* ─── Fond de classe (logo gravé) ─── */
function ClassBackground({ classId }: { classId: number }) {
  const nameId = DOFUS_CLASS_BY_ID[classId]?.nameId;
  if (!nameId) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
      {/* Logo grand format — plein builder, effet relief enfoncé */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/assets/bgclass/${nameId}.png`}
        alt=""
        className="h-[80%] w-[80%] select-none object-contain"
        style={{
          opacity: 0.25,
        }}
      />
      {/* Vignette bords + effet gravé */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 25%, rgba(24,24,24,0.5) 60%, rgba(24,24,24,0.96) 100%)",
          boxShadow:
            "inset 0 0 60px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.6)",
        }}
      />
    </div>
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

  useEffect(() => { setErrored(false); }, [classId, sex]);

  if (errored) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
        <span className="text-[40px] opacity-20">?</span>
        <span className="text-[10px] text-[#444444]">Image non disponible</span>
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
  containerClass = "h-16 w-16",
  fontSize = "text-[15px]",
}: {
  src: string;
  label: string;
  value: number;
  containerClass?: string;
  fontSize?: string;
}) {
  return (
    <div className={`relative flex items-center justify-center ${containerClass}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
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
  const displayStats = useDisplayStats();
  const pa = displayStats.pa ?? 0;
  const pm = displayStats.pm ?? 0;
  const invoc = displayStats.summons ?? 0;
  const pv = displayStats.vitality ?? 0;

  return (
    <div className="mt-1 flex flex-col items-center gap-1 sm:mt-2">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <StatGem src="/assets/build/pa.png"  label="PA"       value={pa}    containerClass="h-[46px] w-[46px] sm:h-[58px] sm:w-[58px]" fontSize="text-[13px] sm:text-[14px]" />
        <StatGem src="/assets/build/pv.png"  label="Vitalité" value={pv}    containerClass="h-[62px] w-[62px] sm:h-[76px] sm:w-[76px]" fontSize="text-[14px] sm:text-[16px]" />
        <StatGem src="/assets/build/pm.png"  label="PM"       value={pm}    containerClass="h-[46px] w-[46px] sm:h-[58px] sm:w-[58px]" fontSize="text-[13px] sm:text-[14px]" />
      </div>
      <StatGem src="/assets/build/invoc.png" label="Invocations" value={invoc} containerClass="h-[36px] w-[36px] sm:h-[44px] sm:w-[44px]" fontSize="text-[11px] sm:text-[12px]" />
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
    <div className="flex items-center gap-0.5 rounded border border-[#383838] bg-[#141414] px-1.5 py-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/elements/lvl.png" alt="lvl" width={14} height={14} className="h-[14px] w-[14px] object-contain" />
      <span className="text-[12px] font-semibold text-[#9cce38]">{stuffLevel}</span>
    </div>
  );
}

/* ─── Grille principale ─── */
export function InventoryGrid({ onOpenTools }: { onOpenTools?: () => void } = {}) {
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
  const displayStats = useDisplayStats();

  const buildName = useBuildStore((s) => s.buildName);
  const setBuildName = useBuildStore((s) => s.setBuildName);
  const exoFm = useBuildStore((s) => s.exoFm);
  const setExoFm = useBuildStore((s) => s.setExoFm);

  const { hover, show, move, scheduleHide, cancelHide } = useItemHoverCard();
  function slotProps(id: SlotId) {
    const itemId = currentBuild[id];
    const item = itemId != null ? itemById[itemId] : undefined;
    const selected = selectedSlot === id;
    const conditionOk = item ? isConditionMet(item.conditions, displayStats) : true;
    return {
      slotId: id,
      selected,
      item,
      rawItemId: itemId,
      conditionOk,
      exoType: exoFm[id],
      onSelect: () => setSelectedSlot(selected ? null : id),
      onUnequip: () => updateSlot(id, null),
      onToggleExo: (type: ExoType) => setExoFm(id, type),
      onHoverEnter: (e: React.MouseEvent) => { if (item) show(item, e); },
      onHoverMove: move,
      onHoverLeave: scheduleHide,
    };
  }

  return (
    <section className="relative rounded-xl border border-[#282828] bg-[#181818] p-3 overflow-hidden">
      {/* ─── Sélecteurs : nom du build / classe / sexe / niveau ─── */}
      <div className="relative z-10 mb-3 flex items-center gap-1.5">
        {/* Nom du build */}
        <input
          value={buildName}
          onChange={(e) => setBuildName(e.target.value)}
          className="min-w-0 w-[130px] shrink rounded border border-transparent bg-transparent px-1.5 py-1 text-[12px] font-semibold text-[#f0d78c] placeholder:text-[#383838] hover:border-[#2a2a2a] focus:border-[#3a3a3a] focus:bg-[#141414] focus:outline-none"
          placeholder="Nom du build…"
          aria-label="Nom du build"
        />

        {/* Classe */}
        <select
          value={classId}
          onChange={(e) => setClassId(Number(e.target.value))}
          className="min-w-0 flex-1 rounded border border-[#383838] bg-[#141414] px-1.5 py-1 text-[12px] text-[#d0d0d0] focus:outline-none"
        >
          {DOFUS_CLASS_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>

        {/* Sexe */}
        <div className="flex overflow-hidden rounded border border-[#383838]">
          {(["male", "female"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSex(s)}
              className={`px-2 py-1 text-[11px] font-medium transition ${
                sex === s
                  ? "bg-[#1a2c0a] text-[#9cce38]"
                  : "bg-[#141414] text-[#666666] hover:bg-[#1e1e1e]"
              }`}
            >
              {s === "male" ? "♂" : "♀"}
            </button>
          ))}
        </div>

        {/* Niveau personnage */}
        <div className="flex items-center gap-0.5 rounded border border-[#383838] bg-[#141414] px-1.5 py-1">
          <span className="text-[10px] text-[#555555]">Niv.</span>
          <input
            type="number"
            min={1}
            max={200}
            value={level}
            onChange={(e) => setLevel(Math.min(200, Math.max(1, Number(e.target.value))))}
            className="w-10 bg-transparent text-center text-[12px] text-[#d0d0d0] outline-none"
          />
        </div>

        {/* Bouton Optimisation */}
        {onOpenTools && (
          <button
            type="button"
            onClick={onOpenTools}
            title="Optimisation & Conseiller IA"
            className="flex items-center gap-1 rounded border border-[#2e2e2e] bg-[#141414] px-2 py-1 text-[11px] font-medium text-[#888888] transition hover:border-[#4a8000]/60 hover:bg-[#1a2c0a] hover:text-[#9cce38]"
          >
            ⚡ Optim.
          </button>
        )}

        <StuffLevelBadge />
      </div>

      {/* ─── Zone principale : gauche | portrait | droite ─── */}
      <div className="relative z-10 flex items-start justify-center gap-2">
        {/* Colonne gauche */}
        <div className="flex flex-col gap-1.5">
          {BOOK_LEFT_SLOTS.map((id) => <SlotCell key={id} {...slotProps(id)} />)}
        </div>

        {/* Portrait de classe + résumé stats */}
        <div className="relative flex flex-1 flex-col items-center justify-start pt-4 sm:pt-6">
          {/* ─── Logo de classe centré sur le portrait ─── */}
          <ClassBackground classId={classId} />
          <div className="relative z-10 h-[240px] w-full max-w-[180px] overflow-hidden sm:h-[360px] sm:max-w-[260px]">
            <ClassPortrait classId={classId} sex={sex} />
          </div>
          <div className="relative z-10">
            <BuildStatsSummary />
          </div>
        </div>

        {/* Colonne droite */}
        <div className="flex flex-col gap-1.5">
          {BOOK_RIGHT_SLOTS.map((id) => <SlotCell key={id} {...slotProps(id)} />)}
        </div>
      </div>

      {/* ─── Rangée Dofus / Trophées ─── */}
      <div className="relative z-10 mt-3 border-t border-[#222222] pt-3">
        <p className="mb-2 text-center text-[9px] font-semibold uppercase tracking-widest text-[#484848]">
          Dofus &amp; Trophées
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {BOOK_DOFUS_SLOTS.map((id) => <SlotCell key={id} {...slotProps(id)} compact />)}
        </div>
      </div>

      {hover && <ItemHoverCard item={hover.item} anchor={{ x: hover.x, y: hover.y }} onMouseEnter={cancelHide} onMouseLeave={scheduleHide} />}
    </section>
  );
}
