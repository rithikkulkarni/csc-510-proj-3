"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type GuestBannerProps = {
    urls: {
        signIn: string;
        signUp: string;
    };
    onGuest?: () => void; // <-- added this optional callback
};

export default function GuestBanner({ urls, onGuest }: GuestBannerProps) {
    const [visible, setVisible] = useState(false);
    const [animate, setAnimate] = useState(false);
    const router = useRouter();
    const AUTO_CLOSE_MS = 8000;

    useEffect(() => {
        const hasSeen = sessionStorage.getItem("guestBannerShown");
        if (!hasSeen) {
            setVisible(true);
            sessionStorage.setItem("guestBannerShown", "true");
            setTimeout(() => setAnimate(true), 50);

            const timer = setTimeout(() => handleGuest(), AUTO_CLOSE_MS);
            return () => clearTimeout(timer);
        }
    }, []);

    const closeBannerWithAnimation = (callback?: () => void) => {
        setAnimate(false);
        setTimeout(() => {
            setVisible(false);
            if (callback) callback();
        }, 300);
    };

    const handleGuest = () => {
        localStorage.setItem("guestUser", "true");
        closeBannerWithAnimation(onGuest); // call optional callback
    };

    const handleSignUp = () => closeBannerWithAnimation(() => router.push(urls.signUp));
    const handleLogin = () => closeBannerWithAnimation(() => router.push(urls.signIn));
    const handleDismiss = () => closeBannerWithAnimation();

    if (!visible) return null;

    return (
        <div
            className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg flex flex-col sm:flex-row gap-2 items-center z-50 transition-transform transition-opacity duration-300 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
        >
            <span className="mr-2 text-sm flex-1">
                Sign up or log in to save your progress!
            </span>

            <div className="flex gap-2 items-center">
                <button
                    onClick={handleLogin}
                    className="bg-green-600 hover:bg-green-700 px-4 py-1 rounded transition"
                >
                    Log In
                </button>
                <button
                    onClick={handleSignUp}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded transition"
                >
                    Sign Up
                </button>
                <button
                    onClick={handleGuest}
                    className="bg-gray-500 hover:bg-gray-600 px-4 py-1 rounded transition"
                >
                    Continue as Guest
                </button>
                <button
                    onClick={handleDismiss}
                    className="ml-2 text-gray-300 hover:text-white font-bold px-2 py-1 rounded transition"
                    aria-label="Dismiss"
                >
                    ×
                </button>
            </div>

            <span className="text-xs text-gray-300 mt-2 sm:mt-0 sm:ml-2 hidden sm:inline">
                Auto-continue as guest in {AUTO_CLOSE_MS / 1000}s...
            </span>
        </div>
    );
}
