# Aureus Consolidated Audit

**Baseline:** current `main` at `e4dcc5b`  
**Scope:** behavior-preserving audit focused on quality, simplicity, robustness, scalability, and long-term maintainability.  
**Excluded:** divergent auto-record implementation and the user-owned `AGENTS.md` deletion.

## Included reports

1. Data integrity and financial behavior
2. Voice transaction engine
3. Android, Capacitor, dependencies, CI, and release process
4. Whole-repository QA and architecture
5. UI, reports, exports, responsiveness, and accessibility

> **Authorship note:** Parts I–IV consolidate the completed parallel Pi reviews. Part V was independently verified and authored by the coordinating assistant after the dedicated UI reviewer failed to emit its report file.

---

## Part I — Data integrity and financial behavior

# Aureus data-integrity audit — current `main`

Scope: commit `e4dcc5b` on `main`; divergent auto-record work excluded. Static audit of transaction entry, summaries, subscriptions, backup/restore, persistence, IDs, dates, validation, categories, renewals, and destructive behavior. No project source was edited or dependency installed; the user's `AGENTS.md` deletion was ignored.

## Confirmed defects

### P0 — Critical

1. **A zero or negative subscription cycle causes an unbounded renewal/write loop.**
   - References: `src/components/SubscriptionManager.tsx:59-62`, `src/components/SubscriptionManager.tsx:64-105`, `src/components/SubscriptionManager.tsx:108-145`, `src/components/SubscriptionManager.tsx:247-253`.
   - Reproduction: add a subscription due today with duration `0` (HTML `required` accepts it). Each renewal adds an expense, advances the date by zero days, replaces subscription state, and retriggers the effect forever. A negative cycle moves the due date farther into the past with the same result.
   - Impact: duplicate-expense flood, repeated localStorage writes/toasts, and UI lockup; negative/zero subscription amounts are also accepted at lines 124/142 and can invert or invalidate financial totals.
   - Conservative fix: before any side effect, require a finite `amount > 0`, a finite integer `cycleDays > 0`, and a valid start date; add matching `min`/`step` input constraints as UX only, not as the validator.
   - Tests: submit amount `0`, `-1`, and non-finite values, and cycle `0`, `-1`, fractional, and non-finite values; assert no subscription or transaction is created and no renewal effect repeats.

### P1 — High

2. **Common voice amounts prefixed with “Rp” are truncated to at most three digits.**
   - References: `src/components/VoiceInput.tsx:342-356`, `src/components/VoiceInput.tsx:464-471`, `src/components/VoiceInput.tsx:504-517`, `src/components/VoiceInput.tsx:571-576`.
   - Reproduction: “Rp 100.000” is preprocessed to `Rp 100000`; the Rp regex then matches only `Rp 100`, creating Rp100. “Rp 50000” becomes Rp500 and “Rp 1.500.000” becomes Rp150.
   - Impact: silently severe under-recording of income or expense.
   - Conservative fix: use one anchored Indonesian amount parser whose plain-digit branch accepts all digits after preprocessing; do not let a partial Rp match suppress later parsers.
   - Tests: table-test `Rp 100.000`, `Rp 1.500.000`, `Rp 50000`, `100.000`, `2,5 juta`, and `15,5 ribu`, asserting exact amounts and full token consumption.

3. **Restore accepts financially invalid records, duplicate IDs, and invalid dates, then silently drops other records while reporting success.**
   - References: `src/components/BackupRestore.tsx:86-124`, `src/pages/Index.tsx:59-80`, `src/pages/Index.tsx:108-113`.
   - Reproduction: restore JSON containing two records with ID `dup`, an amount of `-100` or `1e400`, an empty category, and `date: "not-a-date"`. The restore checks only `typeof amount === "number"`; `JSON.parse("1e400")` yields `Infinity`. Both duplicate IDs are accepted, and deleting either later removes both because deletion filters by ID. Any invalid sibling is skipped without warning before all existing data is replaced.
   - Impact: corrupted totals, unstable rendering/persistence, unintended multi-delete, silent partial data loss, and invalid dates later being rewritten to “now.”
   - Conservative fix: share one strict transaction decoder between startup and restore; require finite positive amount, valid type/date, nonempty normalized category, strings within limits, and unique nonempty IDs. Reject the whole backup with indexed errors rather than partially replacing data; regenerate only missing/colliding legacy IDs deterministically during an explicit migration.
   - Tests: malformed/negative/zero/infinite amounts, invalid dates, empty/legacy categories, duplicate/empty IDs, mixed valid-invalid arrays, and a valid legacy `Hashihan` migration; failed restore must preserve current state byte-for-byte.

4. **Overdue renewals are backfilled one render at a time but all recorded with the current timestamp.**
   - References: `src/components/SubscriptionManager.tsx:59-105`, especially `74-97` and `81`.
   - Reproduction: store a 30-day subscription with `nextPaymentDate` seven months ago, then open the subscriptions tab. The effect repeatedly adds one transaction and advances one cycle until future; every generated transaction uses `new Date().toISOString()` rather than its scheduled due date.
   - Impact: historical expenses are concentrated in the current day/month, corrupting summaries, charts, and reports; interrupted separate transaction/subscription persistence can replay a due occurrence.
   - Conservative fix: compute all due occurrences in one pure pass and advance once. Preserve catch-up behavior by dating each expense at its scheduled due date and assigning an idempotency key `(subscriptionId, dueDate)`; alternatively, if product policy is “one current charge,” advance directly past today and emit exactly one.
   - Tests: fake-clock tests for due today, one missed cycle, many missed cycles, leap/DST boundaries, rerender/remount, and interruption/retry; each due occurrence must appear once with the intended date.

5. **“Backup Data” omits subscriptions, so it cannot restore all persisted financial data.**
   - References: `src/components/BackupRestore.tsx:25-30`, `src/components/BackupRestore.tsx:151-176`, `src/components/SubscriptionManager.tsx:46-57`, `src/pages/Index.tsx:297-307`.
   - Reproduction: create transactions and subscriptions, export, clear app storage/reinstall, then restore. Transactions return; subscriptions and their renewal checkpoints do not because the file and callback carry only transactions.
   - Impact: users following the pre-update backup warning still lose subscription configuration, and restored transaction history can diverge from surviving or missing renewal state.
   - Conservative fix: introduce a new versioned backup schema containing transactions and subscriptions; keep a read-only migration path for current transaction-only v2 files. Restore both datasets as one validated operation.
   - Tests: exact full-state round trip, v2 transaction-only compatibility with an explicit warning, invalid subscription rollback, and restore into empty/nonempty state.

6. **The animated manual form allows duplicate submission and cannot truly cancel a queued submission.**
   - References: `src/components/TransactionForm.tsx:73-99`, `src/components/TransactionForm.tsx:110`, `src/components/TransactionForm.tsx:192-198`.
   - Reproduction: double-click “Simpan Transaksi” within 1.2 seconds to queue two timers, or click Save and then X/Cancel before the timer fires. The former creates duplicates; the latter still creates the transaction after the modal closes.
   - Impact: duplicate or unwanted financial records.
   - Conservative fix: submit exactly once with an `isSubmitting` guard; disable submit/close/cancel while committing, or retain and clear the timer on unmount if cancellation is meant to cancel. Prefer committing immediately and making animation independent of persistence.
   - Tests: rapid double-click creates one record; Save-then-Cancel follows the explicitly chosen cancellation contract; unmount leaves no pending callback.

7. **Calendar-day handling mixes UTC date strings with local calendar calculations.**
   - References: `src/components/TransactionForm.tsx:23`, `src/components/TransactionForm.tsx:76-88`, `src/components/TransactionSummary.tsx:15-22`, `src/components/TransactionSummary.tsx:36-40`, `src/components/SubscriptionManager.tsx:42`, `src/components/SubscriptionManager.tsx:112-145`.
   - Reproduction: at 00:30 WIB, `new Date().toISOString().split('T')[0]` defaults the date input to the previous local day. Later the daily summary compares UTC `YYYY-MM-DD` strings while monthly views use local `Date#getMonth`; a 01:00 WIB transaction can stop counting as “today” at 07:00 WIB although the local date has not changed. In negative UTC offsets, `new Date("YYYY-MM-DD")` plus local `setHours` can move a selected date to the prior day.
   - Impact: transactions appear under inconsistent day/month periods and renewal start dates can shift.
   - Conservative fix: centralize local `YYYY-MM-DD` formatting/parsing; construct local dates from numeric year/month/day parts, and compare all day/month periods in the same documented timezone.
   - Tests: fake-zone tests for `Asia/Jakarta`, UTC, and a negative offset around local midnight, month/year boundaries, and DST; form, summary, ledger, chart, and report must agree.

### P2 — Medium

