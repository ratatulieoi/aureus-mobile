# Aureus Project Progress

**Date:** February 6, 2026
**Status:** Functional Prototype (Android & Web)

## 1. Core Features (Completed)
- **Framework:** React + TypeScript + Vite + Tailwind CSS (Yellow Pastel Theme).
- **Platform:**
  - **Web:** Fully responsive PWA.
  - **Android:** Native app via Capacitor (ID: `com.aureus.moneytracking`).
- **AI Voice Engine:**
  - Hybrid parsing (Browser + Native Android).
  - Supports Indonesian slang (*goceng, ceban*) and relative dates (*kemarin, lusa*).
- **Subscription Manager:**
  - Ticket-style UI for recurring payments.
  - Auto-renewal detection logic.
- **Reporting:**
  - Monthly reports with income/expense/net summary.
  - **Export:** CSV Export logic fixed for mobile (using Filesystem/Share plugins) and Web (Blob download).
- **Backup & Restore:**
  - Export all transactions to JSON file with metadata (version, date, transaction count).
  - Import/restore from JSON backup with validation.
  - Mobile support via Filesystem/Share plugins.
  - Web support via direct download/upload.

## 2. Infrastructure & Build
- **CI/CD:** GitHub Actions (`android-build.yml`) auto-compiles APKs on push.
- **Data Persistence:** `localStorage` (Client-side only).

## 3. Recent Fixes
- **Mobile CSV Export:**
  - *Problem:* Mobile WebView blocked direct `<a>` tag downloads.
  - *Fix:* Implemented `Capacitor Filesystem` to write the file and `Capacitor Share` to export it via native sheet.
- **UI Improvements:**
  - Fixed header and bottom nav to use solid backgrounds (no transparency/blur).
  - Voice input now uses background recognition without Google popup overlay.
  - About section box made wider for better visibility.
  - Smart Insights quote system with history tracking (prevents last few quotes from repeating).
  - Transaction Table ("Buku Besar") now remembers last filter selection (Pemasukan/Pengeluaran).
  - Added backup warning banner in "More" tab to remind users before app updates.

## 4. Next Planned Milestones
- **Auto-Recording:** Automatically detect transactions from e-wallet/banking app notifications.
- **Multi-currency Support:** Handling USD/IDR/JPY conversions.
- **Cloud Sync:** Real-time backup via Supabase/Firebase.
- **Code Refactoring:** Clean up `Index.tsx` and centralized state management.
