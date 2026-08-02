#!/usr/bin/env node
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const MAX_VERSION_CODE = 2_100_000_000;

const eventName = process.env.EVENT_NAME;
let versionName;
let versionCode;
let signing;

if (eventName === 'push') {
  const tag = process.env.TAG_NAME ?? '';
  versionName = tag.startsWith('v') ? tag.slice(1) : '';
  signing = 'unsigned';
  const match = versionName.match(SEMVER);
  if (!match) fail(`Tag must use vMAJOR.MINOR.PATCH, received ${tag || '(empty)'}`);
  versionCode = encodeVersionCode(match.slice(1).map(Number));
} else if (eventName === 'workflow_dispatch') {
  versionName = process.env.INPUT_VERSION_NAME ?? '';
  signing = process.env.INPUT_SIGNING ?? 'unsigned';
  const match = versionName.match(SEMVER);
  if (!match) fail(`version_name must be MAJOR.MINOR.PATCH, received ${versionName || '(empty)'}`);
  versionCode = Number(process.env.INPUT_VERSION_CODE);
  if (!Number.isSafeInteger(versionCode) || versionCode <= 0 || versionCode > MAX_VERSION_CODE) {
    fail(`version_code must be an integer from 1 through ${MAX_VERSION_CODE}`);
  }
  if (!['unsigned', 'signed'].includes(signing)) fail(`Unsupported signing mode: ${signing}`);
} else {
  fail(`Unsupported event: ${eventName || '(empty)'}`);
}

console.log(`version_name=${versionName}`);
console.log(`version_code=${versionCode}`);
console.log(`signing=${signing}`);

function encodeVersionCode([major, minor, patch]) {
  if (minor > 999 || patch > 999) fail('Tag minor and patch components must be <= 999');
  const code = major * 1_000_000 + minor * 1_000 + patch;
  if (code <= 0 || code > MAX_VERSION_CODE) fail(`Tag-derived versionCode ${code} is outside Android limits`);
  return code;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
