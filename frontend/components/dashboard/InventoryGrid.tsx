"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
import { createBuild } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { SLOT_DEFS } from "@/lib/slots";
import type { SlotId } from "@/lib/slots";
import type { ItemOut } from "@/types/api";
import { useBuildStore, type ExoType } from "@/store/build-store";
import { DOFUS_CLASS_BY_ID, DOFUS_CLASS_OPTIONS } from "@/lib/dofusClasses";
import { classHeadUrl, classImageFallback, classImageUrl } from "@/lib/classImage";
import { isConditionMet } from "@/lib/conditionCheck";

/* ─── Icône cadenas inline ─── */
function LockIcon({ locked, size = 10 }: { locked: boolean; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={locked ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/* ─── Cellule d'emplacement ─── */
function SlotCell({
  slotId,
  compact = false,
  selected,
  item,
  rawItemId,
  conditionOk = true,
  exoType,
  locked = false,
  onSelect,
  onUnequip,
  onToggleExo,
  onToggleLock,
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
  locked?: boolean;
  onSelect: () => void;
  onUnequip: () => void;
  onToggleExo: (type: ExoType) => void;
  onToggleLock: () => void;
  onHoverEnter: (e: React.MouseEvent) => void;
  onHoverMove: (e: React.MouseEvent) => void;
  onHoverLeave: () => void;
}) {
  const label = SLOT_SHORT_LABEL[slotId];
  const boxSize = compact
    ? "h-[50px] w-[50px] sm:h-[58px] sm:w-[58px]"
    : "h-[58px] w-[58px] sm:h-[68px] sm:w-[68px]";
  const imgPx = compact ? 36 : 48;

  const borderClass = locked
    ? "border-[#c8a030] bg-[#1a1400]/90 shadow-[0_0_0_2px_rgba(200,160,48,0.40)]"
    : exoType === "pa"
    ? "border-[#4a90d9] bg-[#060e1a]/90 shadow-[0_0_0_2px_rgba(74,144,217,0.45)]"
    : exoType === "pm"
    ? "border-[var(--dofus-ui-selected-border)] bg-[var(--dofus-ui-slot-pm-bg)] shadow-[0_0_0_2px_var(--dofus-ui-selected-glow-strong)]"
    : selected
    ? "border-[var(--dofus-ui-selected-border-muted)] bg-[var(--dofus-ui-slot-selected-bg)] shadow-[0_0_0_2px_var(--dofus-ui-selected-glow)]"
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

        {/* Bouton retirer — masqué si l'item est verrouillé */}
        {item && !locked && (
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

        {/* Bouton verrou — visible sur les items ; actif (doré) si verrouillé */}
        {item && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onToggleLock(); }
            }}
            className={`absolute -left-0.5 -top-0.5 flex h-[14px] w-[14px] items-center justify-center rounded-sm transition ${
              locked
                ? "bg-[#3a2e00] text-[#c8a030]"
                : "hidden bg-[#1e1e1e] text-[#555555] hover:text-[#c8a030] group-hover:flex"
            }`}
            title={locked ? "Déverrouiller cet item" : "Verrouiller cet item (l'optimiseur le conservera)"}
          >
            <LockIcon locked={locked} size={9} />
          </span>
        )}

        {/* Boutons exo FM — apparaissent au hover (pas sur dofus/trophées/familier) */}
        {item && !locked && !slotId.startsWith("dofus") && slotId !== "pet" && (
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
                  ? "bg-[var(--dofus-ui-select-bg)] text-[var(--dofus-green-active)]"
                  : "bg-[#1a1a1a] text-[#555555] hover:text-[var(--dofus-green-active)]"
              }`}
            >
              +{/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/build/pm.png" alt="PM" width={9} height={9} className="h-[9px] w-[9px] object-contain" />
            </span>
          </div>
        )}

        {/* Exo FM sur item verrouillé : affiché sans modifier (lecture seule) */}
        {item && locked && exoType && !slotId.startsWith("dofus") && slotId !== "pet" && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5 bg-[#0a0a0a]/85 py-0.5">
            <span className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-bold ${
              exoType === "pa" ? "bg-[#051225] text-[#4a90d9]" : "bg-[var(--dofus-ui-select-bg)] text-[var(--dofus-green-active)]"
            }`}>
              +{/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/assets/build/${exoType}.png`} alt={exoType.toUpperCase()} width={9} height={9} className="h-[9px] w-[9px] object-contain" />
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

/* ─── Socle de classe sous le personnage ─── */
function ClassSocle({ classId }: { classId: number }) {
  const nameId = DOFUS_CLASS_BY_ID[classId]?.nameId;
  if (!nameId) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/assets/bgclass/socle_${nameId}.png`}
      alt=""
      className="-mt-[4.25rem] w-[202px] translate-y-1 select-none object-contain drop-shadow-2xl sm:-mt-[5.25rem] sm:w-[278px] sm:translate-y-1.5"
    />
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
  overlaySrc,
  label,
  value,
  containerClass = "h-16 w-16",
  fontSize = "text-[15px]",
}: {
  src: string;
  overlaySrc?: string;
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
        className="relative z-0 h-full w-full object-contain drop-shadow-lg"
      />
      {overlaySrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={overlaySrc}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-contain"
        />
      ) : null}
      <span
        className={`absolute z-[2] ${fontSize} font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)]`}
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
    <div className="mt-1 flex items-center gap-1 sm:gap-1.5">
      <StatGem src="/assets/build/pa.png"    label="PA"          value={pa}    containerClass="h-[42px] w-[42px] sm:h-[52px] sm:w-[52px]"  fontSize="text-[12px] sm:text-[13px]" />
      <StatGem
        src="/assets/build/pv.png"
        overlaySrc="/assets/build/pvedge.png"
        label="Vitalité"
        value={pv}
        containerClass="h-[56px] w-[56px] sm:h-[68px] sm:w-[68px]"
        fontSize="text-[13px] sm:text-[15px]"
      />
      <StatGem src="/assets/build/pm.png"    label="PM"          value={pm}    containerClass="h-[42px] w-[42px] sm:h-[52px] sm:w-[52px]"  fontSize="text-[12px] sm:text-[13px]" />
      <StatGem src="/assets/build/invoc.png" label="Invocations" value={invoc} containerClass="h-[32px] w-[32px] sm:h-[40px] sm:w-[40px]"  fontSize="text-[10px] sm:text-[11px]" />
    </div>
  );
}

