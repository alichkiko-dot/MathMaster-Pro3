import {
  AdMob,
  AdMobBannerSize,
  AdMobRewardItem,
  AdmobConsentDebugGeography,
  AdmobConsentInfo,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  MaxAdContentRating,
} from '@capacitor-community/admob';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { NavSection } from '../../types/calculator';
import {
  AdMobRuntimeConfig,
  canShowBannerOnSection,
  canShowInterstitialNow,
  createDefaultAdMobConfig,
  resolveAdUnit,
} from './admobConfig';

export interface AdMobServiceState {
  isNativeAndroid: boolean;
  initialized: boolean;
  enabled: boolean;
  testMode: boolean;
  consentStatus: AdmobConsentStatus;
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
  bannerVisible: boolean;
  bannerHeightPx: number;
  interstitialPrepared: boolean;
  rewardedPrepared: boolean;
  lastError: string | null;
}

export interface RewardedAdOutcome {
  rewarded: boolean;
  reward?: AdMobRewardItem;
  reason?: string;
}

type StateListener = (state: AdMobServiceState) => void;

class AdMobService {
  private config: AdMobRuntimeConfig;
  private listeners = new Set<StateListener>();
  private pluginListeners: PluginListenerHandle[] = [];
  private currentSection: NavSection = 'calculator';
  private lastInterstitialAt = 0;
  private interstitialsShown = 0;
  private initPromise: Promise<void> | null = null;

  private state: AdMobServiceState;

  constructor(config?: AdMobRuntimeConfig) {
    this.config = config ?? createDefaultAdMobConfig();
    const isNativeAndroid =
      typeof Capacitor !== 'undefined' &&
      Capacitor.isNativePlatform() &&
      Capacitor.getPlatform() === 'android';

    this.state = {
      isNativeAndroid,
      initialized: false,
      enabled: this.config.enabled,
      testMode: this.config.testMode,
      consentStatus: AdmobConsentStatus.UNKNOWN,
      canRequestAds: false,
      privacyOptionsRequired: false,
      bannerVisible: false,
      bannerHeightPx: 0,
      interstitialPrepared: false,
      rewardedPrepared: false,
      lastError: null,
    };
  }

  getConfig(): AdMobRuntimeConfig {
    return this.config;
  }

