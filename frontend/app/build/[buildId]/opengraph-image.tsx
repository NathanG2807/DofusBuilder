import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { buildOgDescription, fetchBuildForOg } from "@/lib/buildOg";
import { dofusClassLabel } from "@/lib/dofusClasses";
import type { BuildOut } from "@/types/api";

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

async function fetchIconDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || (!url.startsWith("https://") && !url.startsWith("http://"))) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 3600 } });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 200_000) return null;
    const contentType = res.headers.get("content-type") ?? "image/png";
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
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

function SlotBox({ src, boxSize }: { src: string | null; boxSize: number }) {
  return (
    <div
      style={{
        display: "flex",
        width: boxSize,
        height: boxSize,
        borderRadius: 10,
        border: "2px solid rgba(240,215,140,0.28)",
        backgroundColor: "#1a1a18",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} width={boxSize - 10} height={boxSize - 10} alt="" />
      ) : (
        <div
          style={{
            display: "flex",
            width: 14,
            height: 14,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.12)",
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

  const stats = build.total_stats ?? {};
  const pa = typeof stats.pa === "number" ? stats.pa : null;
  const pm = typeof stats.pm === "number" ? stats.pm : null;
  const pv = typeof stats.vitality === "number" ? stats.vitality : null;
  const centerSrc = bodySrc ?? headSrc;
  const slotSize = 54;
  const dofusSize = 44;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        flexDirection: "column",
        backgroundColor: "#0d120e",
        color: "white",
        fontFamily: "sans-serif",
        padding: "30px 40px 26px",
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
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 800,
              color: "#f3e6b8",
              lineHeight: 1.1,
            }}
          >
            {build.name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            {headSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={headSrc}
                width={34}
                height={34}
                alt=""
                style={{ borderRadius: 8, marginRight: 10 }}
              />
            ) : null}
            <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.72)" }}>
              {metaLine || buildOgDescription(build)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 800,
              color: "#8fd63a",
              marginBottom: 8,
            }}
          >
            Zaap
          </div>
          {(pa != null || pm != null || pv != null) && (
            <div style={{ display: "flex" }}>
              {pa != null ? (
                <div
                  style={{
                    display: "flex",
                    marginLeft: 8,
                    padding: "8px 12px",
                    borderRadius: 12,
                    backgroundColor: "rgba(74,144,217,0.18)",
                    border: "1px solid rgba(74,144,217,0.4)",
                    color: "#9ec5f0",
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {`${pa} PA`}
                </div>
              ) : null}
              {pm != null ? (
                <div
                  style={{
                    display: "flex",
                    marginLeft: 8,
                    padding: "8px 12px",
                    borderRadius: 12,
                    backgroundColor: "rgba(152,192,48,0.18)",
                    border: "1px solid rgba(152,192,48,0.4)",
                    color: "#c5e070",
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {`${pm} PM`}
                </div>
              ) : null}
              {pv != null ? (
                <div
                  style={{
                    display: "flex",
                    marginLeft: 8,
                    padding: "8px 12px",
                    borderRadius: 12,
                    backgroundColor: "rgba(224,112,112,0.18)",
                    border: "1px solid rgba(224,112,112,0.4)",
                    color: "#f0a0a0",
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {`${pv} PV`}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {LEFT_SLOTS.map((key, i) => (
            <div
              key={key}
              style={{ display: "flex", marginBottom: i === LEFT_SLOTS.length - 1 ? 0 : 8 }}
            >
              <SlotBox src={icons[key] ?? null} boxSize={slotSize} />
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            width: 200,
            height: 250,
            marginLeft: 28,
            marginRight: 28,
            borderRadius: 24,
            border: "2px solid rgba(143,214,58,0.4)",
            backgroundColor: "#152015",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {centerSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={centerSrc} width={170} height={220} alt="" />
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
              style={{ display: "flex", marginBottom: i === RIGHT_SLOTS.length - 1 ? 0 : 8 }}
            >
              <SlotBox src={icons[key] ?? null} boxSize={slotSize} />
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 18,
        }}
      >
        <div style={{ display: "flex" }}>
          {DOFUS_SLOTS.map((key, i) => (
            <div key={key} style={{ display: "flex", marginLeft: i === 0 ? 0 : 8 }}>
              <SlotBox src={icons[key] ?? null} boxSize={dofusSize} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex" }}>
          {tags.map((tag, i) => (
            <div
              key={tag}
              style={{
                display: "flex",
                marginLeft: i === 0 ? 0 : 8,
                padding: "8px 14px",
                borderRadius: 999,
                backgroundColor: "rgba(143,214,58,0.14)",
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