8. **Startup persistence can erase recoverable transaction storage and subscription parsing can crash the feature.**
   - References: `src/pages/Index.tsx:43-49`, `src/pages/Index.tsx:83-96`, `src/components/SubscriptionManager.tsx:46-57`.
   - Reproduction: put malformed JSON or a non-array value in `transactions`; loading ignores it, then the unconditional initial save writes `[]`. Put malformed JSON in `subscriptions`; its unguarded `JSON.parse` throws when the tab mounts. Even valid state is transiently written as empty before hydration completes.
   - Impact: corrupted-but-recoverable data is destroyed, valid data has an interruption window, and subscription UI can fail instead of offering recovery.
   - Conservative fix: initialize state lazily from a guarded decoder or gate writes behind `hydrated`; never overwrite undecodable raw data automatically. Catch/report storage read/write errors and preserve the raw payload for export/recovery.
   - Tests: valid, absent, malformed, wrong-shape, and migration-needed storage; assert no write occurs before successful hydration and failed decode preserves raw storage.

9. **Restore is destructive immediately after file selection despite only a passive warning.**
   - References: `src/components/BackupRestore.tsx:74-145`, especially `120-125`; warning only at `216-220`; replacement at `src/pages/Index.tsx:112-114`.
   - Reproduction: choose the wrong valid JSON file. Existing transactions are replaced immediately, with no preview, count comparison, confirmation, merge choice, or undo.
   - Impact: one mistaken file selection irreversibly replaces the ledger.
   - Conservative fix: validate first, show source/current counts and replacement scope, require explicit confirmation, then commit atomically; retain a one-session rollback snapshot.
   - Tests: cancel confirmation preserves state; confirm replaces exactly once; validation failure and file-reader failure preserve state; rollback restores the prior snapshot.

10. **The All-Time flag disables the stats period selector but does not put stats into all-time mode.**
   - References: `src/pages/Index.tsx:215-216`, `src/pages/Index.tsx:251-255`, `src/pages/Index.tsx:263-283`; the three stats components support optional `isAllTime` but it is not passed.
   - Reproduction: enable All-Time on Home, switch to Stats. Month/year controls are disabled, but ledger, chart, and category breakdown still show only the selected month.
   - Impact: misleading financial scope with no usable way to change it.
   - Conservative fix: either pass `isAllTime` consistently to all three stats components or make All-Time local to the summary and never disable stats controls.
   - Tests: toggle All-Time then navigate tabs; selector state, labels, row set, chart buckets, and category totals must all represent the same period.

## Maintainability suggestions (not additional confirmed defects)

- Move `Transaction`, `Subscription`, category aliases/catalogs, strict decoders, local-date helpers, and ID generation into domain modules; `Index.tsx`, restore, manual, voice, and renewal paths should call the same invariants.
- Use `crypto.randomUUID()` for new IDs and explicit migration IDs for legacy records; enforce uniqueness at the state boundary.
- Replace independent component-owned localStorage effects with a versioned repository that supports hydration status, schema migrations, atomic full-state snapshots, error reporting, and idempotent renewal commits.
- Extract pure amount parsing, period selection, backup decoding, and renewal calculation functions and add a real test script covering the regression cases above before UI integration tests.

---

## Part II — Voice transaction engine

# Aureus voice transaction engine audit — current `main`

## Scope and verification
- Audited `main` at `e4dcc5b` (`origin/main`), focusing on `src/components/VoiceInput.tsx`, `src/pages/Index.tsx`, Capacitor/Android configuration, the locked speech plugin, and CI sync/build integration.
- Ignored divergent auto-record work and the user-owned `AGENTS.md` deletion. No project files were edited and no packages were installed.
- This was a static audit; no microphone/device run was possible. Targeted ESLint for `VoiceInput.tsx`/`Index.tsx` passed. Project TypeScript checking is independently blocked by the unrelated missing `Budget` export in `src/components/BudgetManager.tsx:8`.

## Confirmed defects

### P0 — Amounts prefixed with `Rp` are silently truncated or lose their unit
**References:** `src/components/VoiceInput.tsx:350-356`, `src/components/VoiceInput.tsx:463-495`.
- Preprocessing changes `Rp 100.000` to `Rp 100000`; the `Rp` regex then accepts only its first 1–3 digits, yielding **Rp100**, not Rp100,000.
- The `Rp` branch runs before unit branches, so `Rp 5 juta dari gaji` yields **Rp5**, not Rp5,000,000.
- This is especially dangerous because the result is valid and saveable rather than rejected.
**Conservative fix:** replace the ordered regex cascade with one anchored amount grammar that consumes the full numeric token plus an optional unit; require a token boundary after the complete amount. Normalize separators only after deciding whether they are grouping or decimal separators.
**Tests:** assert `Rp 100.000` → 100000, `Rp100000` → 100000, `Rp 5 juta` → 5000000, `Rp 2,5 juta` → 2500000, and `Rp 1.500.000` → 1500000.

### P0 — Date numbers are parsed as transaction amounts
**References:** `src/components/VoiceInput.tsx:290-320`, `src/components/VoiceInput.tsx:500-517`, `src/components/VoiceInput.tsx:545-546`.
- Amount parsing takes the first bare number before date parsing.
- `tanggal 5 beli baju 100000` yields amount **5** instead of 100000.
- `2 hari lalu beli baju 50000` yields amount **2** instead of 50000.
**Conservative fix:** parse and validate date expressions first, preserve their source spans, and exclude those spans from amount extraction. Reject multiple/ambiguous remaining amount candidates instead of guessing.
**Tests:** freeze time and cover `tanggal 5 ... 100000`, `2 hari lalu ... 50000`, and utterances containing quantities plus a price.

### P1 — Type detection uses unbounded substrings and reverses common expenses into income
**References:** `src/components/VoiceInput.tsx:407-429`.
- Any occurrence of an income substring wins; there is no expense precedence or conflict handling.
- `terima kasih beli kopi 20 ribu`, `kasih ibu 100 ribu`, and `masuk tol 20 ribu` become income.
- `bayar gaji pegawai 5 juta` also becomes income although it describes payroll expense.
**Conservative fix:** tokenize words/phrases with boundaries; score explicit direction phrases (`uang masuk`, `menerima dari`, `bayar`, `beli`, `transfer ke`) and reject or ask for confirmation on conflicting evidence. Do not use bare `kasih`, `masuk`, or `gaji` as unconditional income signals.
**Tests:** table-test the examples above plus `terima gaji`, `transfer masuk`, `transfer ke ibu`, `dapat tagihan`, and `jual motor`.

### P1 — Category ordering makes generic words override specific categories
**References:** `src/components/VoiceInput.tsx:210-244`.
- Shopping is checked before health, education, household, and communication and includes generic `beli`.
- Therefore `beli obat 20 ribu` and `beli buku 50 ribu` become **Belanja**, not Kesehatan/Pendidikan.
- Food includes bare time words `malam`, `siang`, and `pagi` and is checked first; `bayar listrik malam ini 200 ribu` becomes **Makanan & Minuman**, not Tagihan.
**Conservative fix:** remove generic verbs/time words from category evidence; score specific nouns across all categories, with deterministic tie-breaking and `Lainnya` for weak/conflicting evidence.
**Tests:** cover `beli obat`, `beli buku`, `beli sabun`, `beli pulsa`, `bayar listrik malam ini`, `makan malam`, and mixed-keyword utterances.

### P1 — Native stop can remain pending forever with the locked plugin implementation
**References:** `src/components/VoiceInput.tsx:186-189`; `package.json:14-17`; `package-lock.json:112-120`; installed `node_modules/@capacitor-community/speech-recognition/android/src/main/java/com/getcapacitor/community/speechrecognition/SpeechRecognition.java:87-94,210-225`.
- The UI awaits `SpeechRecognition.stop()` before clearing `isListening`.
- Plugin 7.0.1 posts `stopListening()` but never calls `call.resolve()` on success, so the JavaScript promise and UI continuation can stay pending.
**Conservative fix:** move to a verified Capacitor-8-compatible plugin release containing a resolved `stop()`, or carry a minimal upstreamable native patch that resolves/rejects every call. Independently clear the local UI in `finally`, while still ensuring the recognizer is actually stopped.
**Tests:** native integration test with a timeout: start, stop before speech, assert the promise settles, microphone use ends, and UI returns to idle.

### P1 — Native recognition has no unmount cleanup and can outlive the modal
**References:** `src/components/VoiceInput.tsx:125-137`, `src/components/VoiceInput.tsx:146-173`, `src/components/VoiceInput.tsx:589`; `src/pages/Index.tsx:327-331`.
- Web cleanup stops recognition, but the native effect returns no cleanup.
- Closing the X while `SpeechRecognition.start()` is pending unmounts the component without stopping the singleton recognizer; its eventual result/error still invokes the old async continuation.
**Conservative fix:** install one lifecycle cleanup for both platforms; invalidate the current operation, detach web handlers/listeners, and stop/cancel native recognition on close/unmount. Guard every post-`await` state update with mounted and operation-generation checks.
**Tests:** close during permission prompt, close while listening, route/tab/unmount during recognition, then reopen; assert no old transcript/error appears and the microphone is released.

