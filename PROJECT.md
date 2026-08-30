# Aureus agent codebase reference

This file is the single project document for coding agents. It maps the codebase, records the financial-data rules, and names the checks that protect those rules. Source code and configuration remain authoritative when they differ from this file.

## Project identity

Aureus is an Indonesian Rupiah money tracker for the browser and Android. The application records income, expenses, and recurring subscriptions. It also provides statistics, CSV export, printable reports, and JSON backup and restore.

The product identity uses the approved three-part Aureus mark and the fixed core palette: lime `#D7DF70`, ink `#0D110E`, and paper `#F7F5EF`. Browser icons, the web manifest, Android launcher icons, Android adaptive icons, Android splash screens, and the in-app header all derive from this identity. Keep destructive red limited to dangerous actions; do not reintroduce Lovable, default Capacitor, or generic template branding.

The application has these boundaries:

- Financial data stays on the device. There is no backend, account system, cloud sync, or analytics integration.
- The browser build stores data in `localStorage`.
- The Android build runs the same React application in a Capacitor WebView.
- Android cloud backup and device transfer are disabled for app data.
- Voice recognition uses the browser or Android speech-recognition service. Speech processing can depend on the platform and a network connection.
- Transaction values are positive whole Rupiah amounts. Subscription costs are whole Rupiah amounts from Rp0 upward. The application has no multi-currency model.
- The active application has no budget feature. `BudgetManager.tsx` and the `Budget` type are dormant code.
- The repository builds release artifacts but does not publish them to Google Play.

The Android identity is fixed:

| Setting | Value |
| --- | --- |
| App name | `Aureus` |
| Capacitor app ID | `com.aureus.moneytracking` |
| Android namespace | `com.aureus.moneytracking` |
| Android application ID | `com.aureus.moneytracking` |
| Web build directory | `dist` |
| UI language and locale | Indonesian, `id-ID` |

## Toolchain

The repository uses npm only. `package-lock.json` defines the dependency graph.

| Tool | Required version or range |
| --- | --- |
| Node.js | `>=22 <23`; CI uses `22.22.3` |
| npm | `>=10 <11`; `packageManager` is `npm@10.9.8` |
| Java | 21 |
| Android minimum SDK | 24 |
| Android compile SDK | 36 |
| Android target SDK | 36 |

The main runtime stack is React 18, TypeScript, Vite 8, Tailwind CSS 3, Radix UI primitives, Recharts, and Capacitor 8. The speech plugin remains `@capacitor-community/speech-recognition@7.0.1`.

## Runtime entry path

The browser and Android WebView use the same entry path:

```text
index.html
└── src/main.tsx
    └── src/App.tsx
        ├── src/pages/Index.tsx
        └── src/pages/NotFound.tsx
```

`src/main.tsx` mounts React and imports `src/index.css`.

`src/App.tsx` mounts the toast provider. It renders `Index` only when `window.location.pathname` is `/`. Every other path renders `NotFound`. The project does not use React Router.

`src/pages/Index.tsx` is the application composition root. It owns:

- the transaction, subscription, and category state,
- `localStorage` hydration and persistence,
- the active primary navigation destination,
- the Home dashboard period and transaction type,
- the Activity month and year,
- the shared quick-entry panel,
- transaction insertion, deletion, reconciliation, and restore callbacks.

The page loads expensive feature sections with `React.lazy`. `src/components/LazyFeature.tsx` wraps each lazy section in `Suspense` and a feature-level error boundary.

## Active UI map

`src/components/BottomNav.tsx` defines the `NavTab` union. It renders a fixed, blurred dock with Home, Transaction, Subs, and Others, followed by the separate add control. `src/components/Header.tsx` renders the Aureus lockup and a three-dot utility menu for theme switching, direct backup access, and Others.

| Destination | Entry point | Active components | Purpose |
| --- | --- | --- | --- |
| `home` | `Home` in the bottom dock | `DashboardHome`, `QuickTransactionEntry` | Show period totals, switch transaction type, rank categories, and create transactions. |
| `activity` | `Transaction` in the bottom dock | `ActivityScreen` | Search and filter monthly transactions, show type-aware totals, group rows by date, and edit or delete a transaction. |
| `subs` | `Subs` in the bottom dock | `SubscriptionManager` | Create subscriptions and reconcile due payments. |
| `more` | `Others` in the bottom dock or utility menu | `MoreMenu`, `CategoryManager`, `MonthlyReports`, `BackupRestore`, `ThemeToggle`, `AboutSection` | Manage categories and open reports, backup, appearance, or application information. |

