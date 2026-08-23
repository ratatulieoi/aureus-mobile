import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BrandMark from './BrandMark';

describe('BrandMark', () => {
  it('renders the approved three-part Aureus mark as decorative by default', () => {
    const { container } = render(<BrandMark data-testid="brand-mark" />);
    const mark = screen.getByTestId('brand-mark');
    expect(mark).toHaveAttribute('viewBox', '0 0 66 100');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('path')).toHaveLength(3);
  });

  it('supports an accessible title when the mark carries meaning', () => {
    render(<BrandMark title="Aureus" />);
    expect(screen.getByRole('img', { name: 'Aureus' })).toBeInTheDocument();
  });
});
