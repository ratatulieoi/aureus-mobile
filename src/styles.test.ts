// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const buttonSource = readFileSync(new URL('./components/ui/button.tsx', import.meta.url), 'utf8');
const aboutSource = readFileSync(new URL('./components/AboutSection.tsx', import.meta.url), 'utf8');
const budgetSource = readFileSync(new URL('./components/BudgetManager.tsx', import.meta.url), 'utf8');
const bottomNavSource = readFileSync(new URL('./components/BottomNav.tsx', import.meta.url), 'utf8');
const liquidGlassSource = readFileSync(new URL('./components/LiquidGlassFilter.tsx', import.meta.url), 'utf8');
const inputSource = readFileSync(new URL('./components/ui/input.tsx', import.meta.url), 'utf8');
const selectSource = readFileSync(new URL('./components/ui/select.tsx', import.meta.url), 'utf8');
const dialogSource = readFileSync(new URL('./components/ui/dialog.tsx', import.meta.url), 'utf8');

type Hsl = readonly [number, number, number];

const TOKEN_NAMES = [
  'background', 'card', 'foreground', 'primary', 'primary-foreground', 'accent-text',
  'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent',
  'accent-foreground', 'destructive', 'destructive-foreground', 'success',
  'success-foreground', 'ring',
] as const;
type TokenName = typeof TOKEN_NAMES[number];

const NORMAL_TEXT_PAIRS: ReadonlyArray<readonly [TokenName, TokenName]> = [
  ['foreground', 'background'], ['foreground', 'card'], ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'], ['muted-foreground', 'background'], ['muted-foreground', 'card'],
  ['muted-foreground', 'muted'], ['accent-foreground', 'accent'], ['accent-text', 'background'],
  ['accent-text', 'card'], ['destructive', 'background'], ['destructive', 'card'],
  ['destructive-foreground', 'destructive'], ['success', 'background'], ['success', 'card'],
  ['success-foreground', 'success'], ['ring', 'background'],
];

const LIGHT = parseTheme(':root');
const DARK = parseTheme('.dark');