Horizontal swiping follows the bottom dock: Home, Transaction, Subs, then Others. The utility menu can open Backup directly in the `more` view.

The shared component layers are:

- `src/components/*.tsx`: product components.
- `src/components/ui/*.tsx`: reusable Radix-based controls and visual primitives.
- `src/components/DeleteConfirmation.tsx`: the shared accessible destructive-action dialog.
- `src/components/ThemeToggle.tsx`: light and dark theme state.
- `src/hooks/use-toast.ts`: toast state.

These files are not in the active runtime path:

| File | Current status |
| --- | --- |
| `src/components/BudgetManager.tsx` | Tested, but not mounted and not persisted. |
| `src/components/TransactionHistory.tsx` | Tested, but not mounted in the active UI. |
| `src/components/TransactionTable.tsx` | Tested, but replaced in the active UI by `ActivityScreen`. |
| `src/components/StatisticsChart.tsx` | Not mounted in the active UI. |
| `src/components/TransactionByCategory.tsx` | Not mounted in the active UI. |
| `src/domain/subscription-storage.ts` | Tested compatibility helper, but `Index` hydrates subscriptions through `ledger.ts`. |

Do not treat dormant code as a shipped feature. A feature becomes active only after the composition root, state model, persistence schema, backup schema, and tests all include it.

## Directory map

| Path | Responsibility |
| --- | --- |
| `src/pages/` | Application composition and the fallback page. |
| `src/components/` | Product UI, dialogs, charts, tables, reports, and feature loading. |
| `src/components/ui/` | Shared controls and Radix wrappers. |
| `src/domain/` | Pure financial rules, validation, dates, parsing, persistence codecs, and tests. |
| `src/platform/` | Browser or Capacitor adapters that perform platform I/O. |
| `src/test/` | Vitest browser-environment setup. |
| `scripts/` | Bundle, Android policy, release-version, manifest, and CI checks. |
| `android/` | Capacitor Android application and Gradle configuration. |
| `.github/workflows/` | Pull-request, main-branch, and release automation. |
| `public/` | Static web assets copied by Vite. |

The `@/*` TypeScript and Vite alias points to `src/*`.

## Domain model

`src/domain/types.ts` owns the shared types. UI components import types from this file, not from `Index.tsx`.

### Transaction

```ts
interface Transaction {
	id: string;
	type: 'income' | 'expense';
	amount: number;
	category: string;
	description: string;
	date: string;
}
```

`src/domain/transaction-validation.ts` enforces the transaction rules:

- `amount` is a safe integer from `1` through `999_999_999_999_999`.
- Fractional, negative, zero, infinite, partially parsed, and unsafe amounts are invalid.
- `category` is required and has a 100-character limit.
- `description` is required and has a 500-character limit.
- `date` is a canonical ISO instant for stored transactions.
- `id` has a 128-character limit and uses only `A-Z`, `a-z`, `0-9`, `.`, `_`, `~`, `:`, `+`, or `-`.
- The legacy category `Hashihan` migrates to `Tagihan` during storage recovery.

`TRANSACTION_CATEGORIES` in `src/domain/categories.ts` defines manual and voice UI choices. Stored categories are not restricted to that catalog. Subscription renewals use the system category `Langganan`.

`NewTransaction` omits `id`. `Index.addTransaction` validates a `NewTransaction`, then `addPrevalidatedTransaction` assigns a collision-safe ID.

### Subscription

```ts
interface Subscription {
	id: string;
	name: string;
	amount: number;
	startDate: string;
	cycleDays: number;
	nextPaymentDate: string;
	color: string;
}
```

`src/domain/subscription.ts` enforces the subscription rules:

