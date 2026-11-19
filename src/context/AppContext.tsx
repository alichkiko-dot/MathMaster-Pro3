import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS, TranslationDictionary } from '../i18n/translations';
import { isDuplicateTopHistory } from '../math/exportHistory';
import {
  AngleMode,
  HistoryFolder,
  HistoryItem,
  LanguageCode,
  NavSection,
  NumberFormat,
} from '../types/calculator';

export interface ReopenRequest {
  item: HistoryItem;
  nonce: number;
}

export type NewHistoryItemInput = Omit<HistoryItem, 'id' | 'timestamp' | 'favorite' | 'folderId'> & {
  folderId?: string;
};

interface AppContextValue {
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  toggleTheme: () => void;
  angleMode: AngleMode;
  setAngleMode: (m: AngleMode) => void;
  precision: number;
  setPrecision: (p: number) => void;
  numberFormat: NumberFormat;
  setNumberFormat: (f: NumberFormat) => void;
  language: LanguageCode;
  setLanguage: (l: LanguageCode) => void;
  t: TranslationDictionary;
  activeNav: NavSection;
  setActiveNav: (n: NavSection) => void;
  calculatorDraft: string;
  setCalculatorDraft: (s: string) => void;
  loadIntoCalculator: (expr: string) => void;
  reopenRequest: ReopenRequest | null;
  reopenHistoryItem: (item: HistoryItem) => void;
  clearReopenRequest: () => void;
  graphDraft: string;
  sendToGrapher: (expr: string) => void;
  variables: Record<string, string>;
  setVariable: (name: string, val: string) => void;
  deleteVariable: (name: string) => void;
  memoryValue: number | null;
  memoryClear: () => void;
  memoryStore: (val: number) => void;
  memoryAdd: (val: number) => void;
  memorySubtract: (val: number) => void;
  history: HistoryItem[];
  folders: HistoryFolder[];
  addHistoryItem: (item: NewHistoryItemInput) => boolean;
  toggleFavorite: (id: string) => void;
  deleteHistoryItem: (id: string) => void;
  clearHistory: () => void;
  moveHistoryToFolder: (itemId: string, folderId: string) => void;
  createFolder: (name: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
}

const DEFAULT_FOLDERS: HistoryFolder[] = [
  { id: 'general', name: 'General', createdAt: 1 },
  { id: 'calculus', name: 'Calculus & Analysis', createdAt: 2 },
  { id: 'linear', name: 'Linear Algebra', createdAt: 3 },
];

const STORAGE_KEY = 'mathmaster_pro_state_v1';

interface PersistedState {
  theme: 'dark' | 'light';
  angleMode: AngleMode;
  precision: number;
  numberFormat: NumberFormat;
  language: LanguageCode;
  variables: Record<string, string>;
  memoryValue: number | null;
  history: HistoryItem[];
  folders: HistoryFolder[];
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: parsed.theme === 'light' ? 'light' : 'dark',
        angleMode: ['RAD', 'DEG', 'GRAD'].includes(parsed.angleMode) ? parsed.angleMode : 'RAD',
        precision: typeof parsed.precision === 'number' ? Math.min(15, Math.max(4, parsed.precision)) : 12,
        numberFormat: parsed.numberFormat || 'auto',
        language: parsed.language && TRANSLATIONS[parsed.language as LanguageCode] ? parsed.language : 'en',
        variables: parsed.variables && typeof parsed.variables === 'object' ? parsed.variables : {},
        memoryValue: typeof parsed.memoryValue === 'number' ? parsed.memoryValue : null,
        history: Array.isArray(parsed.history) ? parsed.history : [],
        folders: Array.isArray(parsed.folders) && parsed.folders.length > 0 ? parsed.folders : DEFAULT_FOLDERS,
      };
    }
  } catch {
    // ignore corrupted storage
  }
  return {
    theme: 'dark',
    angleMode: 'RAD',
    precision: 12,
    numberFormat: 'auto',
    language: 'en',
    variables: { a: '2', b: '5', c: '3' },
    memoryValue: null,
    history: [],
    folders: DEFAULT_FOLDERS,
  };
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initial] = useState(loadInitialState);
  const [theme, setTheme] = useState<'dark' | 'light'>(initial.theme);
  const [angleMode, setAngleMode] = useState<AngleMode>(initial.angleMode);
  const [precision, setPrecision] = useState<number>(initial.precision);
  const [numberFormat, setNumberFormat] = useState<NumberFormat>(initial.numberFormat);
  const [language, setLanguage] = useState<LanguageCode>(initial.language);
  const [variables, setVariables] = useState<Record<string, string>>(initial.variables);
  const [memoryValue, setMemoryValue] = useState<number | null>(initial.memoryValue);
  const [history, setHistory] = useState<HistoryItem[]>(initial.history);
  const [folders, setFolders] = useState<HistoryFolder[]>(initial.folders);
  const [activeNav, setActiveNav] = useState<NavSection>('calculator');
  const [calculatorDraft, setCalculatorDraft] = useState<string>('sin(pi/4)^2 + cos(pi/4)^2');
  const [graphDraft, setGraphDraft] = useState<string>('sin(x)');
  const [reopenRequest, setReopenRequest] = useState<ReopenRequest | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    try {
      const payload: PersistedState = {
        theme,
        angleMode,
        precision,
        numberFormat,
        language,
        variables,
        memoryValue,
        history: history.slice(0, 200),
        folders,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota errors
    }
  }, [theme, angleMode, precision, numberFormat, language, variables, memoryValue, history, folders]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const loadIntoCalculator = (expr: string) => {
    setCalculatorDraft(expr);
    setActiveNav('calculator');
  };

  const sendToGrapher = (expr: string) => {
    setGraphDraft(expr);
    setActiveNav('graphing');
  };

  const setVariable = (name: string, val: string) => {
    setVariables((prev) => ({ ...prev, [name]: val }));
  };

  const deleteVariable = (name: string) => {
    setVariables((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const memoryClear = () => setMemoryValue(null);
  const memoryStore = (val: number) => {
    if (Number.isFinite(val)) setMemoryValue(val);
  };
  const memoryAdd = (val: number) => {
    if (Number.isFinite(val)) setMemoryValue((prev) => (prev ?? 0) + val);
  };
  const memorySubtract = (val: number) => {
    if (Number.isFinite(val)) setMemoryValue((prev) => (prev ?? 0) - val);
  };

  const reopenHistoryItem = useCallback((item: HistoryItem) => {
    let targetNav: NavSection = 'calculator';
    if (item.module === 'number-theory' || item.module === 'discrete') {
      targetNav = 'numerical';
    } else if (
      item.module === 'calculator' ||
      item.module === 'algebra' ||
      item.module === 'calculus' ||
      item.module === 'linear-algebra' ||
      item.module === 'statistics' ||
      item.module === 'complex' ||
      item.module === 'numerical' ||
      item.module === 'graphing'
    ) {
      targetNav = item.module;
    }

    if (targetNav === 'calculator') {
      setCalculatorDraft(item.expression);
    } else if (targetNav === 'graphing') {
      setGraphDraft(item.expression);
    }

    setReopenRequest({ item, nonce: Date.now() });
    setActiveNav(targetNav);
  }, []);

  const clearReopenRequest = useCallback(() => {
    setReopenRequest(null);
  }, []);

  const addHistoryItem: AppContextValue['addHistoryItem'] = useCallback((item) => {
    let added = false;
    setHistory((prev) => {
      if (isDuplicateTopHistory(prev, item)) {
        return prev;
      }
      added = true;
      const defaultFolder =
        item.module === 'calculus'
          ? 'calculus'
          : item.module === 'linear-algebra'
          ? 'linear'
          : 'general';
      const newItem: HistoryItem = {
        ...item,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        favorite: false,
        folderId: item.folderId || defaultFolder,
      };
      return [newItem, ...prev.slice(0, 199)];
    });
    return added;
  }, []);

  const toggleFavorite = (id: string) => {
    setHistory((prev) => prev.map((it) => (it.id === id ? { ...it, favorite: !it.favorite } : it)));
  };

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((it) => it.id !== id));
  };

  const clearHistory = () => setHistory([]);

  const moveHistoryToFolder = (itemId: string, folderId: string) => {
    setHistory((prev) => prev.map((it) => (it.id === itemId ? { ...it, folderId } : it)));
  };

  const createFolder = (name: string) => {
    const id = `folder_${Date.now()}`;
    setFolders((prev) => [...prev, { id, name: name.trim() || 'Untitled', createdAt: Date.now() }]);
    return id;
  };

  const renameFolder = (id: string, name: string) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f)));
  };

  const deleteFolder = (id: string) => {
    if (id === 'general') return;
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setHistory((prev) => prev.map((it) => (it.folderId === id ? { ...it, folderId: 'general' } : it)));
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        angleMode,
        setAngleMode,
        precision,
        setPrecision,
        numberFormat,
        setNumberFormat,
        language,
        setLanguage,
        t: TRANSLATIONS[language],
        activeNav,
        setActiveNav,
        calculatorDraft,
        setCalculatorDraft,
        loadIntoCalculator,
        reopenRequest,
        reopenHistoryItem,
        clearReopenRequest,
        graphDraft,
        sendToGrapher,
        variables,
        setVariable,
        deleteVariable,
        memoryValue,
        memoryClear,
        memoryStore,
        memoryAdd,
        memorySubtract,
        history,
        folders,
        addHistoryItem,
        toggleFavorite,
        deleteHistoryItem,
        clearHistory,
        moveHistoryToFolder,
        createFolder,
        renameFolder,
        deleteFolder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
