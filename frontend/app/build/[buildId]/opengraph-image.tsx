import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import {
  BOOK_DOFUS_SLOTS,
  BOOK_LEFT_SLOTS,
  BOOK_RIGHT_SLOTS,
} from "@/components/dashboard/inventoryLayout";
import { buildOgDescription, fetchBuildForOg } from "@/lib/buildOg";
import { dofusClassLabel } from "@/lib/dofusClasses";
import type { BuildOut } from "@/types/api";

export const alt = "Aperçu du build Zaap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ buildId: string }>;
};

async function readPublicPng(relativePath: string): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public", relativePath));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function normalizeClassId(classId: number): number {
  return classId === 19 ? 20 : classId;
}

async function classBodySrc(build: BuildOut): Promise<string | null> {
  if (build.class_id == null) return null;
  const cid = normalizeClassId(build.class_id);
  const sexCode = build.sex === "female" ? 1 : 0;
  return readPublicPng(`assets/classes/${cid}-${sexCode}.png`);
}

async function classHeadSrc(build: BuildOut): Promise<string | null> {
  if (build.class_id == null) return null;
  const cid = normalizeClassId(build.class_id);
  const sexCode = build.sex === "female" ? 1 : 0;
  return readPublicPng(`assets/classes/Head_${cid}-${sexCode}.png`);
}

function slotIcon(
  preview: Record<string, string | null> | null | undefined,
  key: string,
): string | null {
  const url = preview?.[key];
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return null;
}

function SlotBox({ src, boxSize }: { src: string | null; boxSize: number }) {
  return (
    <div
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: 12,
        border: "2px solid rgba(240,215,140,0.22)",
        background: "linear-gradient(180deg, rgba(40,40,36,0.95) 0%, rgba(18,18,16,0.95) 100%)",
        boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          width={boxSize - 8}
          height={boxSize - 8}
          style={{ objectFit: "contain" }}
          alt=""
        />
      ) : (
        <div
          style={{
            width: boxSize * 0.3,
            height: boxSize * 0.3,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
          }}
        />
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 78,
        padding: "10px 14px",
        borderRadius: 14,
        border: `1px solid ${accent}55`,
        background: `${accent}18`,
      }}
    >
      <div style={{ fontSize: 14, color: `${accent}`, fontWeight: 600, letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "white", lineHeight: 1.1, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function FallbackCard({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 64,
        background: "linear-gradient(135deg, #0b0f0b 0%, #152015 45%, #0a0d0a 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 28, color: "#8fd63a", marginBottom: 16 }}>Zaap Builder</div>
      <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>{title}</div>
      <div style={{ fontSize: 26, color: "rgba(255,255,255,0.55)", marginTop: 18 }}>
        {description}
      </div>
    </div>
  );
}

export default async function Image({ params }: Props) {
  const { buildId } = await params;
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

  const preview = build.slots_preview;
  const [bodySrc, headSrc, logoSrc] = await Promise.all([
    classBodySrc(build),
    classHeadSrc(build),
    readPublicPng("assets/global/ZaapLogo4.png"),
  ]);
  const classLabel = build.class_id != null ? dofusClassLabel(build.class_id) : null;
  const tags = (build.tags ?? []).filter(Boolean).slice(0, 5);
  const metaLine = [
    classLabel,
    build.level != null ? `Niveau ${build.level}` : null,
    build.username ? `par ${build.username}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const stats = build.total_stats ?? {};
  const pa = typeof stats.pa === "number" ? stats.pa : null;
  const pm = typeof stats.pm === "number" ? stats.pm : null;
  const pv = typeof stats.vitality === "number" ? stats.vitality : null;

  const slotSize = 56;
  const dofusSize = 46;
  const gap = 8;
  const centerSrc = bodySrc ?? headSrc;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          color: "white",
          fontFamily: "sans-serif",
          background: "#0a0c0a",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Atmosphere */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(124,184,42,0.18) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 15% 20%, rgba(240,215,140,0.08) 0%, transparent 50%), linear-gradient(160deg, #0c100c 0%, #121812 40%, #0a0d0a 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            padding: "28px 40px 24px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoSrc} width={64} height={64} alt="" style={{ objectFit: "contain" }} />
              ) : null}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 800,
                    lineHeight: 1.05,
                    maxWidth: 780,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "#f3e6b8",
                  }}
                >
                  {build.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 8,
                    fontSize: 22,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {headSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={headSrc}
                      width={32}
                      height={32}
                      alt=""
                      style={{ borderRadius: 8, objectFit: "cover", border: "1px solid rgba(255,255,255,0.15)" }}
                    />
                  ) : null}
                  <span>{metaLine || buildOgDescription(build)}</span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#8fd63a",
                  letterSpacing: 1,
                }}
              >
                Zaap
              </div>
              {(pa != null || pm != null || pv != null) && (
                <div style={{ display: "flex", gap: 8 }}>
                  {pa != null && <StatPill label="PA" value={pa} accent="#4a90d9" />}
                  {pm != null && <StatPill label="PM" value={pm} accent="#98c030" />}
                  {pv != null && <StatPill label="PV" value={pv} accent="#e07070" />}
                </div>
              )}
            </div>
          </div>

          {/* Inventory */}
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 28,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap }}>
              {BOOK_LEFT_SLOTS.map((key) => (
                <SlotBox key={key} src={slotIcon(preview, key)} boxSize={slotSize} />
              ))}
            </div>

            <div
              style={{
                width: 200,
                height: 250,
                borderRadius: 28,
                border: "2px solid rgba(143,214,58,0.35)",
                background:
                  "radial-gradient(ellipse at center, rgba(143,214,58,0.16) 0%, rgba(10,14,10,0.85) 70%)",
                boxShadow: "0 0 40px rgba(124,184,42,0.18), inset 0 0 30px rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {centerSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={centerSrc}
                  width={180}
                  height={230}
                  alt=""
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <div style={{ fontSize: 24, color: "rgba(255,255,255,0.35)" }}>Classe</div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap }}>
              {BOOK_RIGHT_SLOTS.map((key) => (
                <SlotBox key={key} src={slotIcon(preview, key)} boxSize={slotSize} />
              ))}
            </div>
          </div>

          {/* Dofus + tags */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 16,
              gap: 16,
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              {BOOK_DOFUS_SLOTS.map((key) => (
                <SlotBox key={key} src={slotIcon(preview, key)} boxSize={dofusSize} />
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {tags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "rgba(143,214,58,0.14)",
                    border: "1px solid rgba(143,214,58,0.35)",
                    color: "#c8f08a",
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
