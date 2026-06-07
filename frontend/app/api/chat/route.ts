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

type BuildContext = {
  level?: number;
  classId?: number;
  className?: string;
  lockedSlots?: Record<string, number>;
  lockedItemNames?: string;
};

function buildSystemPrompt(ctx: BuildContext): string {
  const level = ctx.level ?? 200;
  const classId = ctx.classId ?? 8;
  const className = ctx.className ?? `classe #${classId}`;

  const lockedSection =
    ctx.lockedItemNames
      ? `\n- Items verrouillés (NE PAS changer, le solver les conserve automatiquement) : ${ctx.lockedItemNames}\n  → Transmets toujours locked_slots dans ton appel à optimize_build.`
      : "";

  return `Tu es l'assistant « Dofus Intelligence Architect » pour Dofus 3.
Tu aides au theorycraft : builds, stats, compromis, explications.

Contexte du build en cours (utilise-le par défaut, ne le redemande jamais) :
- Classe : ${className} (class_id=${classId})
- Niveau du personnage : ${level}${lockedSection}

Quand l'utilisateur veut un stuff optimisé, sois PROACTIF : déduis les paramètres manquants au lieu de poser des questions. Appelle l'outil optimize_build dès que tu peux raisonnablement remplir les paramètres.

Règles de déduction des paramètres :
- level : par défaut le niveau du build (${level}), sauf si l'utilisateur précise un autre niveau max d'objets.
- class_id : par défaut la classe du build (${classId}).
- elements : déduis-les de la demande (« build feu » → intelligence ; « cac/agi » → agility ; etc.) ou du sens commun pour la classe. Force=strength, Intelligence=intelligence, Chance=chance, Agilité=agility.
- min_pa / min_pm : si l'utilisateur ne les précise PAS, choisis toi-même des valeurs cohérentes avec le niveau, la classe et la méta actuelle de Dofus 3 (ex. endgame niveau 200 : viser 12 PA et 6 PM ; objectifs PM/PA adaptés à la classe et au style de jeu). Mentionne brièvement le choix que tu as fait et pourquoi.
- focus_stats : stats secondaires à pousser, clés API en anglais (ex: damage_earth, critical_percent, vitality).
- locked_slots : si des items sont verrouillés dans le contexte ci-dessus, TOUJOURS les inclure tels quels dans l'appel optimize_build.

Ne demande une précision QUE si la demande est réellement ambiguë ou contradictoire (jamais pour le niveau ou la classe, déjà connus). 
Note : ta connaissance de la méta s'arrête à ta date d'entraînement ; propose des valeurs raisonnables et invite l'utilisateur à les ajuster s'il connaît la méta du patch actuel.
Le mode "genetic" n'est pas supporté : utilise toujours mode=solver.
Réponds en français, de façon concise.`;
}

function backendBaseUrl(): string {
  const u =
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://127.0.0.1:8000";
  return u.replace(/\/$/, "");
}

const optimizeSchema = z.object({
  level: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .describe("Niveau maximum des objets. Défaut : niveau du build."),
  class_id: z
    .number()
    .int()
    .optional()
    .describe("ID de classe du personnage. Défaut : classe du build."),
  elements: z
    .array(z.string())
    .min(1)
    .describe("ex: strength, intelligence, chance, agility"),
  min_pa: z
    .number()
    .optional()
    .describe(
      "PA minimum (total avec base perso côté solver). Si non fourni, choisis une valeur méta cohérente.",
    ),
  min_pm: z
    .number()
    .optional()
    .describe("PM minimum. Si non fourni, choisis une valeur méta cohérente."),
  focus_stats: z
    .array(z.string())
    .default([])
    .describe("Stats secondaires à maximiser (clés API, ex: damage_earth)"),
  locked_slots: z
    .record(z.string(), z.number())
    .optional()
    .describe(
      "Items verrouillés à conserver : { slotId: ankama_id }. Toujours transmettre si des items sont verrouillés dans le contexte.",
    ),
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

  let body: { messages: UIMessage[]; buildContext?: BuildContext };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  const buildContext = body.buildContext ?? {};
  const modelId =
    process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

  const result = streamText({
    model: anthropic(modelId),
    system: buildSystemPrompt(buildContext),
    messages: await convertToModelMessages(messages),
    tools: {
      optimize_build: tool({
        description:
          "Lance le solver backend (OR-Tools) et renvoie un build complet : slots → ankama_id, stats totales, panoplies actives.",
        inputSchema: optimizeSchema,
        execute: async (input) => {
          const url = `${backendBaseUrl()}/api/v1/optimize`;
          // Fusionne les locked_slots : ceux transmis par le modèle + ceux du contexte (fallback)
          const lockedSlots =
            input.locked_slots && Object.keys(input.locked_slots).length > 0
              ? input.locked_slots
              : buildContext.lockedSlots && Object.keys(buildContext.lockedSlots).length > 0
              ? buildContext.lockedSlots
              : undefined;

          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...input,
              level: input.level ?? buildContext.level ?? 200,
              class_id: input.class_id ?? buildContext.classId ?? 8,
              min_pa: input.min_pa ?? 11,
              min_pm: input.min_pm ?? 6,
              mode: "solver",
              ...(lockedSlots ? { locked_slots: lockedSlots } : {}),
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
