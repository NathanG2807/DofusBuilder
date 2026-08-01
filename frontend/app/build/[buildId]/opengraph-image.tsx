import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { computeDisplayStats } from "@/lib/buildDisplayStats";
import { buildOgDescription, fetchBuildForOg } from "@/lib/buildOg";
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

async function readPublicPng(relativePath: string): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public", relativePath));
    if (buf.byteLength > 250_000) return null;
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Préfère l’icône 256px quand l’API dofusdu expose `-128.png`. */
function preferHiResIcon(url: string): string {
  return url.replace(/-128\.png(\?.*)?$/i, "-256.png$1");
}

async function fetchIconDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || (!url.startsWith("https://") && !url.startsWith("http://"))) return null;
  const candidates = [preferHiResIcon(url), url].filter(
    (u, i, arr) => arr.indexOf(u) === i,
  );
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
      /* try next candidate */
    }
  }
  return null;
}

function normalizeClassId(classId: number): number {
  return classId === 19 ? 20 : classId;
}

async function loadClassImages(build: BuildOut): Promise<{ body: string | null; head: string | null }> {
  if (build.class_id == null) return { body: null, head: null };
  const cid = normalizeClassId(build.class_id);
  const sexCode = build.sex === "female" ? 1 : 0;
  const [body, head] = await Promise.all([
    readPublicPng(`assets/classes/${cid}-${sexCode}.png`),
    readPublicPng(`assets/classes/Head_${cid}-${sexCode}.png`),
  ]);
  return { body, head };
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

function exoBorder(exo: string | null | undefined): string {
  if (exo === "pa") return "2px solid #4a90d9";
  if (exo === "pm") return "2px solid #98c030";
  return "2px solid rgba(240,215,140,0.32)";
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
  const icon = Math.max(boxSize - (exo === "pa" || exo === "pm" ? 18 : 8), 28);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: boxSize,
        height: boxSize,
        borderRadius: 12,
        border: exoBorder(exo),
        backgroundColor: "#171714",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} width={icon} height={icon} alt="" />
      ) : (
        <div
          style={{
            display: "flex",
            width: 16,
            height: 16,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.1)",
          }}
        />
      )}
      {exo === "pa" || exo === "pm" ? (
        <div
          style={{
            display: "flex",
            marginTop: 2,
            padding: "1px 5px",
            borderRadius: 5,
            backgroundColor: exo === "pa" ? "#4a90d9" : "#98c030",
            color: "white",
            fontSize: 10,
            fontWeight: 800,
            lineHeight: 1.15,
          }}
        >
          {exo === "pa" ? "PA" : "PM"}
        </div>
      ) : null}
    </div>
  );
}

function StatChip({ label, value, bg, border, color }: {
  label: string;
  value: number;
  bg: string;
  border: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 84,
        marginLeft: 10,
        padding: "10px 14px",
        borderRadius: 14,
        backgroundColor: bg,
        border,
      }}
    >
      <div style={{ display: "flex", fontSize: 13, fontWeight: 700, color, letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: "white", marginTop: 2 }}>
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
  headSrc,
  bodySrc,
  icons,
}: {
  build: BuildOut;
  headSrc: string | null;
  bodySrc: string | null;
  icons: Record<string, string | null>;
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
  const centerSrc = bodySrc ?? headSrc;

  const slotSize = 66;
  const dofusSize = 54;
  const slotGap = 8;

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
        padding: "24px 36px 22px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div
            style={{
              display: "flex",
              fontSize: 38,
              fontWeight: 800,
              color: "#f3e6b8",
              lineHeight: 1.05,
            }}
          >
            {build.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
            {headSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={headSrc}
                width={32}
                height={32}
                alt=""
                style={{ borderRadius: 8, marginRight: 10 }}
              />
            ) : null}
            <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.72)" }}>
              {metaLine || buildOgDescription(build)}
            </div>
          </div>
          {tags.length > 0 ? (
            <div style={{ display: "flex", marginTop: 10 }}>
              {tags.map((tag, i) => (
                <div
                  key={tag}
                  style={{
                    display: "flex",
                    marginLeft: i === 0 ? 0 : 8,
                    padding: "6px 12px",
                    borderRadius: 999,
                    backgroundColor: "rgba(143,214,58,0.14)",
                    border: "1px solid rgba(143,214,58,0.35)",
                    color: "#c8f08a",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 800,
              color: "#8fd63a",
              marginRight: 8,
            }}
          >
            Zaap
          </div>
          <StatChip
            label="PA"
            value={pa}
            bg="rgba(74,144,217,0.18)"
            border="1px solid rgba(74,144,217,0.45)"
            color="#9ec5f0"
          />
          <StatChip
            label="PM"
            value={pm}
            bg="rgba(152,192,48,0.18)"
            border="1px solid rgba(152,192,48,0.45)"
            color="#c5e070"
          />
          <StatChip
            label="PV"
            value={pv}
            bg="rgba(224,112,112,0.18)"
            border="1px solid rgba(224,112,112,0.45)"
            color="#f0a0a0"
          />
        </div>
      </div>

      {/* Inventory block */}
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
          padding: "18px 28px 16px",
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
              width: 210,
              height: 270,
              marginLeft: 26,
              marginRight: 26,
              borderRadius: 22,
              border: "2px solid rgba(143,214,58,0.42)",
              backgroundColor: "#182418",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {centerSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={centerSrc} width={180} height={240} alt="" />
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

        <div style={{ display: "flex", marginTop: 14 }}>
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

    const [{ body, head }, icons] = await Promise.all([
      loadClassImages(build),
      loadSlotIcons(build.slots_preview),
    ]);

    return new ImageResponse(
      <BuildCard build={build} headSrc={head} bodySrc={body} icons={icons} />,
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
