#!/usr/bin/env node
import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath, encoding = 'utf8') => readFile(path.join(root, relativePath), encoding);

const [html, css, manifestSource, markSource, appIconSource, headerSource, markComponentSource, favicon] = await Promise.all([
  read('index.html'),
  read('src/index.css'),
  read('public/site.webmanifest'),
  read('public/brand/aureus-mark.svg'),
  read('public/brand/aureus-app-icon.svg'),
  read('src/components/Header.tsx'),
  read('src/components/BrandMark.tsx'),
  read('public/favicon.ico', null),
]);

assert.match(html, /<meta\s+name="theme-color"\s+content="#0d110e"\s*\/>/);
assert.match(html, /href="\/favicon\.ico"/);
assert.match(html, /href="\/brand\/aureus-app-icon\.svg"/);
assert.match(html, /href="\/apple-touch-icon\.png"/);
assert.match(html, /href="\/site\.webmanifest"/);

const manifest = JSON.parse(manifestSource);
assert.equal(manifest.name, 'Aureus');
assert.equal(manifest.background_color, '#0d110e');
assert.equal(manifest.theme_color, '#0d110e');
assert.deepEqual(manifest.icons.map(({ src }) => src), ['/icon-192.png', '/icon-512.png', '/brand/aureus-app-icon-1024.png']);

for (const [token, value] of [
  ['--brand-lime', '63 62% 66%'],
  ['--brand-ink', '135 13% 6%'],
  ['--brand-paper', '40 33% 95%'],
]) {
  assert.match(css, new RegExp(`${escapeRegExp(token)}:\\s*${escapeRegExp(value)}`));
}
assert.match(headerSource, /<BrandMark\s*\/>/);
assert.equal(count(markComponentSource, /<path\s+d=/g), 3, 'In-app Aureus mark must retain exactly three pieces');
assert.equal(count(markSource, /<path\s+d=/g), 3, 'Public Aureus mark must retain exactly three pieces');
assert.match(appIconSource, /#0d110e/i);
assert.match(appIconSource, /#d7df70/i);
assert.ok(favicon.length > 1_000, 'Favicon must contain rendered Aureus artwork');

for (const relativePath of [
  'public/apple-touch-icon.png',
  'public/icon-192.png',
  'public/icon-512.png',
  'public/brand/aureus-app-icon-1024.png',
]) {
  const file = await stat(path.join(root, relativePath));
  assert.ok(file.size > 1_000, `${relativePath} must contain rendered Aureus artwork`);
}

for (const removedTemplateFile of ['public/placeholder.svg', 'src/App.css']) {
  await assert.rejects(access(path.join(root, removedTemplateFile)), undefined, `${removedTemplateFile} must stay removed`);
}

for (const source of [html, css, manifestSource, markSource, appIconSource, headerSource, markComponentSource]) {
  assert.doesNotMatch(source, /lovable|#26a69a|#646cff|#61dafb/i);
}

console.log('Aureus web branding assertions passed.');

function count(value, expression) {
  return [...value.matchAll(expression)].length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
