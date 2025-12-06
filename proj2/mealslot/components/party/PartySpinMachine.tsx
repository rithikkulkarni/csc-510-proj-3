"use client";

import { Shuffle, RotateCcw, Lock, Unlock, ThumbsUp, RotateCcw as RotateCcwIcon } from "lucide-react";
import { z } from "zod";
import { PrefsSchema } from "@/lib/party";

interface Dish {
    id: string;
    name: string;
    category: string;
    tags: string[];
    allergens: string[];
    ytQuery?: string;
}

type SpinTriple = [Dish | null, Dish | null, Dish | null];

interface PartySpinMachineProps {
    slots: SpinTriple;
    locks: [boolean, boolean, boolean];
    votes: [{ keep: Set<string>; reroll: Set<string> }, { keep: Set<string>; reroll: Set<string> }, { keep: Set<string>; reroll: Set<string> }];
    isSpinning: boolean;
    iAmHost: boolean;
    memberId: string | null;
    recent: string[];
    slotCategories?: string[];
    onCategoryChange?: (index: number, category: string) => void;
    onToggleLock: (idx: 0 | 1 | 2) => void;
    onSendVote: (idx: 0 | 1 | 2, kind: "keep" | "reroll") => void;
    onGroupSpin: () => void;
    onReroll: () => void;
    powerups: { healthy?: boolean; cheap?: boolean; fast?: boolean };
    onPowerupToggle: (key: string) => void;
}

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span className="rounded-full border px-2 py-0.5 text-xs bg-[rgb(var(--card))] border-[rgba(var(--card-border),0.7)] text-brand-dusk dark:text-brand-glow">
            {children}
        </span>
    );
}

function ToggleChip({
    active,
    children,
    onClick,
}: {
    active?: boolean;
    children: React.ReactNode;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "rounded-full border px-3 py-1 text-xs transition-colors",
                active
                    ? "border-transparent bg-gradient-to-r from-brand-coral to-brand-gold text-brand-dusk shadow-glow"
                    : "border-[rgba(var(--card-border),0.8)] bg-[rgb(var(--card))] text-brand-dusk hover:border-brand-gold/80 dark:text-white/80 dark:hover:text-white",
            ].join(" ")}
            aria-pressed={!!active}
        >
            {children}
        </button>
    );
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

