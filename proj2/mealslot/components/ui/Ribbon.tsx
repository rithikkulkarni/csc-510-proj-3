import React from 'react';

type RibbonProps = {
    children: React.ReactNode;
    className?: string;
};

export function Ribbon({ children, className = "" }: RibbonProps) {
    return (
        <h3 className={`mb-3 text-lg font-bold text-neutral-900 dark:text-white ${className}`}>
            {children}
        </h3>
    );
}