describe('global accessibility CSS', () => {
  it('activates safe-area values and defines safe-area-aware chrome/toast/dialog CSS', () => {
    expect(html).toMatch(/name="viewport"[^>]+viewport-fit=cover/);
    expect(css).toContain('var(--safe-area-inset-top, env(safe-area-inset-top, 0px))');
    expect(css).toContain('var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))');
    for (const utility of ['safe-area-top', 'safe-area-bottom', 'modal-safe-content', 'main-safe-offset', 'pb-nav']) expect(css).toContain(`.${utility}`);
    expect(css).toMatch(/\.modal-safe-content\s*\{[^}]*max-height:\s*calc\(100vh[^;]+;[^}]*max-height:\s*calc\(100dvh/s);
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it.each([['light', LIGHT], ['dark', DARK]] as const)('%s representative opaque token pairs meet WCAG AA for normal text', (_mode, tokens) => {
    for (const [foreground, background] of NORMAL_TEXT_PAIRS) {
      expect(contrast(tokens[foreground], tokens[background]), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('uses AA-safe primary and accent text for meaningful controls', () => {
    expect(contrast(LIGHT.primary, LIGHT.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(LIGHT['primary-foreground'], LIGHT.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(LIGHT['accent-text'], LIGHT.background)).toBeGreaterThanOrEqual(4.5);
    expect(buttonSource).toContain('link: "text-accent-text');
    expect(aboutSource).toContain('hover:text-accent-text');
    expect(budgetSource).toContain('text-accent-text');
  });

  it('keeps the fixed refractive glass navigation layered with a contained active cue', () => {
    expect(css).toMatch(/\.bottom-nav-positioner\s*\{[^}]*position:\s*fixed/s);
    expect(css).toMatch(/\.bottom-nav-liquid\s*\{[^}]*height:\s*60px;[^}]*background:\s*transparent/s);
    expect(css).toMatch(/\.dock-glass-surface::before\s*\{[^}]*z-index:\s*0;[^}]*box-shadow:[^}]*inset 1px 1px/s);
    expect(css).toMatch(/\.dock-glass-surface::after\s*\{[^}]*z-index:\s*-1;[^}]*backdrop-filter:\s*blur\(1px\);[^}]*filter:\s*url\("#container-glass"\)/s);
    expect(css).toMatch(/\.bottom-nav-add\s*\{[^}]*width:\s*56px;[^}]*height:\s*56px;[^}]*border:\s*0;[^}]*background:\s*transparent/s);
    expect(css).toMatch(/\.bottom-nav-add::before\s*\{[^}]*box-shadow:[^}]*inset 1px 1px/s);
    expect(css).toMatch(/\.bottom-nav-add::after\s*\{[^}]*backdrop-filter:\s*blur\(1px\);[^}]*filter:\s*url\("#container-glass"\)/s);
    expect(css).toMatch(/\.dock-glass-destination\[aria-current="page"\]::before,[\s\S]*?\.dock-glass-destination\[data-glass-active="true"\]::before\s*\{[^}]*background-color:\s*rgb\(255 255 255 \/ \.1\);[^}]*box-shadow:[^}]*inset 1px 1px/s);
    expect(css).toMatch(/\.dock-glass-destination\[aria-current="page"\]::after,[\s\S]*?\.dock-glass-destination\[data-glass-active="true"\]::after\s*\{[^}]*backdrop-filter:\s*blur\(1px\);[^}]*filter:\s*url\("#btn-glass"\)/s);
    expect(css).toMatch(/\.app-content\s*\{[^}]*padding-bottom:\s*calc\(/s);
    expect(css).toMatch(/\.dashboard-home\s*\{[^}]*safe-area-inset-bottom/s);
    expect(css).not.toMatch(/\.bottom-nav-liquid\s*\{[^}]*(brand-lime|brand-paper)/s);
    expect(css).not.toMatch(/\.bottom-nav-(?:destination|add)\.is-active/);
    expect(bottomNavSource).toContain('bottom-nav-liquid dock-glass-surface');
    expect(bottomNavSource).toContain('bottom-nav-destination dock-glass-destination');
    expect(bottomNavSource).not.toContain('is-active');
    expect(liquidGlassSource).toContain('id="container-glass"');
    expect(liquidGlassSource).toContain('stitchTiles="stitch"');
    expect(liquidGlassSource).toContain('scale="40"');
    expect(liquidGlassSource).toContain('/brand/liquid-glass-button-map.png');
  });

  it('uses one solid, soft form system without gradients', () => {
    expect(inputSource).toContain('aureus-input');
    expect(inputSource).toContain('rounded-xl');
    expect(inputSource).toContain('var(--home-surface)');
    expect(selectSource).toContain('aureus-select-trigger');
    expect(selectSource).toContain('var(--home-surface)');
    expect(selectSource).not.toContain('liquid-glass-overlay');
    expect(dialogSource).toContain('rounded-2xl');
    expect(dialogSource).toContain('var(--home-surface)');
    expect(css).toMatch(/\.form-field\s*\{[^}]*display:\s*grid;[^}]*gap:/s);
    expect(css).toMatch(/\.form-actions\s*\{[^}]*grid-template-columns:/s);
    expect(css).not.toMatch(/(?:linear|radial|conic)-gradient\(/);
    expect(css).toMatch(/\.month-picker-backdrop\s*\{[^}]*position:\s*fixed;[^}]*background:\s*transparent;/s);
    expect(css).toMatch(/\.month-picker-box\s*\{[^}]*position:\s*fixed;[^}]*border-radius:\s*1\.35rem;[^}]*background:\s*transparent;[^}]*isolation:\s*isolate;/s);
    expect(css).toMatch(/\.month-picker-box::before,[\s\S]*?\.month-picker-box::after\s*\{[^}]*inset:\s*0;[^}]*border-radius:\s*inherit;/s);
    expect(css).toMatch(/\.month-picker-box::after\s*\{[^}]*backdrop-filter:\s*blur\(1px\);[^}]*-webkit-backdrop-filter:\s*blur\(1px\);/s);
    expect(css).not.toMatch(/\.month-picker-box::after\s*\{[^}]*(?<!-)filter\s*:/s);
    expect(css).toMatch(/\.month-picker-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/s);
    expect(css).toMatch(/\.month-picker-destination\s*\{[^}]*min-height:\s*54px;[^}]*border:\s*0;[^}]*background:\s*transparent;/s);
    expect(css).toMatch(/\.month-picker-destination:disabled\s*\{[^}]*opacity:\s*\.35;/s);
    expect(css).toMatch(/\.quick-period-picker\s*\{[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s);
    expect(css).toMatch(/\.liquid-glass-overlay::after\s*\{[^}]*backdrop-filter:\s*blur\(4px\);[^}]*filter:\s*url\("#container-glass"\)/s);
    expect(css).not.toMatch(/\.(?:month-dock|month-picker-row|month-picker-docks|year-trigger|year-list|month-grid)\b/);
    expect(liquidGlassSource).toContain('filterUnits="objectBoundingBox"');
    expect(liquidGlassSource).toMatch(/id="btn-glass"[\s\S]*?x="0"[\s\S]*?y="0"[\s\S]*?width="1"[\s\S]*?height="1"/);
  });

  it('comprehensively disables decorative motion when reduced motion is requested', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('animation-duration: 0.01ms !important');
    expect(css).toContain('transition-duration: 0.01ms !important');
    expect(css).toContain('scroll-behavior: auto !important');
    for (const animation of ['animate-drift', 'animate-float', 'animate-spin', 'animate-pulse']) expect(css).toContain(`.${animation}`);
  });
});

function parseTheme(selector: ':root' | '.dark'): Record<TokenName, Hsl> {
  const escapedSelector = selector === ':root' ? ':root' : '\\.dark';
  const block = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`))?.[1];
  if (!block) throw new Error(`Theme block ${selector} was not found`);
  return Object.fromEntries(TOKEN_NAMES.map((name) => {
    const value = block.match(new RegExp(`--${name}:\\s*(-?[\\d.]+)\\s+(-?[\\d.]+)%\\s+(-?[\\d.]+)%`));
    if (!value) throw new Error(`Token --${name} was not found in ${selector}`);
    return [name, [Number(value[1]), Number(value[2]), Number(value[3])] as Hsl];
  })) as Record<TokenName, Hsl>;
}

function contrast(first: Hsl, second: Hsl) {
  const firstLuminance = luminance(hslToRgb(first));
  const secondLuminance = luminance(hslToRgb(second));
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

function luminance(rgb: readonly number[]) {
  const linear = rgb.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function hslToRgb([hue, saturationPercent, lightnessPercent]: Hsl): readonly number[] {
  const saturation = saturationPercent / 100;
  const lightness = lightnessPercent / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const offset = lightness - chroma / 2;
  const rgb = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return rgb.map((channel) => channel + offset);
}