- `name` is required and has a 100-character limit.
- `amount` is a whole Rupiah value from Rp0 through the shared maximum transaction amount.
- `cycleDays` is an integer from `1` through `36_600`.
- `startDate` and `nextPaymentDate` are valid `YYYY-MM-DD` calendar dates.
- `nextPaymentDate` cannot precede `startDate`.
- `id` uses the transaction ID alphabet and has a shorter bound so a renewal transaction ID still fits within 128 characters.
- `color` must be one of `SUBSCRIPTION_COLORS`; invalid persisted colors fall back to the first color.
- The stored subscription count cannot exceed `5_000`.

### Budget

`Budget` remains in `src/domain/types.ts` for `BudgetManager.tsx`. Budgets have no active state owner, storage key, ledger field, or backup field.

## ID policy

`src/domain/id.ts` owns ID generation.

- New transaction IDs use the `tx_` prefix.
- New subscription IDs use the `sub_` prefix.
- `crypto.randomUUID()` is the preferred generator.
- Older WebViews use `crypto.getRandomValues()` as the only fallback.
- The code never uses `Math.random()` for financial IDs.
- `addPrevalidatedTransaction` makes at most 32 attempts to avoid an ID collision.

Subscription renewals use a deterministic ID:

```text
renewal_<subscriptionId>_<YYYY-MM-DD>
```

That ID is the idempotency key for one subscription occurrence. Keep the format lossless and deterministic.

## Financial state and persistence

There is no global state library. `Index.tsx` owns financial state with React state and keeps a transaction ref for synchronous, stale-closure-safe updates.

`src/domain/ledger.ts` owns the storage format and storage order.

| Key | Content | Role |
| --- | --- | --- |
| `aureusLedgerV6` | `{ version: 6, transactions, subscriptions, categories, notifications, notificationPreferences }` | Authoritative combined snapshot. |
| `aureusLedgerV5` | Previous notification format | Previous snapshot read during migration. |
| `aureusLedgerV4` | `{ version: 4, transactions, subscriptions, categories }` | Older snapshot read during migration. |
| `aureusLedgerV3` | `{ version: 3, transactions, subscriptions }` | Older snapshot read during migration. |
| `transactions` | Transaction array | Legacy compatibility mirror. |
| `subscriptions` | Subscription array | Legacy compatibility mirror. |
| `theme` | `light` or `dark` | UI preference. |
| `transactionTableFilter` | `income` or `expense` | Ledger UI preference. |
| `quoteHistory` | Recent insight strings | Non-financial UI state. |

Hydration follows this order:

1. `hydrateLedger` reads `aureusLedgerV6`.
2. A valid version 6 snapshot wins over every older source.
3. If no version 6 snapshot exists, hydration migrates valid version 5, version 4, or version 3 snapshots. Version 5 subscription rules become reusable reminder items. Missing notification data becomes an empty list with notifications off.
4. If no valid combined snapshot exists, hydration checks `transactions` and `subscriptions`.
5. Recovery decoders omit invalid individual legacy records. They can repair missing or duplicate legacy IDs.
6. A malformed authoritative value or wrong-shaped legacy value disables automatic persistence. This preserves the raw value instead of overwriting it with an empty array.
7. A successful restore enables persistence again.

Persistence follows this order:

1. `persistLedger` writes `aureusLedgerV6`.
2. Only after the authoritative write succeeds, it writes `transactions`.
3. It then writes `subscriptions`.

Do not move persisted data writes back into feature components. One combined path keeps transactions, subscription checkpoints, categories, and notification rules in the same snapshot.

## Transaction write paths

Every active transaction source ends at `Index.addTransaction` or the idempotent reconciliation merge.

### Manual entry

`src/components/QuickTransactionEntry.tsx` is the active Home entry flow. It locks the selected type and category, formats whole Rupiah, limits dates to today or earlier, provides five recent shortcuts, and commits through `Index.addTransaction`.

`src/components/TransactionForm.tsx` remains the generic transaction form used by tests and future non-category entry points. It:

- uses `formatLocalCalendarDate` for the date input,
- converts the selected day with `calendarDateToLocalInstant`,
- parses the amount with `parsePositiveFiniteAmount`,
- commits immediately through `attemptTransactionCommit`,
- blocks duplicate and re-entrant submissions,
- blocks dialog dismissal after the commit boundary starts.

Persistence must not depend on an animation or a delayed callback.

