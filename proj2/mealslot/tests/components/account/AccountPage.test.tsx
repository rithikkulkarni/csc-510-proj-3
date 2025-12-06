import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock AccountSettings from @stackframe/stack
vi.mock('@stackframe/stack', () => ({
    AccountSettings: ({ fullPage, extraItems }: any) => (
        <div>
            <div data-testid="account-fullpage">{String(!!fullPage)}</div>
            <div data-testid="extra-items">{extraItems?.map((i: any) => i.title).join(',')}</div>
        </div>
    ),
}));

// Mock client.getUser and updateUserDetails so the sync effect won't throw
vi.mock('@/stack/client', () => ({
    client: { getUser: vi.fn().mockResolvedValue({ id: 'u1', displayName: 'Tester' }) }
}));
vi.mock('@/app/actions', () => ({
    updateUserDetails: vi.fn().mockResolvedValue({})
}));

import AccountPage from '@/app/account/page';

describe('AccountPage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('renders AccountSettings and includes Dietary Preferences item', async () => {
        render(React.createElement(AccountPage));
        expect(await screen.findByTestId('account-fullpage')).toBeTruthy();
        expect(screen.getByTestId('extra-items').textContent).toContain('Dietary Preferences');
    });
});
