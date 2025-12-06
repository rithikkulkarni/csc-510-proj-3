import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock useUser hook and next/navigation
vi.mock('@/app/context/UserContext', () => ({
    useUser: () => ({ user: { name: 'Tester' }, refreshUser: vi.fn() })
}));
vi.mock('next/navigation', () => ({
    useSearchParams: () => ({ get: (_: string) => null }),
}));

import PartyPage from '@/app/(site)/party/page';

describe('Party page smoke', () => {
    it('renders header and code input', async () => {
        render(React.createElement(PartyPage));
        expect(await screen.findByText(/Party Mode/i)).toBeTruthy();
        expect(screen.getByPlaceholderText(/------/)).toBeTruthy();
    });
});
