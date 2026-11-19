import { NavSection } from '../../types/calculator';

export type AdFormat = 'banner' | 'interstitial' | 'rewarded';

/**
 * Official Google Mobile Ads SDK Android Test IDs.
 * Source: https://developers.google.com/admob/android/test-ads
 * Always used during development and testing; never replaced with invented IDs.
 */
export const GOOGLE_OFFICIAL_ANDROID_TEST_IDS = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
} as const;

/**
 * Sections that contain scientific keyboards, equations, graphs, or calculation results.
 * Banners MUST NEVER be rendered on these sections.
 */
export const AD_PROTECTED_MATH_SECTIONS: readonly NavSection[] = [
  'calculator',
  'algebra',
  'calculus',
  'linear-algebra',
  'statistics',
  'complex',
  'numerical',
  'graphing',
] as const;

/**
 * Sections eligible for a non-overlapping banner ad when AdMob is explicitly enabled.
 */
export const AD_BANNER_ALLOWED_SECTIONS: readonly NavSection[] = [
  'home',
  'history',
  'settings',
] as const;

export interface AdMobProductionUnitIds {
  banner: string;
  interstitial: string;
  rewarded: string;
}

export interface AdMobRuntimeConfig {
  /** Master kill-switch. Must stay false until Play Store monetization release. */
  enabled: boolean;
  /** Forces Google's official test ad units & testing mode. Must be true in dev/QA. */
  testMode: boolean;
  /** True when running in dev/preview mode; blocks real production ad requests. */
  isDevEnvironment: boolean;
  /** Optional registered Android test device hashes for Google UMP & AdMob testing. */
  testingDevices: string[];
  /** Production ad unit IDs supplied only via release environment variables. */
  productionUnitIds: AdMobProductionUnitIds;
  /** Minimum interval (ms) between interstitial ads. */
  interstitialCooldownMs: number;
  /** Maximum interstitials allowed per app session. */
  maxInterstitialsPerSession: number;
  /** Whether optional rewarded ads are enabled when AdMob is active. */
  rewardedEnabled: boolean;
  /** Tag for child-directed treatment (COPPA). */
  tagForChildDirectedTreatment: boolean;
  /** Tag for users under the age of consent (TFUA). */
  tagForUnderAgeOfConsent: boolean;
}

const AD_UNIT_ID_PATTERN = /^ca-app-pub-\d{16}\/\d{10}$/;
const TEST_PUBLISHER_PREFIX = 'ca-app-pub-3940256099942544/';

export function isValidProductionAdUnitId(adUnitId: string | undefined | null): boolean {
  if (!adUnitId) return false;
  const trimmed = adUnitId.trim();
  if (!trimmed || trimmed.startsWith(TEST_PUBLISHER_PREFIX)) return false;
  return AD_UNIT_ID_PATTERN.test(trimmed);
}

export function createDefaultAdMobConfig(
  envOverride?: Record<string, string | boolean | undefined>
): AdMobRuntimeConfig {
  const metaEnv =
    envOverride ??
    ((typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env) ||
      {});

  const isDevEnvironment = metaEnv.PROD !== true;
  const envEnabled = String(metaEnv.VITE_ADMOB_ENABLED ?? 'false').toLowerCase() === 'true';
  const envTestMode = String(metaEnv.VITE_ADMOB_TEST_MODE ?? 'true').toLowerCase() !== 'false';
  const rawDevices = String(metaEnv.VITE_ADMOB_TESTING_DEVICES ?? '').trim();

  return {
    // Safety default: advertisements remain disabled until release configuration activates them
    enabled: envEnabled,
    // In development/testing, force test mode on even if someone misconfigures VITE_ADMOB_TEST_MODE
    testMode: isDevEnvironment ? true : envTestMode,
    isDevEnvironment,
    testingDevices: rawDevices
      ? rawDevices
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
      : [],
    productionUnitIds: {
      banner: String(metaEnv.VITE_ADMOB_ANDROID_BANNER_ID ?? '').trim(),
      interstitial: String(metaEnv.VITE_ADMOB_ANDROID_INTERSTITIAL_ID ?? '').trim(),
      rewarded: String(metaEnv.VITE_ADMOB_ANDROID_REWARDED_ID ?? '').trim(),
    },
    interstitialCooldownMs: 180_000, // 3 minutes minimum between interstitials
    maxInterstitialsPerSession: 3,
    rewardedEnabled: false,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  };
}

export interface ResolvedAdUnit {
  allowed: boolean;
  adUnitId: string | null;
  isTesting: boolean;
  reason?: string;
}

/**
 * Resolves the safe ad unit ID to request for a given ad format.
 * Guarantees real production ads are never requested during development/testing
 * or when production unit IDs are missing/unconfigured.
 */
export function resolveAdUnit(format: AdFormat, config: AdMobRuntimeConfig): ResolvedAdUnit {
  if (!config.enabled) {
    return {
      allowed: false,
      adUnitId: null,
      isTesting: true,
      reason: 'AdMob monetization is currently disabled by configuration.',
    };
  }

  if (config.testMode || config.isDevEnvironment) {
    return {
      allowed: true,
      adUnitId: GOOGLE_OFFICIAL_ANDROID_TEST_IDS[format],
      isTesting: true,
    };
  }

  const prodId = config.productionUnitIds[format];
  if (!isValidProductionAdUnitId(prodId)) {
    return {
      allowed: false,
      adUnitId: null,
      isTesting: false,
      reason: `Production ${format} ad unit ID is missing or invalid; refusing ad request.`,
    };
  }

  return {
    allowed: true,
    adUnitId: prodId,
    isTesting: false,
  };
}

/**
 * Enforces UI safety: never show banner ads over calculator keyboards,
 * mathematical equations, graphs, or calculation results.
 */
export function canShowBannerOnSection(section: NavSection): boolean {
  if (AD_PROTECTED_MATH_SECTIONS.includes(section)) return false;
  return AD_BANNER_ALLOWED_SECTIONS.includes(section);
}

/**
 * Checks whether an interstitial ad can safely be shown without disrupting active math work.
 */
export function canShowInterstitialNow(params: {
  config: AdMobRuntimeConfig;
  section: NavSection;
  canRequestAds: boolean;
  lastShownAtMs: number;
  shownThisSession: number;
  nowMs?: number;
}): { allowed: boolean; reason?: string } {
  const {
    config,
    section,
    canRequestAds,
    lastShownAtMs,
    shownThisSession,
    nowMs = Date.now(),
  } = params;

  if (!config.enabled) {
    return { allowed: false, reason: 'Ads disabled.' };
  }
  if (!canRequestAds) {
    return { allowed: false, reason: 'UMP consent has not authorized ad requests.' };
  }
  if (AD_PROTECTED_MATH_SECTIONS.includes(section) && section === 'calculator') {
    return { allowed: false, reason: 'Never interrupt active calculator input.' };
  }
  if (shownThisSession >= config.maxInterstitialsPerSession) {
    return { allowed: false, reason: 'Session interstitial cap reached.' };
  }
  if (lastShownAtMs > 0 && nowMs - lastShownAtMs < config.interstitialCooldownMs) {
    return { allowed: false, reason: 'Interstitial cooldown active.' };
  }
  return { allowed: true };
}
