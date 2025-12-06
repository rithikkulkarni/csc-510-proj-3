import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Card } from '@/components/ui/Card';

describe('Card component', () => {
    it('renders children and uses wrapper element', () => {
        render(<Card className="custom-class">Hello Card</Card>);
        const child = screen.getByText(/Hello Card/);
        expect(child).toBeTruthy();
        const wrapper = child.parentElement as HTMLElement;
        expect(wrapper).toBeTruthy();
        expect(wrapper.tagName).toBe('DIV');
    });
});
