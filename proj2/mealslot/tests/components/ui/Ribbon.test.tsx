import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Ribbon } from '@/components/ui/Ribbon';

describe('Ribbon component', () => {
    it('renders children and applies className', () => {
        render(<Ribbon className="ribbon-x">Featured</Ribbon>);
        expect(screen.getByText(/Featured/)).toBeTruthy();
        const el = screen.getByText(/Featured/);
        expect(el.className).toContain('ribbon-x');
    });
});
