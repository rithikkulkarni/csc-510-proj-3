"use client";

import { useRef } from "react";

interface ChatMsg {
    id: string;
    ts: number;
    from: string;
    text: string;
}

interface PartyChatsProps {
    chat: ChatMsg[];
    onSendChat: (text: string) => void;
}

function Ribbon({ children }: { children: React.ReactNode }) {
    return <div className="mb-2 text-sm font-semibold text-brand-dusk dark:text-white">{children}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-[rgba(var(--card-border),0.7)] bg-[rgb(var(--card))] p-5 shadow-panel">
            {children}
        </div>
    );
}

export default function PartyChat({ chat, onSendChat }: PartyChatsProps) {
    const chatInputRef = useRef<HTMLInputElement>(null);

    const handleSend = () => {
        const v = chatInputRef.current?.value || "";
        if (chatInputRef.current) chatInputRef.current.value = "";
        onSendChat(v);
    };

    return (
        <Card>
            <Ribbon>Party chat</Ribbon>
            <div className="mb-2 max-h-40 overflow-auto rounded border p-2 text-xs dark:border-neutral-700">
                {chat.length === 0 ? (
                    <div className="opacity-60">No messages yet.</div>
                ) : (
                    chat.map((m) => (
                        <div key={m.id} className="mb-1">
                            <span className="rounded bg-sky-600/20 px-1 py-0.5 font-medium">{m.from}</span>{" "}
                            <span className="opacity-60">{new Date(m.ts).toLocaleTimeString()}</span>
                            <div className="pl-1 text-brand-dusk dark:text-white">{m.text}</div>
                        </div>
                    ))
                )}
            </div>
            <div className="flex gap-2">
                <input
                    ref={chatInputRef}
                    className="flex-1 rounded border border-[rgba(var(--card-border),0.8)] bg-[rgb(var(--card))] px-2 py-1 text-sm text-brand-dusk dark:text-white"
                    placeholder="Message…"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleSend();
                        }
                    }}
                />
                <button
                    type="button"
                    onClick={handleSend}
                    className="rounded-full border border-brand-gold/50 bg-gradient-to-r from-brand-gold/20 to-brand-coral/20 px-3 py-1 text-sm font-semibold text-brand-dusk hover:from-brand-gold/40 hover:to-brand-coral/40 dark:text-white"
                >
                    Send
                </button>
            </div>
        </Card>
    );
}
