#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowsDirectory = path.join(root, '.github', 'workflows');
const workflowNames = (await readdir(workflowsDirectory)).filter((name) => /\.ya?ml$/.test(name)).sort();
assert.ok(workflowNames.length >= 2, 'CI and release workflows are required');

const expectedActionPins = new Map([
  ['actions/checkout', '11d5960a326750d5838078e36cf38b85af677262'],
  ['actions/setup-node', '49933ea5288caeca8642d1e84afbd3f7d6820020'],
  ['actions/setup-java', 'd7793b545071e98d581d3bf084a51c3213318a07'],
  ['android-actions/setup-android', '9fc6c4e9069bf8d3d10b2204b1fb8f6ef7065407'],
  ['actions/upload-artifact', 'ea165f8d65b6e75b540449e92b4886f43607fa02'],
  ['actions/download-artifact', 'd3f86a106a0bac45b974a628896c90dbdf5c8093'],
  ['softprops/action-gh-release', '3bb12739c298aeb8a4eeaf626c5b8d85266b0e65'],
]);

for (const name of workflowNames) {
  const filePath = path.join(workflowsDirectory, name);
  const source = await readFile(filePath, 'utf8');
  const document = YAML.parse(source);
  assert.equal(typeof document, 'object', `${name} must parse as YAML`);
  assert.match(source, /runs-on:\s*ubuntu-24\.04/, `${name} must pin the runner image`);
  assert.match(source, /timeout-minutes:/, `${name} must set job timeouts`);
  assert.match(source, /concurrency:/, `${name} must set concurrency policy`);

  for (const match of source.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s*#.*)?$/gm)) {
    const reference = match[1];
    const splitAt = reference.lastIndexOf('@');
    assert.ok(splitAt > 0, `Action reference lacks @ in ${name}: ${reference}`);
    const action = reference.slice(0, splitAt);
    const sha = reference.slice(splitAt + 1);
    assert.match(sha, /^[0-9a-f]{40}$/, `Action is not full-SHA pinned in ${name}: ${reference}`);
    assert.equal(expectedActionPins.get(action), sha, `Unreviewed action pin in ${name}: ${reference}`);
    const line = source.slice(0, match.index).split('\n').length;
    const sourceLine = source.split('\n')[line - 1];
    assert.match(sourceLine, /#\s*v?\d/, `Pinned action needs a version comment in ${name}:${line}`);
  }
}

const ci = await readFile(path.join(workflowsDirectory, 'android-build.yml'), 'utf8');
for (const required of [
  'pull_request:',
  'npm ci',
  'npm run check',
  'npm run audit:prod',
  'npm run audit:all',
  'npx cap sync android',
  'testDebugUnitTest',
  'lintDebug',
  'assembleDebug',
  'assert-merged-manifest.mjs',
  'retention-days: 7',
  'if-no-files-found: error',
]) assert.ok(ci.includes(required), `CI workflow missing: ${required}`);

const release = await readFile(path.join(workflowsDirectory, 'android-release.yml'), 'utf8');
for (const required of [
  'workflow_dispatch:',
  "'v[0-9]+.[0-9]+.[0-9]+'",
  'bundleRelease',
  'lintRelease',
  'SHA256SUMS',
  'AUREUS_ANDROID_KEYSTORE_BASE64',
  'permissions:',
  'contents: write',
  'action-gh-release',
]) assert.ok(release.includes(required), `Release workflow missing: ${required}`);

console.log(`Workflow YAML and ${expectedActionPins.size} reviewed action pins validated.`);
