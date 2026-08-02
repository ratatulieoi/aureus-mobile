import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, LoaderCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  featureName: string;
  resetKey?: string | number | boolean;
}

interface FeatureErrorBoundaryState {
  error: Error | null;
}

export class FeatureErrorBoundary extends Component<FeatureErrorBoundaryProps, FeatureErrorBoundaryState> {
  state: FeatureErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Lazy feature failed: ${this.props.featureName}`, error, info);
  }

  componentDidUpdate(previousProps: FeatureErrorBoundaryProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <section role="alert" className="rounded-xl border border-destructive/40 bg-card p-6 text-center shadow-sm">
        <AlertCircle aria-hidden="true" className="mx-auto h-7 w-7 text-destructive" />
        <h2 className="mt-3 text-base font-semibold text-foreground">{this.props.featureName} tidak dapat dimuat</h2>
        <p className="mt-2 text-sm text-muted-foreground">Data Anda tetap aman. Muat ulang aplikasi untuk mencoba mengambil modul ini lagi.</p>
        <Button type="button" variant="outline" className="mt-4 min-h-11 gap-2" onClick={() => window.location.reload()}>
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Muat ulang aplikasi
        </Button>
      </section>
    );
  }
}

export const LazyLoadingFallback = ({ featureName }: { featureName: string }) => (
  <div role="status" aria-live="polite" aria-busy="true" className="flex min-h-32 items-center justify-center rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-sm">
    <LoaderCircle aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" />
    Memuat {featureName.toLocaleLowerCase('id-ID')}…
  </div>
);

interface LazyFeatureProps extends FeatureErrorBoundaryProps {
  loadingLabel?: string;
}

const LazyFeature = ({ children, featureName, loadingLabel = featureName, resetKey }: LazyFeatureProps) => (
  <FeatureErrorBoundary featureName={featureName} resetKey={resetKey}>
    <Suspense fallback={<LazyLoadingFallback featureName={loadingLabel} />}>
      {children}
    </Suspense>
  </FeatureErrorBoundary>
);

export default LazyFeature;