### Voice entry

`src/components/QuickTransactionEntry.tsx` owns the active category-hold recognizer lifecycle. `src/components/VoiceInput.tsx` remains the standalone, fully tested recognizer implementation. Both use `src/domain/voice-parser.ts` as the pure parser.

The parser supports:

- plain and grouped digits,
- `Rp` prefixes,
- `ribu`, `rb`, `k`, `juta`, and `jt` units,
- bounded slang such as `goceng`, `ceban`, `jigo`, and `seceng`,
- relative dates such as `kemarin`, `besok`, `lusa`, `minggu lalu`, and numeric day offsets,
- `tanggal N` with explicit previous-month behavior,
- category and transaction-type detection from bounded Indonesian phrases.

The parser rejects multiple separate amount candidates and multiple separate date expressions. Date spans and explicit item quantities do not become amount candidates.

The platform split is:

- Browser: `SpeechRecognition` or `webkitSpeechRecognition` with `id-ID`.
- Android: `@capacitor-community/speech-recognition` with inline recognition and `popup: false`.
- Native code checks microphone permission before starting. It requests permission only from the untouched `prompt` state. Denied or rationale states never reopen a system prompt.

The native plugin's `stop()` promise is not a reliable completion signal. `VoiceInput` sends `SpeechRecognition.stop()` without awaiting it and waits for the `listeningState` event with status `stopped`. Operation IDs invalidate late results. Preserve both behaviors when changing voice lifecycle code.

The user reviews the parsed amount and description before saving. In the active Home flow, the category remains locked to the held category. Saving uses the same page validation as manual entry.

### Subscription entry and renewal

`src/components/SubscriptionManager.tsx` validates a new subscription before changing state. If the user selects the first-payment option, the component creates the payment transaction before it adds the subscription. Users can hold a row's drag handle and move it vertically. The reordered array flows through `Index.tsx`, so ledger persistence and backups keep the chosen order.

`reconcileSubscriptions` applies this renewal policy:

- Every paid occurrence due on or before the local current day becomes an expense.
- An Rp0 occurrence advances the subscription schedule without creating a zero-value transaction.
- Each expense uses its scheduled due date, not the reconciliation time.
- Each occurrence uses its deterministic renewal ID.
- The function advances `nextPaymentDate` in one pass.
- Retries and remounts cannot add a renewal whose ID already exists.
- One subscription can create at most 1,000 renewals in one pass.
- If a subscription exceeds that bound, reconciliation leaves the subscription unchanged and emits no partial history for it.

`Index.addReconciledTransactions` calls `mergeTransactionsIdempotently` before updating transaction state.

### Notifications

`src/domain/notification.ts` validates reusable reminder items. Each item stores an editable title and message, days before due, time, and the subscription IDs that use it. The title and message support `{name}`, `{amount}`, and `{due}` placeholders. One item can apply to several subscriptions and repeats for each billing cycle.

The notification editor opens a dedicated 24-hour picker with separate hour and minute selectors instead of free-form time entry. On a subscription card, holding the bell count temporarily shows stacked tooltips with the assigned item names, such as `H-3`, and their times. Notification titles and messages only control the Android notification content. Android Back dismisses the topmost open menu, picker, form, or confirmation dialog before the app can exit. `src/platform/notifications.ts` resolves the title and message placeholders for each assigned subscription, owns Capacitor scheduling, serializes reschedules, caps Aureus at 64 pending native notifications, and sets `isExactNotification: false` on every item. The Android manifest removes `SCHEDULE_EXACT_ALARM`, so enabling notifications never opens the separate "Alarms & reminders" settings screen. The master switch is the only route that requests notification permission.

The Notifications page under Others creates items and assigns them to subscriptions. Subscription rows show a bell count. Deleting a subscription removes its ID from reminder items without deleting those items.

### Restore

A confirmed restore replaces transactions, subscriptions, categories, and notification rules in one React batch. Restore is not a merge operation. Restored notification rules remain off until the user enables notifications on the current device.

## Date rules

The codebase distinguishes a calendar date from an instant:

- A calendar date is `YYYY-MM-DD`. Subscription scheduling uses calendar dates.
- An instant is a canonical ISO string. Transactions use instants.
- Period filters interpret transaction instants in the user's local timezone.

