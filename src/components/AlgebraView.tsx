import React, { useEffect, useMemo, useState } from 'react';
import { NewHistoryItemInput, useAppContext } from '../context/AppContext';
import { useAutoSaveCalculation } from '../hooks/useAutoSaveCalculation';
import {
  simplifyAndExpandAlgebra,
  solveCubic,
  solveGeneralEquation,
  solveLinearEquation,
  solvePolynomial,
  solveQuadratic,
  solveQuadraticInequality,
} from '../math/algebra';
import { solveLinearSystem } from '../math/linearAlgebra';
import { MathDisplay } from './MathDisplay';
import { ResultActionsBar } from './ResultActionsBar';

type AlgebraTab = 'equation' | 'poly' | 'simplify' | 'systems' | 'inequality';

const DEFAULT_MAT4 = [
  [2, 1, -1, 1],
  [1, 3, 2, -1],
  [-1, 1, 4, 2],
  [3, -1, 1, 5],
];
const DEFAULT_VEC4 = [4, 7, 13, 19];

export const AlgebraView: React.FC = () => {
  const { sendToGrapher, loadIntoCalculator, reopenRequest, clearReopenRequest } = useAppContext();
  const [tab, setTab] = useState<AlgebraTab>('equation');

  // General Equation
  const [eqInput, setEqInput] = useState('x^3 - 6*x^2 + 11*x - 6 = 0');

  // Linear / Quadratic / Cubic / Degree-N Polynomial
  const [polyDeg, setPolyDeg] = useState<1 | 2 | 3 | 4 | 5 | 6>(2);
  const [linRhs, setLinRhs] = useState(14);
  const [polyCoeffs, setPolyCoeffs] = useState<number[]>([1, -5, 6, 0, 0, 0, 0]);
  const [ca, setCa] = useState(1);
  const [cb, setCb] = useState(-5);
  const [cc, setCc] = useState(6);
  const [cd, setCd] = useState(0);

  // Simplify & Expand
  const [algExpr, setAlgExpr] = useState('(x + 2)^3 - 3*x*(x + 1)');

  // Linear System (2x2, 3x3, or 4x4)
  const [sysSize, setSysSize] = useState<2 | 3 | 4>(2);
  const [s1a, setS1a] = useState(2);
  const [s1b, setS1b] = useState(3);
  const [s1c, setS1c] = useState(13);
  const [s2a, setS2a] = useState(5);
  const [s2b, setS2b] = useState(-1);
  const [s2c, setS2c] = useState(7);
  const [mat3A, setMat3A] = useState<number[][]>([
    [2, 1, -1],
    [-3, -1, 2],
    [-2, 1, 2],
  ]);
  const [vec3b, setVec3b] = useState<number[]>([8, -11, -3]);
  const [mat4A, setMat4A] = useState<number[][]>(DEFAULT_MAT4);
  const [vec4b, setVec4b] = useState<number[]>(DEFAULT_VEC4);

  // Inequality
  const [iqA, setIqA] = useState(1);
  const [iqB, setIqB] = useState(-4);
  const [iqC, setIqC] = useState(3);
  const [iqOp, setIqOp] = useState<'>' | '>=' | '<' | '<='>('>');

  const eqRes = tab === 'equation' ? solveGeneralEquation(eqInput) : null;
  const linRes = tab === 'poly' && polyDeg === 1 ? solveLinearEquation(ca, cb, linRhs) : null;
  const quadRes = tab === 'poly' && polyDeg === 2 ? solveQuadratic(ca, cb, cc) : null;
  const cubicRes = tab === 'poly' && polyDeg === 3 ? solveCubic(ca, cb, cc, cd) : null;
  const polyNRes =
    tab === 'poly' && polyDeg >= 4 ? solvePolynomial(polyCoeffs.slice(0, polyDeg + 1)) : null;

  const simpRes = tab === 'simplify' ? simplifyAndExpandAlgebra(algExpr) : null;
  const sysRes =
    tab === 'systems'
      ? sysSize === 2
        ? solveLinearSystem(
            [
              [s1a, s1b],
              [s2a, s2b],
            ],
            [s1c, s2c]
          )
        : sysSize === 3
        ? solveLinearSystem(mat3A, vec3b)
        : solveLinearSystem(mat4A, vec4b)
      : null;
  const iqRes = tab === 'inequality' ? solveQuadraticInequality(iqA, iqB, iqC, iqOp) : null;

  useEffect(() => {
    if (!reopenRequest || reopenRequest.item.module !== 'algebra') return;
    const p = reopenRequest.item.payload as Record<string, any> | undefined;
    if (p?.tab) {
      setTab(p.tab as AlgebraTab);
      if (p.tab === 'equation' && typeof p.eqInput === 'string') setEqInput(p.eqInput);
      if (p.tab === 'simplify' && typeof p.algExpr === 'string') setAlgExpr(p.algExpr);
      if (p.tab === 'poly') {
        if (typeof p.polyDeg === 'number') setPolyDeg(p.polyDeg as 1 | 2 | 3 | 4 | 5 | 6);
        if (typeof p.ca === 'number') setCa(p.ca);
        if (typeof p.cb === 'number') setCb(p.cb);
        if (typeof p.cc === 'number') setCc(p.cc);
        if (typeof p.cd === 'number') setCd(p.cd);
        if (typeof p.linRhs === 'number') setLinRhs(p.linRhs);
        if (Array.isArray(p.polyCoeffs)) setPolyCoeffs(p.polyCoeffs);
      }
      if (p.tab === 'systems') {
        if (p.sysSize === 2 || p.sysSize === 3 || p.sysSize === 4) setSysSize(p.sysSize);
        if (Array.isArray(p.s2)) {
          setS1a(p.s2[0]); setS1b(p.s2[1]); setS1c(p.s2[2]);
          setS2a(p.s2[3]); setS2b(p.s2[4]); setS2c(p.s2[5]);
        }
        if (Array.isArray(p.mat3A)) setMat3A(p.mat3A);
        if (Array.isArray(p.vec3b)) setVec3b(p.vec3b);
        if (Array.isArray(p.mat4A)) setMat4A(p.mat4A);
        if (Array.isArray(p.vec4b)) setVec4b(p.vec4b);
      }
      if (p.tab === 'inequality') {
        if (typeof p.iqA === 'number') setIqA(p.iqA);
        if (typeof p.iqB === 'number') setIqB(p.iqB);
        if (typeof p.iqC === 'number') setIqC(p.iqC);
        if (p.iqOp) setIqOp(p.iqOp);
      }
    } else if (reopenRequest.item.expression.includes('=')) {
      setTab('equation');
      setEqInput(reopenRequest.item.expression);
    }
    clearReopenRequest();
  }, [reopenRequest, clearReopenRequest]);

  const currentHistoryItem: NewHistoryItemInput | null = useMemo(() => {
    if (tab === 'equation' && eqRes?.ok) {
      const resStr =
        eqRes.allRootsFormatted.length > 0
          ? eqRes.allRootsFormatted.map((r, i) => `x${eqRes.allRootsFormatted.length > 1 ? i + 1 : ''} = ${r}`).join(', ')
          : 'No real solutions in [-50, 50]';
      return {
        expression: eqInput,
        latex: eqInput,
        result: resStr,
        exactResult: eqRes.equationKind !== 'transcendental' ? resStr : null,
        isExact: eqRes.equationKind !== 'transcendental',
        module: 'algebra',
        category: `${eqRes.equationKind.charAt(0).toUpperCase() + eqRes.equationKind.slice(1)} Equation`,
        steps: eqRes.steps,
        payload: { tab: 'equation', eqInput },
      };
    }
    if (tab === 'poly') {
      if (polyDeg === 1 && linRes?.ok) {
        return {
          expression: `${ca}x + ${cb} = ${linRhs}`,
          latex: `${ca}x + ${cb} = ${linRhs}`,
          result: linRes.status === 'unique' ? `x = ${linRes.root}` : linRes.status,
          exactResult: linRes.status === 'unique' ? `x = ${linRes.root}` : null,
          isExact: true,
          module: 'algebra',
          category: 'Linear Equation',
          steps: linRes.steps,
          payload: { tab: 'poly', polyDeg: 1, ca, cb, linRhs },
        };
      }
      if (polyDeg === 2 && quadRes?.ok) {
        return {
          expression: `${ca}x^2 + (${cb})x + (${cc}) = 0`,
          latex: `${ca}x^2 + (${cb})x + (${cc}) = 0`,
          result: quadRes.roots.map((r, i) => `x${i + 1} = ${r}`).join(', '),
          exactResult: quadRes.factoredForm,
          isExact: true,
          module: 'algebra',
          category: 'Quadratic Equation',
          steps: quadRes.steps,
          payload: { tab: 'poly', polyDeg: 2, ca, cb, cc },
        };
      }
      if (polyDeg === 3 && cubicRes?.ok) {
        return {
          expression: `${ca}x^3 + (${cb})x^2 + (${cc})x + (${cd}) = 0`,
          latex: `${ca}x^3 + (${cb})x^2 + (${cc})x + (${cd}) = 0`,
          result: cubicRes.roots.map((r, i) => `x${i + 1} = ${r}`).join(', '),
          exactResult: null,
          isExact: false,
          module: 'algebra',
          category: 'Cubic Equation',
          steps: cubicRes.steps,
          payload: { tab: 'poly', polyDeg: 3, ca, cb, cc, cd },
        };
      }
      if (polyDeg >= 4 && polyNRes?.ok) {
        return {
          expression: `Degree-${polyDeg} Polynomial [${polyCoeffs.slice(0, polyDeg + 1).join(', ')}] = 0`,
          latex: `\\text{Degree-${polyDeg} Polynomial}`,
          result: polyNRes.allRootsFormatted.map((r, i) => `x${i + 1} = ${r}`).join(', '),
          exactResult: null,
          isExact: false,
          module: 'algebra',
          category: `Degree-${polyDeg} Polynomial`,
          steps: polyNRes.steps,
          payload: { tab: 'poly', polyDeg, polyCoeffs },
        };
      }
    }
    if (tab === 'simplify' && simpRes?.ok) {
      return {
        expression: algExpr,
        latex: algExpr,
        result: `Factored: ${simpRes.factored} | Expanded: ${simpRes.expanded}`,
        exactResult: simpRes.factored,
        isExact: true,
        module: 'algebra',
        category: 'Simplify & Factor',
        steps: simpRes.steps,
        payload: { tab: 'simplify', algExpr },
      };
    }
    if (tab === 'systems' && sysRes) {
      const vars = ['x', 'y', 'z', 'w'];
      const resStr =
        sysRes.status === 'unique' && sysRes.solution
          ? sysRes.solution.map((v, i) => `${vars[i] || `x${i + 1}`} = ${Number(v.toPrecision(8))}`).join(', ')
          : sysRes.status === 'infinite'
          ? 'Infinitely many solutions'
          : 'No solution (inconsistent)';
      return {
        expression: `${sysSize}x${sysSize} Linear System`,
        latex: `\\text{${sysSize}\\times${sysSize} Linear System}`,
        result: resStr,
        exactResult: null,
        isExact: false,
        module: 'algebra',
        category: `${sysSize}x${sysSize} Linear System`,
        steps: sysRes.steps,
        payload: { tab: 'systems', sysSize, s2: [s1a, s1b, s1c, s2a, s2b, s2c], mat3A, vec3b, mat4A, vec4b },
      };
    }
    if (tab === 'inequality' && iqRes) {
      return {
        expression: `${iqA}x^2 + (${iqB})x + (${iqC}) ${iqOp} 0`,
        latex: `${iqA}x^2 + (${iqB})x + (${iqC}) ${iqOp} 0`,
        result: iqRes.interval,
        exactResult: iqRes.interval,
        isExact: true,
        module: 'algebra',
        category: 'Quadratic Inequality',
        steps: [{ title: 'Solution Interval', expression: iqRes.interval, explanation: iqRes.explanation }],
        payload: { tab: 'inequality', iqA, iqB, iqC, iqOp },
      };
    }
    return null;
  }, [tab, eqRes, eqInput, polyDeg, linRes, quadRes, cubicRes, polyNRes, ca, cb, cc, cd, linRhs, polyCoeffs, simpRes, algExpr, sysRes, sysSize, s1a, s1b, s1c, s2a, s2b, s2c, mat3A, vec3b, mat4A, vec4b, iqRes, iqA, iqB, iqC, iqOp]);

  useAutoSaveCalculation(
    currentHistoryItem ? `${currentHistoryItem.category}::${currentHistoryItem.expression}::${currentHistoryItem.result}` : '',
    Boolean(currentHistoryItem),
    () => currentHistoryItem,
    1600
  );

  const selectPolyDegree = (deg: 1 | 2 | 3 | 4 | 5 | 6) => {
    setPolyDeg(deg);
    if (deg === 1) {
      setCa(2);
      setCb(6);
      setLinRhs(14);
    } else if (deg === 2) {
      setCa(1);
      setCb(-5);
      setCc(6);
    } else if (deg === 3) {
      setCa(1);
      setCb(-6);
      setCc(11);
      setCd(-6);
    } else if (deg === 4) {
      setPolyCoeffs([1, 0, -5, 0, 4, 0, 0]); // (x^2-1)(x^2-4) -> roots -2, -1, 1, 2
    } else if (deg === 5) {
      setPolyCoeffs([1, -1, 0, 0, -1, 1, 0]);
    } else {
      setPolyCoeffs([1, 0, -1, 0, 0, 0, 0]);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328]">
        {[
          { id: 'equation', label: 'Equation Solver f(x) = g(x)' },
          { id: 'poly', label: 'Linear, Quadratic & Polynomial' },
          { id: 'simplify', label: 'Expand, Simplify & Factor' },
          { id: 'systems', label: 'Systems of Equations (2×2 – 4×4)' },
          { id: 'inequality', label: 'Quadratic Inequalities' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as AlgebraTab)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              tab === t.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* GENERAL EQUATION SOLVER */}
      {tab === 'equation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Solve Equation for x</h2>
            <input
              type="text"
              value={eqInput}
              onChange={(e) => setEqInput(e.target.value)}
              placeholder="e.g. 2*x + 5 = 17 or x^4 - 5*x^2 + 4 = 0"
              className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                '3*(x - 2) + 4 = 2*x + 7',
                'x^2 - 5*x + 6 = 0',
                'x^3 - 6*x^2 + 11*x - 6 = 0',
                'x^4 - 5*x^2 + 4 = 0',
                'e^x = 3*x + 1',
                'cos(x) = x',
              ].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setEqInput(ex)}
                  className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-[#243B6B] bg-slate-50 dark:bg-slate-900 font-mono text-slate-700 dark:text-slate-300 hover:border-cyan-500 cursor-pointer"
                >
                  {ex}
                </button>
              ))}
            </div>
            {eqRes?.ok && (
              <button
                type="button"
                onClick={() => sendToGrapher(eqRes.simplifiedDiff)}
                className="px-3.5 py-2 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-700 cursor-pointer"
              >
                Plot LHS − RHS in Grapher
              </button>
            )}
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            {eqRes?.ok ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
                    {eqRes.equationKind === 'transcendental'
                      ? 'Real Solutions Found on [-50, 50]'
                      : `Exact ${eqRes.equationKind.charAt(0).toUpperCase() + eqRes.equationKind.slice(1)} Solutions`}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 font-mono text-[11px] text-blue-600 dark:text-cyan-300 uppercase">
                      {eqRes.equationKind}
                    </span>
                  </div>
                </div>
                {currentHistoryItem && tab === 'equation' && (
                  <ResultActionsBar compact item={currentHistoryItem} />
                )}
                <div className="font-mono text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {eqRes.allRootsFormatted.length > 0
                    ? eqRes.allRootsFormatted.map((r, i) => `x${eqRes.allRootsFormatted.length > 1 ? i + 1 : ''} = ${r}`).join(',   ')
                    : 'No solutions in [-50, 50]'}
                </div>
                <div className="space-y-2">
                  {eqRes.steps.map((s, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-slate-900/50 p-3 text-xs space-y-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{s.title}</div>
                      {s.latex ? <MathDisplay latex={s.latex} /> : s.expression ? <div className="font-mono text-cyan-400">{s.expression}</div> : null}
                      <p className="text-slate-500 dark:text-slate-400">{s.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-rose-500">{eqRes?.error}</div>
            )}
          </div>
        </div>
      )}

      {/* LINEAR / QUADRATIC / CUBIC / DEGREE-N POLYNOMIAL SOLVER */}
      {tab === 'poly' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
              {([
                { deg: 1, label: 'Linear' },
                { deg: 2, label: 'Quadratic' },
                { deg: 3, label: 'Cubic' },
                { deg: 4, label: 'Degree 4' },
                { deg: 5, label: 'Degree 5' },
                { deg: 6, label: 'Degree 6' },
              ] as const).map((item) => (
                <button
                  key={item.deg}
                  type="button"
                  onClick={() => selectPolyDegree(item.deg)}
                  className={`py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                    polyDeg === item.deg ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {polyDeg <= 3 ? (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 font-mono">a</span>
                  <input type="number" step="any" value={ca} onChange={(e) => setCa(Number(e.target.value) || 0)} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-slate-900 dark:text-slate-100" />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 font-mono">b</span>
                  <input type="number" step="any" value={cb} onChange={(e) => setCb(Number(e.target.value) || 0)} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-slate-900 dark:text-slate-100" />
                </label>
                {polyDeg === 1 && (
                  <label className="space-y-1 col-span-2">
                    <span className="text-slate-500 dark:text-slate-400 font-mono">RHS c (ax + b = c)</span>
                    <input type="number" step="any" value={linRhs} onChange={(e) => setLinRhs(Number(e.target.value) || 0)} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-slate-900 dark:text-slate-100" />
                  </label>
                )}
                {polyDeg >= 2 && (
                  <label className="space-y-1">
                    <span className="text-slate-500 dark:text-slate-400 font-mono">c</span>
                    <input type="number" step="any" value={cc} onChange={(e) => setCc(Number(e.target.value) || 0)} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-slate-900 dark:text-slate-100" />
                  </label>
                )}
                {polyDeg === 3 && (
                  <label className="space-y-1">
                    <span className="text-slate-500 dark:text-slate-400 font-mono">d</span>
                    <input type="number" step="any" value={cd} onChange={(e) => setCd(Number(e.target.value) || 0)} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-slate-900 dark:text-slate-100" />
                  </label>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {Array.from({ length: polyDeg + 1 }, (_, i) => {
                  const pow = polyDeg - i;
                  return (
                    <label key={i} className="space-y-1">
                      <span className="text-slate-500 dark:text-slate-400 font-mono">
                        {pow === 0 ? 'const' : pow === 1 ? 'x' : `x^${pow}`}
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={polyCoeffs[i] ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setPolyCoeffs((prev) => prev.map((c, idx) => (idx === i ? val : c)));
                        }}
                        className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-slate-900 dark:text-slate-100"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            {currentHistoryItem && tab === 'poly' && (
              <div className="pb-1">
                <ResultActionsBar compact item={currentHistoryItem} />
              </div>
            )}
            {polyDeg === 1 && linRes && (
              linRes.ok ? (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Linear Solution</div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158] text-lg">
                    <MathDisplay latex={linRes.latex} displayMode />
                  </div>
                  <div className="space-y-2">
                    {linRes.steps.map((s, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 dark:border-[#1E3158] p-3 text-xs space-y-1">
                        <div className="font-semibold">{s.title}</div>
                        {s.latex && <MathDisplay latex={s.latex} />}
                        <p className="text-slate-500 dark:text-slate-400">{s.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-rose-500">{linRes.error}</div>
              )
            )}

            {polyDeg === 2 && quadRes && (
              quadRes.ok ? (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Exact Roots & Vertex</div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158] text-lg">
                    <MathDisplay latex={quadRes.rootsLatex} displayMode />
                  </div>
                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#1E3158]">
                      Discriminant Δ = {quadRes.discriminant}
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#1E3158]">
                      Vertex = ({quadRes.vertex.x}, {quadRes.vertex.y})
                    </div>
                  </div>
                  <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                    Factored: {quadRes.factoredForm}
                  </div>
                  <div className="space-y-2">
                    {quadRes.steps.map((s, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 dark:border-[#1E3158] p-3 text-xs space-y-1">
                        <div className="font-semibold">{s.title}</div>
                        {s.latex && <MathDisplay latex={s.latex} />}
                        <p className="text-slate-500 dark:text-slate-400">{s.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-rose-500">{quadRes.error}</div>
              )
            )}

            {polyDeg === 3 && cubicRes && (
              cubicRes.ok ? (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Cubic Roots (Real & Complex)</div>
                  <div className="font-mono text-xl font-bold text-slate-900 dark:text-white space-y-1">
                    {cubicRes.roots.map((r, idx) => (
                      <div key={idx}>x_{idx + 1} = {r}</div>
                    ))}
                  </div>
                  {cubicRes.steps.map((s, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 dark:border-[#1E3158] p-3 text-xs space-y-1">
                      <div className="font-semibold">{s.title}</div>
                      {s.latex && <MathDisplay latex={s.latex} />}
                      <p className="text-slate-500 dark:text-slate-400">{s.explanation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-rose-500">{cubicRes.error}</div>
              )
            )}

            {polyDeg >= 4 && polyNRes && (
              polyNRes.ok ? (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
                    Degree-{polyNRes.degree} Polynomial Roots (Aberth-Ehrlich + Rational Deflation)
                  </div>
                  <div className="font-mono text-base font-bold text-slate-900 dark:text-white grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {polyNRes.allRootsFormatted.map((r, idx) => (
                      <div key={idx} className="px-2.5 py-1.5 rounded bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                        x_{idx + 1} = {r}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {polyNRes.steps.map((s, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 dark:border-[#1E3158] p-3 text-xs space-y-1">
                        <div className="font-semibold">{s.title}</div>
                        {s.latex ? <MathDisplay latex={s.latex} /> : s.expression ? <div className="font-mono text-cyan-400">{s.expression}</div> : null}
                        <p className="text-slate-500 dark:text-slate-400">{s.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-rose-500">{polyNRes.error}</div>
              )
            )}
          </div>
        </div>
      )}

      {/* EXPAND, SIMPLIFY & FACTOR */}
      {tab === 'simplify' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <h2 className="text-sm font-semibold">Symbolic Expression</h2>
            <input
              type="text"
              value={algExpr}
              onChange={(e) => setAlgExpr(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2.5 font-mono text-sm text-slate-900 dark:text-slate-100"
            />
            <div className="flex flex-wrap gap-1.5 text-xs">
              {['x^2 - 5*x + 6', 'x^3 - 1', '2*x^2 + 5*x + 2', '(x + 2)^3 - 3*x*(x + 1)'].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setAlgExpr(ex)}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-[#243B6B] font-mono hover:border-cyan-500 cursor-pointer"
                >
                  {ex}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => loadIntoCalculator(algExpr)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
            >
              Open in Calculator
            </button>
          </div>
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            {simpRes?.ok ? (
              <>
                {currentHistoryItem && tab === 'simplify' && (
                  <ResultActionsBar compact item={currentHistoryItem} />
                )}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Factored Form</div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                    <MathDisplay latex={simpRes.factoredLatex} displayMode />
                  </div>
                  <div className="font-mono text-xs text-slate-500">{simpRes.factored}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Expanded / Canonical Polynomial Form</div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                    <MathDisplay latex={simpRes.expandedLatex} displayMode />
                  </div>
                  <div className="font-mono text-xs text-slate-500">{simpRes.expanded}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-blue-600 dark:text-sky-400">Simplified Form</div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                    <MathDisplay latex={simpRes.simplifiedLatex} displayMode />
                  </div>
                </div>
                {simpRes.coefficients && (
                  <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                    Polynomial Coefficients [c₀, c₁, ...]: [{simpRes.coefficients.join(', ')}]
                  </div>
                )}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#1E3158]">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Step-by-Step Algebraic Transformation</div>
                  {simpRes.steps.map((s, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 dark:border-[#1E3158] p-3 text-xs space-y-1">
                      <div className="font-semibold">{s.title}</div>
                      {s.latex && <MathDisplay latex={s.latex} />}
                      <p className="text-slate-500 dark:text-slate-400">{s.explanation}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-rose-500">{simpRes?.error}</div>
            )}
          </div>
        </div>
      )}

      {/* SIMULTANEOUS 2x2 / 3x3 / 4x4 SYSTEM WITH GAUSS-JORDAN STEPS */}
      {tab === 'systems' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{sysSize}×{sysSize} Linear System</h2>
              <div className="flex gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-[#060B18]">
                {([2, 3, 4] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSysSize(sz)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                      sysSize === sz ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {sz}×{sz}
                  </button>
                ))}
              </div>
            </div>
            {sysSize === 2 ? (
              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <input type="number" value={s1a} onChange={(e) => setS1a(Number(e.target.value) || 0)} className="w-16 rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 text-center" />
                  <span>x +</span>
                  <input type="number" value={s1b} onChange={(e) => setS1b(Number(e.target.value) || 0)} className="w-16 rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 text-center" />
                  <span>y =</span>
                  <input type="number" value={s1c} onChange={(e) => setS1c(Number(e.target.value) || 0)} className="w-16 rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 text-center" />
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="number" value={s2a} onChange={(e) => setS2a(Number(e.target.value) || 0)} className="w-16 rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 text-center" />
                  <span>x +</span>
                  <input type="number" value={s2b} onChange={(e) => setS2b(Number(e.target.value) || 0)} className="w-16 rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 text-center" />
                  <span>y =</span>
                  <input type="number" value={s2c} onChange={(e) => setS2c(Number(e.target.value) || 0)} className="w-16 rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 text-center" />
                </div>
              </div>
            ) : sysSize === 3 ? (
              <div className="space-y-2 font-mono text-xs">
                {[0, 1, 2].map((r) => (
                  <div key={r} className="flex flex-wrap items-center gap-1">
                    {['x', 'y', 'z'].map((vName, c) => (
                      <React.Fragment key={c}>
                        <input
                          type="number"
                          step="any"
                          value={mat3A[r][c]}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setMat3A((prev) => prev.map((rw, ri) => rw.map((cell, ci) => (ri === r && ci === c ? val : cell))));
                          }}
                          className="w-12 rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-1.5 py-1 text-center"
                        />
                        <span>{vName}{c < 2 ? ' +' : ' ='}</span>
                      </React.Fragment>
                    ))}
                    <input
                      type="number"
                      step="any"
                      value={vec3b[r]}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setVec3b((prev) => prev.map((it, i) => (i === r ? val : it)));
                      }}
                      className="w-12 rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-1.5 py-1 text-center"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {[0, 1, 2, 3].map((r) => (
                  <div key={r} className="flex flex-wrap items-center gap-1">
                    {['x', 'y', 'z', 'w'].map((vName, c) => (
                      <React.Fragment key={c}>
                        <input
                          type="number"
                          step="any"
                          value={mat4A[r][c]}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setMat4A((prev) => prev.map((rw, ri) => rw.map((cell, ci) => (ri === r && ci === c ? val : cell))));
                          }}
                          className="w-11 rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-1 py-1 text-center"
                        />
                        <span>{vName}{c < 3 ? ' +' : ' ='}</span>
                      </React.Fragment>
                    ))}
                    <input
                      type="number"
                      step="any"
                      value={vec4b[r]}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setVec4b((prev) => prev.map((it, i) => (i === r ? val : it)));
                      }}
                      className="w-11 rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-1 py-1 text-center"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            {currentHistoryItem && tab === 'systems' && (
              <ResultActionsBar compact item={currentHistoryItem} />
            )}
            {sysRes?.status === 'unique' && sysRes.solution ? (
              <div className="font-mono text-xl sm:text-2xl font-bold text-cyan-600 dark:text-cyan-300">
                {sysRes.solution
                  .map((val, idx) => `${['x', 'y', 'z', 'w'][idx] ?? `x${idx + 1}`} = ${Number(val.toPrecision(8))}`)
                  .join(',   ')}
              </div>
            ) : (
              <div className="text-sm font-medium text-amber-500">
                {sysRes?.status === 'infinite' ? 'Infinitely many solutions (dependent system).' : 'Inconsistent system (no solution).'}
              </div>
            )}

            {sysRes && sysRes.steps.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#1E3158]">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Gauss-Jordan Elimination Steps
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {sysRes.steps.map((s, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-slate-900/50 p-3 text-xs space-y-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{s.title}</div>
                      {s.latex && (
                        <div className="overflow-x-auto">
                          <MathDisplay latex={s.latex} />
                        </div>
                      )}
                      <p className="text-slate-500 dark:text-slate-400">{s.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUADRATIC INEQUALITIES */}
      {tab === 'inequality' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <h2 className="text-sm font-semibold">ax² + bx + c □ 0</h2>
            <div className="grid grid-cols-4 gap-2 text-xs font-mono">
              <label className="space-y-1"><span className="text-slate-500">a</span><input type="number" value={iqA} onChange={(e) => setIqA(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5" /></label>
              <label className="space-y-1"><span className="text-slate-500">b</span><input type="number" value={iqB} onChange={(e) => setIqB(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5" /></label>
              <label className="space-y-1"><span className="text-slate-500">c</span><input type="number" value={iqC} onChange={(e) => setIqC(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5" /></label>
              <label className="space-y-1">
                <span className="text-slate-500">Op</span>
                <select value={iqOp} onChange={(e) => setIqOp(e.target.value as any)} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5">
                  <option value=">">&gt;</option>
                  <option value=">=">≥</option>
                  <option value="<">&lt;</option>
                  <option value="<=">≤</option>
                </select>
              </label>
            </div>
          </div>
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Solution Interval</div>
              {currentHistoryItem && tab === 'inequality' && (
                <ResultActionsBar compact item={currentHistoryItem} />
              )}
            </div>
            <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white">{iqRes?.interval}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{iqRes?.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};
