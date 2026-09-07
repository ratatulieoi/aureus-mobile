// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!bootstrap) throw new Error('Missing early theme initialization');

describe('startup first paint', () => {
  it.each([
    ['dark', false, 'dark'],
    ['light', true, 'light'],
    [null, true, 'dark'],
    [null, false, 'light'],
    ['invalid', true, 'dark'],
  ])('uses stored theme %s with device dark mode %s', (stored, prefersDark, expected) => {
    const add = vi.fn();
    const getItem = vi.fn(() => stored);
    const setItem = vi.fn();
    runInNewContext(bootstrap, {
      window: {
        localStorage: { getItem, setItem },
        matchMedia: () => ({ matches: prefersDark }),
      },
      document: { documentElement: { classList: { add } } },
    });
    expect(getItem).toHaveBeenCalledWith('theme');
    expect(add).toHaveBeenCalledExactlyOnceWith(expected);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('still applies the device theme when access to storage throws', () => {
    const add = vi.fn();
    runInNewContext(bootstrap, {
      window: {
        get localStorage() { throw new Error('Storage unavailable'); },
        matchMedia: () => ({ matches: true }),
      },
      document: { documentElement: { classList: { add } } },
    });
    expect(add).toHaveBeenCalledExactlyOnceWith('dark');
  });

  it('falls back to light when device theme detection is unavailable', () => {
    const add = vi.fn();
    runInNewContext(bootstrap, {
      window: { localStorage: { getItem: () => null } },
      document: { documentElement: { classList: { add } } },
    });
    expect(add).toHaveBeenCalledExactlyOnceWith('light');
  });

  it('sets a native-matching fallback and initializes the theme before the app loads', () => {
    expect(html).toMatch(/:where\(html\)\s*\{\s*background:\s*#0d110e;/);
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('</head>'));
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('<script type="module"'));
    expect(bootstrap).not.toMatch(/setTimeout|requestAnimationFrame/);
  });
});