export default function PartySpinMachine({
    slots,
    locks,
    votes,
    isSpinning,
    iAmHost,
    memberId,
    recent,
    slotCategories,
    onCategoryChange,
    onToggleLock,
    onSendVote,
    onGroupSpin,
    onReroll,
    powerups,
    onPowerupToggle,
}: PartySpinMachineProps) {
    const SpinCard = ({ slot, idx }: { slot: Dish | null; idx: 0 | 1 | 2 }) => {
        const v = votes[idx];
        const myId = memberId || "";
        const iVotedKeep = v.keep.has(myId);
        const iVotedReroll = v.reroll.has(myId);

        return (
            <div className="relative flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white/90 p-3 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md min-h-[200px]">
                <div className="flex-1 mb-2">
                    <div className="text-base md:text-lg font-semibold tracking-tight text-[#0F1C24] line-clamp-2">
                        {slot?.name ?? "No selection."}
                    </div>
                    {slot && (
                        <div className="mt-1 text-xs md:text-sm font-medium text-[#48606c]">
                            {slot.category}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={() => onToggleLock(idx)}
                        disabled={!iAmHost}
                        className={[
                            "w-full rounded-full border px-3 py-1.5 text-sm font-semibold transform transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:scale-[1.05] active:scale-[0.97]",
                            locks[idx]
                                ? "border-transparent bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md hover:shadow-lg"
                                : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-900",
                            !iAmHost && "opacity-50 cursor-not-allowed hover:translate-y-0 hover:scale-100"
                        ].join(" ")}
                        title={iAmHost ? (locks[idx] ? "Unlock" : "Lock") : "Host only"}
                    >
                        {locks[idx] ? <><Unlock className="h-4 w-4 inline mr-1" /> Unlock</> : <><Lock className="h-4 w-4 inline mr-1" /> Lock</>}
                    </button>

                    {slot && (
                        <>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onSendVote(idx, "keep")}
                                    disabled={!memberId}
                                    className={[
                                        "flex-1 rounded-full border px-2 py-1 text-xs transition-colors font-medium",
                                        iVotedKeep
                                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                            : "border-neutral-200 bg-white text-neutral-600 hover:border-emerald-300 hover:bg-emerald-50",
                                    ].join(" ")}
                                >
                                    <ThumbsUp className="h-3 w-3 inline mr-1" /> {v.keep.size}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onSendVote(idx, "reroll")}
                                    disabled={!memberId}
                                    className={[
                                        "flex-1 rounded-full border px-2 py-1 text-xs transition-colors font-medium",
                                        iVotedReroll
                                            ? "border-red-400 bg-red-50 text-red-700"
                                            : "border-neutral-200 bg-white text-neutral-600 hover:border-red-300 hover:bg-red-50",
                                    ].join(" ")}
                                >
                                    <RotateCcwIcon className="h-3 w-3 inline mr-1" /> {v.reroll.size}
                                </button>
                            </div>

                            <a
                                target="_blank"
                                rel="noreferrer"
                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(slot.ytQuery || `${slot.name} recipe`)}`}
                                className="block w-full text-center rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
                            >
                                YouTube
                            </a>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Power-Ups Section */}
            <Card>
                <Ribbon>Power-Ups</Ribbon>
                <div className="flex flex-wrap gap-2">
                    <ToggleChip
                        active={!!powerups.healthy}
                        onClick={() => onPowerupToggle("healthy")}
                    >
                        Healthy
                    </ToggleChip>
                    <ToggleChip
                        active={!!powerups.cheap}
                        onClick={() => onPowerupToggle("cheap")}
                    >
                        Cheap
                    </ToggleChip>
                    <ToggleChip
                        active={!!powerups.fast}
                        onClick={() => onPowerupToggle("fast")}
                    >
                        ≤30m
                    </ToggleChip>
                </div>
            </Card>

            {/* Slot Machine Frame - match solo slot machine styling */}
            <div className="relative overflow-hidden rounded-3xl border-4 border-[#1F4F61] bg-[#0F1C24] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
                {/* marquee lights */}
                <div className="absolute inset-x-6 top-4 flex justify-between">
                    {Array.from({ length: 8 }, (_, i) => (
                        <span
                            key={i}
                            className="h-2 w-8 rounded-full bg-[#F1C04F] shadow-[0_0_10px_rgba(241,192,79,0.8)] animate-pulse"
                            style={{ animationDelay: `${i * 120}ms` }}
                        />
                    ))}
                </div>

                {/* Machine Header */}
                <div className="mb-8 mt-6" />

                {/* Reels Container */}
                <div className="mb-6 rounded-2xl border-2 border-[#2B6D82] bg-[#123040] p-6 shadow-inner">
                    <div className="grid gap-4 md:grid-cols-3">
                        {[0, 1, 2].map((idx) => {
                            const slotCat = slotCategories?.[idx] || ["Breakfast", "Lunch", "Dinner"][idx];
                            return (
                                <div key={idx} className="flex flex-col items-center gap-2">
                                    {/* Category selector dropdown */}
                                    {onCategoryChange && (
                                        <select
                                            value={slotCat}
                                            onChange={(e) => onCategoryChange(idx, e.target.value)}
                                            disabled={isSpinning}
                                            className="w-full rounded-lg border border-[#2B6D82] bg-[#0F1C24] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1F4F61] focus:outline-none focus:ring-2 focus:ring-[#F1C04F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="Breakfast">🍳 Breakfast</option>
                                            <option value="Lunch">🥗 Lunch</option>
                                            <option value="Dinner">🍽️ Dinner</option>
                                            <option value="Dessert">🍰 Dessert</option>
                                            <option value="Snack">🍿 Snack</option>
                                        </select>
                                    )}
                                    <div className="w-full rounded-2xl border-2 border-[#1F4F61] bg-gradient-to-b from-[#1F4F61] to-[#123040] p-4 shadow-[0_8px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.45)] transition-shadow">
                                        <SpinCard slot={slots[idx as 0 | 1 | 2]} idx={idx as 0 | 1 | 2} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Spin Controls - moved below cards */}
                <div className="space-y-4 rounded-2xl border-2 border-[#2B6D82] bg-[#2B6D82] p-5 shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
                    <div className="flex flex-col items-center gap-3">
                        <button
                            type="button"
                            disabled={!memberId || isSpinning || !iAmHost}
                            onClick={onGroupSpin}
                            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#E5623A] bg-[#E5623A] px-8 py-3 text-base font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:scale-110 hover:shadow-[0_14px_30px_rgba(0,0,0,0.5)] active:scale-95 transition-all disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-400 disabled:text-neutral-700 disabled:hover:translate-y-0 disabled:hover:scale-100"
                            title={iAmHost ? "Spin for the group" : "Host only"}
                        >
                            <Shuffle className="h-5 w-5" /> {isSpinning ? "SPINNING..." : "✨ SPIN!"}
                        </button>
                        <button
                            type="button"
                            disabled={!memberId || isSpinning || !iAmHost}
                            onClick={onReroll}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition-colors disabled:opacity-50"
                            title={iAmHost ? "Re-run spin" : "Host only"}
                        >
                            <RotateCcw className="h-4 w-4" /> Re-roll
                        </button>
                    </div>
                    <p className="text-xs text-white/80 text-center font-semibold">
                        {!iAmHost ? "Host controls the spin" : isSpinning ? "Spinning..." : "Lock your favorites and spin again!"}
                    </p>
                </div>
            </div>

            {/* Recent Spins */}
            <Card>
                <Ribbon>Recent spins</Ribbon>
                <div className="text-xs text-neutral-600 dark:text-neutral-300">
                    {recent.length
                        ? recent.map((s, i) => <div key={i}>{s}</div>)
                        : "Host rebroadcasts latest result to newcomers."}
                </div>
            </Card>
        </div>
    );
}
