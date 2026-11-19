import {
  ArrowRight,
  BarChart3,
  Binary,
  Calculator,
  Compass,
  FunctionSquare,
  Grid3x3,
  LineChart,
  Search,
  Sigma,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { CONSTANTS_LIBRARY, convertUnit, SI_PREFIXES, UNIT_CATEGORIES } from '../math/constants';
import { FORMULA_LIBRARY } from '../math/formulas';
import { NavSection } from '../types/calculator';
import { MathDisplay } from './MathDisplay';

export const HomeView: React.FC = () => {
  const { setActiveNav, loadIntoCalculator, sendToGrapher, history } = useAppContext();
  const [quickExpr, setQuickExpr] = useState('');
  const [formulaSearch, setFormulaSearch] = useState('');
  const [formulaCat, setFormulaCat] = useState<string>('All');
  const [refTab, setRefTab] = useState<'formulas' | 'units' | 'constants'>('formulas');

  // Unit Converter State
  const [unitCatId, setUnitCatId] = useState('length');
  const activeUnitCat = UNIT_CATEGORIES.find((c) => c.id === unitCatId) || UNIT_CATEGORIES[0];
  const [fromUnit, setFromUnit] = useState(activeUnitCat.units[0].id);
  const [toUnit, setToUnit] = useState(activeUnitCat.units[1].id);
  const [unitVal, setUnitVal] = useState('1');

  const convertedVal = convertUnit(unitCatId, fromUnit, toUnit, Number(unitVal));

  const handleCategoryChange = (id: string) => {
    setUnitCatId(id);
    const cat = UNIT_CATEGORIES.find((c) => c.id === id);
    if (cat) {
      setFromUnit(cat.units[0].id);
      setToUnit(cat.units[1]?.id || cat.units[0].id);
    }
  };

  const modules: {
    id: NavSection;
    title: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    { id: 'calculator', title: 'Scientific Calculator', desc: 'Symbolic & high-precision evaluation, AST steps, variables, memory', icon: <Calculator className="w-5 h-5" /> },
    { id: 'algebra', title: 'Algebra & Equations', desc: 'Quadratic/cubic solver, polynomial expansion, systems, inequalities', icon: <Sigma className="w-5 h-5" /> },
    { id: 'calculus', title: 'Calculus & ODEs', desc: 'Limits, derivatives, partials, integrals, Taylor series, RK4 ODEs', icon: <FunctionSquare className="w-5 h-5" /> },
    { id: 'linear-algebra', title: 'Matrices & Linear Algebra', desc: 'Matrix ops, RREF steps, LU, inverse, determinants, eigenvalues', icon: <Grid3x3 className="w-5 h-5" /> },
    { id: 'statistics', title: 'Statistics & Probability', desc: 'Descriptive stats, regression, Normal/Binomial/Poisson, t/z-tests', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'graphing', title: '2D & 3D Graphing', desc: 'Explicit, parametric, polar, implicit curves & 3D surfaces', icon: <LineChart className="w-5 h-5" /> },
    { id: 'complex', title: 'Complex Numbers', desc: 'Cartesian, Polar, Euler form, De Moivre powers, Argand roots', icon: <Compass className="w-5 h-5" /> },
    { id: 'numerical', title: 'Numerical, Number Theory & Discrete', desc: 'Newton-Raphson, Bisection, Primes, Extended GCD, Truth Tables, Sets', icon: <Binary className="w-5 h-5" /> },
  ];

  const categories = ['All', ...Array.from(new Set(FORMULA_LIBRARY.map((f) => f.category)))];
  const filteredFormulas = FORMULA_LIBRARY.filter((f) => {
    if (formulaCat !== 'All' && f.category !== formulaCat) return false;
    if (formulaSearch.trim()) {
      const q = formulaSearch.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        f.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Hero Launch Console */}
      <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 sm:p-6 space-y-4">
        <div className="max-w-3xl space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            University-Grade Scientific & Symbolic Computation
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Evaluate complex expressions, plot 2D/3D manifolds, solve linear systems, compute symbolic derivatives & integrals, and inspect step-by-step mathematical proofs offline.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (quickExpr.trim()) loadIntoCalculator(quickExpr.trim());
          }}
          className="flex flex-col sm:flex-row gap-2.5 max-w-2xl"
        >
          <input
            type="text"
            value={quickExpr}
            onChange={(e) => setQuickExpr(e.target.value)}
            placeholder="Quick launch expression, e.g. e^(i*pi) + 1 or sin(pi/6)"
            className="flex-1 rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold hover:brightness-110 transition-all cursor-pointer"
          >
            <span>Open in Calculator</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Educational Quick Examples */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Try examples:</span>
          {[
            { label: 'e^(i·π) + 1', expr: 'e^(i*pi) + 1', fn: loadIntoCalculator },
            { label: '5!! + nCr(10,3)', expr: '5!! + nCr(10, 3)', fn: loadIntoCalculator },
            { label: 'Plot y = x²', expr: 'x^2', fn: sendToGrapher },
            { label: 'Plot y = eˣ', expr: 'e^x', fn: sendToGrapher },
          ].map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => ex.fn(ex.expr)}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#081022] font-mono text-slate-700 dark:text-cyan-300 hover:border-cyan-400 cursor-pointer"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </section>

      {/* Module Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {modules.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setActiveNav(m.id)}
            className="text-left rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-4 hover:border-cyan-400 transition-colors space-y-2 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-blue-600 dark:text-cyan-400">
              {m.icon}
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{m.title}</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{m.desc}</p>
          </button>
        ))}
      </section>

      {/* Reference Tools: Formula Library, Unit Converter, Constants & SI Prefixes */}
      <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-[#182848] pb-3">
          <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#070E1F] border border-slate-200 dark:border-[#1E3158]">
            {[
              { id: 'formulas', label: 'Formula Library' },
              { id: 'units', label: 'Unit Converter & SI Prefixes' },
              { id: 'constants', label: 'Scientific Constants' },
            ].map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setRefTab(tb.id as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  refTab === tb.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveNav('history')}
              className="text-xs font-medium text-blue-600 dark:text-cyan-300 hover:underline cursor-pointer"
            >
              View {history.length} saved calculation{history.length === 1 ? '' : 's'} →
            </button>
          )}
        </div>

        {refTab === 'formulas' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formulaSearch}
                  onChange={(e) => setFormulaSearch(e.target.value)}
                  placeholder="Search formulas (e.g. Euler, Taylor, Bayes, Newton)..."
                  className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <select
                value={formulaCat}
                onChange={(e) => setFormulaCat(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 text-xs text-slate-900 dark:text-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {filteredFormulas.map((f) => (
                <div key={f.id} className="rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#081022] p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{f.category}</span>
                  </div>
                  <div className="overflow-x-auto py-1 text-slate-800 dark:text-cyan-200">
                    <MathDisplay latex={f.latex} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{f.notes}</p>
                  {f.sampleExpression && (
                    <button
                      type="button"
                      onClick={() =>
                        f.targetModule === 'graphing'
                          ? sendToGrapher(f.sampleExpression!)
                          : loadIntoCalculator(f.sampleExpression!)
                      }
                      className="text-xs font-medium text-blue-600 dark:text-cyan-300 hover:underline cursor-pointer"
                    >
                      Try sample in {f.targetModule === 'graphing' ? 'Grapher' : 'Calculator'} →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {refTab === 'units' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Scientific Unit Converter</h3>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <label className="space-y-1 col-span-2">
                  <span className="text-slate-500 dark:text-slate-400">Quantity Category</span>
                  <select value={unitCatId} onChange={(e) => handleCategoryChange(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 text-slate-900 dark:text-white">
                    {UNIT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500 dark:text-slate-400">Value</span>
                  <input type="number" step="any" value={unitVal} onChange={(e) => setUnitVal(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-slate-900 dark:text-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500 dark:text-slate-400">From Unit</span>
                  <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 text-slate-900 dark:text-white">
                    {activeUnitCat.units.map((u) => <option key={u.id} value={u.id}>{u.label} ({u.symbol})</option>)}
                  </select>
                </label>
                <label className="space-y-1 col-span-2">
                  <span className="text-slate-500 dark:text-slate-400">To Unit</span>
                  <select value={toUnit} onChange={(e) => setToUnit(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 text-slate-900 dark:text-white">
                    {activeUnitCat.units.map((u) => <option key={u.id} value={u.id}>{u.label} ({u.symbol})</option>)}
                  </select>
                </label>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158] font-mono text-lg font-bold text-blue-600 dark:text-cyan-300 tabular-nums">
                {convertedVal !== null ? `${Number(convertedVal.toPrecision(10))} ${activeUnitCat.units.find((u) => u.id === toUnit)?.symbol || ''}` : 'Invalid input'}
              </div>
            </div>

            <div className="lg:col-span-6 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">SI Metric Prefixes</h3>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-[#1E3158]">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-slate-100 dark:bg-[#070E1F] sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Prefix</th>
                      <th className="p-2 text-left">Symbol</th>
                      <th className="p-2 text-right">Factor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#182848]">
                    {SI_PREFIXES.map((p) => (
                      <tr key={p.prefix}>
                        <td className="p-2 capitalize">{p.prefix}</td>
                        <td className="p-2 font-bold text-blue-600 dark:text-cyan-300">{p.symbol}</td>
                        <td className="p-2 text-right">{p.factor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {refTab === 'constants' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {CONSTANTS_LIBRARY.map((c) => (
              <div key={c.name} className="rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#081022] p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-blue-600 dark:text-cyan-300">{c.symbol}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{c.category}</span>
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">{c.name}</div>
                <div className="font-mono text-xs text-slate-700 dark:text-slate-200 tabular-nums">
                  {c.value} {c.unit || ''}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.description}</p>
                <button
                  type="button"
                  onClick={() => loadIntoCalculator(c.insertToken)}
                  className="text-[11px] font-medium text-blue-600 dark:text-cyan-300 hover:underline cursor-pointer"
                >
                  Insert into Calculator →
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
