import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock stack client and actions used by the HomePage
vi.mock('@/stack/client', () => ({
    client: { getUser: () => null }
}));
vi.mock('@/app/actions', () => ({
    getUserDetails: vi.fn().mockResolvedValue(null),
    getAllAllergens: vi.fn().mockResolvedValue([]),
    updateUserDetails: vi.fn().mockResolvedValue(null),
}));

// Render the site page; this is a dynamic default export, but rendering should show static copy
import SitePage from '@/app/(site)/page';

describe('Site home page (light smoke)', () => {
    it('renders header text and basic controls', async () => {
        render(React.createElement(SitePage));

        // Assert some static copy from the header exists
        expect(await screen.findByText(/What should we eat today\?/i)).toBeTruthy();
        expect(screen.getByText(/Categories/i)).toBeTruthy();
    });
});
