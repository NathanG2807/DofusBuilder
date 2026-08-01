import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { computeDisplayStats } from "@/lib/buildDisplayStats";
import { buildOgDescription, fetchBuildForOg } from "@/lib/buildOg";
import { getBuildTag } from "@/lib/buildTags";
import { dofusClassLabel } from "@/lib/dofusClasses";
import type { BuildOut } from "@/types/api";

type ExoType = "pa" | "pm";

export const alt = "Aperçu du build Zaap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ buildId: string }>;
};

const LEFT_SLOTS = ["amulet", "shield", "ring1", "belt", "boots"] as const;
const RIGHT_SLOTS = ["hat", "weapon", "ring2", "cloak", "pet"] as const;
const DOFUS_SLOTS = ["dofus1", "dofus2", "dofus3", "dofus4", "dofus5", "dofus6"] as const;

function pngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  if (buf.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function fitContain(
  srcW: number,
  srcH: number,
  max: number,
): { width: number; height: number } {
  if (srcW <= 0 || srcH <= 0) return { width: max, height: max };
  const ratio = srcW / srcH;
  if (ratio >= 1) return { width: max, height: Math.round(max / ratio) };
  return { width: Math.round(max * ratio), height: max };
}

async function readPublicPng(
  relativePath: string,
): Promise<{ src: string; width: number; height: number } | null> {
  try {
    const clean = relativePath.replace(/^\//, "");
    const buf = await readFile(join(process.cwd(), "public", clean));
    if (buf.byteLength > 250_000) return null;
    const dims = pngDimensions(buf) ?? { width: 64, height: 64 };
    return {
      src: `data:image/png;base64,${buf.toString("base64")}`,
      width: dims.width,
      height: dims.height,
    };
  } catch {
    return null;
  }
}

function preferHiResIcon(url: string): string {
  return url.replace(/-128\.png(\?.*)?$/i, "-256.png$1");
}

async function fetchIconDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || (!url.startsWith("https://") && !url.startsWith("http://"))) return null;
  const candidates = [preferHiResIcon(url), url].filter((u, i, arr) => arr.indexOf(u) === i);
  for (const candidate of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(candidate, {
        signal: controller.signal,
        next: { revalidate: 3600 },
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength === 0 || buf.byteLength > 300_000) continue;
      const contentType = res.headers.get("content-type") ?? "image/png";
      return `data:${contentType};base64,${buf.toString("base64")}`;
    } catch {
      /* next */
    }
  }
  return null;
}

function normalizeClassId(classId: number): number {
  return classId === 19 ? 20 : classId;
}

async function loadClassHead(
  build: BuildOut,
): Promise<{ src: string; width: number; height: number } | null> {
  if (build.class_id == null) return null;
  const cid = normalizeClassId(build.class_id);
  const sexCode = build.sex === "female" ? 1 : 0;
  return readPublicPng(`assets/classes/Head_${cid}-${sexCode}.png`);
}

async function loadSlotIcons(
  preview: Record<string, string | null> | null | undefined,
): Promise<Record<string, string | null>> {
  const keys = [...LEFT_SLOTS, ...RIGHT_SLOTS, ...DOFUS_SLOTS];
  const entries = await Promise.all(
    keys.map(async (key) => [key, await fetchIconDataUrl(preview?.[key])] as const),
  );
  return Object.fromEntries(entries);
}

async function loadTagAssets(
  tagIds: string[],
): Promise<Record<string, { color: string; label: string; icon: string | null }>> {
  const out: Record<string, { color: string; label: string; icon: string | null }> = {};
  await Promise.all(
    tagIds.map(async (id) => {
      const tag = getBuildTag(id);
      if (!tag) {
        out[id] = { color: "#8fd63a", label: id, icon: null };
        return;
      }
      const iconAsset = await readPublicPng(tag.icon);
      out[id] = {
        color: tag.color,
        label: tag.label,
        icon: iconAsset?.src ?? null,
      };
    }),
  );
  return out;
}

