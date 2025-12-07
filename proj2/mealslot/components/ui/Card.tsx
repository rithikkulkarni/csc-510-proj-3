/**
 * Card
 * ------------------------------------------------------------
 * Reusable presentational wrapper component used throughout the UI.
 * Provides a consistent bordered, padded container with light/dark
 * theme styling, while allowing additional styles via `className`.
 */

import React from "react";

type CardProps = {
    /** Content to be rendered inside the card */
    children: React.ReactNode;
    /** Optional additional CSS classes for customization */
    className?: string;
};

export function Card({ children, className = "" }: CardProps) {
    return (
        <div
            className={`rounded-lg border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800 ${className}`}
        >
            {children}
        </div>
    );
}
