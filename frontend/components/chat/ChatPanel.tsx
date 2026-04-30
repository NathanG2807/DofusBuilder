"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef } from "react";

import { useBuildStore } from "@/store/build-store";
import type { FullBuild } from "@/types/api";

function syncBuildFromMessages(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant" || !("parts" in m) || !m.parts) continue;
    for (const part of m.parts) {
      if (
        part.type === "tool-optimize_build" &&
        part.state === "output-available"
      ) {
        const out = part.output as {
          ok?: boolean;
          build?: FullBuild;
          error?: string;
        };
        if (out?.ok && out.build) {
          useBuildStore.getState().applyFullBuild(out.build);
          void useBuildStore.getState().prefetchEquippedItems();
        }
        return;
      }
    }
  }
}

export function ChatPanel({ bare = false }: { bare?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: ({ messages: msgs }) => {
      syncBuildFromMessages(msgs);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const innerContent = (
    <>

      <div
        ref={scrollRef}
        className="flex max-h-[min(68vh,560px)] flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 && (
          <p className="text-sm leading-relaxed text-[#8a7a62]">
            Exemple : « Stuff 200 Force / Intel, 11 PA 6 PM, je veux surtout des
            dégâts Terre et du critique. »
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-4 rounded-lg border border-[#5c4a32] bg-[#2a2218] px-3 py-2 text-sm text-[#f5e6c8]"
                : "mr-4 rounded-lg border border-[#3d3428] bg-[#120e0a]/90 px-3 py-2 text-sm text-[#e8dcc8]"
            }
          >
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[#6a5c48]">
              {m.role === "user" ? "Vous" : "Assistant"}
            </span>
            {"parts" in m && m.parts
              ? m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <p key={i} className="whitespace-pre-wrap">
                        {part.text}
                      </p>
                    );
                  }
                  if (part.type === "tool-optimize_build") {
                    const st = part.state;
                    if (st === "output-available") {
                      const o = part.output as {
                        ok?: boolean;
                        error?: string;
                      };
                      if (o?.ok) {
                        return (
                          <p
                            key={i}
                            className="mt-1 text-xs text-emerald-400/90"
                          >
                            Build calculé — l’inventaire a été mis à jour.
                          </p>
                        );
                      }
                      return (
                        <p key={i} className="mt-1 text-xs text-red-400/90">
                          Erreur solver : {o?.error ?? "inconnue"}
                        </p>
                      );
                    }
                      return (
                      <p key={i} className="mt-1 text-xs text-[#8a7a62]">
                        Optimisation en cours…
                      </p>
                    );
                  }
                  return null;
                })
              : null}
          </div>
        ))}
        {error && (
          <p className="rounded border border-red-900/50 bg-red-950/30 px-2 py-1.5 text-xs text-red-300">
            {error.message}
          </p>
        )}
      </div>

      <ChatInput
        status={status}
        onSend={(text) => void sendMessage({ text })}
        onStop={() => void stop()}
      />
    </>
  );

  if (bare) return innerContent;
  return (
    <aside className="dofus-panel flex min-h-[min(100vh,720px)] flex-col rounded-xl border-2 border-[#6b5428]/90 bg-[#1a1510]/95 shadow-inner">
      <div className="border-b border-[#3d3428] px-4 py-3">
        <h2 className="font-serif text-lg font-semibold tracking-wide text-[#f0d78c]">
          Conseiller IA
        </h2>
        <p className="mt-0.5 text-xs text-[#a89878]">
          Décris le stuff que tu veux : il peut proposer une optimisation.
        </p>
      </div>
      {innerContent}
    </aside>
  );
}

function ChatInput({
  status,
  onSend,
  onStop,
}: {
  status: string;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const busy = status === "submitted" || status === "streaming";
  return (
    <form
      className="border-t border-[#3d3428] p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const text = (fd.get("msg") as string)?.trim();
        if (!text || busy) return;
        onSend(text);
        e.currentTarget.reset();
      }}
    >
      <div className="flex gap-2">
        <textarea
          name="msg"
          rows={2}
          placeholder="Décrivez votre build ou vos contraintes…"
          className="min-h-[44px] flex-1 resize-y rounded-lg border border-[#5c4a32] bg-[#120e0a] px-3 py-2 text-sm text-[#f5e6c8] placeholder:text-[#6a5c48]"
          disabled={busy}
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="shrink-0 self-end rounded-lg border border-[#5c4a32] px-3 py-2 text-sm text-[#e8dcc8]"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            className="shrink-0 self-end rounded-lg bg-gradient-to-b from-[#e8b84a] to-[#b8891c] px-4 py-2 text-sm font-medium text-[#1a1208] hover:brightness-110"
          >
            Envoyer
          </button>
        )}
      </div>
    </form>
  );
}