### P1 — Start/stop/retry operations are not serialized; stale results can overwrite a newer attempt
**References:** `src/components/VoiceInput.tsx:140-183`, `src/components/VoiceInput.tsx:186-196`, `src/components/VoiceInput.tsx:607-608`, `src/components/VoiceInput.tsx:714-719`.
- The button is not disabled while permission/start is in flight, and `isListening` is only React state, not a synchronous lock.
- Rapid starts can create concurrent promises; the native plugin cancels/replaces its recognizer, while an older completion can still update the new UI. Web restart before `onend` can throw `InvalidStateError`.
- `Ulangi` clears state and immediately starts with no generation boundary.
**Conservative fix:** use an explicit state machine (`idle/requesting/listening/stopping/ready/saving`) plus an operation ID/ref; disable invalid transitions and ignore callbacks from superseded IDs.
**Tests:** deferred-promise tests for double start, stop-then-immediate-start, repeated `Ulangi`, and old result arriving after a new session.

### P1 — Permission, availability, and start/stop failures are incompletely handled
**References:** `src/components/VoiceInput.tsx:109-119`, `src/components/VoiceInput.tsx:132-136`, `src/components/VoiceInput.tsx:146-181`, `src/components/VoiceInput.tsx:186-194`.
- Opening the native modal immediately requests permission; that promise is neither awaited nor caught, and clicking start requests again.
- Native availability is never checked. Denied/rationale states are collapsed to one message; native errors expose raw plugin English.
- Web synchronous `start()` failures are only logged, and `stop()` failures have no `try/catch`; web permission/audio/service/language errors receive no actionable mapping.
**Conservative fix:** check availability and existing permission on open without prompting; request only after the user presses the mic. Handle all permission states and map native/Web Speech error codes to stable Indonesian guidance; put state reset in `finally`.
**Tests:** unavailable service, prompt/granted/denied/prompt-with-rationale, permanent denial, no microphone, no speech, network failure, recognizer busy, unsupported language, and synchronous web start/stop exceptions.

### P1 — Common spoken Indonesian numbers and separator forms are unsupported or misread
**References:** `src/components/VoiceInput.tsx:342-358`, `src/components/VoiceInput.tsx:438-519`.
- `beli nasi lima belas ribu` has no digits and is rejected, although speech engines commonly emit words.
- Without `Rp`, `beli baju 1,500,000` parses as **1** because comma grouping is not normalized.
- Units such as `seribu`, `sejuta`, and `miliar` are absent; the slang loop uses substring matching rather than token boundaries.
- Small-item detection also uses substrings, including `es`; `beli mesin 500` contains `es` and becomes **500000**.
**Conservative fix:** implement a bounded Indonesian number tokenizer for cardinal words, colloquial units, and validated grouping; use exact tokens/phrases for slang and small-item hints. Reject malformed grouping.
**Tests:** digit/word equivalents; dot/comma/space grouping; decimal comma/dot with `ribu`/`juta`; `seribu`, `sejuta`, `miliar`; all supported slang; and negative substring cases such as `mesin`/`dress`.

### P1 — Specific-date construction can roll into the wrong month; advertised date phrases are incomplete
**References:** `src/components/VoiceInput.tsx:265-323`, `src/components/VoiceInput.tsx:529-533`.
- On 15 March 2026, `tanggal 31` first moves to February and then overflows to **3 March**, not a valid prior-month date.
- `minggu lalu` is removed from the description but is never parsed, so it silently records today.
- `besok` is parsed but not removed; `dua hari lalu` is parsed but remains in the saved description.
**Conservative fix:** construct dates from `(year, month, day)` only after checking days-in-month; define an explicit policy for day-only dates and reject impossible dates. Share one recognized-date span list between date parsing and description cleanup.
**Tests:** fake-time tests in `Asia/Jakarta` for leap/non-leap February, months with 30/31 days, year boundaries, `hari ini`, `kemarin`, `dua/N hari lalu`, `minggu lalu`, `besok`, and `lusa`.

### P2 — Saved amounts lack final numeric/domain validation
**References:** `src/components/VoiceInput.tsx:478-517`, `src/components/VoiceInput.tsx:538-539`, `src/components/VoiceInput.tsx:571-576`.
- Save checks only `amount > 0`; fractional rupiah, unsafe integers, or overflow to `Infinity` are not rejected.
**Conservative fix:** require `Number.isSafeInteger(amount)`, a documented positive maximum, and parser consumption of exactly one amount expression before showing Save.
**Tests:** zero, negative/malformed input, 0.5, very long digits, safe-integer boundary, overflow, and multiple amounts.

### P2 — Duplicate submission protection is absent
**References:** `src/components/VoiceInput.tsx:571-579`, `src/components/VoiceInput.tsx:709`; `src/pages/Index.tsx:98-105`.
- Save has no synchronous in-flight guard/disable state, and the parent always creates a new ID; re-entrant or rapid activation has no idempotency boundary.
**Conservative fix:** set a ref-backed `saving` guard before invoking the callback, disable Save immediately, and optionally pass a per-preview request ID that the parent deduplicates.
**Tests:** double-click/double-tap, keyboard activation, and a re-entrant mocked callback must produce exactly one transaction.

## Confirmed integration/regression risks and suggestions
- Web/native branching itself is current and direct (`src/components/VoiceInput.tsx:79-138`); `processVoiceInputRef` is refreshed each render (`src/components/VoiceInput.tsx:54,263`), so no conventional stale-function closure was found. The confirmed staleness problem is asynchronous session identity, described above.
- Android `RECORD_AUDIO` is supplied by the plugin manifest, not the app manifest (`android/app/src/main/AndroidManifest.xml:38-40`; installed plugin `android/src/main/AndroidManifest.xml:4`). CI runs Capacitor sync before Gradle (`.github/workflows/android-build.yml:31-44`), so the omission from the app manifest alone is not a defect. Add a CI assertion against the merged manifest and generated plugin registry.
- Speech plugin 7.0.1 is combined with Capacitor 8.0.2 and ranges are caret-based (`package.json:14-17`); CI uses `npm install` (`.github/workflows/android-build.yml:31-32`). Although the declared plugin peer range accepts core >=7, this is a regression surface. Pin verified exact versions and use `npm ci`.
- No iOS platform exists in current main; native conclusions are Android-only. If iOS is added, require both speech-recognition and microphone usage descriptions and equivalent lifecycle tests.
- There is no voice/parser test script in `package.json:6-11`. Extract parsing into a pure module and add table-driven unit tests, then component tests with mocked Web Speech/Capacitor promises and Android instrumentation/smoke tests.

## Recommended fix order
1. Fix amount grammar and date-span exclusion; add parser tests before changing behavior.
2. Replace type/category substring rules with bounded, scored evidence and ambiguity handling.
3. Repair/upgrade native `stop()`, add unified cleanup, operation IDs, and a serialized lifecycle state machine.
4. Correct permission/error UX and add final amount validation plus save idempotency.
5. Pin native dependencies, switch CI to reproducible install, verify merged permissions/plugin registration, and run web + Android regression matrices.

---

## Part III — Android, Capacitor, dependencies, CI, and release

# Aureus Android / Capacitor / Build / Dependency / CI / Release Audit

## Scope and baseline

- **Audited ref:** local `main` at `e4dcc5bf3707d807847e5c9b28e1c739cc5b40b7` (`adding backup and restore feature and small changes`).
- **Scope discipline:** findings are based on that commit only. The divergent auto-record work and the user-owned `AGENTS.md` deletion were ignored as requested.
- **No repository files were edited and no packages were installed.** The only new file is this requested report under `/tmp`.
- GitHub read-only checks showed that this exact commit's Android workflow completed successfully on 2026-02-06. Its `app-debug` artifact has since expired. GitHub currently has no tags or Releases for the repository.

## Executive summary

The checked-in Capacitor 8 Android project is internally coherent enough to build: identifiers agree, the Capacitor/Android/Gradle versions match the Capacitor 8.0.2 template, the npm lock root exactly matches `package.json`, all npm-resolved entries have integrity metadata, the Gradle wrapper JAR matches Gradle's published 8.14.3 checksum, and CI successfully built the audited commit.

It is **not release-ready or sufficiently hardened**, however. The highest-impact confirmed problems are:

1. The locked dependency graph currently has **18 audit findings**, including critical findings in direct `jspdf` and Capacitor CLI's transitive `tar`.
2. Financial records stored in WebView `localStorage` are included in Android backup scope because backup is enabled without exclusion rules.
3. Monthly report generation inserts transaction fields into HTML and calls `document.write`, permitting stored HTML/script injection, including through imported backup data.
4. CI produces only an expiring, debug-signed APK with a fixed `versionCode`; there is no signed release/AAB, durable Release, or release provenance.
5. CI does not exercise lint, TypeScript checking, unit tests, Android tests, or Android lint; the sole instrumented test is stale and would fail against the real application ID.

---

# Confirmed defects

## P0 — Immediate security/dependency remediation

### D1. Locked dependency graph contains critical and high vulnerabilities

**Evidence**

A non-mutating `npm audit --package-lock-only --audit-level=low --json` reported:

- **2 critical package findings**
- **11 high package findings**
- **5 moderate package findings**
- **18 total vulnerable packages**

The most material paths are:

| Package | Locked version | Audit severity | Reachability/context | Exact references |
|---|---:|---:|---|---|
| `jspdf` | 4.0.0 | **Critical** | Direct production dependency. Current source does not import it, but it remains installed as production attack surface. Audit includes PDF/HTML/object injection and image-decoder DoS advisories. | `package.json:57`; `package-lock.json:5502-5503` |
| `tar` | 7.5.7 | **Critical** | Transitive dependency of `@capacitor/cli`, which CI executes through `npx cap sync android`. Audit includes extraction traversal and DoS advisories. | `package.json:16`; `package-lock.json:130-161`; `package-lock.json:7021-7022` |
| `postcss` | 8.5.6 | **High** | Direct build dependency; audit includes source-map file disclosure/path traversal. | `package.json:87`; `package-lock.json:6030-6031` |
| `vite` | 5.4.21 | **High** | Direct build/dev-server dependency; audit includes path traversal and Windows deny-bypass findings. | `package.json:91`; `package-lock.json:7393-7394` |
| `react-router-dom` / `react-router` | 6.30.3 | **Moderate** | Runtime dependency and actually imported by the app. Audit includes open-redirect/XSS-related findings. | `package.json:66`; `package-lock.json:6422-6423`; `src/App.tsx:5-22`; `src/pages/NotFound.tsx:1-3` |
| `dompurify` | 3.3.1 | **Moderate** | Optional transitive dependency under `jspdf`; multiple sanitizer-bypass advisories. | `package-lock.json:4603-4604`; `package-lock.json:5502-5521` |
| `@xmldom/xmldom` | 0.8.11 | **High** | Transitive through Capacitor CLI (`plist` / `native-run`); XML injection and recursion findings. | `package.json:16`; `package-lock.json:130-161`; `package-lock.json:3840-3841` |

The other audited high findings were in `@isaacs/brace-expansion`, `brace-expansion`, `flatted`, `js-yaml`, `lodash`, `minimatch`, `picomatch`, and `rollup`; the remaining moderate findings were in `ajv` and `esbuild` in addition to those listed above.

**Impact**

- Vulnerable runtime packages can affect application behavior or exported content.
- Vulnerable build/CLI packages execute in CI with repository access and therefore remain supply-chain relevant even if not bundled into the APK.
- `jspdf`, `jspdf-autotable`, and several other direct dependencies appear unused, so the project carries avoidable vulnerable code and maintenance surface.

**Required correction**

Regenerate the npm lock intentionally after upgrading/removing affected direct dependencies, then require a clean production and full audit at the agreed threshold. In particular, remove `jspdf`/`jspdf-autotable` if they are truly unused; otherwise upgrade past the fixed advisory ranges and regression-test generated PDFs. Upgrade Capacitor CLI to a version resolving the affected `tar`/XML stack, or use an audited override only if upstream compatibility is demonstrated.

---

## P1 — High-priority application/platform and release defects

### D2. Android backup can include unencrypted financial records from WebView storage

**Evidence**

- Android backup is explicitly enabled: `android/app/src/main/AndroidManifest.xml:4-10`, especially line 5 (`android:allowBackup="true"`).
- There is no `android:fullBackupContent` or `android:dataExtractionRules` policy on the application and no backup-rules resource in the checked-in tree.
- Transaction data is read from and written to WebView `localStorage`: `src/pages/Index.tsx:43-50` and `src/pages/Index.tsx:93-96`.
- The records include amount, category, description, and date: `src/pages/Index.tsx:51-80`.

**Impact**

Android cloud/device-transfer backup can copy app-private WebView data outside the application's normal sandbox lifecycle. For a money tracker, transaction history is sensitive financial metadata. The app already has an explicit user-controlled JSON backup/share feature, so silent OS backup creates a second, less visible data-export path.

**Required correction**

Choose and document a backup policy. The minimal privacy-first correction is to disable platform backup and add explicit modern and legacy extraction rules excluding WebView/local data. If seamless Android backup is a product requirement, migrate sensitive records to encrypted storage and define narrowly scoped backup rules rather than relying on defaults.

### D3. Monthly report export permits stored HTML/script injection

**Evidence**

- Report HTML is assembled through a template string: `src/components/MonthlyReports.tsx:104-170`.
- User-controlled `category` and `description` values are inserted without HTML escaping: `src/components/MonthlyReports.tsx:153-162`.
- The resulting string is written as active document content: `src/components/MonthlyReports.tsx:172-175`.
- Backup restore accepts arbitrary strings for those fields and persists them: `src/components/BackupRestore.tsx:88-114` and `src/components/BackupRestore.tsx:120-125`.

**Impact**

A crafted transaction or imported backup can inject active markup into the report window. On browser builds this can execute script in the app's origin; behavior in an Android WebView/popup depends on WebView support and configuration, making it both a security problem and a cross-platform regression risk.

**Required correction**

Do not generate active HTML from raw transaction strings. Build the report with DOM APIs and assign fields with `textContent`, or apply a strict context-correct HTML escape routine to every interpolated field. Add a regression test using `<img src=x onerror=...>`, `</td><script>...`, commas/newlines, and formula-prefixed CSV cells.

### D4. The artifact pipeline does not produce a releasable Android build

**Evidence**

- CI runs only `assembleDebug`: `.github/workflows/android-build.yml:40-44`.
- It uploads only `app-debug.apk`: `.github/workflows/android-build.yml:46-50`.
- Android versioning is fixed forever at `versionCode 1` / `versionName "1.0"`: `android/app/build.gradle:6-12`.
- No release signing configuration exists in `android/app/build.gradle:3-25`.
- The release build type disables shrinking/obfuscation: `android/app/build.gradle:19-23`.
- There is no tag/release workflow; read-only GitHub checks found zero repository tags and zero GitHub Releases.
- The GitHub artifact for the audited commit succeeded but expired on 2026-05-07, so it is no longer a durable distribution artifact.

**Impact**

A debug APK is debuggable and signed with a non-production debug key. It is inappropriate as a public release, cannot form a trustworthy update chain, and cannot be uploaded to Play as a production release. A fixed `versionCode` prevents normal store release progression. Workflow artifacts are temporary and are not a substitute for a versioned release repository.

**Required correction**

Create a separate tag/manual release job that derives a monotonically increasing `versionCode`, builds a release AAB (and optionally an APK), signs it with protected secrets/Play App Signing, verifies signatures, emits checksums, and attaches immutable outputs to a GitHub Release. Keep debug APKs as short-lived CI diagnostics only.

### D5. CI provides no regression gate beyond compilation

**Evidence**

- The only package quality script available is lint; there is no `test`, `typecheck`, or Android validation script: `package.json:6-12`.
- CI builds the web app and debug APK but does not invoke ESLint, an explicit no-emit TypeScript check, unit tests, Android unit tests, instrumented tests, or Android lint: `.github/workflows/android-build.yml:31-50`.
- CI triggers only after pushes to `main`, not on pull requests: `.github/workflows/android-build.yml:3-7`.

**Impact**

Defects enter `main` before CI can report them, and passing CI proves only that one debug APK assembled. Permission merging, release configuration, Android lint, tests, and source quality are not enforced.

**Required correction**

Run dependency install, lint, no-emit typecheck, web tests/build, `cap sync`, Gradle unit tests, Android lint, and debug assembly on pull requests and protected `main`. Run release-specific validation in the release job.

---

## P2 — Medium-priority correctness, security, and reproducibility defects

### D6. The checked-in Android instrumented test asserts the wrong application ID

**Evidence**

- Actual application ID: `android/app/build.gradle:7` (`com.aureus.moneytracking`).
- Instrumented test asserts the Capacitor template ID: `android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java:19-25`, especially line 24 (`com.getcapacitor.app`).
- Test packages also retain the template namespace: `android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java:1` and `android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java:1`.

**Impact**

The instrumented test is guaranteed to fail if CI starts running it. Its stale package layout also masks incomplete platform renaming.

**Required correction**

Move/rename the test packages to the app namespace and assert `com.aureus.moneytracking`, or replace template tests with meaningful application tests.

### D7. Dependency installation is not fail-closed or unambiguous

**Evidence**

- CI uses `npm install`, not `npm ci`: `.github/workflows/android-build.yml:31-32`.
- Both npm and Bun locks are tracked: `package-lock.json:1-6` and binary `bun.lockb` (binary file, so no meaningful line address).
- `package.json` declares neither a `packageManager` nor Node/npm engine pin: `package.json:1-12`.
- Git history shows `bun.lockb` was last updated at the initial commit while `package.json` and `package-lock.json` changed later; inspection of the binary lock shows older package resolutions. It is therefore stale relative to the selected npm graph.

**Impact**

Contributors and automation can select different package managers and resolve materially different dependency graphs. `npm install` can repair or rewrite lock state rather than rejecting drift, which weakens reproducibility and reviewability.

**Required correction**