function exoBorder(exo: string | null | undefined): string {
  if (exo === "pa") return "2px solid #4a90d9";
  if (exo === "pm") return "2px solid #98c030";
  return "2px solid rgba(240,215,140,0.28)";
}

function SlotBox({
  src,
  boxSize,
  exo,
}: {
  src: string | null;
  boxSize: number;
  exo?: string | null;
}) {
  const icon = Math.round(boxSize * 0.78);
  return (
    <div
      style={{
        display: "flex",
        width: boxSize,
        height: boxSize,
        borderRadius: 14,
        border: exoBorder(exo),
        backgroundColor: "#171714",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          width={icon}
          height={icon}
          alt=""
          style={{ objectFit: "contain" }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            width: 14,
            height: 14,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.1)",
          }}
        />
      )}
    </div>
  );
}

function StatGem({
  src,
  overlaySrc,
  value,
  sizePx,
  fontSize,
}: {
  src: string | null;
  overlaySrc?: string | null;
  value: number;
  sizePx: number;
  fontSize: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: sizePx,
        height: sizePx,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          width={sizePx}
          height={sizePx}
          alt=""
          style={{ objectFit: "contain", position: "absolute", left: 0, top: 0 }}
        />
      ) : null}
      {overlaySrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={overlaySrc}
          width={sizePx}
          height={sizePx}
          alt=""
          style={{ objectFit: "contain", position: "absolute", left: 0, top: 0 }}
        />
      ) : null}
      <div
        style={{
          display: "flex",
          fontSize,
          fontWeight: 800,
          color: "white",
        }}
      >
        {String(value)}
      </div>
    </div>
  );
}

function FallbackCard({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "center",
        padding: 56,
        backgroundColor: "#101410",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 28, color: "#8fd63a", marginBottom: 16 }}>
        Zaap Builder
      </div>
      <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>{title}</div>
      <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,0.6)", marginTop: 16 }}>
        {description}
      </div>
    </div>
  );
}

