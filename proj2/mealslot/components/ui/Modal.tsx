"use client";

import React, { useEffect, useRef } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Accessible modal dialog:
 * - focus trap
 * - Esc to close
 * - backdrop click to close
 * - aria-modal + labelledby
 */
export default function Modal({ open, title, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFocusRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        // rudimentary focus trap
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href],button,textarea,input,select,[tabindex]:not([tabindex="-1"])',
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          (last as HTMLElement).focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          (first as HTMLElement).focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    // move focus inside
    setTimeout(() => firstFocusRef.current?.focus(), 0);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3"
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 id="dialog-title" className="text-base font-semibold">
            {title}
          </h3>
          <button
            ref={firstFocusRef}
            onClick={onClose}
            aria-label="Close dialog"
            className="
              inline-flex items-center justify-center
              rounded-full border border-neutral-200 bg-white
              px-3 py-1.5 text-xs font-medium text-neutral-800
              shadow-sm transition-all duration-150 ease-out
              hover:-translate-y-0.5 hover:scale-[1.05]
              hover:border-neutral-300 hover:bg-neutral-50
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-orange-400
              focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50
            "
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-4">{children}</div>

        <div className="border-t px-4 py-3 flex justify-end">
          <button
            ref={lastFocusRef}
            onClick={onClose}
            className="
              inline-flex items-center justify-center
              rounded-full border border-transparent
              bg-gradient-to-r from-orange-500 to-rose-500
              px-4 py-1.5 text-xs font-medium text-white
              shadow-sm transition-all duration-150 ease-out
              hover:-translate-y-0.5 hover:scale-[1.05] hover:shadow-md
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-orange-400
              focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50
            "
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
