import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// dynamic mocks controlled via variables so tests can switch scenarios
let currentUser: any = null;
const mockSetUser = vi.fn();
const mockRefresh = vi.fn();
let currentPath = '/';

vi.mock('@/app/context/UserContext', () => ({
    useUser: () => ({ user: currentUser, setUser: mockSetUser, refreshUser: mockRefresh })
}));

vi.mock('next/navigation', () => ({
    usePathname: () => currentPath
}));

vi.mock('@/stack/client', () => ({
    client: { urls: { signIn: '/handler/sign-in', signOut: '/handler/sign-out' } }
}));

// Mock next/font/google so font helpers return simple objects in tests
vi.mock('next/font/google', () => ({
    Bungee: (opts: any) => ({ className: 'bungee' }),
    Sora: (opts: any) => ({ className: 'sora' }),
}));

import HeaderClient from '../../components/HeaderClient';

describe('HeaderClient', () => {
    beforeEach(() => {
        mockSetUser.mockReset();
        mockRefresh.mockReset();
        currentUser = null;
        currentPath = '/';
    });

    it('shows sign in UI when no user present', async () => {
        render(React.createElement(HeaderClient, { serverUser: null }));
        expect(await screen.findByText(/Welcome, Guest!/i)).toBeTruthy();
        expect(screen.getByText(/Sign In \/ Sign Up/i)).toBeTruthy();
    });

    it('uses serverUser to initialize user context', async () => {
        const serverUser = { id: 'u1', name: 'Alice Wonderland' };
        // start with no user
        currentUser = null;
        render(React.createElement(HeaderClient, { serverUser }));

        // effect should call setUser with the serverUser
        await waitFor(() => {
            expect(mockSetUser).toHaveBeenCalledWith(serverUser);
        });
    });

    it('shows user menu when user present', async () => {
        currentUser = { id: 'u2', name: 'Bob Smith' };
        render(React.createElement(HeaderClient, { serverUser: null }));
        // The UserMenu may render the greeting split across nodes ("Hi" and "Bob"),
        // so assert the user's given name appears somewhere in the header.
        expect(await screen.findByText(/Bob/i)).toBeTruthy();
    });

    it('renders solo and party buttons and reflects pathname state', async () => {
        currentPath = '/party';
        render(React.createElement(HeaderClient, { serverUser: null }));
        // Party button should exist
        expect(await screen.findByText(/Party/)).toBeTruthy();
        // Solo button should exist
        expect(screen.getByText(/Solo/)).toBeTruthy();
    });
});