Select one package manager. For the existing workflow, retain `package-lock.json`, delete or regenerate/standardize `bun.lockb`, declare an exact package-manager version, and use `npm ci --ignore-scripts` where compatible (followed by explicitly required trusted lifecycle/build steps).

**Positive consistency result:** the npm lock root exactly matches all 59 dependencies and 17 dev dependencies in `package.json`; every fetched package entry has a resolved URL and integrity value; `npm ls --all` reported no tree problems; and a package-lock-only dry run reported 0 added/removed/changed packages.

### D8. CI and dependency sources are insufficiently pinned and verified

**Evidence**

- Runner floats on `ubuntu-latest`: `.github/workflows/android-build.yml:9-12`.
- Node floats across all Node 22 patch releases: `.github/workflows/android-build.yml:17-20`.
- Java distribution/version is major-pinned only: `.github/workflows/android-build.yml:22-26`.
- Every GitHub Action is referenced by a mutable major tag rather than a commit SHA: `.github/workflows/android-build.yml:14-29` and `.github/workflows/android-build.yml:46-47`.
- The Gradle distribution URL is versioned, but no `distributionSha256Sum` is recorded: `android/gradle/wrapper/gradle-wrapper.properties:1-7`.
- Gradle/Maven dependency verification metadata and dependency lockfiles are absent.

**Impact**

The same source commit can execute different runner images, Node patch versions, Action code, and remotely resolved Gradle artifacts over time. This reduces reproducibility and expands CI supply-chain trust.

**Required correction**

Pin Actions to reviewed full SHAs, pin Node/npm and the runner image intentionally, add Gradle's published distribution SHA-256, and enable Gradle dependency verification. Renovation automation can keep pins maintainable without sacrificing immutability.

**Positive verification result:** the checked-in wrapper JAR SHA-256 is `7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172`, exactly matching Gradle's published 8.14.3 wrapper checksum.

### D9. Signing keys are not ignored

**Evidence**

The keystore patterns are present only as comments, so they do not protect against accidental commits: `android/.gitignore:55-58`.

**Impact**

Introducing release signing later can accidentally stage a `.jks` or `.keystore` file. No key is currently tracked, so this is a preventive configuration defect rather than evidence of an exposed secret.

**Required correction**

Actively ignore `*.jks`, `*.keystore`, signing property files, and local secret material before implementing release signing. Store signing material in GitHub Environments/Secrets or use Play App Signing; never commit it.

### D10. FileProvider exposes an unnecessarily broad path namespace

**Evidence**

- The provider itself is correctly non-exported and grants URIs selectively: `android/app/src/main/AndroidManifest.xml:27-35`.
- Its path policy includes the entire external-storage root and entire cache root: `android/app/src/main/res/xml/file_paths.xml:1-5`, especially lines 3-4.
- Current native exports write only named files in `Directory.Cache`: `src/components/BackupRestore.tsx:35-49` and `src/components/MonthlyReports.tsx:72-85`.

**Impact**

Any current or future component that obtains a grant through this provider can address a much broader file set than the export feature requires. The provider is not openly exported, so this is not a direct unauthenticated file disclosure, but it violates least privilege and increases impact if app/plugin code is abused.

**Required correction**

Remove `<external-path path="." />` unless a demonstrated feature needs it. Write exports to a dedicated cache subdirectory and expose only that subdirectory through `<cache-path>`.

### D11. Explicit workflow token permissions are absent

**Evidence**

There is no top-level or job-level `permissions:` block anywhere in `.github/workflows/android-build.yml:1-50`.

**Impact**

Effective permissions depend on mutable repository/organization defaults instead of being reviewable in source. The job needs only source read access for its current duties.

**Required correction**

Set `permissions: { contents: read }` at workflow or job scope. Give the separate release job only the additional permissions it needs (for example, `contents: write` and provenance/OIDC permissions) and protect it with an Environment.

---

# Suggestions and defense-in-depth improvements

These are not presented as confirmed current breakages.

1. **Request microphone permission only after a clear user gesture.** The native component checks and may request permission in its mount effect at `src/components/VoiceInput.tsx:130-136`, then requests again when listening starts at `src/components/VoiceInput.tsx:146-166`. Keep only the user-initiated path and explain why audio is needed before prompting.
2. **Pin Capacitor plugins to a tested compatibility set.** Core/Android/CLI are 8.0.2 (`package.json:15-17`), while community speech recognition is 7.0.1 (`package.json:14`). Its npm peer range accepts Capacitor 8 (`package-lock.json:112-119`), and the audited CI build succeeded, so this is not a confirmed incompatibility; nevertheless, native runtime/permission tests should gate upgrades.
3. **Move build tooling out of production dependencies.** `@capacitor/cli` is under `dependencies` at `package.json:13-20`. It should normally be a dev dependency, reducing production-only installs and separating runtime from build attack surface.
4. **Remove unused direct dependencies after source-level confirmation.** `jspdf`, `jspdf-autotable`, `@capacitor/haptics`, and `framer-motion` are declared at `package.json:19`, `package.json:55-58` but had no imports in tracked application source. Removing them reduces bundle/install surface and audit noise.
5. **Self-host the font for offline Android behavior and reproducible rendering.** Startup currently depends on Google Fonts at `index.html:14-16`; the app will fall back when offline. Bundling the font removes a runtime network dependency and privacy signal.
6. **Enable release optimization deliberately.** Release minification is disabled at `android/app/build.gradle:19-23`. Enable R8/resource shrinking only after native plugin and WebView bridge regression tests are in place.
7. **Use the optimized default ProGuard profile.** The app references `proguard-android.txt` at `android/app/build.gradle:22`; prefer `proguard-android-optimize.txt` for a production release after validation.
8. **Avoid unnecessary buildscript dependencies.** Google Services classpath is always resolved at `android/build.gradle:9-12`, but it is applied only if `google-services.json` exists at `android/app/build.gradle:47-53`. Remove it until Firebase functionality exists, or move to a modern plugins configuration.
9. **Add concurrency cancellation for branch builds** so superseded pushes do not consume resources, and define artifact `retention-days` explicitly for debug artifacts. The upload block is at `.github/workflows/android-build.yml:46-50`.
10. **Add dependency automation and policy:** Dependabot/Renovate for npm, Gradle, and GitHub Actions; license review; an SBOM; secret scanning; and audit exceptions that include owner, rationale, and expiry.
11. **Protect `main`.** Read-only GitHub inspection reported that `main` is not branch-protected. Require pull requests and successful CI checks before merge. This is a repository-setting recommendation rather than a tracked-file defect.

---

# Configuration checks that passed / were not defects

- **Identity consistency:** Capacitor app ID (`capacitor.config.ts:4`), Android namespace/application ID (`android/app/build.gradle:4-7`), Java package (`android/app/src/main/java/com/aureus/moneytracking/MainActivity.java:1`), and string resources (`android/app/src/main/res/values/strings.xml:3-6`) agree.
- **Capacitor web output:** `webDir: 'dist'` at `capacitor.config.ts:6` matches Vite's default output and CI builds before sync (`.github/workflows/android-build.yml:34-38`).
- **Generated Capacitor files:** `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle`, copied assets, and the Cordova compatibility module are intentionally ignored/generated by `cap sync`; CI performs sync before Gradle. Their absence from HEAD is not itself a defect (`android/settings.gradle:1-5`, `android/app/build.gradle:42-45`, `android/.gitignore:92-101`).
- **Android SDK/toolchain alignment:** min/compile/target SDK 24/36/36 at `android/variables.gradle:2-4`, AGP 8.13.0 at `android/build.gradle:10`, Gradle 8.14.3 at `android/gradle/wrapper/gradle-wrapper.properties:3`, and Java 21 in CI at `.github/workflows/android-build.yml:22-26` match the installed Capacitor 8.0.2 template. The exact audited commit built successfully in GitHub Actions.
- **Permissions:** The checked-in app manifest declares only `INTERNET` at `android/app/src/main/AndroidManifest.xml:38-40`. `RECORD_AUDIO` is supplied by the installed speech-recognition plugin's manifest during Capacitor sync, so its absence from the app manifest is not a confirmed missing-permission bug.
- **Exported components:** `MainActivity` is exported because it owns the launcher intent filter (`android/app/src/main/AndroidManifest.xml:12-25`); the FileProvider is non-exported (`android/app/src/main/AndroidManifest.xml:27-35`). No other checked-in app components are exported.
- **Cleartext traffic:** No config enables cleartext traffic. With target SDK 36, Android's default is restrictive; lack of a custom network-security config is not by itself a defect.
- **Workflow syntax:** `.github/workflows/android-build.yml` parsed successfully as YAML.
- **Lock integrity:** `package.json` and the root section of `package-lock.json:7-89` match exactly; npm reported a valid dependency tree.
- **Gradle wrapper authenticity:** the wrapper JAR matches Gradle's official checksum, as noted above.

---

# Platform-regression risk matrix

