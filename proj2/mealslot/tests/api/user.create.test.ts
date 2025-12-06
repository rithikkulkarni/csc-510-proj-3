import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/user/create/route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
    prisma: {
        user: {
            upsert: vi.fn(),
        },
    },
}));

describe('POST /api/user/create', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates a new user with auth_id', async () => {
        const mockUser = {
            id: 'user-uuid-123',
            auth_id: 'auth-123',
            name: 'Test User',
            allergens: [],
            savedMeals: [],
        };

        (prisma.user.upsert as any).mockResolvedValue(mockUser);

        const request = new Request('http://localhost:3000/api/user/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_id: 'auth-123',
                displayName: 'Test User',
            }),
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockUser);
        expect(prisma.user.upsert).toHaveBeenCalledWith({
            where: { auth_id: 'auth-123' },
            update: { name: 'Test User' },
            create: expect.objectContaining({
                auth_id: 'auth-123',
                name: 'Test User',
                allergens: [],
                savedMeals: [],
            }),
        });
    });

    it('returns 400 if auth_id is missing', async () => {
        const request = new Request('http://localhost:3000/api/user/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                displayName: 'Test User',
            }),
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('auth_id is required');
        expect(prisma.user.upsert).not.toHaveBeenCalled();
    });

    it('updates existing user if auth_id already exists', async () => {
        const mockUser = {
            id: 'existing-user-id',
            auth_id: 'auth-456',
            name: 'Updated Name',
            allergens: ['dairy'],
            savedMeals: ['meal1'],
        };

        (prisma.user.upsert as any).mockResolvedValue(mockUser);

        const request = new Request('http://localhost:3000/api/user/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_id: 'auth-456',
                displayName: 'Updated Name',
            }),
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.auth_id).toBe('auth-456');
        expect(prisma.user.upsert).toHaveBeenCalled();
    });

    it('handles database errors gracefully', async () => {
        (prisma.user.upsert as any).mockRejectedValue(new Error('Database connection failed'));

        const request = new Request('http://localhost:3000/api/user/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_id: 'auth-789',
                displayName: 'Error User',
            }),
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to create user');
    });
});
