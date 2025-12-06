import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UserProvider, useUser } from '@/app/context/UserContext';

function Checker() {
    const { user, refreshUser } = useUser();
    return (
        <div>
            <span data-testid="has-user">{user ? 'yes' : 'no'}</span>
            <button data-testid="refresh" onClick={() => { void refreshUser(); }} />
        </div>
    );
}

describe('UserContext useUser stub in tests', () => {
    it('returns a safe stub when not wrapped in provider (test env)', () => {
        const { getByTestId } = render(<Checker />);
        expect(getByTestId('has-user').textContent).toBe('no');
    });

    it('provider supplies context to children', () => {
        const { getByTestId } = render(
            <UserProvider>
                <Checker />
            </UserProvider>
        );

        expect(getByTestId('has-user').textContent).toBe('no');
    });
});
