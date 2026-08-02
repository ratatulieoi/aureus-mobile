import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aureus.moneytracking',
  appName: 'Aureus',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      // Capacitor 8 injects --safe-area-inset-* for affected Android
      // WebViews. Phase 3 CSS consumes those values before env() fallbacks.
      insetsHandling: 'css',
      hidden: false,
      style: 'DEFAULT',
    },
  },
};

export default config;
