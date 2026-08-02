#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export const BUNDLE_BUDGETS = Object.freeze({
  initialJavaScriptBytes: 500_000,
  initialJavaScriptGzipBytes: 170_000,
  singleJavaScriptChunkBytes: 600_000,
});

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function checkBundle({
  root = rootDirectory,
  budgets = BUNDLE_BUDGETS,
} = {}) {
  const manifestPath = path.join(root, 'dist', '.vite', 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const entry = manifest['index.html'];
  if (!entry?.isEntry || !entry.file) {
    throw new Error(`Vite entry index.html is missing from ${manifestPath}`);
  }

  const initialFiles = collectInitialJavaScript(manifest, 'index.html');
  const chunks = await Promise.all(initialFiles.map(async (file) => {
    const absolutePath = path.join(root, 'dist', file);
    const [metadata, source] = await Promise.all([stat(absolutePath), readFile(absolutePath)]);
    return { file, bytes: metadata.size, gzipBytes: gzipSync(source).byteLength };
  }));
  const totals = chunks.reduce(
    (result, chunk) => ({ bytes: result.bytes + chunk.bytes, gzipBytes: result.gzipBytes + chunk.gzipBytes }),
    { bytes: 0, gzipBytes: 0 },
  );

  const failures = [];
  if (totals.bytes > budgets.initialJavaScriptBytes) {
    failures.push(`initial JavaScript ${formatBytes(totals.bytes)} exceeds ${formatBytes(budgets.initialJavaScriptBytes)}`);
  }
  if (totals.gzipBytes > budgets.initialJavaScriptGzipBytes) {
    failures.push(`initial gzip JavaScript ${formatBytes(totals.gzipBytes)} exceeds ${formatBytes(budgets.initialJavaScriptGzipBytes)}`);
  }
  for (const chunk of chunks) {
    if (chunk.bytes > budgets.singleJavaScriptChunkBytes) {
      failures.push(`${chunk.file} ${formatBytes(chunk.bytes)} exceeds per-chunk ${formatBytes(budgets.singleJavaScriptChunkBytes)}`);
    }
  }

  return { chunks, totals, budgets, failures };
}

function collectInitialJavaScript(manifest, entryKey) {
  const files = new Set();
  const visited = new Set();

  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const record = manifest[key];
    if (!record) throw new Error(`Missing imported manifest record: ${key}`);
    if (record.file?.endsWith('.js')) files.add(record.file);
    for (const importedKey of record.imports ?? []) visit(importedKey);
  }

  visit(entryKey);
  return [...files].sort();
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await checkBundle();
    console.log('Initial JavaScript bundle:');
    for (const chunk of result.chunks) {
      console.log(`  ${chunk.file}: ${formatBytes(chunk.bytes)} (${formatBytes(chunk.gzipBytes)} gzip)`);
    }
    console.log(`  total: ${formatBytes(result.totals.bytes)} (${formatBytes(result.totals.gzipBytes)} gzip)`);
    console.log(`Budgets: ${formatBytes(result.budgets.initialJavaScriptBytes)} initial / ${formatBytes(result.budgets.initialJavaScriptGzipBytes)} initial gzip / ${formatBytes(result.budgets.singleJavaScriptChunkBytes)} per chunk`);
    if (result.failures.length) {
      for (const failure of result.failures) console.error(`Bundle budget failed: ${failure}`);
      process.exitCode = 1;
    } else {
      console.log('Bundle budget passed.');
    }
  } catch (error) {
    console.error(`Bundle budget check failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
