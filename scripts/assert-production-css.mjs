#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDirectory = path.join(root, 'dist', 'assets');
const cssFiles = (await readdir(assetsDirectory)).filter((name) => name.endsWith('.css'));
assert.equal(cssFiles.length, 1, `Expected one production CSS bundle, found ${cssFiles.length}`);

const css = await readFile(path.join(assetsDirectory, cssFiles[0]), 'utf8');
const standardBackdropFilters = count(css, /(?<!-)backdrop-filter\s*:/g);
const webkitBackdropFilters = count(css, /-webkit-backdrop-filter\s*:/g);

assert.ok(standardBackdropFilters > 0, 'Production CSS removed every standard backdrop-filter declaration');
assert.equal(
  standardBackdropFilters,
  webkitBackdropFilters,
  'Production CSS must retain matching standard and WebKit backdrop-filter fallbacks',
);
assert.match(css, /(?<!-)backdrop-filter\s*:\s*blur\(4px\)/);
assert.match(css, /-webkit-backdrop-filter\s*:\s*blur\(4px\)/);

console.log(`Production CSS retained ${standardBackdropFilters} standard and ${webkitBackdropFilters} WebKit backdrop filters.`);

function count(value, expression) {
  return [...value.matchAll(expression)].length;
}
