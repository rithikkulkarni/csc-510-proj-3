import React from 'react';

type CardProps = {
    children: React.ReactNode;
    className?: string;
};

export function Card({ children, className = "" }: CardProps) {
    return (
        <div className={`rounded-lg border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800 ${className}`}>
            {children}
        </div>
    );
}
