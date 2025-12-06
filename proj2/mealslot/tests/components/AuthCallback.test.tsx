import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';

vi.mock('@/stack/client', () => ({
    client: { getUser: vi.fn() },
}));

vi.mock('@/app/actions', () => ({
    ensureUserInDB: vi.fn(),
    getUserDetails: vi.fn(),
}));

// Shared router/search mocks so the test and component see the same spies
const routerReplace = vi.fn();
let searchGet = (k: string) => null;
vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: routerReplace }),
    useSearchParams: () => ({ get: (k: string) => searchGet(k) }),
}));

// Mock useUser from context to provide refreshUser
const refreshStub = vi.fn();
vi.mock('@/app/context/UserContext', () => ({
    useUser: () => ({ refreshUser: refreshStub }),
}));

import AuthCallbackPage from '../../app/auth/callback/page';
import { client } from '../../stack/client';
import * as actions from '../../app/actions';

describe('AuthCallbackPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('redirects to / when client.getUser returns null', async () => {
        (client.getUser as any).mockResolvedValue(null);
        searchGet = () => null;

        render(<AuthCallbackPage />);

        await waitFor(() => {
            expect(routerReplace).toHaveBeenCalledWith('/');
        });

        expect(actions.ensureUserInDB).not.toHaveBeenCalled();
    });

    // it('calls ensureUserInDB and redirects to /account on signup action', async () => {
    //     // configure mocks for signup scenario
    //     searchGet = (k: string) => (k === 'action' ? 'signup' : null);
    //     (client.getUser as any).mockResolvedValue({ id: 'authx', displayName: 'Z' });
    //     (actions.ensureUserInDB as any).mockResolvedValue({ id: 'uX', auth_id: 'authx' });
    //     (actions.getUserDetails as any).mockResolvedValue({ id: 'uX', name: 'Z' });

    //     render(<AuthCallbackPage />);

    //     await waitFor(() => {
    //         expect(actions.ensureUserInDB).toHaveBeenCalled();
    //         expect(routerReplace).toHaveBeenCalledWith('/account');
    //     });
    // });
});
