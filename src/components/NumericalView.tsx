import React, { useEffect, useMemo, useState } from 'react';
import { NewHistoryItemInput, useAppContext } from '../context/AppContext';
import { useAutoSaveCalculation } from '../hooks/useAutoSaveCalculation';
import {
  analyzeAdjacencyMatrix,
  computeSetOperations,
  evaluateTruthTable,
  extendedGCD,
  generateSequence,
  isPrime,
  modInverse,
  modPow,
  primeFactorization,
} from '../math/numberTheoryDiscrete';
import {
  bisectionMethod,
  lagrangeInterpolation,
  newtonRaphson,
  numericalDifferentiation,
  numericalIntegrationComparison,
  secantMethod,
} from '../math/numericalMethods';
import { ResultActionsBar } from './ResultActionsBar';

type NumTab = 'roots' | 'diffint' | 'interp' | 'number-theory' | 'discrete';

export const NumericalView: React.FC = () => {
  const { reopenRequest, clearReopenRequest } = useAppContext();
  const [tab, setTab] = useState<NumTab>('roots');

  // Root Finding
  const [rootMethod, setRootMethod] = useState<'newton' | 'bisection' | 'secant'>('newton');
  const [rootExpr, setRootExpr] = useState('x^3 - x - 2');
  const [x0, setX0] = useState(1.5);
  const [x1, setX1] = useState(2.0);

  // Numerical Diff / Int
  const [diExpr, setDiExpr] = useState('sin(x) * e^(-x/4)');
  const [diffX, setDiffX] = useState(1.0);
  const [diffH, setDiffH] = useState(0.001);
  const [intA, setIntA] = useState(0);
  const [intB, setIntB] = useState(3.14159265);
  const [intN, setIntN] = useState(24);

  // Interpolation
  const [interpPointsRaw, setInterpPointsRaw] = useState('0,1; 1,3; 2,7; 3,13');
  const [interpEvalX, setInterpEvalX] = useState(2.5);

  // Number Theory
  const [ntNumber, setNtNumber] = useState(360);
  const [gcdA, setGcdA] = useState(240);
  const [gcdB, setGcdB] = useState(46);
  const [modBase, setModBase] = useState(7);
  const [modExp, setModExp] = useState(13);
  const [modM, setModM] = useState(19);
  const [seqType, setSeqType] = useState<'fibonacci' | 'primes' | 'triangular' | 'catalan' | 'factorial'>('fibonacci');

  // Discrete Math
  const [logicFormula, setLogicFormula] = useState('(P AND Q) -> (P OR R)');
  const [setAStr, setSetAStr] = useState('1, 2, 3, 4');
  const [setBStr, setSetBStr] = useState('3, 4, 5, 6');
  const [adjMatrix, setAdjMatrix] = useState<number[][]>([
    [0, 1, 1, 0],
    [1, 0, 1, 1],
    [1, 1, 0, 1],
    [0, 1, 1, 0],
  ]);

  // Computations
  const rootRes =
    tab === 'roots'
      ? rootMethod === 'newton'
        ? newtonRaphson(rootExpr, x0)
        : rootMethod === 'bisection'
        ? bisectionMethod(rootExpr, x0, x1)
        : secantMethod(rootExpr, x0, x1)
      : null;

  let diffRes = null;
  let intRes = null;
  let diErr = '';
  if (tab === 'diffint') {
    try {
      diffRes = numericalDifferentiation(diExpr, diffX, diffH);
      intRes = numericalIntegrationComparison(diExpr, intA, intB, intN);
    } catch (e: any) {
      diErr = e.message;
    }
  }

  let interpRes = null;
  let interpErr = '';
  if (tab === 'interp') {
    try {
      const pts = interpPointsRaw
        .split(';')
        .map((pair) => pair.trim())
        .filter(Boolean)
        .map((pair) => {
          const [px, py] = pair.split(',').map((s) => Number(s.trim()));
          if (!Number.isFinite(px) || !Number.isFinite(py)) throw new Error('Invalid coordinate pair');
          return { x: px, y: py };
        });
      interpRes = lagrangeInterpolation(pts, interpEvalX);
    } catch (e: any) {
      interpErr = e.message;
    }
  }

  let pfRes = null;
  let pfErr = '';
  let gcdRes = null;
  if (tab === 'number-theory') {
    try {
      pfRes = primeFactorization(ntNumber);
    } catch (e: any) {
      pfErr = e.message;
    }
    try {
      gcdRes = extendedGCD(gcdA, gcdB);
    } catch {
      gcdRes = null;
    }
  }

  let truthRes = null;
  let truthErr = '';
  if (tab === 'discrete') {
    try {
      truthRes = evaluateTruthTable(logicFormula);
    } catch (e: any) {
      truthErr = e.message;
    }
  }

  const setOps = tab === 'discrete' ? computeSetOperations(setAStr, setBStr) : null;
  const graphStats = tab === 'discrete' ? analyzeAdjacencyMatrix(adjMatrix) : null;

  useEffect(() => {
    if (
      !reopenRequest ||
      !['numerical', 'number-theory', 'discrete'].includes(reopenRequest.item.module)
    ) {
      return;
    }
    const p = reopenRequest.item.payload as Record<string, any> | undefined;
    if (p?.tab) {
      setTab(p.tab as NumTab);
      if (p.tab === 'roots') {
        if (p.rootMethod) setRootMethod(p.rootMethod);
        if (typeof p.rootExpr === 'string') setRootExpr(p.rootExpr);
        if (typeof p.x0 === 'number') setX0(p.x0);
        if (typeof p.x1 === 'number') setX1(p.x1);
      } else if (p.tab === 'diffint') {
        if (typeof p.diExpr === 'string') setDiExpr(p.diExpr);
        if (typeof p.diffX === 'number') setDiffX(p.diffX);
        if (typeof p.diffH === 'number') setDiffH(p.diffH);
        if (typeof p.intA === 'number') setIntA(p.intA);
        if (typeof p.intB === 'number') setIntB(p.intB);
        if (typeof p.intN === 'number') setIntN(p.intN);
      } else if (p.tab === 'interp') {
        if (typeof p.interpPointsRaw === 'string') setInterpPointsRaw(p.interpPointsRaw);
        if (typeof p.interpEvalX === 'number') setInterpEvalX(p.interpEvalX);
      } else if (p.tab === 'number-theory') {
        if (typeof p.ntNumber === 'number') setNtNumber(p.ntNumber);
        if (typeof p.gcdA === 'number') setGcdA(p.gcdA);
        if (typeof p.gcdB === 'number') setGcdB(p.gcdB);
        if (typeof p.modBase === 'number') setModBase(p.modBase);
        if (typeof p.modExp === 'number') setModExp(p.modExp);
        if (typeof p.modM === 'number') setModM(p.modM);
      } else if (p.tab === 'discrete') {
        if (typeof p.logicFormula === 'string') setLogicFormula(p.logicFormula);
        if (typeof p.setAStr === 'string') setSetAStr(p.setAStr);
        if (typeof p.setBStr === 'string') setSetBStr(p.setBStr);
      }
    }
    clearReopenRequest();
  }, [reopenRequest, clearReopenRequest]);

  const currentHistoryItem: NewHistoryItemInput | null = useMemo(() => {
    if (tab === 'roots' && rootRes?.ok) {
      const rootVal = Number(rootRes.root.toPrecision(12));
      return {
        expression: `${rootMethod.toUpperCase()} root of ${rootExpr} = 0 (start=${x0}${rootMethod !== 'newton' ? `, ${x1}` : ''})`,
        latex: `${rootExpr} = 0`,
        result: `x ~ ${rootVal} (${rootRes.iterations.length} iterations)`,
        exactResult: null,
        isExact: false,
        module: 'numerical',
        category: `Root Finding (${rootMethod})`,
        steps: rootRes.iterations.slice(0, 8).map((row) => ({
          title: `Iteration ${row.iter}`,
          expression: `x_${row.iter} = ${row.x.toPrecision(10)}`,
          explanation: `f(x) = ${row.fx.toExponential(2)}, error = ${row.error.toExponential(2)}`,
        })),
        payload: { tab: 'roots', rootMethod, rootExpr, x0, x1 },
      };
    }
    if (tab === 'diffint' && !diErr && diffRes && intRes) {
      return {
        expression: `f(x) = ${diExpr}, diff at x=${diffX} (h=${diffH}), integral [${intA}, ${intB}] (n=${intN})`,
        latex: diExpr,
        result: `f'(${diffX}) = ${diffRes.central4.toPrecision(8)}; Integral (Romberg) = ${intRes.romberg.toPrecision(10)}`,
        exactResult: null,
        isExact: false,
        module: 'numerical',
        category: 'Numerical Diff & Quadrature',
        steps: [
          { title: '5-Point Central Derivative', expression: `f'(${diffX}) = ${diffRes.central4.toPrecision(8)}`, explanation: `2nd Deriv f'' = ${diffRes.secondDeriv.toPrecision(7)}, Forward = ${diffRes.forward.toPrecision(7)}.` },
          { title: 'Quadrature Comparison', expression: `Romberg = ${intRes.romberg.toPrecision(10)}, Simpson 1/3 = ${intRes.simpson13.toPrecision(10)}`, explanation: `Trapezoidal = ${intRes.trapezoidal.toPrecision(10)}, Error est ~ +/-${intRes.rombergErrorEst.toExponential(1)}.` },
        ],
        payload: { tab: 'diffint', diExpr, diffX, diffH, intA, intB, intN },
      };
    }
    if (tab === 'interp' && !interpErr && interpRes) {
      return {
        expression: `Lagrange Interpolation [(${interpPointsRaw})] at x=${interpEvalX}`,
        latex: `P(${interpEvalX})`,
        result: `P(${interpEvalX}) = ${Number(interpRes.value.toPrecision(10))}`,
        exactResult: interpRes.polynomial,
        isExact: false,
        module: 'numerical',
        category: 'Lagrange Interpolation',
        steps: [
          { title: `Degree-${interpRes.degree} Polynomial`, expression: `P(x) = ${interpRes.polynomial}`, explanation: `Evaluated P(${interpEvalX}) = ${Number(interpRes.value.toPrecision(10))}.` },
        ],
        payload: { tab: 'interp', interpPointsRaw, interpEvalX },
      };
    }
    if (tab === 'number-theory' && !pfErr && pfRes) {
      const mPow = modPow(modBase, modExp, modM);
      const mInv = modInverse(modBase, modM);
      return {
        expression: `n=${ntNumber}, GCD(${gcdA},${gcdB}), ${modBase}^${modExp} mod ${modM}`,
        latex: `${ntNumber} = ${pfRes.formatted}`,
        result: `${pfRes.formatted} (${isPrime(pfRes.n) ? 'Prime' : 'Composite'}), phi=${pfRes.totient}${gcdRes ? `, GCD=${gcdRes.gcd}` : ''}, mod=${mPow}`,
        exactResult: pfRes.formatted,
        isExact: true,
        module: 'number-theory',
        category: 'Number Theory',
        steps: [
          { title: 'Prime Factorization & Totient', expression: `${pfRes.n} = ${pfRes.formatted}`, explanation: `Euler totient phi(${pfRes.n}) = ${pfRes.totient}, ${pfRes.divisors.length} divisors.` },
          ...(gcdRes ? [{ title: 'Extended Euclidean Algorithm', expression: `GCD=${gcdRes.gcd}, LCM=${gcdRes.lcm}`, explanation: `Bezout: (${gcdA})(${gcdRes.x}) + (${gcdB})(${gcdRes.y}) = ${gcdRes.gcd}.` }] : []),
          { title: 'Modular Arithmetic', expression: `${modBase}^${modExp} mod ${modM} = ${mPow}`, explanation: `Modular inverse ${modBase}^-1 mod ${modM} = ${mInv ?? 'None'}.` },
        ],
        payload: { tab: 'number-theory', ntNumber, gcdA, gcdB, modBase, modExp, modM },
      };
    }
    if (tab === 'discrete' && !truthErr && truthRes && setOps && graphStats) {
      return {
        expression: `Logic: ${logicFormula} | Sets A={${setAStr}}, B={${setBStr}}`,
        latex: logicFormula,
        result: `${truthRes.classification}; A U B = {${setOps.union.join(', ')}}`,
        exactResult: truthRes.classification,
        isExact: true,
        module: 'discrete',
        category: 'Discrete Math & Logic',
        steps: [
          { title: 'Propositional Logic Classification', expression: `${logicFormula} -> ${truthRes.classification}`, explanation: `Evaluated ${truthRes.rows.length} truth table rows across variables ${truthRes.variables.join(', ')}.` },
          { title: 'Set Operations & Graph Stats', expression: `A intersect B = {${setOps.intersection.join(', ')}}`, explanation: `4-vertex graph: ${graphStats.edges} edges, connected: ${graphStats.isConnected ? 'Yes' : 'No'}.` },
        ],
        payload: { tab: 'discrete', logicFormula, setAStr, setBStr },
      };
    }
    return null;
  }, [tab, rootRes, rootMethod, rootExpr, x0, x1, diErr, diffRes, intRes, diExpr, diffX, diffH, intA, intB, intN, interpErr, interpRes, interpPointsRaw, interpEvalX, pfErr, pfRes, ntNumber, gcdA, gcdB, gcdRes, modBase, modExp, modM, truthErr, truthRes, logicFormula, setOps, setAStr, setBStr, graphStats]);

  useAutoSaveCalculation(
    currentHistoryItem ? `${tab}::${currentHistoryItem.expression}::${currentHistoryItem.result}` : '',
    Boolean(currentHistoryItem),
    () => currentHistoryItem,
    1600
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328]">
        {[
          { id: 'roots', label: 'Root Finding (Newton / Bisection / Secant)' },
          { id: 'diffint', label: 'Numerical Diff & Quadrature' },
          { id: 'interp', label: 'Lagrange Interpolation' },
          { id: 'number-theory', label: 'Number Theory' },
          { id: 'discrete', label: 'Discrete Math (Logic, Sets, Graphs)' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as NumTab)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ROOT FINDING */}
      {tab === 'roots' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#060B18]">
              {(['newton', 'bisection', 'secant'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRootMethod(m)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md capitalize cursor-pointer ${
                    rootMethod === m ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-xs text-slate-500">Equation f(x) = 0</span>
              <input type="text" value={rootExpr} onChange={(e) => setRootExpr(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-sm" />
            </label>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span className="text-slate-500">{rootMethod === 'newton' ? 'Initial guess x₀' : rootMethod === 'bisection' ? 'Left bracket a' : 'Initial x₀'}</span>
                <input type="number" step="any" value={x0} onChange={(e) => setX0(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono" />
              </label>
              {rootMethod !== 'newton' && (
                <label className="space-y-1">
                  <span className="text-slate-500">{rootMethod === 'bisection' ? 'Right bracket b' : 'Second x₁'}</span>
                  <input type="number" step="any" value={x1} onChange={(e) => setX1(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono" />
                </label>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            {currentHistoryItem && tab === 'roots' && (
              <ResultActionsBar compact item={currentHistoryItem} />
            )}
            {rootRes?.ok ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-blue-600 dark:text-cyan-300 font-medium">
                      {rootRes.converged ? 'Converged Root' : 'Max Iterations Reached'}
                    </div>
                    <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                      x ≈ {Number(rootRes.root.toPrecision(12))}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    {rootRes.iterations.length} iterations
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-[#1E3158]">
                  <table className="w-full text-xs font-mono">
                    <thead className="bg-slate-100 dark:bg-[#060B18] sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Iter</th>
                        <th className="p-2 text-right">xₙ</th>
                        <th className="p-2 text-right">f(xₙ)</th>
                        <th className="p-2 text-right">Error Estimate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rootRes.iterations.map((row) => (
                        <tr key={row.iter}>
                          <td className="p-2">{row.iter}</td>
                          <td className="p-2 text-right">{row.x.toPrecision(10)}</td>
                          <td className="p-2 text-right">{row.fx.toExponential(2)}</td>
                          <td className="p-2 text-right">{row.error.toExponential(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-sm text-rose-500">{rootRes?.error}</div>
            )}
          </div>
        </div>
      )}

      {/* NUMERICAL DIFF & INTEGRATION */}
      {tab === 'diffint' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <h2 className="text-sm font-semibold">Function & Grid Parameters</h2>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">f(x)</span>
              <input type="text" value={diExpr} onChange={(e) => setDiExpr(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="space-y-1">
                <span className="text-slate-500">Diff point x₀</span>
                <input type="number" step="any" value={diffX} onChange={(e) => setDiffX(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
              </label>
              <label className="space-y-1">
                <span className="text-slate-500">Step size h</span>
                <input type="number" step="0.0001" value={diffH} onChange={(e) => setDiffH(Math.max(1e-7, Number(e.target.value)))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
              </label>
              <label className="space-y-1">
                <span className="text-slate-500">Integral a</span>
                <input type="number" step="any" value={intA} onChange={(e) => setIntA(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
              </label>
              <label className="space-y-1">
                <span className="text-slate-500">Integral b</span>
                <input type="number" step="any" value={intB} onChange={(e) => setIntB(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
              </label>
              <label className="space-y-1 col-span-2">
                <span className="text-slate-500">Subintervals n</span>
                <input type="number" min={6} max={600} step={6} value={intN} onChange={(e) => setIntN(Math.max(6, Number(e.target.value)))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
              </label>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            {currentHistoryItem && tab === 'diffint' && (
              <ResultActionsBar compact item={currentHistoryItem} />
            )}
            {diErr ? (
              <p className="text-sm text-rose-500">{diErr}</p>
            ) : (
              <>
                {diffRes && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-blue-600 dark:text-cyan-300">Finite Difference Derivatives at x₀ = {diffX}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">Forward O(h): {diffRes.forward.toPrecision(8)}</div>
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">Backward O(h): {diffRes.backward.toPrecision(8)}</div>
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">Central O(h²): {diffRes.central2.toPrecision(8)}</div>
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">5-Pt Central O(h⁴): {diffRes.central4.toPrecision(8)}</div>
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">Second Deriv f″: {diffRes.secondDeriv.toPrecision(7)}</div>
                    </div>
                  </div>
                )}
                {intRes && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-blue-600 dark:text-cyan-300">Quadrature Comparison (n = {intRes.subintervals})</h3>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">Trapezoidal: {intRes.trapezoidal.toPrecision(10)}</div>
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">Simpson 1/3: {intRes.simpson13.toPrecision(10)}</div>
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">Simpson 3/8: {intRes.simpson38.toPrecision(10)}</div>
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                        Romberg R(4,4): {intRes.romberg.toPrecision(10)} (±{intRes.rombergErrorEst.toExponential(1)})
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* LAGRANGE INTERPOLATION */}
      {tab === 'interp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <h2 className="text-sm font-semibold">Data Points (x, y; ...)</h2>
            <input type="text" value={interpPointsRaw} onChange={(e) => setInterpPointsRaw(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-xs" />
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">Evaluate P(x) at x =</span>
              <input type="number" step="any" value={interpEvalX} onChange={(e) => setInterpEvalX(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-1.5 font-mono text-xs" />
            </label>
          </div>
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            {currentHistoryItem && tab === 'interp' && (
              <ResultActionsBar compact item={currentHistoryItem} />
            )}
            {interpErr ? (
              <p className="text-sm text-rose-500">{interpErr}</p>
            ) : interpRes ? (
              <div className="space-y-2">
                <div className="text-xs text-blue-600 dark:text-cyan-300 font-medium">Degree-{interpRes.degree} Interpolating Polynomial</div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158] font-mono text-sm">
                  P(x) = {interpRes.polynomial}
                </div>
                <div className="font-mono text-xl font-bold text-slate-900 dark:text-white">
                  P({interpEvalX}) = {Number(interpRes.value.toPrecision(10))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* NUMBER THEORY */}
      {tab === 'number-theory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Primality, Factorization &amp; Totient</h2>
              {currentHistoryItem && tab === 'number-theory' && (
                <ResultActionsBar compact item={currentHistoryItem} />
              )}
            </div>
            <input type="number" value={ntNumber} onChange={(e) => setNtNumber(Math.max(2, Math.floor(Number(e.target.value) || 2)))} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-sm" />
            {pfErr ? (
              <p className="text-xs text-rose-500">{pfErr}</p>
            ) : pfRes ? (
              <div className="space-y-2 text-xs font-mono">
                <div>Status: <span className="font-bold text-blue-600 dark:text-cyan-300">{isPrime(pfRes.n) ? 'Prime' : 'Composite'}</span></div>
                <div>Prime Factorization: <span className="font-bold">{pfRes.formatted}</span></div>
                <div>Euler Totient φ({pfRes.n}) = {pfRes.totient}</div>
                {pfRes.divisors.length > 0 && (
                  <div className="max-h-24 overflow-y-auto text-slate-500">
                    Divisors ({pfRes.divisors.length}): {pfRes.divisors.join(', ')}
                  </div>
                )}
              </div>
            ) : null}

            <div className="pt-3 border-t border-slate-200 dark:border-[#1E3158] space-y-2">
              <h3 className="text-xs font-semibold">Extended Euclidean GCD / LCM</h3>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={gcdA} onChange={(e) => setGcdA(Number(e.target.value))} className="rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs" />
                <input type="number" value={gcdB} onChange={(e) => setGcdB(Number(e.target.value))} className="rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs" />
              </div>
              {gcdRes && (
                <div className="font-mono text-xs space-y-1">
                  <div className="text-blue-600 dark:text-cyan-300 font-semibold">
                    GCD = {gcdRes.gcd} · LCM = {gcdRes.lcm}
                  </div>
                  <div className="text-slate-500">Bézout: ({gcdA})({gcdRes.x}) + ({gcdB})({gcdRes.y}) = {gcdRes.gcd}</div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Modular Arithmetic (aᵇ mod m & Inverse)</h2>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <label className="space-y-1"><span className="text-slate-500">Base a</span><input type="number" value={modBase} onChange={(e) => setModBase(Math.trunc(Number(e.target.value)))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5" /></label>
                <label className="space-y-1"><span className="text-slate-500">Exp b</span><input type="number" min={0} value={modExp} onChange={(e) => setModExp(Math.max(0, Math.trunc(Number(e.target.value))))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5" /></label>
                <label className="space-y-1"><span className="text-slate-500">Mod m</span><input type="number" min={1} value={modM} onChange={(e) => setModM(Math.max(1, Math.trunc(Number(e.target.value))))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5" /></label>
              </div>
              <div className="font-mono text-xs p-2.5 rounded bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158] space-y-1">
                <div>{modBase}^{modExp} mod {modM} = <strong className="text-blue-600 dark:text-cyan-300">{modPow(modBase, modExp, modM)}</strong></div>
                <div>
                  Modular Inverse {modBase}⁻¹ mod {modM} ={' '}
                  <strong>{modInverse(modBase, modM) ?? 'Does not exist (gcd ≠ 1)'}</strong>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-[#1E3158] space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold">Integer Sequences</h3>
                <select value={seqType} onChange={(e) => setSeqType(e.target.value as any)} className="rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1 text-xs">
                  <option value="fibonacci">Fibonacci</option>
                  <option value="primes">Primes</option>
                  <option value="triangular">Triangular</option>
                  <option value="catalan">Catalan</option>
                  <option value="factorial">Factorial</option>
                </select>
              </div>
              <div className="font-mono text-xs p-2.5 rounded bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                {generateSequence(seqType, 14).join(', ')}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* DISCRETE MATH */}
      {tab === 'discrete' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <section className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Propositional Logic &amp; Truth Tables</h2>
              {currentHistoryItem && tab === 'discrete' && (
                <ResultActionsBar compact item={currentHistoryItem} />
              )}
            </div>
            <p className="text-xs text-slate-500">Supports P, Q, R, S and NOT (!, ¬), AND (∧), OR (∨), XOR (⊕), -&gt; (⇒), &lt;-&gt; (⇔).</p>
            <input type="text" value={logicFormula} onChange={(e) => setLogicFormula(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-xs" />
            {truthErr ? (
              <p className="text-xs text-rose-500">{truthErr}</p>
            ) : truthRes ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-blue-600 dark:text-cyan-300">
                  Classification: {truthRes.classification}
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-[#1E3158]">
                  <table className="w-full text-xs font-mono text-center">
                    <thead className="bg-slate-100 dark:bg-[#060B18] sticky top-0">
                      <tr>
                        {truthRes.variables.map((v) => <th key={v} className="p-1.5">{v}</th>)}
                        <th className="p-1.5 text-blue-600 dark:text-cyan-300">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {truthRes.rows.map((r, i) => (
                        <tr key={i}>
                          {truthRes.variables.map((v) => (
                            <td key={v} className="p-1.5">{r.assignment[v] ? 'T' : 'F'}</td>
                          ))}
                          <td className={`p-1.5 font-bold ${r.result ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {r.result ? 'T' : 'F'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>

          <section className="lg:col-span-6 space-y-5">
            <div className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
              <h2 className="text-sm font-semibold">Set Operations</h2>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <label className="space-y-1"><span className="text-slate-500">Set A</span><input type="text" value={setAStr} onChange={(e) => setSetAStr(e.target.value)} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5" /></label>
                <label className="space-y-1"><span className="text-slate-500">Set B</span><input type="text" value={setBStr} onChange={(e) => setSetBStr(e.target.value)} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5" /></label>
              </div>
              {setOps && (
                <div className="font-mono text-xs space-y-1">
                  <div>A ∪ B = {'{' + setOps.union.join(', ') + '}'}</div>
                  <div>A ∩ B = {'{' + setOps.intersection.join(', ') + '}'}</div>
                  <div>A \ B = {'{' + setOps.diffAB.join(', ') + '}'}</div>
                  <div>A △ B = {'{' + setOps.symDiff.join(', ') + '}'}</div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
              <h2 className="text-sm font-semibold">Graph Theory (4-Vertex Adjacency Matrix)</h2>
              <div className="grid grid-cols-4 gap-1.5 max-w-[200px]">
                {adjMatrix.map((row, r) =>
                  row.map((val, c) => (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      disabled={r === c}
                      onClick={() => {
                        const nextVal = val ? 0 : 1;
                        setAdjMatrix((prev) =>
                          prev.map((rw, ri) =>
                            rw.map((cell, ci) => {
                              if ((ri === r && ci === c) || (ri === c && ci === r)) return nextVal;
                              return cell;
                            })
                          )
                        );
                      }}
                      className={`h-9 rounded border font-mono text-xs font-semibold cursor-pointer ${
                        r === c
                          ? 'bg-slate-100 dark:bg-[#060B18] border-slate-200 dark:border-[#1E3158] text-slate-400'
                          : val
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white dark:bg-[#060B18] border-slate-300 dark:border-[#243B6B]'
                      }`}
                    >
                      {val}
                    </button>
                  ))
                )}
              </div>
              {graphStats && (
                <div className="font-mono text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <div>Vertices: {graphStats.vertices} · Edges: {graphStats.edges} · Connected: {graphStats.isConnected ? 'Yes' : `No (${graphStats.connectedComponents} components)`}</div>
                  <div>Degrees: [{graphStats.degrees.join(', ')}]</div>
                  <div>Shortest path dist from v₁: [{graphStats.shortestFromV1.join(', ')}]</div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
