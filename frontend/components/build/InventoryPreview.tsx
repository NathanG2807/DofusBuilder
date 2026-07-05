"use client";

import { useEffect, useRef, useState } from "react";

import { ItemHoverCard, useItemHoverCard } from "@/components/items/ItemHoverCard";
import { BOOK_DOFUS_SLOTS, BOOK_LEFT_SLOTS, BOOK_RIGHT_SLOTS, SLOT_SHORT_LABEL } from "@/components/dashboard/inventoryLayout";
import { fetchItem } from "@/lib/api";
import { classImageUrl } from "@/lib/classImage";
import { useBuildStore } from "@/store/build-store";
import type { ItemOut } from "@/types/api";

function exoBorderStyle(exoType: string | undefined): string {
  if (exoType === "pa") return "border-[#4a90d9] shadow-[0_0_0_2px_rgba(74,144,217,0.40)]";
  if (exoType === "pm") return "border-[var(--dofus-ui-selected-border)] shadow-[0_0_0_2px_var(--dofus-ui-selected-glow-strong)]";
  return "border-[#2e2e2e]";
}

export function InventoryPreview({
  slotsPreview,
  slots,
  exoFm,
  classId,
  sex,
  slotSize,
  dofusSlotSize,
  centerWidth,
  showLabels = false,
}: {
  slotsPreview: Record<string, string | null> | null;
  slots?: Record<string, number | null> | null;
  exoFm?: Record<string, string> | null;
  classId: number;
  sex: "male" | "female";
  slotSize: number;
  dofusSlotSize?: number;
  centerWidth?: number;
  showLabels?: boolean;
}) {
  const gap = 4;
  const dofusSize = dofusSlotSize ?? Math.round(slotSize * 0.82);
  const spriteWidth = centerWidth ?? Math.round(slotSize * 2.2);

  const slotCellH = showLabels ? slotSize + 12 : slotSize;
  const colHeight = 5 * slotCellH + 4 * gap;

  const { hover, show, move, scheduleHide, cancelHide, hide } = useItemHoverCard();
  const localItemCacheRef = useRef<Record<number, ItemOut>>({});
  const [iconBySlot, setIconBySlot] = useState<Record<string, string | null>>({});
  const pendingSlotRef = useRef<string | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!slots) return;
    let cancelled = false;

    void (async () => {
      const next: Record<string, string | null> = {};
      const entries = Object.entries(slots).filter((entry): entry is [string, number] => entry[1] != null);

      await Promise.all(
        entries.map(async ([slotKey, itemId]) => {
          const cached = useBuildStore.getState().itemById[itemId] ?? localItemCacheRef.current[itemId];
          if (cached) {
            next[slotKey] = cached.image_url_icon ?? null;
            return;
          }
          try {
            const item = await fetchItem(itemId);
            localItemCacheRef.current[itemId] = item;
            next[slotKey] = item.image_url_icon ?? null;
          } catch {
            next[slotKey] = slotsPreview?.[slotKey] ?? null;
          }
        }),
      );

      if (!cancelled) setIconBySlot(next);
    })();

    return () => { cancelled = true; };
  }, [slots, slotsPreview]);

  function resolveIconUrl(slotKey: string): string | null {
    const itemId = slots?.[slotKey];
    if (itemId != null) {
      if (Object.prototype.hasOwnProperty.call(iconBySlot, slotKey)) {
        return iconBySlot[slotKey];
      }
      return null;
    }
    return slotsPreview?.[slotKey] ?? null;
  }

  function handleHoverEnter(slotKey: string, e: React.MouseEvent) {
    if (!slots) return;
    const itemId = slots[slotKey];
    if (itemId == null) return;
    const cached = useBuildStore.getState().itemById[itemId] ?? localItemCacheRef.current[itemId];
    if (cached) { show(cached, e); return; }
    pendingSlotRef.current = slotKey;
    pendingPosRef.current = { x: e.clientX, y: e.clientY };
    void fetchItem(itemId).then((item) => {
      localItemCacheRef.current[itemId] = item;
      if (pendingSlotRef.current === slotKey) {
        show(item, { clientX: pendingPosRef.current.x, clientY: pendingPosRef.current.y } as React.MouseEvent);
      }
    }).catch(() => {});
  }

  function handleHoverLeave() {
    pendingSlotRef.current = null;
    scheduleHide();
  }

  function SlotTile({ slotKey, size }: { slotKey: string; size: number }) {
    const url = resolveIconUrl(slotKey);
    const exoType = exoFm?.[slotKey];
    const hasItem = !!(slots?.[slotKey]);
    const tileImgSize = Math.round(size * 0.75);
    const label = SLOT_SHORT_LABEL[slotKey as keyof typeof SLOT_SHORT_LABEL];

    if (showLabels) {
      return (
        <div
          className={`relative flex shrink-0 flex-col items-center gap-0.5 rounded-lg border p-1 transition ${exoBorderStyle(exoType)} bg-[#111111]`}
          style={{ width: size + 10, minHeight: slotCellH }}
          onMouseEnter={hasItem ? (e) => handleHoverEnter(slotKey, e) : undefined}
          onMouseMove={hasItem ? move : undefined}
          onMouseLeave={hasItem ? handleHoverLeave : undefined}
        >
          <span className="max-w-[72px] truncate text-[7px] font-semibold uppercase tracking-wide text-[#555]">
            {label}
          </span>
          <div
            className="flex items-center justify-center overflow-hidden rounded border border-[#303030] bg-[#0e0e0e]"
            style={{ width: size, height: size }}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" width={tileImgSize} height={tileImgSize}
                style={{ width: tileImgSize, height: tileImgSize }}
                className="object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="rounded-sm bg-[#232323] opacity-50"
                style={{ width: Math.round(size * 0.35), height: Math.round(size * 0.35) }} />
            )}
          </div>
          {exoType && (
            <div className="pointer-events-none absolute bottom-1 right-1 z-10 flex h-[11px] w-[11px] items-center justify-center rounded-sm text-[7px] font-bold"
              style={{ backgroundColor: exoType === "pa" ? "#4a90d9" : "var(--dofus-ui-selected-border)", color: "#fff" }}>
              {exoType === "pa" ? "PA" : "PM"}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className={`relative flex shrink-0 items-center justify-center rounded-[5px] border bg-[#111111] ${exoBorderStyle(exoType)}`}
        style={{ width: size, height: size }}
        onMouseEnter={hasItem ? (e) => handleHoverEnter(slotKey, e) : undefined}
        onMouseMove={hasItem ? move : undefined}
        onMouseLeave={hasItem ? handleHoverLeave : undefined}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" width={tileImgSize} height={tileImgSize}
            style={{ width: tileImgSize, height: tileImgSize }}
            className="object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="rounded-sm bg-[#232323] opacity-50"
            style={{ width: Math.round(size * 0.35), height: Math.round(size * 0.35) }} />
        )}
        {exoType && (
          <div className="pointer-events-none absolute bottom-0 right-0 z-10 flex h-[9px] w-[9px] items-center justify-center rounded-tl-[3px] text-[6px] font-bold"
            style={{ backgroundColor: exoType === "pa" ? "#4a90d9" : "var(--dofus-ui-selected-border)", color: "#fff" }}>
            {exoType === "pa" ? "PA" : "PM"}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center">
        <div className="flex flex-col items-center">
          <div className="flex items-start" style={{ gap }}>
            <div className="flex flex-col" style={{ gap }}>
              {BOOK_LEFT_SLOTS.map((s) => <SlotTile key={s} slotKey={s} size={slotSize} />)}
            </div>

            <div
              className="flex shrink-0 items-end justify-center overflow-hidden"
              style={{ height: colHeight, width: spriteWidth }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={classImageUrl(classId, sex)}
                alt=""
                style={{ height: "100%", width: "100%" }}
                className="object-contain object-bottom drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>

            <div className="flex flex-col" style={{ gap }}>
              {BOOK_RIGHT_SLOTS.map((s) => <SlotTile key={s} slotKey={s} size={slotSize} />)}
            </div>
          </div>

          <div className="mt-2 flex items-center" style={{ gap }}>
            {BOOK_DOFUS_SLOTS.map((s) => {
              const url = resolveIconUrl(s);
              const dofusImgSize = Math.round(dofusSize * 0.75);
              const hasItem = !!(slots?.[s]);
              return (
                <div key={s}
                  className={`relative flex shrink-0 items-center justify-center rounded-[5px] border bg-[#111111] ${exoBorderStyle(exoFm?.[s])}`}
                  style={{ width: dofusSize, height: dofusSize }}
                  onMouseEnter={hasItem ? (e) => handleHoverEnter(s, e) : undefined}
                  onMouseMove={hasItem ? move : undefined}
                  onMouseLeave={hasItem ? handleHoverLeave : undefined}
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" width={dofusImgSize} height={dofusImgSize}
                      style={{ width: dofusImgSize, height: dofusImgSize }}
                      className="object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="rounded-sm bg-[#232323] opacity-50"
                      style={{ width: Math.round(dofusSize * 0.35), height: Math.round(dofusSize * 0.35) }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {hover && (
        <ItemHoverCard item={hover.item} anchor={{ x: hover.x, y: hover.y }}
          onMouseEnter={cancelHide} onMouseLeave={scheduleHide} onForceHide={hide} />
      )}
    </>
  );
}
