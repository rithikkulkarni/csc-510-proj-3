// --- path: components/SpinResult.tsx ---
import React from "react";
import { Lock, RefreshCcw, ThumbsUp } from "lucide-react";

type Reel = {
  id?: string;
  name?: string;
  category?: string;
  tags?: any;
  allergens?: any;
  ytQuery?: string;
  slow?: boolean;
  mid?: boolean;
  isHealthy?: boolean;
};
type VoteInfo = {
  keep: number;
  reroll: number;
  majority: number;
  iVotedKeep: boolean;
  iVotedReroll: boolean;
};

type Props = {
  selection: Reel[] | null;
  reels: readonly string[];
  locks: boolean[];
  votes: VoteInfo[];
  countdown: number | null;
  onToggleLock: (idx: number) => void;
  onVoteKeep: (idx: number) => void;
  onVoteReroll: (idx: number) => void;
  disabled?: boolean; // disable actions when not host (buttons still show tallies)
};

function toStrings(x: any): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.map((s) => String(s));
  if (typeof x === "string") {
    const s = x.trim();
    try {
      if ((s.startsWith("[") && s.endsWith("]")) || s.includes('","')) {
        const arr = JSON.parse(s);
        return Array.isArray(arr) ? arr.map((v: any) => String(v)) : [s];
      }
    } catch {}
    if (s.includes(",")) return s.split(",").map((t) => t.trim());
    return [s];
  }
  return [String(x)];
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-neutral-200 bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-neutral-800 shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
      {children}
    </span>
  );
}

export default function SpinResult({
  selection,
  reels,
  locks,
  votes,
  countdown,
  onToggleLock,
  onVoteKeep,
  onVoteReroll,
  disabled,
}: Props) {
  if (!selection || selection.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white/80 p-3 text-sm text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
        No spin yet.
      </div>
    );
  }

  const lockButtonBase =
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transform transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 hover:-translate-y-0.5 hover:scale-[1.05] active:scale-[0.97]";
  const voteButtonBase =
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transform transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 hover:-translate-y-0.5 hover:scale-[1.05] active:scale-[0.97]";
  const chipCountdownBase =
    "ml-auto rounded-full border border-neutral-200 bg-white/80 px-2 py-0.5 text-[11px] text-neutral-700 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {reels.map((label, i) => {
        const d = selection[i] || selection[0];
        const tags = toStrings(d?.tags).map((t) => t.replace(/[_-]/g, " "));
        const allergens = toStrings(d?.allergens).map((t) =>
          t.replace(/[_-]/g, " "),
        );
        const pills: string[] = [];
        if (d?.category) pills.push(d.category);
        if (d?.mid) pills.push("mid");
        if (d?.slow) pills.push("slow");
        if (d?.isHealthy) pills.push("healthy");

        const v: VoteInfo =
          votes[i] ??
          {
            keep: 0,
            reroll: 0,
            majority: 1,
            iVotedKeep: false,
            iVotedReroll: false,
          };

        return (
          <div
            key={label}
            className="rounded-2xl border border-neutral-200 bg-white/90 p-3 shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/70"
          >
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300">
              <div className="font-semibold text-neutral-800 dark:text-neutral-100">
                {label}
              </div>
              <button
                type="button"
                onClick={() => onToggleLock(i)}
                className={[
                  lockButtonBase,
                  locks[i]
                    ? "border-amber-600 bg-amber-600 text-white shadow-sm hover:shadow-md"
                    : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100",
                ].join(" ")}
                title={locks[i] ? "Unlock" : "Lock this slot"}
              >
                <Lock className="h-3.5 w-3.5" />
                {locks[i] ? "Locked" : "Lock"}
              </button>
            </div>

            <div className="mb-2 text-sm md:text-lg font-semibold leading-6 text-neutral-900 dark:text-neutral-100">
              {d?.name ?? "—"}
            </div>

            {pills.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {pills.map((p) => (
                  <Chip key={p}>{p}</Chip>
                ))}
              </div>
            )}

            <div className="mb-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Tags
            </div>
            <div className="mb-2 min-h-[1.5rem]">
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-neutral-500">—</span>
              )}
            </div>

            <div className="mb-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Allergens
            </div>
            <div>
              {allergens.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {allergens.map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-neutral-500">—</span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onVoteKeep(i)}
                disabled={disabled}
                className={[
                  voteButtonBase,
                  v.iVotedKeep
                    ? "border-green-600 bg-green-600 text-white shadow-sm hover:shadow-md disabled:opacity-70"
                    : "border-neutral-200 bg-white text-neutral-800 hover:border-green-400 hover:bg-green-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100",
                ].join(" ")}
                title="Vote to keep this reel"
              >
                <ThumbsUp className="h-3.5 w-3.5" /> Keep ({v.keep}/
                {v.majority})
              </button>

              <button
                type="button"
                onClick={() => onVoteReroll(i)}
                disabled={disabled}
                className={[
                  voteButtonBase,
                  v.iVotedReroll
                    ? "border-amber-600 bg-amber-600 text-white shadow-sm hover:shadow-md disabled:opacity-70"
                    : "border-neutral-200 bg-white text-neutral-800 hover:border-amber-400 hover:bg-amber-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100",
                ].join(" ")}
                title="Vote to re-roll only this reel"
              >
                <RefreshCcw className="h-3.5 w-3.5" /> Re-roll ({v.reroll}/
                {v.majority})
              </button>

              {typeof countdown === "number" && (
                <span className={chipCountdownBase}>
                  Spin in {countdown}
                </span>
              )}
            </div>

            <div className="mt-3">
              <a
                className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/90 px-3 py-1 text-xs font-medium text-neutral-800 shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-red-400 hover:bg-red-50 hover:text-red-700 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-800/80"
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                  d?.ytQuery || d?.name || "recipe",
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Watch on YouTube
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
