import React, { useEffect, useMemo, useState } from 'react';
import { NewHistoryItemInput, useAppContext } from '../context/AppContext';
import { useAutoSaveCalculation } from '../hooks/useAutoSaveCalculation';
import {
  computeDefiniteIntegral,
  computeDerivative,
  computeDoubleIntegral,
  computeGradient,
  computeIndefiniteIntegral,
  computeLimit,
  computeNumericalDerivative,
  computeTaylorSeries,
  extractExpressionVariables,
  solveFirstOrderODE,
} from '../math/calculus';
import { math, preprocessExpression } from '../math/engine';
import { MathDisplay } from './MathDisplay';
import { ResultActionsBar } from './ResultActionsBar';

type CalcTab = 'derivative' | 'integral' | 'limit' | 'taylor' | 'ode';

function parseCalcNumber(raw: string): number {
  const t = raw.trim();
  if (!t) return NaN;
  try {
    const val = math.evaluate(preprocessExpression(t), { pi: Math.PI, e: Math.E });
    return typeof val === 'number' && Number.isFinite(val) ? val : NaN;
  } catch {
    return NaN;
  }
}

export const CalculusView: React.FC = () => {
  const { addHistoryItem, sendToGrapher, reopenRequest, clearReopenRequest } = useAppContext();
  const [tab, setTab] = useState<CalcTab>('derivative');

  // Derivative state
  const [derivExpr, setDerivExpr] = useState('x^3 * sin(x)');
  const [derivVar, setDerivVar] = useState('x');
  const [derivOrder, setDerivOrder] = useState(1);
  const [derivEvalAt, setDerivEvalAt] = useState('1');
  const [partialMode, setPartialMode] = useState(false);
  const [partialEvalMap, setPartialEvalMap] = useState<Record<string, string>>({ x: '1', y: '0', z: '1' });

  // Integral state
  const [intMode, setIntMode] = useState<'indefinite' | 'definite' | 'double'>('definite');
  const [intExpr, setIntExpr] = useState('x^2 * e^x');
  const [intVar, setIntVar] = useState('x');
  const [intA, setIntA] = useState('0');
  const [intB, setIntB] = useState('2');
  const [dblYMin, setDblYMin] = useState('0');
  const [dblYMax, setDblYMax] = useState('1');

  // Limit state
  const [limExpr, setLimExpr] = useState('sin(x) / x');
  const [limVar, setLimVar] = useState('x');
  const [limTarget, setLimTarget] = useState('0');
  const [limDir, setLimDir] = useState<'both' | 'left' | 'right'>('both');

  // Taylor state
  const [tayExpr, setTayExpr] = useState('cos(x)');
  const [tayCenter, setTayCenter] = useState('0');
  const [tayDegree, setTayDegree] = useState(6);

  // ODE state
  const [odeExpr, setOdeExpr] = useState('-y + sin(x)');
  const [odeX0, setOdeX0] = useState('0');
  const [odeY0, setOdeY0] = useState('1');
  const [odeXEnd, setOdeXEnd] = useState('5');

  const detectedPartialVars = useMemo(() => {
    const vars = extractExpressionVariables(derivExpr);
    return vars.length > 0 ? vars : ['x', 'y', 'z'];
  }, [derivExpr]);

  const numericPartialPoint = useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of detectedPartialVars) {
      const parsed = parseCalcNumber(partialEvalMap[v] ?? '');
      if (Number.isFinite(parsed)) out[v] = parsed;
    }
    return out;
  }, [detectedPartialVars, partialEvalMap]);

  const evalPtNum = derivEvalAt.trim() !== '' ? parseCalcNumber(derivEvalAt) : undefined;
  const validEvalPt = evalPtNum !== undefined && Number.isFinite(evalPtNum) ? evalPtNum : undefined;

  const derivRes =
    tab === 'derivative' && !partialMode
      ? computeDerivative(derivExpr, derivVar, derivOrder, validEvalPt)
      : null;

  const numDerivRes =
    tab === 'derivative' && !partialMode && validEvalPt !== undefined
      ? computeNumericalDerivative(derivExpr, derivVar, derivOrder, validEvalPt)
      : null;

  const gradRes =
    tab === 'derivative' && partialMode
      ? computeGradient(
          derivExpr,
          detectedPartialVars,
          Object.keys(numericPartialPoint).length === detectedPartialVars.length ? numericPartialPoint : undefined
        )
      : null;

  const indefRes = tab === 'integral' && intMode === 'indefinite' ? computeIndefiniteIntegral(intExpr, intVar) : null;
  const parsedA = parseCalcNumber(intA);
  const parsedB = parseCalcNumber(intB);
  const parsedYMin = parseCalcNumber(dblYMin);
  const parsedYMax = parseCalcNumber(dblYMax);

  const defRes =
    tab === 'integral' && intMode === 'definite'
      ? Number.isFinite(parsedA) && Number.isFinite(parsedB)
        ? computeDefiniteIntegral(intExpr, intVar, parsedA, parsedB)
        : { ok: false, value: NaN, errorEstimate: NaN, method: 'Adaptive Simpson', steps: [], error: 'Enter valid numeric or symbolic bounds (e.g. 0, pi, pi/2).' }
      : null;
  const dblRes =
    tab === 'integral' && intMode === 'double'
      ? Number.isFinite(parsedA) && Number.isFinite(parsedB) && Number.isFinite(parsedYMin) && Number.isFinite(parsedYMax)
        ? computeDoubleIntegral(intExpr, parsedA, parsedB, parsedYMin, parsedYMax)
        : { ok: false, value: NaN, steps: [], error: 'Enter valid numeric or symbolic domain bounds (e.g. 0, pi).' }
      : null;

  const limRes = tab === 'limit' ? computeLimit(limExpr, limVar, limTarget, limDir) : null;
  const tayCenterNum = parseCalcNumber(tayCenter);
  const tayRes = tab === 'taylor' ? computeTaylorSeries(tayExpr, 'x', Number.isFinite(tayCenterNum) ? tayCenterNum : 0, tayDegree) : null;
  const odeRes =
    tab === 'ode'
      ? solveFirstOrderODE(odeExpr, Number(odeX0) || 0, Number(odeY0) || 0, Number(odeXEnd) || 2, 36)
      : null;

  useEffect(() => {
    if (!reopenRequest || reopenRequest.item.module !== 'calculus') return;
    const p = reopenRequest.item.payload as Record<string, any> | undefined;
    if (p?.tab) {
      setTab(p.tab as CalcTab);
      if (p.tab === 'derivative') {
        if (typeof p.partialMode === 'boolean') setPartialMode(p.partialMode);
        if (typeof p.derivExpr === 'string') setDerivExpr(p.derivExpr);
        if (typeof p.derivVar === 'string') setDerivVar(p.derivVar);
        if (typeof p.derivOrder === 'number') setDerivOrder(p.derivOrder);
        if (typeof p.derivEvalAt === 'string') setDerivEvalAt(p.derivEvalAt);
      } else if (p.tab === 'integral') {
        if (p.intMode) setIntMode(p.intMode);
        if (typeof p.intExpr === 'string') setIntExpr(p.intExpr);
        if (typeof p.intVar === 'string') setIntVar(p.intVar);
        if (typeof p.intA === 'string') setIntA(p.intA);
        if (typeof p.intB === 'string') setIntB(p.intB);
        if (typeof p.dblYMin === 'string') setDblYMin(p.dblYMin);
        if (typeof p.dblYMax === 'string') setDblYMax(p.dblYMax);
      } else if (p.tab === 'limit') {
        if (typeof p.limExpr === 'string') setLimExpr(p.limExpr);
        if (typeof p.limVar === 'string') setLimVar(p.limVar);
        if (typeof p.limTarget === 'string') setLimTarget(p.limTarget);
        if (p.limDir) setLimDir(p.limDir);
      } else if (p.tab === 'taylor') {
        if (typeof p.tayExpr === 'string') setTayExpr(p.tayExpr);
        if (typeof p.tayCenter === 'string') setTayCenter(p.tayCenter);
        if (typeof p.tayDegree === 'number') setTayDegree(p.tayDegree);
      } else if (p.tab === 'ode') {
        if (typeof p.odeExpr === 'string') setOdeExpr(p.odeExpr);
        if (typeof p.odeX0 === 'string') setOdeX0(p.odeX0);
        if (typeof p.odeY0 === 'string') setOdeY0(p.odeY0);
        if (typeof p.odeXEnd === 'string') setOdeXEnd(p.odeXEnd);
      }
    }
    clearReopenRequest();
  }, [reopenRequest, clearReopenRequest]);

  const currentHistoryItem: NewHistoryItemInput | null = useMemo(() => {
    if (tab === 'derivative') {
      if (!partialMode && derivRes?.ok) {
        return {
          expression: `d^${derivOrder}/d${derivVar}^${derivOrder}(${derivExpr})${validEvalPt !== undefined ? ` at ${derivVar}=${derivEvalAt}` : ''}`,
          latex: `\\frac{d^{${derivOrder}}}{d${derivVar}^{${derivOrder}}}\\left(${derivExpr}\\right)`,
          result:
            derivRes.evaluatedAt !== undefined
              ? `${derivRes.expression} (at ${derivVar}=${derivEvalAt}: ${Number(derivRes.evaluatedAt.toPrecision(10))})`
              : derivRes.expression,
          exactResult: derivRes.expression,
          isExact: true,
          module: 'calculus',
          category: derivOrder > 1 ? `Order-${derivOrder} Derivative` : 'Derivative',
          steps: derivRes.steps,
          payload: { tab: 'derivative', partialMode: false, derivExpr, derivVar, derivOrder, derivEvalAt },
        };
      }
      if (partialMode && gradRes && gradRes.some((g) => g.ok)) {
        const vec = gradRes.filter((g) => g.ok).map((g) => `d/d${g.variable}: ${g.expression}`).join('; ');
        return {
          expression: `grad(${derivExpr})`,
          latex: `\\nabla\\left(${derivExpr}\\right)`,
          result: vec,
          exactResult: vec,
          isExact: true,
          module: 'calculus',
          category: 'Partial Derivatives & Gradient',
          steps: gradRes.flatMap((g) => g.steps),
          payload: { tab: 'derivative', partialMode: true, derivExpr },
        };
      }
    }
    if (tab === 'integral') {
      if (intMode === 'indefinite' && indefRes?.ok) {
        return {
          expression: `integral (${intExpr}) d${intVar}`,
          latex: `\\int (${intExpr})\\,d${intVar}`,
          result: indefRes.symbolicFound ? indefRes.antiderivative : 'No closed-form elementary antiderivative',
          exactResult: indefRes.symbolicFound ? indefRes.antiderivative : null,
          isExact: indefRes.symbolicFound,
          module: 'calculus',
          category: 'Indefinite Integral',
          steps: indefRes.steps,
          payload: { tab: 'integral', intMode, intExpr, intVar },
        };
      }
      if (intMode === 'definite' && defRes?.ok) {
        const valStr = String(Number(defRes.value.toPrecision(12)));
        return {
          expression: `integral_[${intA}, ${intB}] (${intExpr}) d${intVar}`,
          latex: `\\int_{${intA}}^{${intB}} (${intExpr})\\,d${intVar}`,
          result: valStr,
          exactResult: null,
          isExact: false,
          module: 'calculus',
          category: 'Definite Integral',
          steps: defRes.steps,
          payload: { tab: 'integral', intMode, intExpr, intVar, intA, intB },
        };
      }
      if (intMode === 'double' && dblRes?.ok) {
        const valStr = String(Number(dblRes.value.toPrecision(10)));
        return {
          expression: `double_integral_[${intA},${intB}]x[${dblYMin},${dblYMax}] (${intExpr}) dx dy`,
          latex: `\\int_{${dblYMin}}^{${dblYMax}}\\int_{${intA}}^{${intB}} (${intExpr})\\,dx\\,dy`,
          result: valStr,
          exactResult: null,
          isExact: false,
          module: 'calculus',
          category: 'Double Integral',
          steps: dblRes.steps,
          payload: { tab: 'integral', intMode, intExpr, intA, intB, dblYMin, dblYMax },
        };
      }
    }
    if (tab === 'limit' && limRes?.ok) {
      return {
        expression: `lim (${limVar} -> ${limTarget}${limDir === 'left' ? '-' : limDir === 'right' ? '+' : ''}) ${limExpr}`,
        latex: `\\lim_{${limVar} \\to ${limTarget}} \\left(${limExpr}\\right)`,
        result: limRes.value,
        exactResult: null,
        isExact: false,
        module: 'calculus',
        category: 'Limit',
        steps: limRes.steps,
        payload: { tab: 'limit', limExpr, limVar, limTarget, limDir },
      };
    }
    if (tab === 'taylor' && tayRes?.ok) {
      return {
        expression: `Taylor(${tayExpr}, x0=${tayCenter}, deg=${tayDegree})`,
        latex: `T_{${tayDegree}}(${tayExpr})`,
        result: tayRes.polynomial,
        exactResult: tayRes.polynomial,
        isExact: true,
        module: 'calculus',
        category: 'Taylor Series',
        steps: tayRes.steps,
        payload: { tab: 'taylor', tayExpr, tayCenter, tayDegree },
      };
    }
    if (tab === 'ode' && odeRes?.ok) {
      const rk4 = Number(odeRes.finalRK4.toPrecision(8));
      return {
        expression: `dy/dx = ${odeExpr}, y(${odeX0}) = ${odeY0}, target x = ${odeXEnd}`,
        latex: `\\frac{dy}{dx} = ${odeExpr},\\; y(${odeX0})=${odeY0}`,
        result: `RK4 y(${odeXEnd}) = ${rk4} (Euler: ${Number(odeRes.finalEuler.toPrecision(8))})`,
        exactResult: null,
        isExact: false,
        module: 'calculus',
        category: 'Differential Equation (ODE)',
        steps: [
          {
            title: '4th-Order Runge-Kutta (RK4) Integration',
            expression: `y(${odeXEnd}) ~ ${rk4}`,
            explanation: `Integrated from x0 = ${odeX0} to ${odeXEnd} in 36 uniform RK4 steps alongside Euler comparison.`,
          },
        ],
        payload: { tab: 'ode', odeExpr, odeX0, odeY0, odeXEnd },
      };
    }
    return null;
  }, [tab, partialMode, derivRes, gradRes, derivOrder, derivVar, derivExpr, validEvalPt, derivEvalAt, intMode, indefRes, defRes, dblRes, intExpr, intVar, intA, intB, dblYMin, dblYMax, limRes, limVar, limTarget, limDir, limExpr, tayRes, tayExpr, tayCenter, tayDegree, odeRes, odeExpr, odeX0, odeY0, odeXEnd]);

  useAutoSaveCalculation(
    currentHistoryItem ? `${currentHistoryItem.category}::${currentHistoryItem.expression}::${currentHistoryItem.result}` : '',
    Boolean(currentHistoryItem),
    () => currentHistoryItem,
    1600
  );

  const saveCurrentToHistory = () => {
    if (currentHistoryItem) addHistoryItem(currentHistoryItem);
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328]">
        {[
          { id: 'derivative', label: 'Derivatives & Partials' },
          { id: 'integral', label: 'Integrals (Indef / Def / Double)' },
          { id: 'limit', label: 'Limits' },
          { id: 'taylor', label: 'Taylor & Maclaurin Series' },
          { id: 'ode', label: 'Differential Equations (ODE)' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as CalcTab)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              tab === item.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* DERIVATIVES */}
      {tab === 'derivative' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Differentiation Input</h2>
              <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={partialMode}
                  onChange={(e) => {
                    setPartialMode(e.target.checked);
                    if (e.target.checked && !derivExpr.includes('y')) setDerivExpr('x^2*y + sin(y*z)');
                  }}
                />
                <span>Partial / Gradient ∇f</span>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs text-slate-500">Function f</span>
              <input
                type="text"
                value={derivExpr}
                onChange={(e) => setDerivExpr(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-sm"
              />
            </label>

            {!partialMode ? (
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">Variable</span>
                  <input
                    type="text"
                    value={derivVar}
                    onChange={(e) => setDerivVar(e.target.value || 'x')}
                    className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">Order n</span>
                  <select
                    value={derivOrder}
                    onChange={(e) => setDerivOrder(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">Eval at (e.g. pi/4)</span>
                  <input
                    type="text"
                    value={derivEvalAt}
                    onChange={(e) => setDerivEvalAt(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-slate-500">Evaluate Gradient ∇f at Point (optional)</div>
                <div className="grid grid-cols-3 gap-2">
                  {detectedPartialVars.map((v) => (
                    <label key={v} className="space-y-1">
                      <span className="text-xs font-mono text-slate-500">{v}₀</span>
                      <input
                        type="text"
                        value={partialEvalMap[v] ?? ''}
                        onChange={(e) => setPartialEvalMap((p) => ({ ...p, [v]: e.target.value }))}
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 text-xs">
              {(partialMode
                ? ['x^2*y + sin(y*z)', 'e^(x*y) + x/y', 'sqrt(x^2 + y^2)']
                : ['x^3 * sin(x)', 'arcsin(x)', 'ln(x^2 + 1)', 'abs(x^2 - 1)']
              ).map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setDerivExpr(ex)}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-[#243B6B] font-mono hover:border-cyan-500 cursor-pointer"
                >
                  {ex}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {derivRes?.ok && (
                <>
                  <button
                    type="button"
                    onClick={saveCurrentToHistory}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 cursor-pointer"
                  >
                    Save to History
                  </button>
                  <button
                    type="button"
                    onClick={() => sendToGrapher(derivRes.expression)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#243B6B] text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Plot Derivative
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            {currentHistoryItem && tab === 'derivative' && (
              <ResultActionsBar compact item={currentHistoryItem} />
            )}
            {partialMode && gradRes ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-semibold">Partial Derivatives & Gradient Vector</h3>
                  {gradRes.every((g) => g.ok && g.evaluatedAt !== undefined) && (
                    <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      ∇f = ({gradRes.map((g) => Number(g.evaluatedAt!.toPrecision(7))).join(', ')})
                    </span>
                  )}
                </div>
                {gradRes.map((g) => (
                  <div key={g.variable} className="rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#060B18]/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">∂f / ∂{g.variable}</span>
                      {g.evaluatedAt !== undefined && (
                        <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                          = {Number(g.evaluatedAt.toPrecision(8))}
                          {g.numericalAt !== undefined ? ` (num: ${Number(g.numericalAt.toPrecision(8))})` : ''}
                        </span>
                      )}
                    </div>
                    {g.ok ? (
                      <>
                        <div className="text-base text-slate-900 dark:text-cyan-300">
                          <MathDisplay latex={`\\frac{\\partial f}{\\partial ${g.variable}} = ${g.latex}`} />
                        </div>
                        {g.steps[1] && <p className="text-xs text-slate-500 dark:text-slate-400">{g.steps[1].explanation}</p>}
                      </>
                    ) : (
                      <div className="text-xs text-rose-500">{g.error}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : derivRes?.ok ? (
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-blue-600 dark:text-cyan-300">Symbolic & Numerical Result</span>
                  <div className="mt-1 p-3 rounded-lg bg-slate-50 dark:bg-[#060B18]/70 border border-slate-200 dark:border-[#1E3158] overflow-x-auto text-lg">
                    <MathDisplay latex={derivRes.latex} displayMode />
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">Plaintext: {derivRes.expression}</div>
                  {(derivRes.evaluatedAt !== undefined || numDerivRes?.ok) && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                      {derivRes.evaluatedAt !== undefined && (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                          <div className="text-[11px] opacity-80">Exact / Symbolic at {derivVar} = {derivEvalAt}</div>
                          <div className="text-sm font-bold">{Number(derivRes.evaluatedAt.toPrecision(10))}</div>
                        </div>
                      )}
                      {numDerivRes?.ok && (
                        <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300">
                          <div className="text-[11px] opacity-80">5-Point Numerical Stencil</div>
                          <div className="text-sm font-bold">
                            {Number(numDerivRes.value.toPrecision(10))} (±{numDerivRes.errorEstimate.toExponential(1)})
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Step-by-Step Solution</h3>
                  {derivRes.steps.map((s, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 dark:border-[#1E3158] p-3 text-xs space-y-1">
                      <div className="font-semibold">{s.title}</div>
                      {s.latex ? <MathDisplay latex={s.latex} /> : s.expression ? <div className="font-mono text-cyan-400">{s.expression}</div> : null}
                      <p className="text-slate-500 dark:text-slate-400">{s.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-rose-500">{derivRes?.error}</div>
            )}
          </div>
        </div>
      )}

      {/* INTEGRALS */}
      {tab === 'integral' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#060B18]">
              {(['definite', 'indefinite', 'double'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setIntMode(m);
                    if (m === 'double' && !intExpr.includes('y')) setIntExpr('x*y + x^2');
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md capitalize cursor-pointer ${
                    intMode === m ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-xs text-slate-500">Integrand {intMode === 'double' ? 'f(x, y)' : 'f(x)'}</span>
              <input
                type="text"
                value={intExpr}
                onChange={(e) => setIntExpr(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-sm"
              />
            </label>

            {intMode !== 'double' && (
              <label className="block space-y-1">
                <span className="text-xs text-slate-500">Variable</span>
                <input
                  type="text"
                  value={intVar}
                  onChange={(e) => setIntVar(e.target.value || 'x')}
                  className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-1.5 font-mono text-xs"
                />
              </label>
            )}

            {intMode !== 'indefinite' && (
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">{intMode === 'double' ? 'x min' : 'Lower limit a (e.g. 0, -pi)'}</span>
                  <input
                    type="text"
                    value={intA}
                    onChange={(e) => setIntA(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">{intMode === 'double' ? 'x max' : 'Upper limit b (e.g. pi, 2)'}</span>
                  <input
                    type="text"
                    value={intB}
                    onChange={(e) => setIntB(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                  />
                </label>
              </div>
            )}

            {intMode === 'double' && (
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">y min</span>
                  <input
                    type="text"
                    value={dblYMin}
                    onChange={(e) => setDblYMin(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">y max</span>
                  <input
                    type="text"
                    value={dblYMax}
                    onChange={(e) => setDblYMax(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                  />
                </label>
              </div>
            )}

            {intMode !== 'double' && (
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  { label: 'x·eˣ', expr: 'x * e^x', a: '0', b: '2' },
                  { label: 'x·ln(x)', expr: 'x * ln(x)', a: '1', b: 'e' },
                  { label: 'sin(x)', expr: 'sin(x)', a: '0', b: 'pi' },
                  { label: '1/(x²+4)', expr: '1/(x^2 + 4)', a: '0', b: '2' },
                ].map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => {
                      setIntExpr(ex.expr);
                      setIntA(ex.a);
                      setIntB(ex.b);
                    }}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-[#243B6B] font-mono hover:border-cyan-500 cursor-pointer"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            {currentHistoryItem && tab === 'integral' && (
              <ResultActionsBar compact item={currentHistoryItem} />
            )}
            {intMode === 'indefinite' && indefRes && (
              indefRes.ok ? (
                <div className="space-y-3">
                  <span className="text-xs font-medium text-blue-600 dark:text-cyan-300">
                    {indefRes.symbolicFound ? 'Exact Symbolic Antiderivative' : 'No Closed-Form Elementary Antiderivative'}
                  </span>
                  {indefRes.symbolicFound && (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158] text-lg">
                      <MathDisplay latex={indefRes.latex} displayMode />
                    </div>
                  )}
                  <div className="space-y-2">
                    {indefRes.steps.map((s, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 dark:border-[#1E3158] p-3 text-xs space-y-1">
                        <div className="font-semibold">{s.title}</div>
                        {s.expression && <div className="font-mono text-blue-700 dark:text-cyan-300">{s.expression}</div>}
                        <p className="text-slate-500 dark:text-slate-400">{s.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-rose-500">{indefRes.error}</div>
              )
            )}

            {intMode === 'definite' && defRes && (
              defRes.ok ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-600 dark:text-cyan-300">
                      Numerical Quadrature ({defRes.method})
                    </span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {Number(defRes.value.toPrecision(12))}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    Estimated error bound: ±{defRes.errorEstimate.toExponential(2)}
                  </div>
                  <div className="space-y-2">
                    {defRes.steps.map((s, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 dark:border-[#1E3158] p-3 text-xs space-y-1">
                        <div className="font-semibold">{s.title}</div>
                        {s.latex && <MathDisplay latex={s.latex} />}
                        <p className="text-slate-500 dark:text-slate-400">{s.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-rose-500">{defRes.error}</div>
              )
            )}

            {intMode === 'double' && dblRes && (
              dblRes.ok ? (
                <div className="space-y-3">
                  <span className="text-xs font-medium text-blue-600 dark:text-cyan-300">2D Composite Simpson Integral</span>
                  <div className="font-mono text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {Number(dblRes.value.toPrecision(10))}
                  </div>
                  {dblRes.steps.map((s, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 dark:border-[#1E3158] p-3 text-xs space-y-1">
                      <div className="font-semibold">{s.title}</div>
                      {s.latex && <MathDisplay latex={s.latex} />}
                      <p className="text-slate-500 dark:text-slate-400">{s.explanation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-rose-500">{dblRes.error}</div>
              )
            )}
          </div>
        </div>
      )}

      {/* LIMITS */}
      {tab === 'limit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            <h2 className="text-sm font-semibold">Limit Parameters</h2>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">Expression f(x)</span>
              <input
                type="text"
                value={limExpr}
                onChange={(e) => setLimExpr(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-sm"
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-slate-500">Variable</span>
                <input
                  type="text"
                  value={limVar}
                  onChange={(e) => setLimVar(e.target.value || 'x')}
                  className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500">Approach a / ∞</span>
                <input
                  type="text"
                  value={limTarget}
                  onChange={(e) => setLimTarget(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500">Direction</span>
                <select
                  value={limDir}
                  onChange={(e) => setLimDir(e.target.value as 'both' | 'left' | 'right')}
                  className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 text-xs"
                >
                  <option value="both">Two-sided</option>
                  <option value="left">Left (a⁻)</option>
                  <option value="right">Right (a⁺)</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                { label: 'sin(x)/x → 0', e: 'sin(x)/x', t: '0' },
                { label: '(1+1/x)^x → ∞', e: '(1 + 1/x)^x', t: 'inf' },
                { label: 'ln(x)/x → ∞', e: 'ln(x)/x', t: 'inf' },
                { label: '(x^2-4)/(x-2) → 2', e: '(x^2 - 4)/(x - 2)', t: '2' },
              ].map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => {
                    setLimExpr(ex.e);
                    setLimTarget(ex.t);
                  }}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-[#243B6B] font-mono hover:border-blue-500 cursor-pointer"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            {currentHistoryItem && tab === 'limit' && (
              <ResultActionsBar compact item={currentHistoryItem} />
            )}
            {limRes?.ok ? (
              <div className="space-y-3">
                <span className="text-xs font-medium text-blue-600 dark:text-cyan-300">
                  {limRes.exists ? 'Convergent Limit' : 'Limit Does Not Exist / Divergent'}
                </span>
                <div className="font-mono text-3xl font-bold text-slate-900 dark:text-white">{limRes.value}</div>
                <div className="text-xs font-mono text-slate-500">
                  Left lim⁻ = {limRes.leftLimit} · Right lim⁺ = {limRes.rightLimit}
                </div>
                <div className="space-y-2">
                  {limRes.steps.map((s, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 dark:border-[#1E3158] p-3 text-xs space-y-1">
                      <div className="font-semibold">{s.title}</div>
                      {s.latex ? <MathDisplay latex={s.latex} /> : s.expression ? <div className="font-mono">{s.expression}</div> : null}
                      <p className="text-slate-500 dark:text-slate-400">{s.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-rose-500">{limRes?.error}</div>
            )}
          </div>
        </div>
      )}

      {/* TAYLOR SERIES */}
      {tab === 'taylor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            <h2 className="text-sm font-semibold">Taylor / Maclaurin Expansion</h2>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">Function f(x)</span>
              <input
                type="text"
                value={tayExpr}
                onChange={(e) => setTayExpr(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs text-slate-500">Center x₀ (0 = Maclaurin)</span>
                <input
                  type="text"
                  value={tayCenter}
                  onChange={(e) => setTayCenter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500">Degree (1–8)</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={tayDegree}
                  onChange={(e) => setTayDegree(Math.max(1, Math.min(8, Number(e.target.value))))}
                  className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                />
              </label>
            </div>
            {tayRes?.ok && (
              <button
                type="button"
                onClick={() => sendToGrapher(tayRes.polynomial)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 cursor-pointer"
              >
                Plot Taylor Polynomial
              </button>
            )}
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            {currentHistoryItem && tab === 'taylor' && (
              <ResultActionsBar compact item={currentHistoryItem} />
            )}
            {tayRes?.ok ? (
              <div className="space-y-3">
                <span className="text-xs font-medium text-blue-600 dark:text-cyan-300">
                  Degree-{tayDegree} Polynomial Expansion
                </span>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158] overflow-x-auto">
                  <MathDisplay latex={`P_{${tayDegree}}(x) = ${tayRes.latex}`} displayMode />
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {tayRes.steps.map((s, idx) => (
                    <div key={idx} className="rounded border border-slate-200 dark:border-[#1E3158] p-2.5 text-xs">
                      <span className="font-semibold">{s.title}: </span>
                      <span className="font-mono text-blue-700 dark:text-cyan-300">{s.expression}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-rose-500">{tayRes?.error}</div>
            )}
          </div>
        </div>
      )}

      {/* ODE SOLVER */}
      {tab === 'ode' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            <h2 className="text-sm font-semibold">First-Order ODE: dy/dx = f(x, y)</h2>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">f(x, y)</span>
              <input
                type="text"
                value={odeExpr}
                onChange={(e) => setOdeExpr(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-sm"
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-slate-500">x₀</span>
                <input
                  type="number"
                  value={odeX0}
                  onChange={(e) => setOdeX0(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500">y(x₀)</span>
                <input
                  type="number"
                  value={odeY0}
                  onChange={(e) => setOdeY0(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500">Target x</span>
                <input
                  type="number"
                  value={odeXEnd}
                  onChange={(e) => setOdeXEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs"
                />
              </label>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            {currentHistoryItem && tab === 'ode' && (
              <ResultActionsBar compact item={currentHistoryItem} />
            )}
            {odeRes?.ok ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 dark:border-[#1E3158] p-3">
                    <div className="text-xs text-slate-500">RK4 (4th-Order Runge-Kutta) y({odeXEnd})</div>
                    <div className="font-mono text-xl font-bold text-blue-600 dark:text-cyan-300">
                      {Number(odeRes.finalRK4.toPrecision(8))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-[#1E3158] p-3">
                    <div className="text-xs text-slate-500">Euler Method y({odeXEnd})</div>
                    <div className="font-mono text-xl font-bold text-amber-600 dark:text-amber-400">
                      {Number(odeRes.finalEuler.toPrecision(8))}
                    </div>
                  </div>
                </div>

                <ODEChart points={odeRes.points} />

                <div className="max-h-44 overflow-y-auto border border-slate-200 dark:border-[#1E3158] rounded-lg">
                  <table className="w-full text-xs font-mono">
                    <thead className="bg-slate-100 dark:bg-[#060B18] sticky top-0">
                      <tr>
                        <th className="p-2 text-left">x</th>
                        <th className="p-2 text-right">RK4 y(x)</th>
                        <th className="p-2 text-right">Euler y(x)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {odeRes.points.filter((_, idx) => idx % 3 === 0 || idx === odeRes.points.length - 1).map((pt, i) => (
                        <tr key={i}>
                          <td className="p-2">{pt.x.toFixed(3)}</td>
                          <td className="p-2 text-right">{pt.rk4.toFixed(6)}</td>
                          <td className="p-2 text-right text-slate-500">{pt.euler.toFixed(6)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-sm text-rose-500">{odeRes?.error}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ODEChart: React.FC<{ points: { x: number; rk4: number; euler: number }[] }> = ({ points }) => {
  if (points.length < 2) return null;
  const xs = points.map((p) => p.x);
  const ys = points.flatMap((p) => [p.rk4, p.euler]).filter(Number.isFinite);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const W = 520,
    H = 160,
    P = 16;

  const toPath = (key: 'rk4' | 'euler') =>
    points
      .map((p, idx) => {
        const sx = P + ((p.x - minX) / spanX) * (W - 2 * P);
        const sy = H - P - ((p[key] - minY) / spanY) * (H - 2 * P);
        return `${idx === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
      })
      .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40 rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#070B14]">
      <path d={toPath('euler')} fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 4" />
      <path d={toPath('rk4')} fill="none" stroke="#3B82F6" strokeWidth="2.5" />
    </svg>
  );
};