function BuildCard({
  build,
  head,
  icons,
  tagAssets,
  gemAssets,
}: {
  build: BuildOut;
  head: { src: string; width: number; height: number } | null;
  icons: Record<string, string | null>;
  tagAssets: Record<string, { color: string; label: string; icon: string | null }>;
  gemAssets: {
    pa: string | null;
    pm: string | null;
    pv: string | null;
    pvedge: string | null;
  };
}) {
  const classLabel = build.class_id != null ? dofusClassLabel(build.class_id) : null;
  const tags = (build.tags ?? []).filter(Boolean).slice(0, 5);
  const metaLine = [
    classLabel,
    build.level != null ? `Niveau ${build.level}` : null,
    build.username ? `par ${build.username}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const display = computeDisplayStats(
    build.total_stats ?? {},
    build.level ?? 200,
    build.char_stats ?? {},
    build.parcho_stats ?? {},
    (build.exo_fm ?? {}) as Partial<Record<string, ExoType>>,
  );
  const pa = display.pa ?? 0;
  const pm = display.pm ?? 0;
  const pv = display.vitality ?? 0;
  const exoFm = build.exo_fm ?? {};

  const slotSize = 70;
  const dofusSize = 56;
  const slotGap = 8;
  const headBox = 156;
  const headFit = head
    ? fitContain(head.width, head.height, 132)
    : { width: 132, height: 132 };

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        flexDirection: "column",
        backgroundColor: "#0c100c",
        color: "white",
        fontFamily: "sans-serif",
        padding: "22px 34px 20px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 800,
              color: "#f3e6b8",
              lineHeight: 1.05,
            }}
          >
            {build.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
            <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.72)" }}>
              {metaLine || buildOgDescription(build)}
            </div>
          </div>
          {tags.length > 0 ? (
            <div style={{ display: "flex", marginTop: 10 }}>
              {tags.map((tagId, i) => {
                const tag = tagAssets[tagId] ?? {
                  color: "#8fd63a",
                  label: tagId,
                  icon: null,
                };
                return (
                  <div
                    key={tagId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginLeft: i === 0 ? 0 : 8,
                      padding: "6px 12px",
                      borderRadius: 999,
                      backgroundColor: `${tag.color}22`,
                      border: `1px solid ${tag.color}66`,
                      color: tag.color,
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {tag.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tag.icon}
                        width={16}
                        height={16}
                        alt=""
                        style={{ objectFit: "contain", marginRight: 6 }}
                      />
                    ) : null}
                    <div style={{ display: "flex" }}>{tag.label}</div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 800,
              color: "#8fd63a",
              marginRight: 10,
            }}
          >
            Zaap
          </div>
          <StatGem src={gemAssets.pa} value={pa} sizePx={58} fontSize={15} />
          <StatGem
            src={gemAssets.pv}
            overlaySrc={gemAssets.pvedge}
            value={pv}
            sizePx={74}
            fontSize={16}
          />
          <StatGem src={gemAssets.pm} value={pm} sizePx={58} fontSize={15} />
        </div>
      </div>

      {/* Inventory */}
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#121612",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "16px 24px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {LEFT_SLOTS.map((key, i) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  marginBottom: i === LEFT_SLOTS.length - 1 ? 0 : slotGap,
                }}
              >
                <SlotBox src={icons[key] ?? null} boxSize={slotSize} exo={exoFm[key]} />
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              width: headBox,
              height: headBox,
              marginLeft: 28,
              marginRight: 28,
              borderRadius: 28,
              border: "2px solid rgba(143,214,58,0.45)",
              backgroundColor: "#182418",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {head ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={head.src}
                width={headFit.width}
                height={headFit.height}
                alt=""
              />
            ) : (
              <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.35)" }}>
                Classe
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {RIGHT_SLOTS.map((key, i) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  marginBottom: i === RIGHT_SLOTS.length - 1 ? 0 : slotGap,
                }}
              >
                <SlotBox src={icons[key] ?? null} boxSize={slotSize} exo={exoFm[key]} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 12 }}>
          {DOFUS_SLOTS.map((key, i) => (
            <div key={key} style={{ display: "flex", marginLeft: i === 0 ? 0 : 10 }}>
              <SlotBox src={icons[key] ?? null} boxSize={dofusSize} exo={exoFm[key]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function Image({ params }: Props) {
  const { buildId } = await params;

  try {
    const build = await fetchBuildForOg(buildId);

    if (!build) {
      return new ImageResponse(
        <FallbackCard
          title="Build introuvable"
          description="Ce build n’existe pas ou n’est plus public."
        />,
        { ...size },
      );
    }

    const tagIds = (build.tags ?? []).filter(Boolean).slice(0, 5);
    const [head, icons, tagAssets, pa, pm, pv, pvedge] = await Promise.all([
      loadClassHead(build),
      loadSlotIcons(build.slots_preview),
      loadTagAssets(tagIds),
      readPublicPng("assets/build/pa.png"),
      readPublicPng("assets/build/pm.png"),
      readPublicPng("assets/build/pv.png"),
      readPublicPng("assets/build/pvedge.png"),
    ]);

    return new ImageResponse(
      <BuildCard
        build={build}
        head={head}
        icons={icons}
        tagAssets={tagAssets}
        gemAssets={{
          pa: pa?.src ?? null,
          pm: pm?.src ?? null,
          pv: pv?.src ?? null,
          pvedge: pvedge?.src ?? null,
        }}
      />,
      { ...size },
    );
  } catch {
    return new ImageResponse(
      <FallbackCard
        title="Aperçu indisponible"
        description="Réessaie dans un instant — Zaap Builder"
      />,
      { ...size },
    );
  }
}
