import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => {
    return {
        prisma: {
            dish: { findMany: vi.fn() },
            user: {
                findUnique: vi.fn(),
                update: vi.fn(),
                upsert: vi.fn(),
            },
        },
    };
});

import {
    getAllAllergens,
    getUserDetails,
    updateUserDetails,
    ensureUserInDB,
} from '@/app/actions';
import { prisma } from '@/lib/db';

describe('actions.ts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('normalizes and merges allergens from dishes', async () => {
        (prisma.dish.findMany as any).mockResolvedValue([
            { allergens: '["Peanuts","tree_nut"]' },
            { allergens: '{almond, cashew}' },
            { allergens: null },
        ]);

        const res = await getAllAllergens();
        // expect normalized values, tree_nut -> nuts
        expect(res).toEqual(expect.arrayContaining(['peanuts', 'nuts', 'almond', 'cashew']));
    });

    it('returns null for getUserDetails when no userId provided', async () => {
        const result = await getUserDetails(undefined);
        expect(result).toBeNull();
    });

    it('returns user details when user exists', async () => {
        (prisma.user.findUnique as any).mockResolvedValue({
            id: 'u1',
            auth_id: 'auth1',
            name: 'Alice',
            allergens: ['peanuts'],
            savedMeals: ['meal1'],
        });

        (prisma.dish.findMany as any).mockResolvedValue([]);

        const result = await getUserDetails('auth1');
        expect(result).toMatchObject({
            id: 'u1',
            auth_id: 'auth1',
            name: 'Alice',
            allergens: ['peanuts'],
            savedMeals: ['meal1'],
            allAllergens: [],
        });
    });

    it('updateUserDetails calls update and returns updated details', async () => {
        (prisma.user.update as any).mockResolvedValue({});
        (prisma.user.findUnique as any).mockResolvedValue({
            id: 'u1',
            auth_id: 'auth1',
            name: 'New Name',
            allergens: ['peanuts'],
            savedMeals: [],
        });
        (prisma.dish.findMany as any).mockResolvedValue([]);

        const res = await updateUserDetails('auth1', { name: 'New Name' });
        expect(res).toMatchObject({
            id: 'u1',
            auth_id: 'auth1',
            name: 'New Name',
        });
    });

    it('ensureUserInDB returns null for missing neonUser', async () => {
        const res = await ensureUserInDB(null as any);
        expect(res).toBeNull();
    });

    it('ensureUserInDB upserts and returns user', async () => {
        const mockUser = { id: 'u2', auth_id: 'auth2', name: 'Bob' };
        (prisma.user.upsert as any).mockResolvedValue(mockUser);

        const res = await ensureUserInDB({ id: 'auth2', displayName: 'Bob' });
        expect(res).toEqual(mockUser);
    });
});
