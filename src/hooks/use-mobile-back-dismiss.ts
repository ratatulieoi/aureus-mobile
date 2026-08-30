import { useEffect, useRef } from 'react';

const HISTORY_GUARD_KEY = 'aureusLayerGuard';

interface BackLayer {
  id: symbol;
  dismiss: () => void;
}

const layers: BackLayer[] = [];
let guardToken: string | null = null;
let releaseTimer: number | null = null;
let listening = false;

/** Makes the Android/WebView back action dismiss the topmost transient layer. */
export function useMobileBackDismiss(open: boolean, onDismiss: () => void): void {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const layer: BackLayer = { id: Symbol('aureus-back-layer'), dismiss: () => dismissRef.current() };
    registerLayer(layer);
    return () => unregisterLayer(layer.id);
  }, [open]);
}

function registerLayer(layer: BackLayer): void {
  if (releaseTimer !== null) {
    window.clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  layers.push(layer);
  ensureListener();
  ensureHistoryGuard();
}

function unregisterLayer(id: symbol): void {
  const index = layers.findIndex((layer) => layer.id === id);
  if (index >= 0) layers.splice(index, 1);
  if (layers.length === 0) scheduleGuardRelease();
}

function ensureListener(): void {
  if (listening) return;
  window.addEventListener('popstate', handlePopState);
  listening = true;
}

function removeListener(): void {
  if (!listening) return;
  window.removeEventListener('popstate', handlePopState);
  listening = false;
}

function ensureHistoryGuard(): void {
  if (guardToken !== null || layers.length === 0) return;
  const state = isRecord(window.history.state) ? window.history.state : {};
  guardToken = `aureus-layer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.history.pushState({ ...state, [HISTORY_GUARD_KEY]: guardToken }, '');
}

function scheduleGuardRelease(): void {
  if (releaseTimer !== null) window.clearTimeout(releaseTimer);
  releaseTimer = window.setTimeout(() => {
    releaseTimer = null;
    if (layers.length > 0) {
      ensureHistoryGuard();
      return;
    }
    const token = guardToken;
    guardToken = null;
    removeListener();
    if (token !== null && isRecord(window.history.state) && window.history.state[HISTORY_GUARD_KEY] === token) {
      window.history.back();
    }
  }, 0);
}

function handlePopState(event: PopStateEvent): void {
  if (guardToken === null) return;
  const nextToken = isRecord(event.state) ? event.state[HISTORY_GUARD_KEY] : undefined;
  if (nextToken === guardToken) return;

  guardToken = null;
  const topLayer = layers.at(-1);
  topLayer?.dismiss();

  window.setTimeout(() => {
    if (layers.length > 0) ensureHistoryGuard();
    else removeListener();
  }, 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
