import React from 'react';
import { describe, it, expect, vi } from 'vitest';

// Mock server and actions before importing HeaderServer
vi.mock('@/stack/server', () => ({
    server: { getUser: vi.fn().mockResolvedValue({ id: 'u1', displayName: 'Alice' }) }
}));
vi.mock('@/app/actions', () => ({
    ensureUserInDB: vi.fn().mockResolvedValue({ id: 'u1', name: 'Alice' }),
    getUserDetails: vi.fn().mockResolvedValue({ id: 'u1', name: 'Alice', extra: 'profile' })
}));
// Mock fonts used by HeaderClient to avoid runtime errors
vi.mock('next/font/google', () => ({
    Bungee: (opts: any) => ({ className: 'bungee' }),
    Sora: (opts: any) => ({ className: 'sora' }),
}));

import HeaderServer from '../../components/HeaderServer';

describe('HeaderServer', () => {
    it.skip('returns a HeaderClient element with serverUser prop when server user exists', async () => {
        const el: any = await HeaderServer();
        expect(el).toBeTruthy();
        // The server component returns <HeaderClient serverUser={serverUser} />
        expect(el.props).toBeDefined();
        expect(el.props.serverUser).toEqual({ id: 'u1', name: 'Alice', extra: 'profile' });
    });

    it.skip('handles missing server user gracefully', async () => {
        // Remock server to return null by updating the mocked module
        const serverMod = await import('../../stack/server');
        serverMod.stackServerApp.getUser = vi.fn().mockResolvedValue(null);
        const el: any = await HeaderServer();
        expect(el).toBeTruthy();
        expect(el.props.serverUser).toBeNull();
    });
});