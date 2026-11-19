# MathMaster Pro — Capacitor Android & Google AdMob Integration Guide

MathMaster Pro is packaged for Android via **Capacitor** with a **dormant, test-safe Google AdMob + UMP (User Messaging Platform) layer**. Advertisements remain **disabled by default** (`VITE_ADMOB_ENABLED="false"`).

---

## 1. Architecture & Safety Guarantees

- **100% Independent Mathematics Engine**: Everything under `src/math/` (expression evaluator, algebra solver, calculus, linear algebra, statistics, complex numbers, numerical methods, graphing, PDF/CSV export) has zero imports from or runtime dependency on `src/services/admob/`.
- **Non-Intrusive Ad Placement Policy**: `canShowBannerOnSection()` strictly blocks banner ads on all calculation workspaces (`calculator`, `algebra`, `calculus`, `linear-algebra`, `statistics`, `complex`, `numerical`, `graphing`), guaranteeing ads never cover the keyboard, equations, graphs, or calculation results. Banners are only eligible on `home`, `history`, and `settings`, positioned at bottom-center above navigation chrome with dynamic CSS inset clearance (`--ad-banner-inset`).
- **Development Test-Only Guardrail**: `createDefaultAdMobConfig()` and `resolveAdUnit()` enforce `testMode = true` in all non-production builds and resolve exclusively Google's official Android test unit IDs:
  - Test App ID: `ca-app-pub-3940256099942544~3347511713`
  - Test Banner: `ca-app-pub-3940256099942544/6300978111`
  - Test Interstitial: `ca-app-pub-3940256099942544/1033173712`
  - Test Rewarded: `ca-app-pub-3940256099942544/5224354917`
- **Google UMP Consent First**: `adMobService.initialize()` calls `syncPrivacyConsent()` (`requestConsentInfo` + `showConsentForm`) prior to `AdMob.initialize()`, and exposes `openPrivacyOptions()` inside **Settings → Android Capacitor & Privacy Readiness**.

---

## 2. Prepared Files

| File | Purpose |
| :--- | :--- |
| `capacitor.config.ts` | Capacitor app ID (`com.mathmasterpro.calculator`), `webDir: 'dist'`, AdMob plugin config |
| `src/services/admob/admobConfig.ts` | Official test IDs, production format validator, protected section list, interstitial cooldown rules |
| `src/services/admob/admobService.ts` | Native Android lifecycle, UMP consent sync, Banner/Interstitial/Rewarded orchestration |
| `src/App.tsx` | Initializes `adMobService` safely on mount and hides banners on math screens |
| `src/components/SettingsView.tsx` | Displays runtime platform/consent state & UMP Privacy Preferences button |
| `src/hooks/usePWAInstall.ts` | Suppresses web PWA install prompts inside Capacitor native shells |
| `android/app/src/main/AndroidManifest.xml` | Includes `APPLICATION_ID` metadata (`@string/admob_app_id`), `INTERNET`, `ACCESS_NETWORK_STATE`, `AD_ID` |
| `android/app/src/main/res/values/strings.xml` | Stores `admob_app_id` (currently Google's official sample App ID) |
| `android/app/proguard-rules.pro` | Keep rules for Capacitor WebView bridge, Google Mobile Ads SDK, and UMP SDK |

---

## 3. Local Development & Testing Workflow

1. **Build web assets & sync to Android**:
   ```bash
   npm run android:prepare
   ```
2. **Open Android Studio**:
   ```bash
   npm run cap:open:android
   ```
3. **Testing test ads safely (optional QA)**:
   - Keep `VITE_ADMOB_TEST_MODE="true"` and leave `android/app/src/main/res/values/strings.xml` using Google's official sample App ID (`ca-app-pub-3940256099942544~3347511713`).
   - Add your Android device/emulator test device hash to `VITE_ADMOB_TESTING_DEVICES` in `.env`.
   - Test with `VITE_ADMOB_ENABLED="true"` **only** when verifying test ad rendering on a device/emulator. Keep `VITE_ADMOB_ENABLED="false"` during normal development.

---

## 4. Production Play Store Release Checklist (When Ready)

1. Register **MathMaster Pro** in the Google AdMob Console and generate your real Android App ID + Ad Unit IDs (Banner, Interstitial, optional Rewarded).
2. Configure your GDPR / US State privacy messages inside **AdMob → Privacy & messaging** (required for Google UMP SDK).
3. Replace `admob_app_id` in `android/app/src/main/res/values/strings.xml` with your real AdMob App ID.
4. Set production build environment variables cleanly (never in dev):
   - `VITE_ADMOB_ENABLED="true"`
   - `VITE_ADMOB_TEST_MODE="false"`
   - `VITE_ADMOB_ANDROID_BANNER_ID`
   - `VITE_ADMOB_ANDROID_INTERSTITIAL_ID`
   - `VITE_ADMOB_ANDROID_REWARDED_ID` (if activating rewarded features)
5. Run `npm run android:prepare`, configure keystore signing in `android/app/build.gradle`, and generate the signed `.aab` in Android Studio (`Build → Generate Signed Bundle / APK`).
6. Complete Play Console Data Safety & Advertising ID declarations (`com.google.android.gms.permission.AD_ID`).