| Area | Current evidence | Risk/gap |
|---|---|---|
| Android compilation | Exact audited commit passed GitHub `assembleDebug`. | Release variant is untested and unsigned. |
| Native speech | Permission comes from plugin merge; peer range accepts Core 8. | No device test; community plugin major differs; eager permission request. |
| Native backup/export | Filesystem writes to cache and Share receives a file URI. | FileProvider policy is broader than needed; platform backup silently includes financial data. |
| Web report/PDF | Browser print-window path exists. | Active HTML injection; popup/print behavior is not Android-gated or tested. |
| Routing | `BrowserRouter` is used at `src/App.tsx:5-22`. | No deep-link/App Link configuration or tests; acceptable for current root-only navigation but should be covered before adding external routes. |
| Offline operation | Core records are local. | Google Fonts and speech recognition may require network; no offline regression gate. |
| Upgrade/install path | Application ID is stable. | Fixed version code and debug signing prevent a proper durable release/update channel. |

---

# Minimal hardening plan

## Phase 1 — Block immediate security exposure

1. Remove unused `jspdf`/`jspdf-autotable` or upgrade to fixed versions; upgrade the Capacitor CLI/transitives; refresh only the selected npm lock; run full and production-only audits.
2. Replace report template interpolation/`document.write` with safe DOM/text rendering and escape CSV fields/formulas.
3. Set the financial-data backup policy: disable Android backup and add extraction exclusions, or migrate records to encrypted storage with explicit narrow rules.
4. Narrow `file_paths.xml` to a dedicated cache export directory and activate keystore ignores.

## Phase 2 — Make CI deterministic and protective

5. Standardize npm: remove/regenerate the stale Bun lock, declare exact Node/npm/package-manager versions, and replace `npm install` with `npm ci`.
6. Add pull-request CI gates: dependency audit policy, ESLint, no-emit TypeScript, web tests/build, Capacitor sync, Gradle unit tests, Android lint, and debug assembly.
7. Fix the stale Android test identity and add device/emulator smoke coverage for speech permission, local persistence, backup export/share, CSV export, report generation, and offline launch.
8. Pin Actions to full SHAs, add `permissions: contents: read`, pin the runner/toolchain, add the Gradle distribution checksum, and enable Gradle dependency verification.
9. Protect `main` and require these checks.

## Phase 3 — Establish a real release process

10. Add a protected tag/manual release workflow with monotonic versioning, release AAB/APK signing, signature verification, checksums, SBOM/provenance, and immutable GitHub Release assets.
11. Keep push-built debug APKs explicitly non-release and short-lived; set retention and concurrency in source.
12. Add a staged upgrade matrix for Capacitor/Core/plugins, target SDK, Android WebView behavior, and at least one API 24 device plus current Android API.

---

# Checks performed

Non-mutating/read-only checks used during the audit:

- Git tree/ref/status inspection and exact `HEAD:<file>` reads.
- JSON parsing and root comparison of `package.json` / `package-lock.json`.
- Integrity/resolution scan of all 543 locked package entries.
- `npm ls --all --json` — passed with no dependency-tree problems.
- `npm install --package-lock-only --ignore-scripts --dry-run --json` — reported 0 added, 0 removed, 0 changed and did not alter repository status.
- `npm audit --package-lock-only --audit-level=low --json` — reported 18 vulnerable packages.
- YAML parse of the GitHub workflow — passed.
- Read-only inspection of the Capacitor 8.0.2 Android template and installed plugin manifests.
- Gradle wrapper SHA-256 comparison against Gradle's published 8.14.3 checksum — passed.
- Read-only GitHub Actions, artifact, tag, Release, and branch-protection queries.

A fresh local TypeScript/ESLint run was **not conclusive** because the pre-existing local `node_modules` installation is incomplete/corrupted (the binaries could not load installed package files). It was not repaired because installation/mutation was prohibited. No local Android build was attempted because the SDK/generated sync files were unavailable and builds/syncs are mutating; the successful GitHub run for the exact audited SHA supplies compilation evidence but not the missing quality/release gates.

---

## Part IV — Whole-repository QA and architecture

# Aureus whole-repository QA/architecture audit

## Scope and evidence
- Audited current `main` only: `e4dcc5bf3707d807847e5c9b28e1c739cc5b40b7` (`origin/main` at the same commit). Divergent auto-record was not used.
- No source/config was edited and no package was installed. The user-owned `AGENTS.md` deletion was ignored.
- Direct Vite production build passed: 3,379 modules; main JS 866.90 kB minified / 257.68 kB gzip; Vite emitted a >500 kB warning.
- Direct TypeScript checks: app failed; config check passed. Direct ESLint: 3 errors and 8 warnings. `npm audit --omit=dev`: 11 vulnerabilities (2 critical, 6 high, 3 moderate).
- Android tests/build could not be executed locally because Java/JAVA_HOME is unavailable. The committed test sources and CI were inspected.
- The local `node_modules/.bin` wrappers are malformed, so `npm run build` failed locally before Vite; direct `node node_modules/vite/bin/vite.js build` passed. This workspace condition is not attributed to the repository.

## Prioritized confirmed defects

### P0 — Financial correctness/data integrity
1. **Voice input misparses common Indonesian `Rp` amounts by orders of magnitude.** Preprocessing turns `Rp 100.000` into `Rp 100000`, then the `Rp` regex permits only 1–3 leading digits unless separators follow, so it captures `100`; likewise `Rp 5.500.000` becomes `550`. Exact refs: `src/components/VoiceInput.tsx:342-355`, `src/components/VoiceInput.tsx:394-404`, `src/components/VoiceInput.tsx:462-473`. The parser is embedded in a 733-line UI component and has no executable tests.
2. **A zero/negative subscription cycle can create an unbounded renewal loop and repeated expenses.** Number inputs have no positive minimum; submit checks only non-empty strings, then accepts `Number(cycleDays)`. For `0`, renewal leaves `nextPaymentDate` unchanged, updates state, reruns the effect, and adds another transaction repeatedly. Negative cycles move farther into the past. Negative/zero amounts are also accepted. Exact refs: `src/components/SubscriptionManager.tsx:58-99`, `src/components/SubscriptionManager.tsx:108-146`, `src/components/SubscriptionManager.tsx:222-249`.
3. **Renewal recording is non-atomic and non-idempotent.** Adding the transaction and advancing/saving the subscription occur in separate parent/child state and localStorage effects; interruption between them duplicates the expense on restart. Catch-up renewals are all dated “now,” not their due dates. Exact refs: `src/components/SubscriptionManager.tsx:63-99`, `src/pages/Index.tsx:92-104`.

### P1 — Security, data loss, and broken quality gates
4. **Restore-to-report is a confirmed stored HTML/script-injection path.** Restore accepts arbitrary category/description strings from user-selected JSON; PDF export interpolates them directly into HTML and calls `document.write` in a same-origin child window. A crafted backup can execute markup/script when PDF export is opened. Exact refs: `src/components/BackupRestore.tsx:80-121`, `src/components/MonthlyReports.tsx:109-176`.
5. **Restore validation can replace good data with semantically invalid/partial data.** It does not validate schema version, finite positive amount, valid date, non-empty/unique ID, known category, file size, or all-or-nothing row validity; invalid rows are silently dropped and one valid row is enough to replace everything, without a confirmation step. Exact refs: `src/components/BackupRestore.tsx:80-129`, `src/pages/Index.tsx:111-114`.
6. **Persisted subscription and quote data can crash effects on malformed storage.** Both call `JSON.parse` without a guard or schema validation. Subscription objects are trusted before date/arithmetic use. Exact refs: `src/components/SubscriptionManager.tsx:46-51`, `src/components/SmartInsights.tsx:39-57`. Transaction loading is guarded but still accepts zero/negative amounts and arbitrary categories (`src/pages/Index.tsx:44-89`).
7. **“All-Time” state is behaviorally inconsistent.** The home toggle sets page-level `isAllTime` and disables the statistics period selector, but the statistics table/chart/category components are not passed `isAllTime`; they continue showing one selected month. Exact refs: `src/pages/Index.tsx:211-233`, `src/pages/Index.tsx:249-284`; optional all-time branches exist at `src/components/TransactionTable.tsx:23-56`, `src/components/StatisticsChart.tsx:26-67`, and `src/components/TransactionByCategory.tsx:14-31`.
8. **Date semantics mix UTC calendar days and local calendar days.** Defaults and “today” use `toISOString().split('T')[0]`, transaction filtering elsewhere uses local `Date` fields, and daily summary compares UTC date substrings. Around timezone day boundaries, transactions/default dates can be assigned to the wrong Indonesian calendar day. Exact refs: `src/components/TransactionForm.tsx:17-24`, `src/components/TransactionForm.tsx:75-87`, `src/components/TransactionSummary.tsx:13-24`, `src/components/SubscriptionManager.tsx:36-43`.
9. **The repository does not pass TypeScript.** `BudgetManager` imports a nonexistent `Budget` export from the page module. Exact refs: `src/components/BudgetManager.tsx:8-15`, `src/pages/Index.tsx:20-27`. It is dead code, but `tsconfig.app.json` includes all `src`, so `tsc -p tsconfig.app.json` fails.
10. **Lint is red and configured to conceal dead code.** Confirmed errors: `SubscriptionManager.tsx:70` (`prefer-const`), `TransactionByCategory.tsx:68` (`no-explicit-any`), `TransactionSummary.tsx:4` (restricted global name shadowing); 8 hook/fast-refresh warnings remain. Unused-variable lint is explicitly disabled (`eslint.config.js:20-27`) and TS unused checks/strict mode are off (`tsconfig.app.json:17-22`).
11. **CI can publish an APK despite type, lint, test, and audit failures.** `build` is only `vite build`; there is no `typecheck` or `test` script. CI runs only on pushes to main, uses `npm install`, then Vite build/Capacitor sync/debug APK; it runs no PR gate, lint, `tsc`, tests, audit, Android lint, or release build. Exact refs: `package.json:6-11`, `.github/workflows/android-build.yml:3-50`.
12. **Current locked production tree has known vulnerabilities.** Audit confirmed 11 advisories. Notable locked nodes: unused direct `jspdf@4.0.0` is critical (`package.json:57-58`, `package-lock.json:5502-5508`); `tar@7.5.7` via Capacitor CLI (`package-lock.json:7021-7026`); `@xmldom/xmldom@0.8.11` (`package-lock.json:3840-3845`); `lodash@4.17.23` via Recharts (`package-lock.json:5595-5599`); and `react-router(-dom)@6.30.3` (`package-lock.json:6407-6427`). Applicability varies, but the vulnerable resolved tree is confirmed.

