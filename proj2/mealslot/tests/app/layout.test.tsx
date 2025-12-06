import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Header and providers used by the layout so we can render RootLayout
vi.mock('@/components/HeaderClient', () => ({
    default: () => React.createElement('div', { 'data-testid': 'mock-header' }, 'Header'),
}));

vi.mock('@stackframe/stack', () => ({
    StackProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    StackTheme: ({ children }: any) => React.createElement(React.Fragment, null, children),
}));

vi.mock('@/stack/client', () => ({ client: {} }));

vi.mock('@/app/context/UserContext', () => ({
    UserProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
}));

import RootLayout from '@/app/layout';

describe('RootLayout', () => {
    beforeEach(() => {
        // Reset any mocks that may be reused
        vi.resetAllMocks();
    });

    it('renders header and children', () => {
        render(React.createElement(RootLayout, { children: React.createElement('div', null, 'PageBody') }));

        expect(screen.getByTestId('mock-header')).toBeTruthy();
        expect(screen.getByText('PageBody')).toBeTruthy();
    });
});