/* ─── Picker de classe (grille de têtes) ─── */
function ClassPicker({ classId, onSelect }: { classId: number; onSelect: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  function updatePosition() {
    const btn = anchorRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const panel = panelRef.current;
    let left = rect.left;
    let top = rect.bottom + 6;
    if (panel && typeof window !== "undefined") {
      const vw = window.innerWidth;
      const panelW = panel.offsetWidth;
      left = Math.max(8, Math.min(left, vw - panelW - 8));
      const panelH = panel.offsetHeight;
      if (top + panelH > window.innerHeight - 8) {
        top = Math.max(8, rect.top - panelH - 6);
      }
    }
    setPos({ top, left });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    function onViewport() {
      updatePosition();
    }
    window.addEventListener("scroll", onViewport, true);
    window.addEventListener("resize", onViewport);
    return () => {
      window.removeEventListener("scroll", onViewport, true);
      window.removeEventListener("resize", onViewport);
    };
  }, [open]);

  const portal =
    mounted &&
    open &&
    createPortal(
      <>
        <div
          className="fixed inset-0 z-[310] bg-black/50 backdrop-blur-[1px]"
          aria-hidden
          onClick={() => setOpen(false)}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Choisir une classe"
          className="fixed z-[311] rounded-xl border border-[#383838] bg-[#141414] p-2 shadow-[0_16px_48px_rgba(0,0,0,0.85)]"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 40px)",
            gap: "4px",
            /* 5×40 + 4×4 gaps = 216px grille + p-2 (8px×2) */
            width: "232px",
            top: pos.top,
            left: pos.left,
          }}
        >
          {DOFUS_CLASS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              title={opt.label}
              onClick={() => {
                onSelect(opt.id);
                setOpen(false);
              }}
              className={`flex h-[40px] w-[40px] items-center justify-center overflow-hidden rounded-lg border transition hover:border-[#6db824] ${
                classId === opt.id
                  ? "border-[#6db824] ring-1 ring-[#6db824]/50"
                  : "border-[#2a2a2a]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={classHeadUrl(opt.id, "male")}
                alt={opt.label}
                width={40}
                height={40}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </button>
          ))}
        </div>
      </>,
      document.body,
    );

  return (
    <>
      <div className="relative">
        <button
          ref={anchorRef}
          type="button"
          title="Changer de classe"
          onClick={() => setOpen((o) => !o)}
          className="flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-md border border-[#383838] bg-[#141414] transition hover:border-[#505050]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={classHeadUrl(classId, "male")}
            alt=""
            width={30}
            height={30}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </button>
      </div>
      {portal}
    </>
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
      <span className="text-[12px] font-semibold text-[var(--dofus-green-active)]">{stuffLevel}</span>
    </div>
  );
}

/* ─── Bouton de sauvegarde rapide ─── */
function SaveBuildButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const currentBuild = useBuildStore((s) => s.currentBuild);
  const stats = useBuildStore((s) => s.stats);
  const activeSetBonuses = useBuildStore((s) => s.activeSetBonuses);
  const charStats = useBuildStore((s) => s.charStats);
  const parchoStats = useBuildStore((s) => s.parchoStats);
  const exoFm = useBuildStore((s) => s.exoFm);
  const lockedSlots = useBuildStore((s) => s.lockedSlots);
  const level = useBuildStore((s) => s.level);
  const classId = useBuildStore((s) => s.classId);
  const sex = useBuildStore((s) => s.sex);
  const buildName = useBuildStore((s) => s.buildName);

  async function handleSave() {
    if (!getAccessToken()) {
      setMsg("Connectez-vous pour sauvegarder.");
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    setBusy(true);
    setMsg(null);
    // Construit la map locked_slots : slotId → ankamaId
    const lockedSlotsMap: Record<string, number> = {};
    for (const slot of lockedSlots) {
      const id = currentBuild[slot];
      if (id != null) lockedSlotsMap[slot] = id;
    }
    try {
      await createBuild({
        name: buildName.trim() || "Sans titre",
        slots: { ...currentBuild },
        total_stats: { ...stats },
        active_set_bonuses: [...activeSetBonuses],
        char_stats: Object.keys(charStats).length > 0 ? { ...charStats } : null,
        parcho_stats: Object.keys(parchoStats).length > 0 ? { ...parchoStats } : null,
        exo_fm: Object.keys(exoFm).length > 0 ? (exoFm as Record<string, string>) : null,
        locked_slots: Object.keys(lockedSlotsMap).length > 0 ? lockedSlotsMap : null,
        level,
        class_id: classId,
        sex,
        is_public: true,
      });
      setMsg("Sauvegardé !");
    } catch {
      setMsg("Échec de la sauvegarde.");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={busy}
        title="Sauvegarder le build"
        className="btn-dofus-green flex items-center gap-1.5 rounded px-2 py-1 text-[11px] disabled:opacity-50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/global/UI/save.png" width={13} height={13} alt="" className="shrink-0" />
        Sauvegarder
      </button>
      {msg && (
        <span className={`text-[11px] ${msg.includes("Échec") || msg.includes("Connectez") ? "text-red-400" : "text-emerald-400"}`}>
          {msg}
        </span>
      )}
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
  const lockedSlots = useBuildStore((s) => s.lockedSlots);
  const toggleLockSlot = useBuildStore((s) => s.toggleLockSlot);

  const { hover, show, move, scheduleHide, cancelHide, hide } = useItemHoverCard();
  function slotProps(id: SlotId) {
    const itemId = currentBuild[id];
    const item = itemId != null ? itemById[itemId] : undefined;
    const selected = selectedSlot === id;
    const conditionOk = item ? isConditionMet(item.conditions, displayStats) : true;
    const locked = lockedSlots.includes(id);
    return {
      slotId: id,
      selected,
      item,
      rawItemId: itemId,
      conditionOk,
      exoType: exoFm[id],
      locked,
      onSelect: () => setSelectedSlot(selected ? null : id),
      onUnequip: () => updateSlot(id, null),
      onToggleExo: (type: ExoType) => setExoFm(id, type),
      onToggleLock: () => toggleLockSlot(id),
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
        <ClassPicker classId={classId} onSelect={setClassId} />

        {/* Sexe */}
        <div className="flex overflow-hidden rounded border border-[#383838]">
          {(["male", "female"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSex(s)}
              className={`px-2 py-1 text-[11px] font-medium transition ${
                sex === s
                  ? "bg-[var(--dofus-ui-select-bg)] text-[var(--dofus-green-active)]"
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
            className="btn-dofus-gray flex items-center gap-1.5 rounded px-2 py-1 text-[11px]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/global/UI/optimizer.png" width={13} height={13} alt="" className="shrink-0" />
            Optimiseur
          </button>
        )}

        <SaveBuildButton />
        <StuffLevelBadge />
      </div>

      {/* ─── Zone principale : gauche | portrait | droite ─── */}
      <div className="relative z-10 flex items-start justify-center gap-2">
        {/* Colonne gauche */}
        <div className="flex flex-col gap-1.5">
          {BOOK_LEFT_SLOTS.map((id) => <SlotCell key={id} {...slotProps(id)} />)}
        </div>

        {/* Portrait de classe + socle + résumé stats */}
        <div className="relative flex flex-1 flex-col items-center justify-start pt-2 sm:pt-4">
          {/* ─── Background de classe ─── */}
          <ClassBackground classId={classId} />

          {/* ─── Portrait + Socle empilés ─── */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Portrait avec z-index élevé pour passer au-dessus du socle */}
            <div className="relative z-10 h-[185px] w-full max-w-[140px] translate-y-4 overflow-hidden sm:h-[250px] sm:max-w-[180px] sm:translate-y-24">
              <ClassPortrait classId={classId} sex={sex} />
            </div>
            {/* Socle : z-0, tiré vers le haut pour superposition sous les pieds */}
            <div className="relative z-0">
              <ClassSocle classId={classId} />
            </div>
          </div>

          {/* ─── Stats ─── */}
          <div className="relative z-10 mt-1">
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

      {hover && <ItemHoverCard item={hover.item} anchor={{ x: hover.x, y: hover.y }} onMouseEnter={cancelHide} onMouseLeave={scheduleHide} onForceHide={hide} />}
    </section>
  );
}
