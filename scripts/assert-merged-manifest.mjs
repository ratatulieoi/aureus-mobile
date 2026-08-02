#!/usr/bin/env node
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('Usage: node scripts/assert-merged-manifest.mjs <merged AndroidManifest.xml>');
  process.exit(2);
}

await access(manifestPath);
const manifest = await readFile(manifestPath, 'utf8');
const application = tag(manifest, 'application');
const provider = [...manifest.matchAll(/<provider\b[\s\S]*?>/g)]
  .map((match) => match[0])
  .find((entry) => attribute(entry, 'android:name') === 'androidx.core.content.FileProvider');

assert.equal(attribute(application, 'android:allowBackup'), 'false', 'Merged manifest enabled backup');
assert.match(manifest, /<uses-permission\s+android:name="android\.permission\.RECORD_AUDIO"/);
assert.ok(provider, 'Merged FileProvider is missing');
assert.equal(attribute(provider, 'android:exported'), 'false', 'Merged FileProvider is exported');
assert.equal(attribute(provider, 'android:grantUriPermissions'), 'true');
assert.equal(attribute(provider, 'android:authorities'), 'com.aureus.moneytracking.fileprovider');

console.log(`Merged manifest security assertions passed: ${path.normalize(manifestPath)}`);

function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}\\b[\\s\\S]*?>`));
  assert.ok(match, `<${name}> not found`);
  return match[0];
}

function attribute(xmlTag, name) {
  return xmlTag.match(new RegExp(`${escapeRegExp(name)}="([^"]+)"`))?.[1];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