`src/domain/calendar-date.ts` owns calendar parsing, formatting, comparison, local conversion, and day arithmetic.

Use these functions instead of native date-string shortcuts:

| Requirement | Function |
| --- | --- |
| Format the user's local day | `formatLocalCalendarDate` |
| Validate `YYYY-MM-DD` | `parseCalendarDateParts` |
| Parse a day as local midnight | `parseLocalCalendarDate` |
| Combine a selected day with a local clock | `calendarDateToLocalInstant` |
| Add calendar days across DST and month boundaries | `addCalendarDays` |
| Compare two valid calendar dates | `compareCalendarDates` |
| Recover a legacy persisted day | `normalizePersistedCalendarDate` |

Do not parse a date input with `new Date('YYYY-MM-DD')`. Do not derive a local date input with `toISOString().split('T')[0]`. Both forms apply UTC behavior and can shift the user's day.

`src/domain/period.ts` owns monthly filtering for Activity and reports. `src/domain/dashboard-period.ts` owns Home filters, including month selection and the fixed 1, 7, 14, 30, 90, 180, and 365-day ranges.

## Backup and restore

`src/domain/backup.ts` owns the backup schema and validation.

The current backup envelope is:

```ts
interface BackupEnvelope {
	version: '6.0';
	exportDate: string;
	transactionCount: number;
	subscriptionCount: number;
	notificationCount: number;
	transactions: Transaction[];
	subscriptions: Subscription[];
	categories: CategoryCatalog;
	notifications: AppNotification[];
	notificationPreferences: NotificationPreferences;
}
```

Backup version `6.0` is separate from the numeric local ledger version `6`. Versions `2.0` through `5.0` remain read-only restore formats. Version 5 subscription rules become reusable reminder items. Missing notification data becomes an empty list with notifications off.

The limits are:

| Limit | Value |
| --- | --- |
| File size | 5 MiB |
| Transactions | 50,000 |
| Subscriptions | 5,000 |
| JSON nesting depth | 12 |

`decodeBackup` is strict and all-or-nothing. It validates the version, export date, declared counts, every record, and unique IDs. One invalid record rejects the complete backup.

Version `2.0` is read-only compatibility for transaction-only backups. Restoring version `2.0` clears subscriptions after the confirmation dialog warns the user.

`src/components/BackupRestore.tsx` validates the selected file before it displays replacement counts. Data changes only after explicit confirmation.

## Reports and file export

`src/components/MonthlyReports.tsx` calculates report totals from `filterTransactionsByPeriod`.

CSV export uses `src/domain/csv.ts`:

- `serializeCsvRows` uses RFC 4180 quoting and CRLF record separators.
- String cells that start with `=`, `+`, `-`, or `@`, including after whitespace, receive an apostrophe prefix.
- The exported file starts with a UTF-8 byte-order mark for spreadsheet compatibility.

Printable reports use `src/domain/report.ts`. `buildPrintReportDocument` creates DOM nodes and writes untrusted transaction fields through `textContent`. Do not replace this path with HTML template interpolation or `document.write`.

Browser exports create a Blob URL, activate a temporary download link, and revoke the URL.

Android exports use `src/platform/export-file.ts`:

- files go to `Directory.Cache`,
- the relative directory is `aureus-exports/`,
- file names use only `A-Z`, `a-z`, `0-9`, `.`, `_`, or `-`,
- `@capacitor/share` opens the native share sheet.

`NATIVE_EXPORT_DIRECTORY` must stay aligned with `android/app/src/main/res/xml/file_paths.xml`. The FileProvider exposes only `cache/aureus-exports/`.

## Android structure and security policy

`capacitor.config.ts` sets the application ID, app name, web directory, and CSS-based system-bar inset handling.

Important Android files are:

