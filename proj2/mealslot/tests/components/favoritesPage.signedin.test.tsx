import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock the context before importing the page so module cache sees the mock
vi.mock('@/app/context/UserContext', () => ({
    useUser: () => ({ user: { id: 'u1', savedMeals: ['m1'] }, setUser: vi.fn(), refreshUser: vi.fn() })
}));

// Mock fetch for /api/dishes
(globalThis as any).fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 'm1', name: 'Taco', category: 'Dinner' }]) }));

import SavedMealsPage from '@/app/favorites/page';

describe('SavedMealsPage (signed-in)', () => {
    it('renders saved meal items when user has savedMeals', async () => {
        render(React.createElement(SavedMealsPage));
        await waitFor(() => expect(screen.getByText(/Taco/)).toBeTruthy());
    });
});