### P2 — Export correctness, dead code, bundle, and maintainability
13. **CSV export is not valid/safe CSV for arbitrary transaction text.** Cells are joined with commas without quoting embedded commas, quotes, CR/LF, or neutralizing spreadsheet formulas (`=`, `+`, `-`, `@`). Exact refs: `src/components/MonthlyReports.tsx:48-69`.
14. **There is no meaningful feature test suite.** No TS/TSX test files or JS test command exist. Android tests are generated placeholders; the instrumentation test expects `com.getcapacitor.app`, while the application ID is `com.aureus.moneytracking`, so it is guaranteed to fail if run. Exact refs: `android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java:12-17`, `android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java:17-25`, `android/app/build.gradle:6-12`.
15. **The initial bundle is monolithic.** All tabs/features and charts are eagerly imported by `src/pages/Index.tsx:2-18`; no dynamic imports/manual chunks exist in `vite.config.ts:7-22`. The confirmed main chunk is 866.90 kB minified. Query Client and two toast systems are mounted despite no query usage and no confirmed Sonner calls (`src/App.tsx:1-23`).
16. **Dead source/dependency surface is large.** Static reachability from `src/main.tsx` found 35 unreachable TS/TSX files: `BudgetManager`, `TransactionHistory`, `use-mobile`, and 31 `src/components/ui/*` modules. `src/App.css` is also unimported. Dependencies used only by unreachable UI include many Radix packages plus `cmdk`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-hook-form`, `react-resizable-panels`, and `vaul`. Direct imports were not found for `@capacitor/haptics`, `@hookform/resolvers`, `framer-motion`, `jspdf`, `jspdf-autotable`, `zod`, or `@tailwindcss/typography` (`package.json:19-21,55-58,72,76`).
17. **Domain boundaries are inverted and persistence is fragmented.** Reusable components import the `Transaction` domain type from route UI (`src/pages/Index.tsx`) rather than a domain module. Transactions, subscriptions, theme, filters, and quotes each access localStorage independently; load/save effects first render empty state and then write it, creating transient overwrite windows. Exact refs: `src/pages/Index.tsx:44-96`, `src/components/SubscriptionManager.tsx:46-62`, `src/components/ThemeToggle.tsx:6-19`, `src/components/TransactionTable.tsx:35-50`.
18. **Core business constants/derivations are duplicated.** Category lists occur independently in form, voice parser, and dead budget code; month names and month/year filtering are repeated; currency/date formatting and income/expense reductions are repeated across summary, reports, charts, table, and category views. Representative refs: `src/components/TransactionForm.tsx:26-47`, `src/components/VoiceInput.tsx:56-77`, `src/pages/Index.tsx:38-41`, `src/components/MonthlyReports.tsx:21-45`.
19. **Android financial-data hardening is absent.** OS backup is enabled and FileProvider exposes whole external/cache roots (`android/app/src/main/AndroidManifest.xml:4-10`, `android/app/src/main/res/xml/file_paths.xml:2-4`). The provider is not exported, which limits exposure, but backup/exposed path scope should be explicitly minimized for sensitive local finance data.
20. **Reproducibility is ambiguous.** Both `package-lock.json` and `bun.lockb` are tracked, while CI chooses npm and the manifest declares neither `packageManager` nor Node/npm engines (`package.json:1-5`, `.github/workflows/android-build.yml:17-35`).

## Suggestions (not asserted as current feature failures)
- Prefer one typed application repository/store with versioned migrations; IndexedDB is the scalable option, while a localStorage adapter can preserve current behavior initially.
- Use canonical domain modules for transaction/subscription types, categories, local-calendar utilities, ID generation, money formatting, selectors, and export codecs; keep UI and Capacitor adapters at the edges.
- Include every user-owned persisted domain (especially subscriptions) in a versioned backup envelope while retaining backward-compatible transaction-only restore.
- Consider locally bundling the Google font (`index.html:14-16`) for offline/privacy reliability and honoring `prefers-reduced-motion` for the many perpetual animations.

## Staged low-regression implementation plan
1. **Baseline/gates:** choose npm, declare `packageManager`/engines, retain one lockfile, add `typecheck` and test scripts, and add PR CI using clean `npm ci`; record current UI flows and bundle sizes before refactoring.
2. **Characterization tests first:** extract pure functions without changing outputs; cover voice examples (including `Rp 100.000`), local-day boundaries, totals/filters, subscription renewal schedules, storage normalization/migrations, CSV escaping, and backup compatibility.
3. **Stop financial corruption:** enforce finite positive amount/cycle constraints; make renewal planning idempotent with stable renewal IDs and due-date timestamps; persist transaction plus advanced schedule atomically or via a recoverable journal; repair parser precedence/regex with golden tests.
4. **Harden storage/restore/export:** lazy-initialize validated state so mount never writes empty defaults over loaded data; use a versioned schema and bounded file size; preview counts/errors and require confirmation before replace; reject the whole invalid restore; escape RFC 4180 CSV and neutralize spreadsheet formulas; generate print DOM with text nodes or rigorously escape all interpolated values.
5. **Unify dates/state:** represent calendar dates explicitly, centralize timezone-safe conversion/selectors, pass period mode consistently, and migrate existing ISO records compatibly. Move domain types/constants/selectors out of `Index.tsx`; add a repository/context boundary before altering UI composition.
6. **Restore static health:** remove/fix `BudgetManager`, eliminate `any`/lint errors and stale imports/state, enable unused checks, then raise strictness incrementally module-by-module. Keep generated shadcn warnings scoped rather than globally weakening rules.
7. **Reduce attack/bundle surface:** remove confirmed-unused libraries first (especially vulnerable jsPDF), update and re-audit necessary direct/transitive dependencies, then delete unreachable UI only after import and visual regression checks. Lazy-load chart, voice, reports, subscriptions, backup, and non-active tabs; set an enforced bundle budget.
8. **Android/CI hardening:** correct test package, add real unit/instrumented smoke tests, Android lint and `testDebugUnitTest`, restrict backup/FileProvider paths, pin Actions to immutable SHAs, cache safely, and upload APK only after web and Android gates pass.

## Verification plan
- Clean checkout: `npm ci`; `npm run typecheck`; lint with zero errors and an agreed warning ceiling; unit/component tests; production build; dependency audit with policy threshold; lockfile-drift check.
- Unit matrix: Indonesian number/slang parsing; zero/negative/NaN rejection; overdue multi-cycle/idempotent renewals; UTC±14/local-midnight dates; corrupt/legacy/current backups; duplicate IDs; CSV commas/quotes/newlines/formulas; HTML payloads rendered as text.
- Web integration/E2E: fresh install and upgrade with existing storage; add/delete/reload; all-time versus monthly stats; subscription restart/interruption; backup/restore cancel/confirm; CSV/print; mocked voice permission/results/errors; theme and all tab flows.
- Bundle: compare route/tab chunks and enforce initial-JS gzip budget below the recorded 257.68 kB baseline without removing behavior.
- Android: clean `cap sync android`, Gradle unit tests/lint/assemble, emulator instrumentation, microphone deny/grant, speech result, backup/restore share, CSV share, process death/relaunch, timezone changes, and offline startup.
- Final regression: compare transaction totals, categories, reports, subscription schedules, backup compatibility, visual states, and APK installation against the pre-change baseline; release stages independently so each can be reverted without data migration loss.

---

## Part V — UI, reports, exports, responsiveness, and accessibility

# Aureus UI, reports, exports, and accessibility audit

## Scope and verification

- Audited current `main` at `e4dcc5b`; divergent auto-record work was excluded.
- Reviewed all active user-facing flows: navigation, transaction entry, voice modal, statistics, subscriptions, monthly reports, backup/restore, theme, responsive layout, and accessibility.
- Findings below were independently verified against the source by the coordinating assistant. No application source was edited for this audit.

## Prioritized confirmed defects

### P0 — Security and financial-operation safety

1. **Monthly “PDF” printing allows stored HTML/script injection.** Transaction category and description are interpolated into active HTML and passed to `document.write` (`src/components/MonthlyReports.tsx:108-175`). A crafted manual/imported transaction can execute markup in the report window. Build report nodes with DOM APIs and `textContent`, or escape every dynamic value context-correctly. Test script/image/event-handler payloads and confirm they render only as text.

2. **CSV output is malformed for normal text and unsafe in spreadsheet applications.** Rows are joined with commas without quoting commas, quotes, CR/LF, or formula-prefixed cells (`src/components/MonthlyReports.tsx:48-69`). Use RFC 4180 escaping, a UTF-8 BOM where needed, and neutralize cells beginning with `=`, `+`, `-`, or `@`. Test commas, quotes, multiline descriptions, Unicode, and formula payloads.

3. **Restore replaces the complete ledger immediately after file selection.** A passive warning is displayed, but valid input invokes replacement without a preview or confirmation (`src/components/BackupRestore.tsx:74-145,216-220`; `src/pages/Index.tsx:112-114`). Validate first, display current/imported counts and scope, require explicit confirmation, and preserve a rollback snapshot. Test cancel, invalid input, partial input, and confirmed replacement.

4. **Manual transaction submission can duplicate or survive cancellation.** Every submit queues a 1.2-second timer while submit and close controls remain enabled (`src/components/TransactionForm.tsx:73-99,110,192-198`). Double activation queues duplicates; closing before timeout does not cancel the pending transaction. Commit once behind a synchronous guard and make animation independent, or retain/clear the timer under an explicit cancellation contract. Test double-click, Enter plus click, close-after-save, and unmount.

### P1 — Incorrect or misleading UI behavior

5. **All-Time mode disables period controls but statistics remain monthly.** Page-level `isAllTime` disables the selector (`src/pages/Index.tsx:205-241`) but is not passed to the three components that implement all-time behavior (`src/pages/Index.tsx:260-283`; `src/components/TransactionTable.tsx:26-57`; `src/components/StatisticsChart.tsx:37-68`; `src/components/TransactionByCategory.tsx:17-32`). Pass it consistently or keep the summary toggle local. Test rows, totals, chart buckets, categories, and control state together.

6. **Calendar dates can display under the wrong day around timezone boundaries.** Date-input defaults and daily comparisons use UTC strings while month/day displays use local `Date` methods (`src/components/TransactionForm.tsx:18-24,76-96`; `src/components/TransactionSummary.tsx:13-40`; `src/components/SubscriptionManager.tsx:38-43,112-145`). Centralize local calendar parsing/formatting and use one period convention. Test `Asia/Jakarta`, UTC, and negative offsets around midnight and month/year boundaries.

7. **The bottom navigation overflows narrow mobile viewports.** Five items each require at least 72 px and also use horizontal padding inside a padded container (`src/components/BottomNav.tsx:22-57`). At 360 px and below, their combined minimum width exceeds the content area. Use five equal `flex-1 min-w-0` targets with responsive padding/text sizing. Test 320, 360, 375, and 412 px widths with long Indonesian labels.

8. **Fixed header and navigation reference undefined safe-area utilities.** `safe-area-top` and `safe-area-bottom` are used (`src/components/Header.tsx:7`; `src/components/BottomNav.tsx:22`) but only `.pb-nav` is defined (`src/index.css:212-216`). On notched/gesture-navigation devices, controls can overlap system insets. Define top/bottom inset padding and make fixed-bar/content heights derive from the same tokens. Test portrait/landscape with display cutouts and gesture navigation.

9. **Transaction and voice modals can be clipped by small screens or the software keyboard.** Their fixed centered panels have no `max-height` or internal scrolling (`src/components/TransactionForm.tsx:102-202`; `src/components/VoiceInput.tsx:581-729`). Use `max-h-[calc(100dvh-...)] overflow-y-auto`, safe-area padding, and keyboard-aware viewport sizing. Test short landscape, 320×568, font scaling, and focused text fields.

10. **A stale category filter can produce an unexplained empty breakdown after changing periods.** `selectedCategory` persists while available categories are recalculated (`src/components/TransactionByCategory.tsx:24-40,79-89`). If the selected category is absent in the new month, no option represents the current value and all results disappear. Reset to `all` when the category becomes unavailable or clearly show/remove the active filter. Test switching between disjoint months.

11. **Web CSV export leaks object URLs, while PDF failure can be silent.** The CSV path creates but never revokes a blob URL (`src/components/MonthlyReports.tsx:87-97`); the PDF path provides no feedback when `window.open` returns null (`src/components/MonthlyReports.tsx:172-181`). Revoke after activation and report blocked/unsupported printing. Test repeated exports and blocked popups.

### P1 — Accessibility blockers

12. **Both custom modals lack dialog semantics and focus management.** The overlays have no `role="dialog"`, `aria-modal`, labelled title, initial focus, focus trap, Escape handling, or focus restoration (`src/components/TransactionForm.tsx:102-116`; `src/components/VoiceInput.tsx:581-594`). Use the existing accessible dialog primitive or implement the full WAI-ARIA dialog pattern. Test keyboard-only and screen-reader workflows.

13. **Several icon-only controls have no accessible names.** Missing labels include modal close, voice category edit, ledger/category/subscription delete, and related icon buttons (`src/components/TransactionForm.tsx:110-112`; `src/components/VoiceInput.tsx:589-591,668-675`; `src/components/TransactionTable.tsx:203-215`; `src/components/TransactionByCategory.tsx:135-144`; `src/components/SubscriptionManager.tsx:318-325`). Add contextual Indonesian `aria-label`s and keep decorative icons hidden from assistive technology. Test computed accessible names.

14. **Ledger rows expose description only through a mouse/touch click on a non-interactive `div`.** Rows have `onClick` but no keyboard role, tab stop, or key handler (`src/components/TransactionTable.tsx:152-173`). The delete button is `opacity-0` and becomes visible only on group hover (`src/components/TransactionTable.tsx:203-215`), making it invisible for keyboard and unreliable on touch. Use semantic buttons/disclosure, `focus-within` visibility, and always-visible mobile actions. Test Tab, Enter, Space, touch, and screen-reader navigation.

15. **Subscription form labels are not programmatically associated with inputs.** Labels for service, amount, date, and duration have no `htmlFor`, and inputs have no IDs (`src/components/SubscriptionManager.tsx:214-255`). Add stable IDs and associations, constraints, descriptions, and inline validation. Test label activation and accessible-name computation.

16. **Meaningful success/destructive colors fail contrast in the light theme.** The source tokens produce approximately 1.65:1 for success foreground on success and 1.90:1 for destructive foreground on destructive; status colors against the pale background are similarly below WCAG thresholds (`src/index.css:11-47`). These colors are used for totals, selected filters, and actions (`src/components/TransactionTable.tsx:88-108`; `src/components/MonthlyReports.tsx:235-263`). Replace tokens with contrast-tested pairs and verify normal text at ≥4.5:1 and large/UI graphics at ≥3:1.

17. **Continuous and large animations ignore reduced-motion preferences.** Drifting currency icons, spinning icons, floating empty states, pulsing recognition, and coin rain run without an active `prefers-reduced-motion` override (`src/index.css:108-175`; `src/pages/Index.tsx:124-181`; `src/components/TransactionForm.tsx:204-223`; `src/components/TransactionTable.tsx:120-149`). The only reduced-motion rule is in unimported `src/App.css`. Add a global reduce-motion override and remove nonessential infinite animation for affected users. Test emulated reduced motion.

## Maintainability and UX improvements

- Centralize currency/date/month formatting, period selection, and category definitions so every tab displays the same value and locale.
- Replace browser `confirm` calls with one accessible confirmation component and consistent copy.
- Keep destructive actions visible and recoverable; add a short undo where practical.
- Use responsive one-column forms on the smallest widths and enforce minimum 44×44 px touch targets.
- Add component/E2E coverage for every tab, empty state, error state, dark/light theme, keyboard flow, 200% text zoom, and Android safe areas.

## Minimal UI verification checklist

1. Run automated axe/accessibility-name checks and keyboard traversal for every tab and modal.
2. Capture visual regressions at 320/360/375/768/1280 px, light/dark, reduced motion, and 200% text zoom.
3. Verify All-Time/monthly totals agree across summary, ledger, chart, category breakdown, and reports.
4. Verify CSV with punctuation/formulas and print reports with hostile HTML render safely and accurately.
5. Verify add/cancel/double-submit, delete confirmation, restore cancel/confirm/rollback, and corrupted-storage states.
6. Verify Android cutouts, gesture navigation, keyboard opening, orientation changes, sharing, and offline fallback behavior.
