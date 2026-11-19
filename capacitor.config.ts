import type { CapacitorConfig } from '@capacitor/cli';

/**
 * MathMaster Pro — Capacitor Configuration
 *
 * Pre-configured for Android packaging and future Google AdMob + UMP integration.
 * Real production AdMob App IDs must ONLY be supplied via Android strings.xml / CI secrets
 * at release time — never commit invented or unverified production IDs.
 */
const config: CapacitorConfig = {
  appId: 'com.mathmasterpro.calculator',
  appName: 'MathMaster Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    AdMob: {
      // Development & testing default: always use Google's official test App ID in Android strings.xml
      // Replace android/app/src/main/res/values/strings.xml (admob_app_id) before Play Store release.
      testingDevices: [],
      initializeForTesting: true,
    },
  },
};

export default config;