| Path | Responsibility |
| --- | --- |
| `android/app/build.gradle` | App identity, version properties, signing, R8, resources, and dependencies. |
| `android/variables.gradle` | SDK and AndroidX versions. |
| `android/app/src/main/AndroidManifest.xml` | Activity, permissions, backup policy, and FileProvider. |
| `android/app/src/main/res/xml/backup_rules.xml` | Android 11 and lower backup exclusions. |
| `android/app/src/main/res/xml/data_extraction_rules.xml` | Android 12 and newer cloud and device-transfer exclusions. |
| `android/app/src/main/res/xml/file_paths.xml` | FileProvider export scope. |
| `android/app/src/main/res/values-v27/styles.xml` | API 27 display-cutout attributes. |
| `scripts/assert-android.mjs` | Static assertions over tracked Android policy. |
| `scripts/assert-merged-manifest.mjs` | Assertions over the manifest produced by Gradle. |

The manifest declares `INTERNET` and `RECORD_AUDIO`. The application sets `allowBackup="false"`, and both backup-rules files exclude every app-data domain. The FileProvider is not exported and grants access only through temporary URI permissions.

The release build enables R8 minification, resource shrinking, and `proguard-android-optimize.txt`.

`android/capacitor.settings.gradle` and `android/app/capacitor.build.gradle` are generated Capacitor files. `npx cap sync android` can rewrite them. Persistent native policy belongs in the app manifest, Gradle files, XML resources, `capacitor.config.ts`, and policy scripts.

## Styling and accessibility contracts

`src/index.css` is the active global stylesheet. `tailwind.config.ts` maps Tailwind names to its HSL custom properties.

The active style contracts include:

- light and dark theme tokens,
- AA-tested text and status colors,
- a visible global `focus-visible` outline,
- at least 44 CSS-pixel touch targets for common controls,
- safe-area utilities for the sticky header, fixed bottom navigation, dialogs, and content offsets,
- a neutral bottom dock with ordinary `4px` backdrop blur, transparent surfaces, bright rims, readable labels, and an inner blurred capsule for the active page,
- `viewport-fit=cover` in `index.html`,
- a global `prefers-reduced-motion: reduce` override.

`capacitor.config.ts` asks Capacitor System Bars to expose CSS inset values. `safe-area-top`, `safe-area-bottom`, `main-safe-offset`, `pb-nav`, and dialog inset styles consume those values with `env(safe-area-inset-*)` fallbacks.

Dialogs use the shared Radix wrappers in `src/components/ui/dialog.tsx` and `alert-dialog.tsx`. Product dialogs preserve labels, initial focus, focus trapping, Escape behavior, focus return, and named icon controls.

## Test structure

Vitest runs `src/**/*.test.ts` and `src/**/*.test.tsx` in jsdom. `vitest.config.ts` fixes the test timezone to `Asia/Jakarta`. `src/test/setup.ts` installs DOM matchers and browser API stubs.

The source test files cover these areas:

- transaction and subscription validation,
- ledger hydration, persistence order, and ID collision behavior,
- backup versions, strict restore, limits, and full-state round trips,
- local calendar arithmetic and timezone boundaries,
- voice parsing and browser or native recognition lifecycle,
- subscription catch-up and idempotency,
- CSV formula and quoting safety,
- safe printable-report construction,
- Android export-directory scope,
- dialogs, focus, keyboard controls, touch sizing, and navigation,
- Home period behavior, category ranking, quick entry, safe areas, contrast, reduced motion, and axe checks,
- lazy-feature loading and failure containment.

Two Node test files under `scripts/` cover bundle-budget behavior and Android version derivation. `npm run test:policy` runs them with Node's test runner.

## Command reference

| Command | Result |
| --- | --- |
| `npm ci` | Installs the exact locked npm graph. |
| `npm run dev` | Starts Vite on port 8080. |
| `npm run build` | Creates the production web build in `dist/`. |
| `npm run typecheck` | Runs both TypeScript project checks without emitting files. |
| `npm run lint` | Runs ESLint over the repository's TypeScript sources. |
| `npm run test` | Runs the Vitest suite once. |
| `npm run test:watch` | Runs Vitest in watch mode. |
| `npm run test:policy` | Runs the Node policy tests in `scripts/`. |
| `npm run bundle:check` | Checks the built Vite manifest and JavaScript budgets. |
| `npm run android:assert` | Checks tracked Android privacy, path, cutout, and build policy. |
| `npm run ci:validate` | Parses workflow YAML and verifies required gates and full action SHA pins. |
| `npm run check` | Runs typecheck, lint, Vitest, policy tests, build, bundle checks, Android assertions, and workflow validation. |
| `npm run audit:prod` | Audits production dependencies through the npm advisory service. |
| `npm run audit:all` | Audits all dependencies through the npm advisory service. |
| `npm run ci` | Runs `check` and both npm audits. It does not run Gradle. |
| `npm run sbom` | Writes `aureus-sbom.cdx.json` in CycloneDX format. |

