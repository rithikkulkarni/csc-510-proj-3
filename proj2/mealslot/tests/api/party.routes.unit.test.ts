import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma to deterministic behavior for party routes
vi.mock('@/lib/db', () => {
    const makeModel = () => ({
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'created' }),
        update: vi.fn().mockResolvedValue({ id: 'updated' }),
        delete: vi.fn().mockResolvedValue({}),
        upsert: vi.fn().mockResolvedValue({ id: 'upserted' }),
    });

    const prisma = {
        party: makeModel(),
        partyMember: makeModel(),
        user: makeModel(),
    } as any;

    return { prisma };
});

import * as Join from '@/app/api/party/join/route';
import * as Leave from '@/app/api/party/leave/route';
import * as State from '@/app/api/party/state/route';
import * as Update from '@/app/api/party/update/route';
import * as Spin from '@/app/api/party/spin/route';
import { prisma } from '@/lib/db';

describe('party route unit tests', () => {
    beforeEach(() => vi.clearAllMocks());

    it('join returns 404 when party not found', async () => {
        (prisma.party.findFirst as any).mockResolvedValue(null);
        const req = new Request('http://local', { method: 'POST', body: JSON.stringify({ code: 'ABC123' }) });
        const res = await Join.POST(req as any);
        expect(res.status).toBe(404);
    });

    it('join creates member when party exists', async () => {
        (prisma.party.findFirst as any).mockResolvedValue({ id: 'p1', code: 'ABC123', isActive: true });
        (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', allergens: ['dairy'] });
        (prisma.partyMember.create as any).mockResolvedValue({ id: 'm1' });

        const req = new Request('http://local', { method: 'POST', body: JSON.stringify({ code: 'ABC123', auth_id: 'auth1' }) });
        const res = await Join.POST(req as any);
        expect(res.status).toBe(200);
        const j = await res.json();
        expect(j.partyId).toBe('p1');
        expect(j.memberId).toBe('m1');
    });

    it('leave deletes member and returns ok', async () => {
        const req = new Request('http://local', { method: 'POST', body: JSON.stringify({ memberId: 'm1' }) });
        const res = await Leave.POST(req as any);
        expect(res.status).toBe(200);
        const j = await res.json();
        expect(j.ok).toBe(true);
    });

    it('state returns NOT_FOUND when party missing', async () => {
        (prisma.party.findFirst as any).mockResolvedValue(null);
        const req = new Request('http://local/?code=XXXXXX');
        const res = await State.GET(req as any);
        expect(res.status).toBe(404);
    });

    it('state returns validated party state', async () => {
        (prisma.party.findFirst as any).mockResolvedValue({ id: 'p1', code: 'ABC123', isActive: true, constraintsJson: '{}' });
        (prisma.partyMember.findMany as any).mockResolvedValue([
            { id: 'm1', prefsJson: JSON.stringify({ nickname: 'A' }), user: { allergens: ['soy'] } }
        ]);

        const req = new Request('http://local/?code=ABC123');
        const res = await State.GET(req as any);
        expect(res.status).toBe(200);
        const j = await res.json();
        expect(j.party).toBeDefined();
        expect(Array.isArray(j.members)).toBe(true);
    });

    it('update responds with merged constraints', async () => {
        (prisma.partyMember.findMany as any).mockResolvedValue([{ prefsJson: JSON.stringify({ allergens: [] }) }]);
        const req = new Request('http://local', { method: 'POST', body: JSON.stringify({ partyId: 'p1', memberId: 'm1', prefs: { allergens: [] } }) });
        const res = await Update.POST(req as any);
        expect(res.status).toBe(200);
        const j = await res.json();
        expect(j.merged).toBeDefined();
    });

    it('spin returns three items (fallback path)', async () => {
        // Ensure internal fetch calls fail fast so the fallback menu path is used deterministically
        (globalThis as any).fetch = vi.fn(() => Promise.reject(new Error('network disabled')));

        const req = new Request('http://local', { method: 'POST', body: JSON.stringify({}) });
        const res = await Spin.POST(req as any);
        expect(res.status).toBe(200);
        const j = await res.json();
        expect(Array.isArray(j.selection)).toBe(true);
        expect(j.selection.length).toBe(3);
    });
});
