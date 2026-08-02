import { createRef, lazy } from 'react';
import { act, render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LazyFeature, { FeatureErrorBoundary } from './LazyFeature';

expect.extend(toHaveNoViolations);

afterEach(() => {
  vi.restoreAllMocks();
});

const LazySuccess = lazy(async () => ({ default: () => <p>Modul statistik siap</p> }));

describe('LazyFeature', () => {
  it('announces loading and renders a resolved lazy chunk accessibly', async () => {
    const { container } = render(
      <LazyFeature featureName="Statistik">
        <LazySuccess />
      </LazyFeature>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Memuat statistik');
    expect(await screen.findByText('Modul statistik siap')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders a contained recovery surface after a feature failure', () => {
    const boundary = createRef<FeatureErrorBoundary>();
    const { container } = render(
      <FeatureErrorBoundary ref={boundary} featureName="Laporan">
        <p>Konten laporan</p>
      </FeatureErrorBoundary>,
    );

    act(() => boundary.current?.setState({ error: new Error('chunk unavailable') }));

    expect(screen.getByRole('alert')).toHaveTextContent('Laporan tidak dapat dimuat');
    expect(screen.getByRole('button', { name: 'Muat ulang aplikasi' })).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });
});
