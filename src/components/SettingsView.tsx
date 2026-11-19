import { CheckCircle2, Moon, Play, ShieldCheck, Smartphone, Sun, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { runMathMasterTestSuite, TestCaseResult } from '../math/selfTest';
import { adMobService, AdMobServiceState } from '../services/admob';
import { AngleMode, LanguageCode, NumberFormat } from '../types/calculator';
import { PWAInstallButton } from './PWAInstallButton';

export const SettingsView: React.FC = () => {
  const {
    theme,
    setTheme,
    angleMode,
    setAngleMode,
    precision,
    setPrecision,
    numberFormat,
    setNumberFormat,
    language,
    setLanguage,
  } = useAppContext();

  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);
  const [adState, setAdState] = useState<AdMobServiceState>(() => adMobService.getState());
  const [privacyBusy, setPrivacyBusy] = useState(false);

  useEffect(() => {
    return adMobService.subscribe(setAdState);
  }, []);

  const handleOpenPrivacyOptions = async () => {
    setPrivacyBusy(true);
    try {
      await adMobService.openPrivacyOptions();
    } finally {
      setPrivacyBusy(false);
    }
  };

  const handleRunTests = () => {
    setTestResults(runMathMasterTestSuite());
  };

  const passedCount = testResults ? testResults.filter((t) => t.passed).length : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Appearance & Engine Preferences */}
        <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
          <h2 className="text-base font-semibold">Preferences & Engine Configuration</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Color Theme</div>
                <div className="text-xs text-slate-500">Switch between deep navy dark mode and academic light mode</div>
              </div>
              <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#060B18]">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                    theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                    theme === 'dark' ? 'bg-blue-600 text-white' : 'text-slate-500'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Dark
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1E3158]">
              <div>
                <div className="font-medium">Default Angle Unit</div>
                <div className="text-xs text-slate-500">Applies to trigonometric & inverse trig evaluations</div>
              </div>
              <select
                value={angleMode}
                onChange={(e) => setAngleMode(e.target.value as AngleMode)}
                className="rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-1.5 font-mono text-xs"
              >
                <option value="RAD">Radians (RAD)</option>
                <option value="DEG">Degrees (DEG)</option>
                <option value="GRAD">Gradians (GRAD)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1E3158]">
              <div>
                <div className="font-medium">Significant Precision: {precision} digits</div>
                <div className="text-xs text-slate-500">Controls display rounding accuracy (4 to 15 digits)</div>
              </div>
              <input
                type="range"
                min={4}
                max={15}
                value={precision}
                onChange={(e) => setPrecision(Number(e.target.value))}
                className="w-36"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1E3158]">
              <div>
                <div className="font-medium">Number Display Format</div>
                <div className="text-xs text-slate-500">Automatic, fixed decimal, scientific, engineering, or fraction</div>
              </div>
              <select
                value={numberFormat}
                onChange={(e) => setNumberFormat(e.target.value as NumberFormat)}
                className="rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-1.5 text-xs"
              >
                <option value="auto">Auto</option>
                <option value="decimal">Decimal</option>
                <option value="scientific">Scientific (e-notation)</option>
                <option value="engineering">Engineering (10³ⁿ)</option>
                <option value="fraction">Exact / Fraction Priority</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1E3158]">
              <div>
                <div className="font-medium">Interface Language (i18n)</div>
                <div className="text-xs text-slate-500">Multilingual dictionary ready for global classrooms</div>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-1.5 text-xs"
              >
                <option value="en">English (Default)</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>
        </section>

        {/* Keyboard Shortcuts & Offline PWA */}
        <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Desktop Shortcuts & Offline App</h2>
            <PWAInstallButton />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['Enter', 'Evaluate & save to history'],
              ['Ctrl / Cmd + Z', 'Undo expression edit'],
              ['Ctrl / Cmd + Y', 'Redo expression edit'],
              ['Shift + Enter', 'Insert newline in editor'],
              ['^', 'Exponentiation power'],
              ['!', 'Factorial / Double factorial !!'],
            ].map(([key, desc]) => (
              <div key={key} className="rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#060B18]/50 p-2.5">
                <div className="font-mono font-semibold text-blue-600 dark:text-cyan-300">{key}</div>
                <div className="text-slate-500 mt-0.5">{desc}</div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-[#1E3158] text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div className="font-semibold text-slate-800 dark:text-slate-200">Offline Support & Android / Web Deployment</div>
            <p>
              Core expression evaluation, symbolic calculus, linear algebra, graphing, and local history run 100% client-side with zero network dependency via Service Worker caching.
            </p>
            <p className="font-mono text-[11px] text-slate-500">
              Web Build: npm run build · Android Capacitor: npm run android:prepare
            </p>
          </div>
        </section>
      </div>

      {/* Mobile Packaging & Privacy Readiness (Capacitor Android + AdMob UMP) */}
      <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              <h2 className="text-base font-semibold">Android Capacitor &amp; Privacy Readiness</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Prepared for Android packaging and Google UMP privacy consent. All mathematical engines operate 100% independently, and ads never overlay keyboards, equations, or results.
            </p>
          </div>
          {(adState.privacyOptionsRequired || adState.isNativeAndroid) && (
            <button
              type="button"
              disabled={privacyBusy}
              onClick={handleOpenPrivacyOptions}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] text-xs font-medium hover:border-cyan-400 cursor-pointer disabled:opacity-60"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
              <span>{privacyBusy ? 'Opening Privacy Form...' : 'Ad Privacy Preferences'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#060B18]/50 p-3">
            <div className="text-slate-500 dark:text-slate-400">Runtime Platform</div>
            <div className="font-mono font-semibold mt-0.5 text-slate-900 dark:text-white">
              {adState.isNativeAndroid ? 'Capacitor Android (Native)' : 'Web / PWA Browser'}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#060B18]/50 p-3">
            <div className="text-slate-500 dark:text-slate-400">AdMob Monetization State</div>
            <div className="font-mono font-semibold mt-0.5 text-blue-600 dark:text-cyan-300">
              {adState.enabled
                ? adState.testMode
                  ? 'Active (Official Google Test IDs)'
                  : 'Active (Release Config)'
                : 'Disabled (Pre-Release Safe Mode)'}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#060B18]/50 p-3">
            <div className="text-slate-500 dark:text-slate-400">UMP Consent Status</div>
            <div className="font-mono font-semibold mt-0.5 text-slate-900 dark:text-white">
              {adState.isNativeAndroid ? `${adState.consentStatus}` : 'Standby (Android Only)'}
            </div>
          </div>
        </div>
      </section>

      {/* Live Mathematical QA Verification Suite */}
      <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Mathematical Engine Verification Suite</h2>
            <p className="text-xs text-slate-500">
              Runs automated accuracy tests across arithmetic, trig, logarithms, calculus, linear algebra, complex numbers, statistics, number theory, and error handling.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunTests}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run All Verification Tests</span>
          </button>
        </div>

        {testResults && (
          <div className="space-y-3">
            <div className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              Passed {passedCount} / {testResults.length} assertions
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-[#1E3158]">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 dark:bg-[#060B18] sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-left">Test Case</th>
                    <th className="p-2 text-left">Actual Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {testResults.map((tr, i) => (
                    <tr key={i}>
                      <td className="p-2">
                        {tr.passed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-500">
                            <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-500">
                            <XCircle className="w-3.5 h-3.5" /> FAIL
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-slate-500">{tr.category}</td>
                      <td className="p-2">{tr.name}</td>
                      <td className="p-2 text-blue-600 dark:text-cyan-300">{tr.actual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
