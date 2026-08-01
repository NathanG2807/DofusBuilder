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

async function classHeadSrc(build: BuildOut): Promise<string | null> {
  if (build.class_id == null) return null;
  const cid = normalizeClassId(build.class_id);
  const sexCode = build.sex === "female" ? 1 : 0;
  return readPublicPng(`assets/classes/Head_${cid}-${sexCode}.png`);
}

function slotIcon(preview: Record<string, string | null> | null | undefined, key: string): string | null {
  const url = preview?.[key];
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return null;
}

function SlotBox({
  src,
  boxSize,
}: {
  src: string | null;
  boxSize: number;
}) {
  return (
    <div
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: 10,
        border: "2px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
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
          width={boxSize - 10}
          height={boxSize - 10}
          style={{ objectFit: "contain" }}
          alt=""
        />
      ) : (
        <div
          style={{
            width: boxSize * 0.28,
            height: boxSize * 0.28,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
          }}
        />
      )}
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
        background: "linear-gradient(145deg, #0a0a0a 0%, #141814 55%, #0d120e 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 28, color: "#7cb82a", marginBottom: 16 }}>Zaap Builder</div>
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
  const classSrc = await classHeadSrc(build);
  const logoSrc = await readPublicPng("assets/global/ZaapLogo4.png");
  const classLabel = build.class_id != null ? dofusClassLabel(build.class_id) : null;
  const tags = (build.tags ?? []).filter(Boolean).slice(0, 5);
  const metaLine = [
    classLabel,
    build.level != null ? `Niveau ${build.level}` : null,
    build.username ? `par ${build.username}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const slotSize = 54;
  const dofusSize = 44;
  const gap = 8;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(145deg, #080808 0%, #101410 50%, #0b100c 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "32px 44px 28px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} width={56} height={56} alt="" style={{ objectFit: "contain" }} />
            ) : null}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  maxWidth: 860,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {build.name}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 8,
                  fontSize: 22,
                  color: "rgba(255,255,255,0.62)",
                }}
              >
                {classSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={classSrc}
                    width={30}
                    height={30}
                    alt=""
                    style={{ borderRadius: 7, objectFit: "cover" }}
                  />
                ) : null}
                <span>{metaLine || buildOgDescription(build)}</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 20, color: "#7cb82a", fontWeight: 600 }}>Zaap</div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap }}>
            {BOOK_LEFT_SLOTS.map((key) => (
              <SlotBox key={key} src={slotIcon(preview, key)} boxSize={slotSize} />
            ))}
          </div>

          <div
            style={{
              width: 168,
              height: 168,
              borderRadius: 24,
              border: "2px solid rgba(124,184,42,0.35)",
              background: "rgba(124,184,42,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {classSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={classSrc} width={140} height={140} alt="" style={{ objectFit: "contain" }} />
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

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            marginTop: 16,
          }}
        >
          {BOOK_DOFUS_SLOTS.map((key) => (
            <SlotBox key={key} src={slotIcon(preview, key)} boxSize={dofusSize} />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 16,
            gap: 10,
          }}
        >
          {tags.map((tag) => (
            <div
              key={tag}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(124,184,42,0.12)",
                border: "1px solid rgba(124,184,42,0.28)",
                color: "#b7e06a",
                fontSize: 18,
              }}
            >
              {tag.startsWith("#") ? tag : `#${tag}`}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
