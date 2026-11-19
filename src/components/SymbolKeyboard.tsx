import React, { useState } from 'react';

interface KeyButton {
  label: string;
  shiftLabel?: string;
  insert: string;
  shiftInsert?: string;
  title?: string;
  variant?: 'default' | 'operator' | 'accent' | 'function' | 'danger' | 'secondary';
}

type SymbolTab = 'Greek' | 'Calculus' | 'Matrices & Roots' | 'Logic & Sets' | 'Operators';

const SYMBOL_TABS: SymbolTab[] = [
  'Greek',
  'Calculus',
  'Matrices & Roots',
  'Logic & Sets',
  'Operators',
];

const EXTRA_SYMBOLS: Record<SymbolTab, KeyButton[]> = {
  Greek: [
    { label: 'α', insert: 'α', title: 'Alpha' },
    { label: 'β', insert: 'β', title: 'Beta' },
    { label: 'γ', insert: 'γ', title: 'Gamma (Euler–Mascheroni constant)' },
    { label: 'δ', insert: 'δ', title: 'Delta' },
    { label: 'θ', insert: 'θ', title: 'Theta' },
    { label: 'λ', insert: 'λ', title: 'Lambda' },
    { label: 'μ', insert: 'μ', title: 'Mu' },
    { label: 'π', insert: 'π', title: 'Pi' },
    { label: 'φ', insert: 'φ', title: 'Golden Ratio' },
    { label: 'σ', insert: 'σ', title: 'Sigma' },
    { label: 'ω', insert: 'ω', title: 'Omega' },
    { label: 'Δ', insert: 'Δ', title: 'Capital Delta' },
    { label: 'Σ', insert: 'Σ', title: 'Capital Sigma' },
    { label: 'Ω', insert: 'Ω', title: 'Capital Omega' },
  ],
  Calculus: [
    { label: 'd/dx', insert: 'derivative("{cursor}", "x")', title: 'Symbolic derivative', variant: 'function' },
    { label: 'Σ sum', insert: 'sum("{cursor}", "k", 1, 10)', title: 'Finite summation Σ f(k)', variant: 'function' },
    { label: 'Π prod', insert: 'prod("{cursor}", "k", 1, 5)', title: 'Finite product Π f(k)', variant: 'function' },
    { label: '∫', insert: '∫', title: 'Integral symbol' },
    { label: '∬', insert: '∬', title: 'Double integral symbol' },
    { label: '∭', insert: '∭', title: 'Triple integral symbol' },
    { label: '∮', insert: '∮', title: 'Contour integral symbol' },
    { label: '∂', insert: '∂', title: 'Partial derivative symbol' },
    { label: '∇', insert: '∇', title: 'Nabla / Gradient' },
    { label: 'lim', insert: 'lim', title: 'Limit notation' },
    { label: '∞', insert: '∞', title: 'Infinity' },
  ],
  'Matrices & Roots': [
    { label: 'ⁿ√(', insert: 'nthRoot({cursor}, 3)', title: 'n-th root nthRoot(x, n)', variant: 'function' },
    { label: 'logₐ(', insert: 'log({cursor}, 2)', title: 'Logarithm base a: log(x, base)', variant: 'function' },
    { label: 'nCr', insert: 'nCr({cursor}, )', title: 'Combinations', variant: 'function' },
    { label: 'nPr', insert: 'nPr({cursor}, )', title: 'Permutations', variant: 'function' },
    { label: 'gcd(', insert: 'gcd({cursor}, )', title: 'Greatest Common Divisor', variant: 'function' },
    { label: 'lcm(', insert: 'lcm({cursor}, )', title: 'Least Common Multiple', variant: 'function' },
    { label: 'floor(', insert: 'floor({cursor})', title: 'Floor', variant: 'function' },
    { label: 'ceil(', insert: 'ceil({cursor})', title: 'Ceiling', variant: 'function' },
    { label: 'round(', insert: 'round({cursor})', title: 'Round', variant: 'function' },
    { label: 'min(', insert: 'min({cursor}, )', title: 'Minimum', variant: 'function' },
    { label: 'max(', insert: 'max({cursor}, )', title: 'Maximum', variant: 'function' },
    { label: '[[a,b]]', insert: '[[1, 2], [3, 4]]', title: '2×2 Matrix literal', variant: 'function' },
    { label: 'det(', insert: 'det([[1, 2], [3, 4]])', title: 'Determinant', variant: 'function' },
    { label: 'inv(', insert: 'inv([[1, 2], [3, 4]])', title: 'Matrix Inverse', variant: 'function' },
    { label: 'dot(', insert: 'dot([1, 2], [3, 4])', title: 'Dot product', variant: 'function' },
    { label: 'cross(', insert: 'cross([1, 0, 0], [0, 1, 0])', title: 'Cross product', variant: 'function' },
  ],
  'Logic & Sets': [
    { label: '∈', insert: ' ∈ ' },
    { label: '∉', insert: ' ∉ ' },
    { label: '⊂', insert: ' ⊂ ' },
    { label: '⊆', insert: ' ⊆ ' },
    { label: '∪', insert: ' ∪ ' },
    { label: '∩', insert: ' ∩ ' },
    { label: '∅', insert: '∅' },
    { label: '∧', insert: ' ∧ ' },
    { label: '∨', insert: ' ∨ ' },
    { label: '¬', insert: '¬' },
    { label: '⇒', insert: ' ⇒ ' },
    { label: '⇔', insert: ' ⇔ ' },
    { label: '∀', insert: '∀' },
    { label: '∃', insert: '∃' },
    { label: '⊕', insert: ' ⊕ ' },
  ],
  Operators: [
    { label: '!!', insert: '!!', title: 'Double Factorial' },
    { label: 'mod', insert: ' mod ', title: 'Modulo' },
    { label: '±', insert: '±' },
    { label: '≤', insert: ' <= ' },
    { label: '≥', insert: ' >= ' },
    { label: '≠', insert: ' != ' },
    { label: '≈', insert: '≈' },
    { label: '∝', insert: '∝' },
    { label: '₀', insert: '₀' },
    { label: '₁', insert: '₁' },
    { label: '₂', insert: '₂' },
    { label: 'ₙ', insert: 'ₙ' },
  ],
};

