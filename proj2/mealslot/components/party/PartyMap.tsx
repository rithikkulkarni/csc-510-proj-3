"use client";

import PlacesMapCard from "@/components/PlacesMapCard";

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

export default function PartyMap() {
    return (
        <Card>
            <Ribbon>Eat Outside</Ribbon>
            <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                Shows restaurants based on your approximate location.
            </p>
            <PlacesMapCard height={300} />
        </Card>
    );
}
