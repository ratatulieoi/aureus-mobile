#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');

const [manifest, filePaths, legacyRules, extractionRules, exportAdapter, buildGradle, styles, api27Styles, capacitorConfig] = await Promise.all([
  read('android/app/src/main/AndroidManifest.xml'),
  read('android/app/src/main/res/xml/file_paths.xml'),
  read('android/app/src/main/res/xml/backup_rules.xml'),
  read('android/app/src/main/res/xml/data_extraction_rules.xml'),
  read('src/platform/export-file.ts'),
  read('android/app/build.gradle'),
  read('android/app/src/main/res/values/styles.xml'),
  read('android/app/src/main/res/values-v27/styles.xml'),
  read('capacitor.config.ts'),
]);

const application = tag(manifest, 'application');
assert.equal(attribute(application, 'android:allowBackup'), 'false', 'Android backup must be disabled');
assert.equal(attribute(application, 'android:fullBackupContent'), '@xml/backup_rules');
assert.equal(attribute(application, 'android:dataExtractionRules'), '@xml/data_extraction_rules');

const activity = tag(manifest, 'activity');
assert.equal(attribute(activity, 'android:windowSoftInputMode'), 'adjustResize');
assert.equal(attribute(activity, 'android:exported'), 'true');

const provider = tag(manifest, 'provider');
assert.equal(attribute(provider, 'android:exported'), 'false', 'FileProvider must remain non-exported');
assert.equal(attribute(provider, 'android:grantUriPermissions'), 'true');
assert.equal(attribute(provider, 'android:authorities'), '${applicationId}.fileprovider');
assert.match(manifest, /<uses-permission\s+android:name="android\.permission\.RECORD_AUDIO"\s*\/>/);

assert.doesNotMatch(filePaths, /<(?:external-path|external-cache-path|files-path|external-files-path)\b/);
assert.doesNotMatch(filePaths, /<cache-path[^>]+path="\.\/?"/);
assert.match(filePaths, /<cache-path\s+name="aureus_exports"\s+path="aureus-exports\/"\s*\/>/);
assert.match(exportAdapter, /NATIVE_EXPORT_DIRECTORY\s*=\s*['"]aureus-exports['"]/);
assert.match(exportAdapter, /recursive:\s*true/);

for (const domain of ['root', 'file', 'database', 'sharedpref', 'external', 'device_root', 'device_file', 'device_database', 'device_sharedpref']) {
  assert.match(legacyRules, new RegExp(`<exclude\\s+domain="${domain}"\\s+path="\\."\\s*/>`));
  assert.equal(count(extractionRules, new RegExp(`<exclude\\s+domain="${domain}"\\s+path="\\."\\s*/>`, 'g')), 2, `${domain} must be excluded from cloud and device transfer`);
}
assert.match(extractionRules, /<cloud-backup>/);
assert.match(extractionRules, /<device-transfer>/);

assert.match(buildGradle, /minifyEnabled\s*=\s*true/);
assert.match(buildGradle, /shrinkResources\s*=\s*true/);
assert.match(buildGradle, /proguard-android-optimize\.txt/);
assert.match(buildGradle, /AUREUS_VERSION_CODE/);
assert.match(buildGradle, /AUREUS_VERSION_NAME/);
assert.doesNotMatch(styles, /android:windowLayoutInDisplayCutoutMode/, 'API 24 base styles cannot use the API 27 cutout attribute');
assert.equal(count(api27Styles, /android:windowLayoutInDisplayCutoutMode">always</g), 2);
assert.match(capacitorConfig, /SystemBars:[\s\S]*insetsHandling:\s*['"]css['"]/);

console.log('Tracked Android privacy/security assertions passed.');

function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}\\b[\\s\\S]*?>`));
  assert.ok(match, `<${name}> not found`);
  return match[0];
}

function attribute(xmlTag, name) {
  return xmlTag.match(new RegExp(`${escapeRegExp(name)}="([^"]+)"`))?.[1];
}

function count(value, expression) {
  return [...value.matchAll(expression)].length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
