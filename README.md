# Aureus

A privacy-first money-flow tracker built with React, TypeScript, Vite, and Capacitor. This is an actively used personal project.

## Development

This repository uses **npm only**. The supported local/CI toolchain is Node.js `22.22.3` with npm `10.9.8`; `package-lock.json` is the dependency source of truth.

```bash
npm ci
npm run dev
```

Run the complete local regression gate before submitting changes:

```bash
npm run check
```

The aggregate check runs strict TypeScript checking, ESLint, Vitest, policy tests, a production Vite build, the initial-bundle budget, tracked Android security assertions, and workflow/action-pin validation. Dependency policy is separate because it queries the npm advisory service:

```bash
npm run audit:prod
npm run audit:all
# or both after the aggregate gate:
npm run ci
```

## Android validation

Capacitor 8 requires Java 21 and Android SDK/API 36. With those tools installed:

```bash
npm run build
npx cap sync android
cd android
./gradlew testDebugUnitTest lintDebug assembleDebug bundleRelease
cd ..
node scripts/assert-merged-manifest.mjs \
  android/app/build/intermediates/merged_manifests/debug/processDebugManifest/AndroidManifest.xml
```

The app opts out of Android cloud backup and device transfer because its WebView state contains financial data. User-controlled JSON backup remains available inside the app. Native backup/report exports are temporary files under `cache/aureus-exports/`; the FileProvider exposes only that directory.

## CI artifacts versus releases

The pull-request/main workflow uploads a short-lived **debug APK**. It is diagnostic only: Android signs it with the standard debug key, and it must not be distributed as a release.

The release workflow builds a release **AAB** after all web, audit, Android unit-test, lint, manifest, and release-build gates pass:

- A strict tag `vMAJOR.MINOR.PATCH` derives `versionName=MAJOR.MINOR.PATCH` and sortable `versionCode=MAJOR*1,000,000 + MINOR*1,000 + PATCH`. Tag builds are unsigned by default and are attached to a GitHub Release with an SBOM and SHA-256 checksums.
- Manual runs require explicit `version_name`, positive/monotonically increasing `version_code`, and an `unsigned` or `signed` mode. Repository release history/Play Console remains the authority for monotonicity; the workflow validates syntax and Android limits but cannot infer unpublished store versions.
- An unsigned AAB validates release shrinking and packaging, but it is **not distributable** and cannot be uploaded to Play.

### Protected signing interface

To request `signed` mode, configure these protected repository/environment secrets:

- `AUREUS_ANDROID_KEYSTORE_BASE64`
- `AUREUS_ANDROID_KEYSTORE_PASSWORD`
- `AUREUS_ANDROID_KEY_ALIAS`
- `AUREUS_ANDROID_KEY_PASSWORD`

The workflow fails before Gradle if any required secret is missing. It decodes the keystore only into the runner's temporary directory and passes credentials through Gradle project environment variables; no key or credential is written to the repository or an artifact. Prefer Google Play App Signing and protect manual release approval with a GitHub Environment.

This repository does not publish to Play Store. Play credentials, Play App Signing enrollment, closed-track testing, store metadata, data-safety declarations, and device/emulator acceptance testing are external release prerequisites.