interface SymbolKeyboardProps {
  onInsert: (token: string) => void;
  onAction: (action: 'evaluate' | 'clear' | 'backspace' | 'ans') => void;
  hasAns?: boolean;
}

export const SymbolKeyboard: React.FC<SymbolKeyboardProps> = ({
  onInsert,
  onAction,
  hasAns = false,
}) => {
  const [shift, setShift] = useState(false);
  const [hyp, setHyp] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [activeTab, setActiveTab] = useState<SymbolTab>('Greek');

  const varBar = ['x', 'y', 'z', 'a', 'b', 'c', 'n', 't', 'θ', 'α', 'β', 'λ'];

  // Complete Scientific Function Deck (2 rows x 6 cols on desktop/tablet, 4 cols on compact phones)
  const scientificKeys: KeyButton[] = [
    {
      label: hyp ? (shift ? 'arsinh' : 'sinh') : shift ? 'arcsin' : 'sin',
      insert: hyp ? (shift ? 'arsinh({cursor})' : 'sinh({cursor})') : shift ? 'arcsin({cursor})' : 'sin({cursor})',
      variant: 'function',
    },
    {
      label: hyp ? (shift ? 'arcosh' : 'cosh') : shift ? 'arccos' : 'cos',
      insert: hyp ? (shift ? 'arcosh({cursor})' : 'cosh({cursor})') : shift ? 'arccos({cursor})' : 'cos({cursor})',
      variant: 'function',
    },
    {
      label: hyp ? (shift ? 'artanh' : 'tanh') : shift ? 'arctan' : 'tan',
      insert: hyp ? (shift ? 'artanh({cursor})' : 'tanh({cursor})') : shift ? 'arctan({cursor})' : 'tan({cursor})',
      variant: 'function',
    },
    {
      label: shift ? 'eˣ' : 'ln',
      insert: shift ? 'exp({cursor})' : 'ln({cursor})',
      variant: 'function',
    },
    {
      label: shift ? '10ˣ' : 'log',
      insert: shift ? '10^({cursor})' : 'log({cursor})',
      variant: 'function',
    },
    {
      label: shift ? '2ˣ' : 'log₂',
      insert: shift ? '2^({cursor})' : 'log₂({cursor})',
      variant: 'function',
    },
    {
      label: shift ? 'x³' : 'x²',
      insert: shift ? '^3' : '^2',
      variant: 'function',
    },
    {
      label: shift ? '∛x' : '√x',
      insert: shift ? '∛({cursor})' : '√({cursor})',
      variant: 'function',
    },
    {
      label: shift ? 'ⁿ√x' : 'xʸ',
      insert: shift ? 'nthRoot({cursor}, 3)' : '^({cursor})',
      variant: 'function',
    },
    {
      label: shift ? 'x⁻¹' : '|x|',
      insert: shift ? '^(-1)' : 'abs({cursor})',
      variant: 'function',
    },
    {
      label: shift ? 'n!!' : 'n!',
      insert: shift ? '!!' : '!',
      variant: 'function',
    },
    {
      label: shift ? 'mod' : '%',
      insert: shift ? ' mod ' : '%',
      variant: 'function',
    },
  ];

  // 5-Column Core Numeric + Operator Keypad
  const keypad: KeyButton[] = [
    { label: 'π', insert: 'π', variant: 'secondary' },
    { label: '(', insert: '(', variant: 'secondary' },
    { label: ')', insert: ')', variant: 'secondary' },
    { label: 'DEL', insert: '__DEL__', variant: 'danger' },
    { label: 'AC', insert: '__AC__', variant: 'danger' },

    { label: '7', insert: '7' },
    { label: '8', insert: '8' },
    { label: '9', insert: '9' },
    { label: '÷', insert: '/', variant: 'operator' },
    { label: 'e', insert: 'e', variant: 'secondary' },

    { label: '4', insert: '4' },
    { label: '5', insert: '5' },
    { label: '6', insert: '6' },
    { label: '×', insert: '*', variant: 'operator' },
    { label: 'i', insert: 'i', variant: 'secondary' },

    { label: '1', insert: '1' },
    { label: '2', insert: '2' },
    { label: '3', insert: '3' },
    { label: '−', insert: '-', variant: 'operator' },
    { label: 'φ', insert: 'φ', variant: 'secondary' },

    { label: '0', insert: '0' },
    { label: '.', insert: '.' },
    { label: 'EXP', insert: 'e', title: 'Scientific notation (e.g. 1.5e-3)' },
    { label: '+', insert: '+', variant: 'operator' },
    { label: '=', insert: '__EVAL__', variant: 'accent' },
  ];

  const handleKeyPress = (key: KeyButton) => {
    if (key.insert === '__EVAL__') onAction('evaluate');
    else if (key.insert === '__DEL__') onAction('backspace');
    else if (key.insert === '__AC__') onAction('clear');
    else onInsert(key.insert);
  };

  return (
    <div className="space-y-3.5">
      {/* Mode Modifiers + Variable Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShift((s) => !s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              shift
                ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                : 'bg-slate-100 dark:bg-[#101C36] border-slate-200 dark:border-[#1E3158] text-slate-700 dark:text-slate-200 hover:border-cyan-500/60'
            }`}
          >
            2nd
          </button>
          <button
            type="button"
            onClick={() => setHyp((h) => !h)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              hyp
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-100 dark:bg-[#101C36] border-slate-200 dark:border-[#1E3158] text-slate-700 dark:text-slate-200 hover:border-blue-500/60'
            }`}
          >
            hyp
          </button>
          <button
            type="button"
            disabled={!hasAns}
            onClick={() => onAction('ans')}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border border-slate-200 dark:border-[#1E3158] bg-slate-100 dark:bg-[#101C36] text-cyan-700 dark:text-cyan-300 hover:border-cyan-500 disabled:opacity-40 cursor-pointer"
          >
            Ans
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowExtra((s) => !s)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            showExtra
              ? 'bg-blue-600/15 border-blue-500 text-blue-700 dark:text-cyan-300'
              : 'border-slate-200 dark:border-[#1E3158] text-slate-600 dark:text-slate-300 hover:border-cyan-500/50'
          }`}
        >
          {showExtra ? 'Hide Symbol Drawer' : 'Greek / Calculus / Logic Symbols'}
        </button>
      </div>

      {/* Variables Quick Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1 shrink-0">
          Variables:
        </span>
        {varBar.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onInsert(v)}
            className="min-w-[34px] h-8 px-2 rounded-md border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#081022] font-mono text-xs font-semibold text-blue-700 dark:text-cyan-300 hover:border-cyan-400 transition-colors cursor-pointer shrink-0"
          >
            {v}
          </button>
        ))}
      </div>

      {/* Optional Extended Mathematical Symbol Drawer */}
      {showExtra && (
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#081022] p-3 space-y-2.5">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {SYMBOL_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === t
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-[#13203E]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
            {EXTRA_SYMBOLS[activeTab].map((k, idx) => (
              <button
                key={`${k.label}_${idx}`}
                type="button"
                title={k.title || k.label}
                onClick={() => onInsert(k.insert)}
                className="min-h-[38px] px-2 rounded-lg border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0D1830] font-mono text-xs font-medium text-slate-800 dark:text-slate-100 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 truncate cursor-pointer"
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scientific Function Keys (4 cols mobile -> 6 cols tablet/desktop) */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {scientificKeys.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => handleKeyPress(k)}
            className="min-h-[42px] px-2 rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-100 dark:bg-[#101C38] font-mono text-xs sm:text-[13px] font-semibold text-blue-700 dark:text-cyan-300 hover:bg-blue-50 dark:hover:bg-[#17284D] hover:border-cyan-500/60 active:scale-[0.98] transition-all cursor-pointer"
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Main 5-Column Keypad */}
      <div className="grid grid-cols-5 gap-1.5">
        {keypad.map((k) => (
          <button
            key={k.label}
            type="button"
            title={k.title || k.label}
            onClick={() => handleKeyPress(k)}
            className={`min-h-[46px] sm:min-h-[48px] rounded-lg font-mono text-sm sm:text-base font-semibold border active:scale-[0.98] transition-all cursor-pointer ${
              k.variant === 'accent'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 border-cyan-400 text-white hover:brightness-110'
                : k.variant === 'danger'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs sm:text-sm'
                : k.variant === 'operator'
                ? 'bg-blue-50 dark:bg-[#132347] border-blue-200 dark:border-[#243B6B] text-blue-700 dark:text-cyan-300 hover:bg-blue-100 dark:hover:bg-[#1A2E5C]'
                : k.variant === 'secondary'
                ? 'bg-slate-100 dark:bg-[#0D1830] border-slate-200 dark:border-[#1E3158] text-slate-700 dark:text-sky-200 hover:bg-slate-200 dark:hover:bg-[#142347]'
                : 'bg-white dark:bg-[#081022] border-slate-200 dark:border-[#1B2C50] text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-[#0F1B38]'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
};
