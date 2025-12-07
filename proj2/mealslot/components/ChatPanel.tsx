// --- path: components/ChatPanel.tsx ---

/**
 * ChatPanel
 * ------------------------------------------------------------
 * Client-side party chat panel used in group / party flows.
 *
 * Responsibilities:
 * - Renders a scrollable list of chat messages, auto-scrolling to the latest.
 * - Distinguishes the current user's messages from others (alignment + styling).
 * - Provides a simple input form for composing and sending new messages.
 * - Delegates actual send behavior to the parent via `onSend`.
 *
 * Intended usage:
 * - Embedded alongside party UI (spins, preferences, maps) to coordinate in real time.
 * - Controlled by the parent via `messages`, `meId`, and `onSend` props.
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "./ui/cn";

/** Single chat message as stored/consumed by the chat UI */
export type ChatMsg = {
  /** Unique message identifier (for React keys / dedupe) */
  id: string;
  /** Timestamp (ms since epoch) used to render human-readable time */
  ts: number;
  /** Sender's internal id; used to detect "my" messages */
  fromId: string;
  /** Human-readable sender name shown in the bubble header */
  name: string;
  /** Plain-text message content */
  text: string;
};

export default function ChatPanel({
  messages,
  meId,
  onSend,
}: {
  /** Full ordered message history for the current party */
  messages: ChatMsg[];
  /** Current member id, or null if not joined (disables input) */
  meId: string | null;
  /** Called when the user submits a new chat message */
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the newest message whenever `messages` changes
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white/80 p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Party chat</h3>
        <span className="text-[11px] text-neutral-500">
          {messages.length === 0
            ? "No messages yet"
            : `${messages.length} message${messages.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <div
        ref={listRef}
        className="mb-3 max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-2 text-sm"
      >
        {messages.length === 0 ? (
          <div className="text-xs text-neutral-500">
            Be the first to say hi 👋
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.fromId === meId;
            return (
              <div
                key={m.id}
                className={cn(
                  "flex w-full gap-2 text-xs",
                  mine ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-2.5 py-1.5 shadow-sm",
                    mine
                      ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white"
                      : "bg-white text-neutral-900 border border-neutral-200/80",
                  )}
                >
                  <div className="mb-[2px] flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide",
                        mine ? "text-white/80" : "text-neutral-600",
                      )}
                    >
                      {m.name}
                    </span>
                    <span
                      className={cn(
                        "text-[10px]",
                        mine ? "text-white/70" : "text-neutral-400",
                      )}
                    >
                      {new Date(m.ts).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="break-words text-[11px] leading-snug">
                    {m.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        className="flex items-center gap-2"
        onSubmit={handleSubmit}
      >
        <input
          className="flex-1 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 focus:ring-offset-slate-50"
          placeholder={meId ? "Message…" : "Join the party to chat"}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          disabled={!meId}
        />
        <button
          type="submit"
          className={cn(
            "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium shadow-sm transition-all duration-150",
            meId
              ? "border border-neutral-200 bg-white text-neutral-800 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
              : "border border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed",
          )}
          disabled={!meId}
          title={meId ? "Send message" : "Join the party to chat"}
        >
          Send
        </button>
      </form>
    </section>
  );
}
