import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';

const script = path.resolve('scripts/derive-version.mjs');

function run(env) {
  return execFileSync(process.execPath, [script], { env: { ...process.env, ...env }, encoding: 'utf8' });
}

test('derives a sortable code from a strict semver tag', () => {
  assert.match(run({ EVENT_NAME: 'push', TAG_NAME: 'v2.15.9' }), /version_code=2015009/);
});

test('accepts an explicit positive manual version code', () => {
  const output = run({ EVENT_NAME: 'workflow_dispatch', INPUT_VERSION_NAME: '3.0.0', INPUT_VERSION_CODE: '3000000' });
  assert.match(output, /version_name=3.0.0/);
  assert.match(output, /version_code=3000000/);
  assert.doesNotMatch(output, /signing=/);
});

test('rejects malformed tags and invalid manual codes', () => {
  for (const env of [
    { EVENT_NAME: 'push', TAG_NAME: 'release-1.0.0' },
    { EVENT_NAME: 'workflow_dispatch', INPUT_VERSION_NAME: '1.0.0', INPUT_VERSION_CODE: '0' },
  ]) {
    assert.notEqual(spawnSync(process.execPath, [script], { env: { ...process.env, ...env } }).status, 0);
  }
});