The bundle budgets in `scripts/check-bundle.mjs` are:

| Budget | Limit |
| --- | --- |
| Initial JavaScript | 500,000 bytes |
| Initial gzip JavaScript | 170,000 bytes |
| One initial JavaScript chunk | 600,000 bytes |

`npm run bundle:check` requires a current `dist/.vite/manifest.json`, so `npm run build` runs before it in the aggregate check.

The local Android regression sequence is:

```bash
npm run build
npx cap sync android
cd android
./gradlew testDebugUnitTest lintDebug assembleDebug testReleaseUnitTest lintRelease assembleRelease
cd ..
node scripts/assert-merged-manifest.mjs \
	android/app/build/intermediates/merged_manifests/debug/processDebugManifest/AndroidManifest.xml
```

## CI and release automation

`.github/workflows/android-build.yml` runs for pull requests and pushes to `main`. It uses Ubuntu 24.04, Node 22.22.3, npm 10.9.8, Java 21, and Android API 36.

The workflow runs:

1. `npm ci`.
2. `npm run check`.
3. Both npm audits.
4. SBOM generation.
5. `npx cap sync android`.
6. An npm lockfile-drift check.
7. Android unit tests, Android lint, debug assembly, and merged-manifest processing.
8. Merged-manifest security assertions.
9. Debug APK checksum generation.

The uploaded debug APK uses Android's debug key. It is a diagnostic artifact with seven-day retention, not a release download.

`.github/workflows/android-release.yml` runs for strict `vMAJOR.MINOR.PATCH` tags or manual dispatch.

- The tag determines `versionName`.
- `scripts/derive-version.mjs` calculates `versionCode` as `MAJOR * 1_000_000 + MINOR * 1_000 + PATCH`.
- Minor and patch values cannot exceed 999.
- The workflow signs every release with the same private Aureus key so a newer APK can update an installed older version.
- Signing requires `AUREUS_ANDROID_KEYSTORE_BASE64`, `AUREUS_ANDROID_KEYSTORE_PASSWORD`, `AUREUS_ANDROID_KEY_ALIAS`, and `AUREUS_ANDROID_KEY_PASSWORD` in GitHub Actions secrets.
- A successful tag creates a GitHub Release containing one installable file named `aureus-vMAJOR.MINOR.PATCH.apk`. GitHub adds source ZIP and TAR archives automatically.
- Manual runs accept `version_name` and a positive `version_code`, then upload the validated APK as an Actions artifact without creating a GitHub Release.

GitHub Actions use reviewed full commit SHAs. `scripts/validate-ci.mjs` rejects unreviewed pins and mutable action tags. Automated dependency pull requests are disabled. Dependency upgrades are manual and must update `package.json`, `package-lock.json`, compatibility checks, and reviewed action pins as applicable.

## Change lookup

Use this map to find the first relevant implementation and regression tests.

