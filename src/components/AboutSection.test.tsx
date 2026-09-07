import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import AboutSection from './AboutSection';

expect.extend(toHaveNoViolations);

describe('About Aureus', () => {
  it('shows app identity, storage context, version, and project links', async () => {
    const { container } = render(<AboutSection />);

    expect(screen.getByRole('heading', { name: 'Tentang Aureus' })).toBeInTheDocument();
    expect(screen.getByText('2.5.6')).toBeInTheDocument();
    expect(screen.getByText('Lokal di perangkat')).toBeInTheDocument();
    expect(screen.getByText('Data tetap di perangkat')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /repositori Aureus di GitHub/ })).toHaveAttribute('href', 'https://github.com/ratatulieoi/aureus-mobile');
    expect(screen.getByRole('link', { name: /Instagram @rmeydani_/ })).toHaveAttribute('href', 'https://instagram.com/rmeydani_');
    expect(await axe(container)).toHaveNoViolations();
  });
});
