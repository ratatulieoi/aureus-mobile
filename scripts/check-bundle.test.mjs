import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkBundle } from './check-bundle.mjs';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aureus-bundle-'));
  await mkdir(path.join(root, 'dist', '.vite'), { recursive: true });
  await mkdir(path.join(root, 'dist', 'assets'), { recursive: true });
  await writeFile(path.join(root, 'dist', '.vite', 'manifest.json'), JSON.stringify({
    'index.html': { file: 'assets/index.js', isEntry: true, imports: ['_vendor.js'], dynamicImports: ['src/Lazy.tsx'] },
    '_vendor.js': { file: 'assets/vendor.js' },
    'src/Lazy.tsx': { file: 'assets/lazy.js', isDynamicEntry: true },
  }));
  await writeFile(path.join(root, 'dist', 'assets', 'index.js'), 'entry');
  await writeFile(path.join(root, 'dist', 'assets', 'vendor.js'), 'vendor');
  await writeFile(path.join(root, 'dist', 'assets', 'lazy.js'), 'x'.repeat(1000));
  return root;
}

test('counts entry/static imports but permits separately loaded lazy chunks', async () => {
  const result = await checkBundle({
    root: await fixture(),
    budgets: { initialJavaScriptBytes: 20, initialJavaScriptGzipBytes: 100, singleJavaScriptChunkBytes: 20 },
  });
  assert.deepEqual(result.chunks.map(({ file }) => file), ['assets/index.js', 'assets/vendor.js']);
  assert.equal(result.failures.length, 0);
});

test('reports an enforceable initial-entry budget failure', async () => {
  const result = await checkBundle({
    root: await fixture(),
    budgets: { initialJavaScriptBytes: 5, initialJavaScriptGzipBytes: 5, singleJavaScriptChunkBytes: 5 },
  });
  assert.ok(result.failures.some((failure) => failure.startsWith('initial JavaScript')));
  assert.ok(result.failures.some((failure) => failure.startsWith('initial gzip JavaScript')));
  assert.ok(result.failures.some((failure) => failure.includes('per-chunk')));
});