  getState(): AdMobServiceState {
    return { ...this.state };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(patch: Partial<AdMobServiceState>) {
    this.state = { ...this.state, ...patch };
    if (typeof document !== 'undefined') {
      const inset = this.state.bannerVisible ? Math.max(0, this.state.bannerHeightPx) : 0;
      document.documentElement.style.setProperty('--ad-banner-inset', `${inset}px`);
    }
    const snapshot = this.getState();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  /**
   * Initializes Google UMP consent first, then initializes the Google Mobile Ads SDK
   * strictly on Capacitor Android when AdMob is enabled.
   * Mathematical functionality never blocks on or depends on this call.
   */
  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!this.state.isNativeAndroid || !this.config.enabled) {
        return;
      }

      try {
        await this.attachBannerListeners();
        await this.syncPrivacyConsent();

        await AdMob.initialize({
          initializeForTesting: this.config.testMode || this.config.isDevEnvironment,
          testingDevices: this.config.testingDevices,
          tagForChildDirectedTreatment: this.config.tagForChildDirectedTreatment,
          tagForUnderAgeOfConsent: this.config.tagForUnderAgeOfConsent,
          maxAdContentRating: MaxAdContentRating.General,
        });

        this.updateState({ initialized: true, lastError: null });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'AdMob initialization skipped.';
        this.updateState({ lastError: msg });
      }
    })();

    return this.initPromise;
  }

  /**
   * Google User Messaging Platform (UMP) SDK consent synchronization.
   * Requests consent info and presents the GDPR / US state privacy form if required.
   */
  async syncPrivacyConsent(): Promise<AdmobConsentInfo | null> {
    if (!this.state.isNativeAndroid) return null;

    try {
      let info = await AdMob.requestConsentInfo({
        tagForUnderAgeOfConsent: this.config.tagForUnderAgeOfConsent,
        ...(this.config.testMode && this.config.testingDevices.length > 0
          ? {
              debugGeography: AdmobConsentDebugGeography.EEA,
              testDeviceIdentifiers: this.config.testingDevices,
            }
          : {}),
      });

      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        info = await AdMob.showConsentForm();
      }

      this.updateState({
        consentStatus: info.status,
        canRequestAds: Boolean(info.canRequestAds),
        privacyOptionsRequired:
          String(info.privacyOptionsRequirementStatus) === 'REQUIRED',
        lastError: null,
      });

      return info;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Consent check failed.';
      this.updateState({ canRequestAds: false, lastError: msg });
      return null;
    }
  }

  /**
   * Opens Google's UMP Privacy Options form so users can review or revoke ad consent.
   */
  async openPrivacyOptions(): Promise<boolean> {
    if (!this.state.isNativeAndroid) return false;
    try {
      await AdMob.showPrivacyOptionsForm();
      await this.syncPrivacyConsent();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to open privacy options.';
      this.updateState({ lastError: msg });
      return false;
    }
  }

  /**
   * Resets UMP consent state for QA testing ONLY when testMode is active.
   */
  async resetPrivacyConsentForDebug(): Promise<void> {
    if (!this.state.isNativeAndroid || !this.config.testMode) return;
    await AdMob.resetConsentInfo();
    this.updateState({
      consentStatus: AdmobConsentStatus.UNKNOWN,
      canRequestAds: false,
      privacyOptionsRequired: false,
    });
  }

  private async attachBannerListeners() {
    if (this.pluginListeners.length > 0) return;
    try {
      const sizeHandle = await AdMob.addListener(
        BannerAdPluginEvents.SizeChanged,
        (size: AdMobBannerSize) => {
          this.updateState({ bannerHeightPx: Math.max(0, size.height || 0) });
        }
      );
      const loadedHandle = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        this.updateState({ bannerVisible: true, lastError: null });
      });
      const failedHandle = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (err) => {
        this.updateState({ bannerVisible: false, bannerHeightPx: 0, lastError: err.message });
      });
      this.pluginListeners.push(sizeHandle, loadedHandle, failedHandle);
    } catch {
      // ignore on web
    }
  }

  /**
   * Automatically shows or hides banner ads on navigation changes,
   * ensuring banners NEVER display over keyboards, equations, or calculation results.
   */
  async onSectionChange(section: NavSection): Promise<void> {
    this.currentSection = section;
    if (!this.state.isNativeAndroid || !this.config.enabled) {
      if (this.state.bannerVisible) {
        await this.hideBanner();
      }
      return;
    }

    if (canShowBannerOnSection(section)) {
      await this.showSafeBanner(section);
    } else {
      await this.hideBanner();
    }
  }

  async showSafeBanner(section: NavSection = this.currentSection): Promise<boolean> {
    if (!canShowBannerOnSection(section)) {
      await this.hideBanner();
      return false;
    }

    if (!this.state.isNativeAndroid || !this.state.initialized || !this.state.canRequestAds) {
      return false;
    }

    const resolved = resolveAdUnit('banner', this.config);
    if (!resolved.allowed || !resolved.adUnitId) return false;

    try {
      await AdMob.showBanner({
        adId: resolved.adUnitId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 60, // Clears mobile bottom navigation bar cleanly
        isTesting: resolved.isTesting,
        npa: this.state.consentStatus !== AdmobConsentStatus.OBTAINED,
      });
      this.updateState({ bannerVisible: true });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Banner ad failed to show.';
      this.updateState({ bannerVisible: false, bannerHeightPx: 0, lastError: msg });
      return false;
    }
  }

  async hideBanner(): Promise<void> {
    if (!this.state.isNativeAndroid) {
      this.updateState({ bannerVisible: false, bannerHeightPx: 0 });
      return;
    }
    try {
      await AdMob.hideBanner();
    } catch {
      // ignore if banner was not created yet
    } finally {
      this.updateState({ bannerVisible: false, bannerHeightPx: 0 });
    }
  }

  async removeBanner(): Promise<void> {
    if (!this.state.isNativeAndroid) {
      this.updateState({ bannerVisible: false, bannerHeightPx: 0 });
      return;
    }
    try {
      await AdMob.removeBanner();
    } catch {
      // ignore
    } finally {
      this.updateState({ bannerVisible: false, bannerHeightPx: 0 });
    }
  }

  async prepareInterstitial(): Promise<boolean> {
    if (!this.state.isNativeAndroid || !this.state.initialized || !this.state.canRequestAds) {
      return false;
    }
    const resolved = resolveAdUnit('interstitial', this.config);
    if (!resolved.allowed || !resolved.adUnitId) return false;

    try {
      await AdMob.prepareInterstitial({
        adId: resolved.adUnitId,
        isTesting: resolved.isTesting,
        npa: this.state.consentStatus !== AdmobConsentStatus.OBTAINED,
      });
      this.updateState({ interstitialPrepared: true });
      return true;
    } catch {
      this.updateState({ interstitialPrepared: false });
      return false;
    }
  }

  async showInterstitialIfEligible(): Promise<boolean> {
    const check = canShowInterstitialNow({
      config: this.config,
      section: this.currentSection,
      canRequestAds: this.state.canRequestAds,
      lastShownAtMs: this.lastInterstitialAt,
      shownThisSession: this.interstitialsShown,
    });
    if (!check.allowed || !this.state.isNativeAndroid || !this.state.initialized) {
      return false;
    }

    try {
      if (!this.state.interstitialPrepared) {
        const prepared = await this.prepareInterstitial();
        if (!prepared) return false;
      }
      await AdMob.showInterstitial();
      this.lastInterstitialAt = Date.now();
      this.interstitialsShown += 1;
      this.updateState({ interstitialPrepared: false });
      return true;
    } catch {
      this.updateState({ interstitialPrepared: false });
      return false;
    }
  }

  async prepareRewardedAd(): Promise<boolean> {
    if (
      !this.config.rewardedEnabled ||
      !this.state.isNativeAndroid ||
      !this.state.initialized ||
      !this.state.canRequestAds
    ) {
      return false;
    }
    const resolved = resolveAdUnit('rewarded', this.config);
    if (!resolved.allowed || !resolved.adUnitId) return false;

    try {
      await AdMob.prepareRewardVideoAd({
        adId: resolved.adUnitId,
        isTesting: resolved.isTesting,
        npa: this.state.consentStatus !== AdmobConsentStatus.OBTAINED,
      });
      this.updateState({ rewardedPrepared: true });
      return true;
    } catch {
      this.updateState({ rewardedPrepared: false });
      return false;
    }
  }

  async showRewardedAd(): Promise<RewardedAdOutcome> {
    if (!this.config.enabled || !this.config.rewardedEnabled) {
      return { rewarded: false, reason: 'Optional rewarded ads are currently disabled.' };
    }
    if (!this.state.isNativeAndroid || !this.state.initialized || !this.state.canRequestAds) {
      return { rewarded: false, reason: 'Rewarded ads require native Android and user consent.' };
    }

    try {
      if (!this.state.rewardedPrepared) {
        const prepared = await this.prepareRewardedAd();
        if (!prepared) return { rewarded: false, reason: 'Rewarded ad could not be prepared.' };
      }
      const reward = await AdMob.showRewardVideoAd();
      this.updateState({ rewardedPrepared: false });
      return { rewarded: true, reward };
    } catch (err: unknown) {
      this.updateState({ rewardedPrepared: false });
      return {
        rewarded: false,
        reason: err instanceof Error ? err.message : 'Rewarded ad dismissed or failed.',
      };
    }
  }

  async dispose(): Promise<void> {
    await Promise.all(this.pluginListeners.map((h) => h.remove().catch(() => undefined)));
    this.pluginListeners = [];
  }
}

export const adMobService = new AdMobService();
export { AdMobService };
