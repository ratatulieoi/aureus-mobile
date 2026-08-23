import { useEffect, useRef } from 'react';

/** Makes the Android/WebView back action dismiss the active transient layer. */
export function useMobileBackDismiss(open: boolean, onDismiss: () => void): void {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const marker = `aureus-layer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const state = { ...(isRecord(window.history.state) ? window.history.state : {}), aureusLayer: marker };
    window.history.pushState(state, '');

    const handlePopState = () => dismissRef.current();
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (isRecord(window.history.state) && window.history.state.aureusLayer === marker) {
        window.history.back();
      }
    };
  }, [open]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
