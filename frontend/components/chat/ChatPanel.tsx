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
        className={`flex flex-col gap-3 overflow-y-auto px-3 py-3 sm:px-4 ${
          bare ? "min-h-[200px] flex-1" : "max-h-[min(68vh,560px)]"
        }`}
      >
        {messages.length === 0 && (
          <p className="text-sm leading-relaxed text-[#666666]">
            Exemple : « Stuff 200 Force / Intel, 11 PA 6 PM, je veux surtout des
            dégâts Terre et du critique. »
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-4 rounded-lg border border-[#333333] bg-[#222222] px-3 py-2 text-sm text-[#e0e0e0]"
                : "mr-4 rounded-lg border border-[#252525] bg-[#111111]/90 px-3 py-2 text-sm text-[#d0d0d0]"
            }
          >
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[#555555]">
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
                            Build calculé — l'inventaire a été mis à jour.
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
                      <p key={i} className="mt-1 text-xs text-[#666666]">
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

  if (bare) {
    return (
      <div className="flex min-h-0 flex-col rounded-lg border border-[#252525] bg-[#111111]/40">
        {innerContent}
      </div>
    );
  }
  return (
    <aside className="dofus-panel flex min-h-[min(100vh,720px)] flex-col rounded-xl border border-[#2e2e2e] bg-[#181818]/95">
      <div className="border-b border-[#222222] px-4 py-3">
        <h2 className="font-serif text-lg font-semibold tracking-wide text-[#f0d78c]">
          Conseiller IA
        </h2>
        <p className="mt-0.5 text-xs text-[#888888]">
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
      className="border-t border-[#222222] p-3"
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
          className="min-h-[44px] flex-1 resize-y rounded-lg border border-[#383838] bg-[#111111] px-3 py-2 text-sm text-[#e0e0e0] placeholder:text-[#555555] focus:border-[#4a4a4a] focus:outline-none"
          disabled={busy}
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="btn-dofus-gray shrink-0 self-end rounded-lg px-3 py-2 text-sm"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            className="btn-dofus-green shrink-0 self-end rounded-lg px-4 py-2 text-sm"
          >
            Envoyer
          </button>
        )}
      </div>
    </form>
  );
}
