import {
  BarChart3,
  Binary,
  Calculator,
  Compass,
  FunctionSquare,
  Grid3x3,
  History,
  Home,
  LineChart,
  Menu,
  Moon,
  Settings,
  Sigma,
  Sun,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AlgebraView } from './components/AlgebraView';
import { CalculusView } from './components/CalculusView';
import { CalculatorView } from './components/CalculatorView';
import { ComplexView } from './components/ComplexView';
import { GraphingView } from './components/GraphingView';
import { HistoryView } from './components/HistoryView';
import { HomeView } from './components/HomeView';
import { LinearAlgebraView } from './components/LinearAlgebraView';
import { NumericalView } from './components/NumericalView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SettingsView } from './components/SettingsView';
import { StatisticsView } from './components/StatisticsView';
import { AppProvider, useAppContext } from './context/AppContext';
import { adMobService } from './services/admob';
import { NavSection } from './types/calculator';

const NAV_ITEMS: { id: NavSection; icon: React.ReactNode }[] = [
  { id: 'home', icon: <Home className="w-4 h-4" /> },
  { id: 'calculator', icon: <Calculator className="w-4 h-4" /> },
  { id: 'algebra', icon: <Sigma className="w-4 h-4" /> },
  { id: 'calculus', icon: <FunctionSquare className="w-4 h-4" /> },
  { id: 'linear-algebra', icon: <Grid3x3 className="w-4 h-4" /> },
  { id: 'statistics', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'graphing', icon: <LineChart className="w-4 h-4" /> },
  { id: 'complex', icon: <Compass className="w-4 h-4" /> },
  { id: 'numerical', icon: <Binary className="w-4 h-4" /> },
  { id: 'history', icon: <History className="w-4 h-4" /> },
  { id: 'settings', icon: <Settings className="w-4 h-4" /> },
];

const CORE_WORKSPACES: { id: NavSection; shortLabel: string; icon: React.ReactNode }[] = [
  { id: 'calculator', shortLabel: 'Calc', icon: <Calculator className="w-4 h-4" /> },
  { id: 'algebra', shortLabel: 'Algebra', icon: <Sigma className="w-4 h-4" /> },
  { id: 'calculus', shortLabel: 'Calculus', icon: <FunctionSquare className="w-4 h-4" /> },
  { id: 'linear-algebra', shortLabel: 'Matrices', icon: <Grid3x3 className="w-4 h-4" /> },
  { id: 'statistics', shortLabel: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'graphing', shortLabel: 'Graph', icon: <LineChart className="w-4 h-4" /> },
];

const AppShell: React.FC = () => {
  const { activeNav, setActiveNav, theme, toggleTheme, angleMode, setAngleMode, t } = useAppContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    void adMobService.initialize();
    return () => {
      void adMobService.dispose();
    };
  }, []);

  useEffect(() => {
    void adMobService.onSectionChange(activeNav);
  }, [activeNav]);

  const handleSelectNav = (id: NavSection) => {
    setActiveNav(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#060B18] dark:text-slate-100">
      {/* Desktop Left Navigation Rail */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-[#182848] bg-white dark:bg-[#0B1328]">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#182848]">
          <button
            type="button"
            onClick={() => handleSelectNav('home')}
            className="text-left block w-full cursor-pointer"
          >
            <div className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              {t.appName}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-cyan-300/80 truncate mt-0.5">
              {t.subtitle}
            </div>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#13203E]'
                }`}
              >
                <span className={active ? 'text-white' : 'text-blue-600 dark:text-cyan-400'}>
                  {item.icon}
                </span>
                <span className="truncate">{t.nav[item.id]}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-[#182848] space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>Angle Unit</span>
            <button
              type="button"
              onClick={() =>
                setAngleMode(angleMode === 'RAD' ? 'DEG' : angleMode === 'DEG' ? 'GRAD' : 'RAD')
              }
              className="font-mono font-semibold text-blue-600 dark:text-cyan-300 hover:underline cursor-pointer"
            >
              {angleMode}
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#1E3158] py-1.5 text-xs font-medium text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#13203E] cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-cyan-300" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
          <PWAInstallButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 ad-banner-clearance">
        {/* Clean Top Workspace Header */}
        <header className="sticky top-0 z-30 h-13 lg:h-14 flex items-center justify-between gap-4 px-4 sm:px-6 border-b border-slate-200 dark:border-[#182848] bg-white/95 dark:bg-[#0B1328]/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#13203E] cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
              {t.nav[activeNav]}
            </h1>
          </div>

          {/* Tablet / Desktop Quick Core Module Links */}
          <nav className="hidden md:flex lg:hidden items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
            {CORE_WORKSPACES.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => handleSelectNav(w.id)}
                className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                  activeNav === w.id
                    ? 'text-blue-600 dark:text-cyan-300 border-b-2 border-cyan-400 font-semibold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.nav[w.id]}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                setAngleMode(angleMode === 'RAD' ? 'DEG' : angleMode === 'DEG' ? 'GRAD' : 'RAD')
              }
              className="font-mono text-xs font-semibold text-blue-600 dark:text-cyan-300 px-2 py-1 rounded border border-slate-200 dark:border-[#1E3158] hover:border-cyan-400 cursor-pointer"
              title="Switch Angle Mode (RAD / DEG / GRAD)"
            >
              {angleMode}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-[#1E3158] text-slate-700 dark:text-slate-100 cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-cyan-300" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="hidden sm:block lg:hidden">
              <PWAInstallButton compact />
            </div>
          </div>
        </header>

        {/* Active Module Viewport */}
        <main className="flex-1 p-3.5 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activeNav === 'home' && <HomeView />}
          {activeNav === 'calculator' && <CalculatorView />}
          {activeNav === 'algebra' && <AlgebraView />}
          {activeNav === 'graphing' && <GraphingView />}
          {activeNav === 'calculus' && <CalculusView />}
          {activeNav === 'linear-algebra' && <LinearAlgebraView />}
          {activeNav === 'statistics' && <StatisticsView />}
          {activeNav === 'complex' && <ComplexView />}
          {activeNav === 'numerical' && <NumericalView />}
          {activeNav === 'history' && <HistoryView />}
          {activeNav === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Mobile Bottom Core Navigation (Calculator, Algebra, Calculus, Matrices, Statistics, Graphing) */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 border-t border-slate-200 dark:border-[#182848] bg-white dark:bg-[#0B1328] grid grid-cols-6"
        aria-label="Mobile Core Modules"
      >
        {CORE_WORKSPACES.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => handleSelectNav(it.id)}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
              activeNav === it.id
                ? 'text-blue-600 dark:text-cyan-300'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {it.icon}
            <span className="truncate max-w-full px-0.5">{it.shortLabel}</span>
          </button>
        ))}
      </nav>

      {/* Mobile Slide-over Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0B1328] border-r border-slate-200 dark:border-[#1E3158] flex flex-col z-10">
            <div className="px-4 py-3.5 border-b border-slate-200 dark:border-[#182848] flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{t.appName}</div>
                <div className="text-[11px] text-slate-500 dark:text-cyan-300/80">{t.subtitle}</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#13203E] cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                      active
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#13203E]'
                    }`}
                  >
                    <span className={active ? 'text-white' : 'text-blue-600 dark:text-cyan-400'}>
                      {item.icon}
                    </span>
                    <span>{t.nav[item.id]}</span>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-200 dark:border-[#182848]">
              <PWAInstallButton />
            </div>
          </div>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
