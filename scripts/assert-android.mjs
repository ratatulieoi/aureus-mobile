#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');

const [manifest, filePaths, legacyRules, extractionRules, exportAdapter, buildGradle, styles, api27Styles, capacitorConfig, launcherBackground, adaptiveIcon, adaptiveRoundIcon, vectorForeground] = await Promise.all([
  read('android/app/src/main/AndroidManifest.xml'),
  read('android/app/src/main/res/xml/file_paths.xml'),
  read('android/app/src/main/res/xml/backup_rules.xml'),
  read('android/app/src/main/res/xml/data_extraction_rules.xml'),
  read('src/platform/export-file.ts'),
  read('android/app/build.gradle'),
  read('android/app/src/main/res/values/styles.xml'),
  read('android/app/src/main/res/values-v27/styles.xml'),
  read('capacitor.config.ts'),
  read('android/app/src/main/res/values/ic_launcher_background.xml'),
  read('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml'),
  read('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml'),
  read('android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml'),
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
assert.match(manifest, /android:name="android\.permission\.SCHEDULE_EXACT_ALARM"\s+tools:node="remove"/);
assert.match(manifest, /xmlns:tools="http:\/\/schemas\.android\.com\/tools"/);

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

assert.match(buildGradle, /minifyEnabled\s*=\s*false/, 'Release bytecode shrinking can break reflected Capacitor permission entry points');
assert.match(buildGradle, /shrinkResources\s*=\s*false/, 'Release resources must remain aligned with the unshrunk native graph');
assert.doesNotMatch(buildGradle, /minifyEnabled\s*=\s*true/);
assert.doesNotMatch(buildGradle, /shrinkResources\s*=\s*true/);
assert.match(buildGradle, /proguard-android-optimize\.txt/);
assert.match(buildGradle, /AUREUS_VERSION_CODE/);
assert.match(buildGradle, /AUREUS_VERSION_NAME/);
assert.doesNotMatch(styles, /android:windowLayoutInDisplayCutoutMode/, 'API 24 base styles cannot use the API 27 cutout attribute');
assert.equal(count(api27Styles, /android:windowLayoutInDisplayCutoutMode">always</g), 2);
assert.match(
  api27Styles,
  /<style name="AppTheme\.NoActionBar" parent="Theme\.AppCompat\.DayNight\.NoActionBar">[\s\S]*?<item name="windowActionBar">false<\/item>[\s\S]*?<item name="windowNoTitle">true<\/item>/,
  'API 27+ must preserve the no-ActionBar parent instead of falling back to AppTheme',
);
assert.match(
  api27Styles,
  /<style name="AppTheme\.NoActionBarLaunch" parent="Theme\.SplashScreen">/,
  'API 27+ must preserve the splash theme parent',
);
assert.match(capacitorConfig, /SystemBars:[\s\S]*insetsHandling:\s*['"]css['"]/);
assert.match(capacitorConfig, /LocalNotifications:[\s\S]*presentationOptions:\s*\[['"]sound['"],\s*['"]banner['"],\s*['"]list['"]\]/);

assert.match(styles, /colorPrimary">#D7DF70</);
assert.match(styles, /colorPrimaryDark">#0D110E</);
assert.match(styles, /android:statusBarColor">#0D110E</);
assert.match(styles, /android:navigationBarColor">#0D110E</);
assert.match(launcherBackground, /<color\s+name="ic_launcher_background">#0D110E<\/color>/);
for (const adaptive of [adaptiveIcon, adaptiveRoundIcon]) {
  assert.match(adaptive, /<background\s+android:drawable="@color\/ic_launcher_background"\s*\/>/);
  assert.match(adaptive, /<foreground\s+android:drawable="@mipmap\/ic_launcher_foreground"\s*\/>/);
}
assert.match(vectorForeground, /android:fillColor="#D7DF70"/);
assert.doesNotMatch(vectorForeground, /M66\.94,46\.02/, 'Default Android launcher artwork must not return');

const brandedRasterDirectories = [
  'drawable',
  'drawable-land-hdpi',
  'drawable-land-mdpi',
  'drawable-land-xhdpi',
  'drawable-land-xxhdpi',
  'drawable-land-xxxhdpi',
  'drawable-port-hdpi',
  'drawable-port-mdpi',
  'drawable-port-xhdpi',
  'drawable-port-xxhdpi',
  'drawable-port-xxxhdpi',
  'mipmap-hdpi',
  'mipmap-mdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi',
];
for (const directory of brandedRasterDirectories) {
  const entries = await readdir(path.join(root, 'android/app/src/main/res', directory));
  assert.ok(entries.some((entry) => entry === 'splash.png' || entry === 'ic_launcher.png'), `${directory} must retain its Aureus raster asset`);
}

console.log('Tracked Android privacy, security, and branding assertions passed.');

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
