"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Modal from "./ui/Modal";
import { cn } from "./ui/cn";

type GuestModalProps = {
  onGuest?: () => void; // callback when user continues as guest
};

export default function GuestModal({ onGuest }: GuestModalProps) {
  const [open, setOpen] = useState(false);
  const [animate, setAnimate] = useState(false);
  const router = useRouter();
  const AUTO_CLOSE_MS = 8000;

  useEffect(() => {
    const hasSeen = sessionStorage.getItem("guestModalShown");
    if (!hasSeen) {
      setOpen(true);
      sessionStorage.setItem("guestModalShown", "true");

      // small delay so the scale/opacity animation has something to transition from
      setTimeout(() => setAnimate(true), 50);

      const timer = setTimeout(() => handleGuest(), AUTO_CLOSE_MS);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleGuest = () => {
    setAnimate(false);
    setTimeout(() => setOpen(false), 300);
    localStorage.setItem("guestUser", "true");
    if (onGuest) onGuest(); // notify parent
  };

  const handleSignUp = () => {
    setAnimate(false);
    setTimeout(() => {
      setOpen(false);
      router.push("/handler/sign-up");
    }, 300);
  };

  const shellClasses =
    "rounded-2xl border border-neutral-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm";
  const primaryButton =
    "inline-flex items-center justify-center rounded-full border border-transparent bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50";
  const secondaryButton =
    "inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50";

  return (
    <Modal open={open} title="Welcome" onClose={handleGuest}>
      <div
        className={cn(
          shellClasses,
          "transform transition-all duration-300",
          animate ? "opacity-100 scale-100" : "opacity-0 scale-95",
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <p className="text-sm text-neutral-800">
              Continue as a guest to start spinning right away, or sign up to
              save your preferences and sessions.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button onClick={handleGuest} className={secondaryButton}>
              Continue as Guest
            </button>
            <button onClick={handleSignUp} className={primaryButton}>
              Sign Up
            </button>
          </div>

          <p className="mt-1 text-xs text-neutral-500">
            Auto-continuing as guest in{" "}
            <span className="font-medium">
              {AUTO_CLOSE_MS / 1000} seconds…
            </span>
          </p>
        </div>
      </div>
    </Modal>
  );
}