| Change | Primary files | Primary tests or checks |
| --- | --- | --- |
| Transaction fields or limits | `src/domain/types.ts`, `transaction-validation.ts`, `ledger.ts` | `transaction-validation.test.ts`, `ledger.test.ts`, `backup.test.ts` |
| Manual transaction entry | `QuickTransactionEntry.tsx`, `TransactionForm.tsx`, `transaction-action.ts`, `Index.tsx` | `QuickTransactionEntry.test.tsx`, `TransactionForm.test.tsx`, `transaction-action.test.ts` |
| Voice amount, type, date, or category parsing | `voice-parser.ts`, `categories.ts` | `voice-parser.test.ts` |
| Voice permission or recognizer lifecycle | `QuickTransactionEntry.tsx`, `VoiceInput.tsx`, `capacitor.config.ts`, Android manifest | `QuickTransactionEntry.test.tsx`, `QuickTransactionEntry.native.test.tsx`, `VoiceInput.test.tsx`, `VoiceInput.native.test.tsx`, Android assertions |
| Subscription validation or renewal | `subscription.ts`, `SubscriptionManager.tsx`, `id.ts` | `subscription.test.ts`, `SubscriptionManager.test.tsx`, `id.test.ts`, `ledger.test.ts` |
| Notification validation, permission, or scheduling | `notification.ts`, `NotificationManager.tsx`, `notifications.ts`, Android manifest | `notification.test.ts`, `NotificationManager.test.tsx`, `notifications.test.ts`, Android assertions |
| Storage or migration | `ledger.ts`, `backup.ts`, `subscription.ts` | `ledger.test.ts`, `backup.test.ts`, `subscription-storage.test.ts` |
| Backup schema or restore UX | `backup.ts`, `BackupRestore.tsx`, `Index.tsx` | `backup.test.ts`, `BackupRestore.test.tsx` |
| Date or period behavior | `calendar-date.ts`, `period.ts`, `dashboard-period.ts` | `calendar-date.test.ts`, `period.test.ts`, `dashboard-period.test.ts`, affected component tests |
| Activity history, filters, edit, or delete | `ActivityScreen.tsx` | `ActivityScreen.test.tsx`, `Index.test.tsx` |
| CSV export | `csv.ts`, `MonthlyReports.tsx`, `export-file.ts` | `csv.test.ts`, `export-file.test.ts` |
| Printable report | `report.ts`, `MonthlyReports.tsx` | `report.test.ts` |
| Navigation or tab composition | `Header.tsx`, `BottomNav.tsx`, `Index.tsx` | `Header.test.tsx`, `BottomNav.test.tsx`, `Index.test.tsx` |
| Theme, safe areas, contrast, or motion | `index.css`, `tailwind.config.ts`, `ThemeToggle.tsx`, `index.html` | `styles.test.ts`, `ControlSizing.test.tsx`, `npm run android:assert` |
| Shared controls | `src/components/ui/` | Component tests and `Index.test.tsx` axe coverage |
| Android privacy or file sharing | Manifest and XML resources, `export-file.ts`, `capacitor.config.ts` | `assert-android.mjs`, `assert-merged-manifest.mjs`, `export-file.test.ts` |
| CI gate or action pin | `.github/workflows/`, `scripts/validate-ci.mjs` | `npm run ci:validate` |
| Release versioning | `android-release.yml`, `derive-version.mjs`, `android/app/build.gradle` | `derive-version.test.mjs`, release workflow |
| Dependency update | `package.json`, `package-lock.json`, native compatibility files | `npm run ci`, `npx cap sync android`, Gradle gates |

## Non-negotiable implementation rules

These rules protect data correctness and platform security:

- Keep transaction and subscription validation in `src/domain/`. UI input constraints are not validation boundaries.
- Route active transaction writes through `Index.addTransaction` or the idempotent reconciliation merge.
- Generate financial IDs with `src/domain/id.ts`. Do not add weak random or timestamp-only IDs.
- Keep renewal IDs deterministic by subscription ID and due date.
- Keep the authoritative ledger write ahead of the legacy mirror writes.
- Do not overwrite malformed persisted data during startup.
- Keep backup restore strict, all-or-nothing, and confirmed before replacement.
- Keep backup version `6.0` distinct from ledger version `6`.
- Use `calendar-date.ts` for calendar inputs and subscription arithmetic.
- Keep Home totals, category amounts, and displayed counts on the selected dashboard period. Rank categories by their all-time transaction frequency so the order does not reset when the period or day changes.
- Keep CSV formula neutralization and RFC 4180 escaping.
- Build printable reports with DOM text nodes. Do not parse stored fields as markup.
- Keep Android exports inside `cache/aureus-exports/` and keep the TypeScript and FileProvider paths equal.
- Keep Android backup disabled in the manifest and both extraction-rule files.
- Do not await native `SpeechRecognition.stop()` as the release signal.
- Keep lazy feature errors contained by `LazyFeature`.
- Keep safe-area and reduced-motion behavior in the active global stylesheet.
- Use npm and commit `package-lock.json`. Do not add a second package-manager lockfile.
- Update this file instead of adding another project documentation file.
