import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

export const maxDuration = 120;

const SYSTEM = `Tu es l'assistant « Dofus Intelligence Architect » pour Dofus 3.
Tu aides au theorycraft : builds, stats, compromis, explications.
Quand l'utilisateur veut un stuff optimisé avec des contraintes (niveau max d'objets, PA/PM min, éléments, stats à pousser), appelle l'outil optimize_build avec les bons paramètres.
Réponds en français, de façon concise. Si une contrainte manque, demande une précision avant d'appeler l'outil.
Les identifiants de stats annexes sont en anglais (ex: damage_earth, critical_percent) comme dans l'API backend.
Le mode "genetic" n'est pas supporté : utilise toujours mode=solver.`;

function backendBaseUrl(): string {
  const u =
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://127.0.0.1:8000";
  return u.replace(/\/$/, "");
}

const optimizeSchema = z.object({
  level: z.number().min(1).max(200).describe("Niveau maximum des objets"),
  class_id: z.number().int().describe("ID de classe du personnage"),
  elements: z
    .array(z.string())
    .min(1)
    .describe("ex: strength, intelligence, chance, agility"),
  min_pa: z.number().describe("PA minimum (total avec base perso côté solver)"),
  min_pm: z.number().describe("PM minimum"),
  focus_stats: z
    .array(z.string())
    .default([])
    .describe("Stats secondaires à maximiser (clés API, ex: damage_earth)"),
  mode: z.literal("solver").default("solver"),
});

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "Clé API Anthropic manquante : définissez ANTHROPIC_API_KEY dans .env.local",
      },
      { status: 503 },
    );
  }

  let body: { messages: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  const modelId =
    process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

  const result = streamText({
    model: anthropic(modelId),
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    tools: {
      optimize_build: tool({
        description:
          "Lance le solver backend (OR-Tools) et renvoie un build complet : slots → ankama_id, stats totales, panoplies actives.",
        inputSchema: optimizeSchema,
        execute: async (input) => {
          const url = `${backendBaseUrl()}/api/v1/optimize`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...input,
              mode: "solver",
            }),
          });
          const data = (await res.json().catch(() => ({}))) as Record<
            string,
            unknown
          >;
          if (!res.ok) {
            const detail = data.detail;
            const msg =
              typeof detail === "string"
                ? detail
                : JSON.stringify(detail ?? data);
            return {
              ok: false as const,
              error: msg || `HTTP ${res.status}`,
            };
          }
          return { ok: true as const, build: data };
        },
      }),
    },
    stopWhen: stepCountIs(12),
  });

  return result.toUIMessageStreamResponse();
}
