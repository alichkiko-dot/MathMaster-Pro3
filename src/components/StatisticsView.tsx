import React, { useEffect, useMemo, useState } from 'react';
import { NewHistoryItemInput, useAppContext } from '../context/AppContext';
import { useAutoSaveCalculation } from '../hooks/useAutoSaveCalculation';
import {
  binomialCDF,
  binomialPMF,
  computeDescriptiveStats,
  computeLinearRegression,
  normalCDF,
  normalPDF,
  parseNumberList,
  poissonCDF,
  poissonPMF,
  runHypothesisTest,
} from '../math/statistics';
import { ResultActionsBar } from './ResultActionsBar';

type StatTab = 'descriptive' | 'regression' | 'distributions' | 'hypothesis';

export const StatisticsView: React.FC = () => {
  const { reopenRequest, clearReopenRequest } = useAppContext();
  const [tab, setTab] = useState<StatTab>('descriptive');

  // Descriptive
  const [rawData, setRawData] = useState('12, 15, 14, 18, 21, 15, 17, 24, 19, 15');

  // Regression
  const [rawX, setRawX] = useState('1, 2, 3, 4, 5, 6');
  const [rawY, setRawY] = useState('2.1, 3.9, 6.2, 7.8, 10.1, 12.2');

  // Distributions
  const [distType, setDistType] = useState<'normal' | 'binomial' | 'poisson'>('normal');
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);
  const [normX, setNormX] = useState(1.96);
  const [binN, setBinN] = useState(10);
  const [binP, setBinP] = useState(0.5);
  const [binK, setBinK] = useState(5);
  const [poisLambda, setPoisLambda] = useState(4);
  const [poisK, setPoisK] = useState(3);

  // Hypothesis
  const [testType, setTestType] = useState<'t-test' | 'z-test'>('t-test');
  const [hMean, setHMean] = useState(104.5);
  const [hNull, setHNull] = useState(100);
  const [hStd, setHStd] = useState(8.2);
  const [hN, setHN] = useState(25);
  const [hAlpha, setHAlpha] = useState(0.05);
  const [hTail, setHTail] = useState<'two-sided' | 'greater' | 'less'>('two-sided');

  let descStats = null;
  let descError = '';
  try {
    descStats = computeDescriptiveStats(parseNumberList(rawData));
  } catch (e: any) {
    descError = e.message;
  }

  let regRes = null;
  let regXs: number[] = [];
  let regYs: number[] = [];
  let regError = '';
  try {
    regXs = parseNumberList(rawX);
    regYs = parseNumberList(rawY);
    regRes = computeLinearRegression(regXs, regYs);
  } catch (e: any) {
    regError = e.message;
  }

  let hypRes = null;
  let hypError = '';
  try {
    hypRes = runHypothesisTest({
      testType,
      sampleMean: hMean,
      nullMean: hNull,
      stdDev: hStd,
      sampleSize: hN,
      alpha: hAlpha,
      tail: hTail,
    });
  } catch (e: any) {
    hypError = e.message;
  }

  useEffect(() => {
    if (!reopenRequest || reopenRequest.item.module !== 'statistics') return;
    const p = reopenRequest.item.payload as Record<string, any> | undefined;
    if (p?.tab) {
      setTab(p.tab as StatTab);
      if (p.tab === 'descriptive' && typeof p.rawData === 'string') setRawData(p.rawData);
      if (p.tab === 'regression') {
        if (typeof p.rawX === 'string') setRawX(p.rawX);
        if (typeof p.rawY === 'string') setRawY(p.rawY);
      }
      if (p.tab === 'distributions') {
        if (p.distType) setDistType(p.distType);
        if (typeof p.mu === 'number') setMu(p.mu);
        if (typeof p.sigma === 'number') setSigma(p.sigma);
        if (typeof p.normX === 'number') setNormX(p.normX);
        if (typeof p.binN === 'number') setBinN(p.binN);
        if (typeof p.binP === 'number') setBinP(p.binP);
        if (typeof p.binK === 'number') setBinK(p.binK);
        if (typeof p.poisLambda === 'number') setPoisLambda(p.poisLambda);
        if (typeof p.poisK === 'number') setPoisK(p.poisK);
      }
      if (p.tab === 'hypothesis') {
        if (p.testType) setTestType(p.testType);
        if (typeof p.hMean === 'number') setHMean(p.hMean);
        if (typeof p.hNull === 'number') setHNull(p.hNull);
        if (typeof p.hStd === 'number') setHStd(p.hStd);
        if (typeof p.hN === 'number') setHN(p.hN);
        if (typeof p.hAlpha === 'number') setHAlpha(p.hAlpha);
        if (p.hTail) setHTail(p.hTail);
      }
    }
    clearReopenRequest();
  }, [reopenRequest, clearReopenRequest]);

  const currentHistoryItem: NewHistoryItemInput | null = useMemo(() => {
    if (tab === 'descriptive' && descStats && !descError) {
      return {
        expression: `Descriptive Stats [${rawData}]`,
        latex: `\\text{Descriptive Stats }(n=${descStats.count})`,
        result: `Mean = ${descStats.mean.toPrecision(6)}, Median = ${descStats.median.toPrecision(6)}, s = ${descStats.stdSample.toPrecision(6)}`,
        exactResult: null,
        isExact: false,
        module: 'statistics',
        category: 'Descriptive Statistics',
        steps: [
          { title: 'Sample Size & Sum', expression: `n = ${descStats.count}, Sum = ${descStats.sum}`, explanation: 'Counted observations and computed sample total.' },
          { title: 'Central Tendency', expression: `Mean = ${descStats.mean}, Median = ${descStats.median}`, explanation: `Mode(s): ${descStats.modes.length ? descStats.modes.join(', ') : 'None'}.` },
          { title: 'Dispersion', expression: `s = ${descStats.stdSample.toPrecision(6)}, sigma = ${descStats.stdPop.toPrecision(6)}, IQR = ${descStats.iqr}`, explanation: `Range: [${descStats.min}, ${descStats.max}], Q1=${descStats.q1}, Q3=${descStats.q3}.` },
        ],
        payload: { tab: 'descriptive', rawData },
      };
    }
    if (tab === 'regression' && regRes && !regError) {
      return {
        expression: `OLS Regression X=[${rawX}], Y=[${rawY}]`,
        latex: regRes.equation,
        result: `${regRes.equation} (r = ${regRes.r.toPrecision(6)}, R^2 = ${regRes.rSquared.toPrecision(6)})`,
        exactResult: null,
        isExact: false,
        module: 'statistics',
        category: 'Linear Regression',
        steps: [
          { title: 'Least-Squares Line', expression: regRes.equation, explanation: `Slope m = ${regRes.slope.toPrecision(6)}, Intercept b = ${regRes.intercept.toPrecision(6)}.` },
          { title: 'Goodness of Fit', expression: `r = ${regRes.r.toPrecision(6)}, R^2 = ${regRes.rSquared.toPrecision(6)}`, explanation: `Covariance = ${regRes.covarianceSample.toPrecision(6)}, Residual SE = ${regRes.residualStdError.toPrecision(5)}.` },
        ],
        payload: { tab: 'regression', rawX, rawY },
      };
    }
    if (tab === 'distributions') {
      try {
        if (distType === 'normal') {
          const pdf = normalPDF(normX, mu, sigma);
          const cdf = normalCDF(normX, mu, sigma);
          return {
            expression: `Normal(mu=${mu}, sigma=${sigma}) at x=${normX}`,
            latex: `X \\sim \\mathcal{N}(${mu}, ${sigma}^2),\\; x=${normX}`,
            result: `PDF = ${pdf.toPrecision(6)}, CDF P(X<=x) = ${cdf.toPrecision(6)}`,
            exactResult: null,
            isExact: false,
            module: 'statistics',
            category: 'Normal Distribution',
            steps: [
              { title: 'Probability Density & Cumulative', expression: `f(${normX}) = ${pdf.toPrecision(6)}, F(${normX}) = ${cdf.toPrecision(6)}`, explanation: `Upper tail P(X > ${normX}) = ${(1 - cdf).toPrecision(6)}.` },
            ],
            payload: { tab: 'distributions', distType, mu, sigma, normX },
          };
        }
        if (distType === 'binomial') {
          const pmf = binomialPMF(binK, binN, binP);
          const cdf = binomialCDF(binK, binN, binP);
          return {
            expression: `Binomial(n=${binN}, p=${binP}) at k=${binK}`,
            latex: `X \\sim \\text{Bin}(${binN}, ${binP}),\\; k=${binK}`,
            result: `P(X=${binK}) = ${pmf.toPrecision(6)}, P(X<=${binK}) = ${cdf.toPrecision(6)}`,
            exactResult: null,
            isExact: false,
            module: 'statistics',
            category: 'Binomial Distribution',
            steps: [
              { title: 'PMF & CDF', expression: `PMF = ${pmf.toPrecision(6)}, CDF = ${cdf.toPrecision(6)}`, explanation: `Mean = ${(binN * binP).toPrecision(4)}, StdDev = ${Math.sqrt(binN * binP * (1 - binP)).toPrecision(4)}.` },
            ],
            payload: { tab: 'distributions', distType, binN, binP, binK },
          };
        }
        const pmf = poissonPMF(poisK, poisLambda);
        const cdf = poissonCDF(poisK, poisLambda);
        return {
          expression: `Poisson(lambda=${poisLambda}) at k=${poisK}`,
          latex: `X \\sim \\text{Pois}(${poisLambda}),\\; k=${poisK}`,
          result: `P(X=${poisK}) = ${pmf.toPrecision(6)}, P(X<=${poisK}) = ${cdf.toPrecision(6)}`,
          exactResult: null,
          isExact: false,
          module: 'statistics',
          category: 'Poisson Distribution',
          steps: [
            { title: 'PMF & CDF', expression: `PMF = ${pmf.toPrecision(6)}, CDF = ${cdf.toPrecision(6)}`, explanation: `Mean = Variance = ${poisLambda}.` },
          ],
          payload: { tab: 'distributions', distType, poisLambda, poisK },
        };
      } catch {
        return null;
      }
    }
    if (tab === 'hypothesis' && hypRes && !hypError) {
      return {
        expression: `${testType.toUpperCase()} (${hTail}): x_bar=${hMean}, mu0=${hNull}, std=${hStd}, n=${hN}, alpha=${hAlpha}`,
        latex: `\\text{${testType}}: \\bar{x}=${hMean},\\; \\mu_0=${hNull},\\; n=${hN}`,
        result: `stat = ${hypRes.statistic.toPrecision(6)}, p = ${hypRes.pValue.toPrecision(5)} (${hypRes.rejectNull ? 'Reject H0' : 'Fail to reject H0'})`,
        exactResult: null,
        isExact: false,
        module: 'statistics',
        category: 'Hypothesis Testing',
        steps: [
          { title: 'Test Statistic & Standard Error', expression: `stat = ${hypRes.statistic.toPrecision(6)}, SE = ${hypRes.standardError.toPrecision(5)}`, explanation: `Computed ${testType} test statistic under H0: mu = ${hNull}.` },
          { title: 'p-Value Decision', expression: `p = ${hypRes.pValue.toPrecision(5)} vs alpha = ${hAlpha}`, explanation: hypRes.conclusion },
        ],
        payload: { tab: 'hypothesis', testType, hMean, hNull, hStd, hN, hAlpha, hTail },
      };
    }
    return null;
  }, [tab, descStats, descError, rawData, regRes, regError, rawX, rawY, distType, mu, sigma, normX, binN, binP, binK, poisLambda, poisK, hypRes, hypError, testType, hMean, hNull, hStd, hN, hAlpha, hTail]);

  useAutoSaveCalculation(
    currentHistoryItem ? `${currentHistoryItem.category}::${currentHistoryItem.expression}::${currentHistoryItem.result}` : '',
    Boolean(currentHistoryItem),
    () => currentHistoryItem,
    1600
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328]">
        {[
          { id: 'descriptive', label: 'Descriptive Statistics' },
          { id: 'regression', label: 'Correlation & Linear Regression' },
          { id: 'distributions', label: 'Probability Distributions' },
          { id: 'hypothesis', label: 'Hypothesis Testing' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as StatTab)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'descriptive' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <h2 className="text-sm font-semibold">Sample Dataset</h2>
            <p className="text-xs text-slate-500">Enter comma, space, or semicolon-separated observations.</p>
            <textarea
              rows={5}
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] p-3 font-mono text-sm"
            />
          </div>
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            {currentHistoryItem && tab === 'descriptive' && (
              <ResultActionsBar compact item={currentHistoryItem} />
            )}
            {descError ? (
              <p className="text-sm text-rose-500">{descError}</p>
            ) : descStats ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ['Count (n)', descStats.count],
                  ['Sum (Σx)', descStats.sum.toPrecision(8)],
                  ['Mean (x̄)', descStats.mean.toPrecision(8)],
                  ['Median', descStats.median.toPrecision(8)],
                  ['Mode(s)', descStats.modes.length ? descStats.modes.join(', ') : 'None'],
                  ['Sample Std Dev (s)', descStats.stdSample.toPrecision(7)],
                  ['Pop Std Dev (σ)', descStats.stdPop.toPrecision(7)],
                  ['Sample Variance (s²)', descStats.varianceSample.toPrecision(7)],
                  ['Pop Variance (σ²)', descStats.variancePop.toPrecision(7)],
                  ['Min / Max', `${descStats.min} / ${descStats.max}`],
                  ['Q₁ / Q₃ (IQR)', `${descStats.q1} / ${descStats.q3} (${descStats.iqr})`],
                  ['Std Error / Skew', `${descStats.standardError.toPrecision(5)} / ${descStats.skewness.toPrecision(4)}`],
                ].map(([label, val]) => (
                  <div key={String(label)} className="rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#060B18]/60 p-3">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
                    <div className="font-mono text-sm font-semibold text-slate-900 dark:text-cyan-300 mt-0.5 tabular-nums">
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {tab === 'regression' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <h2 className="text-sm font-semibold">Paired Data (X, Y)</h2>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">X values</span>
              <input
                type="text"
                value={rawX}
                onChange={(e) => setRawX(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">Y values</span>
              <input
                type="text"
                value={rawY}
                onChange={(e) => setRawY(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-xs"
              />
            </label>
            {regRes && (
              <div className="space-y-2 pt-2 text-xs">
                <div className="font-mono text-base font-bold text-blue-600 dark:text-cyan-300">{regRes.equation}</div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>Pearson r = {regRes.r.toPrecision(6)}</div>
                  <div>R² = {regRes.rSquared.toPrecision(6)}</div>
                  <div>Cov(X,Y) = {regRes.covarianceSample.toPrecision(6)}</div>
                  <div>SE_est = {regRes.residualStdError.toPrecision(5)}</div>
                </div>
              </div>
            )}
            {regError && <p className="text-xs text-rose-500">{regError}</p>}
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-500">Scatter Plot & Ordinary Least Squares Fit</h3>
              {currentHistoryItem && tab === 'regression' && (
                <ResultActionsBar compact item={currentHistoryItem} />
              )}
            </div>
            {regRes && <RegressionPlot xs={regXs} ys={regYs} slope={regRes.slope} intercept={regRes.intercept} />}
          </div>
        </div>
      )}

      {tab === 'distributions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#060B18]">
              {(['normal', 'binomial', 'poisson'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDistType(d)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md capitalize cursor-pointer ${
                    distType === d ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {distType === 'normal' && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <label className="space-y-1">
                  <span className="text-slate-500">Mean μ</span>
                  <input type="number" value={mu} onChange={(e) => setMu(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">Std Dev σ</span>
                  <input type="number" min={0.01} step={0.1} value={sigma} onChange={(e) => setSigma(Math.max(0.01, Number(e.target.value)))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">x</span>
                  <input type="number" step={0.1} value={normX} onChange={(e) => setNormX(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
                </label>
              </div>
            )}

            {distType === 'binomial' && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <label className="space-y-1">
                  <span className="text-slate-500">Trials n</span>
                  <input type="number" min={1} max={200} value={binN} onChange={(e) => setBinN(Math.max(1, Math.floor(Number(e.target.value))))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">Prob p</span>
                  <input type="number" min={0} max={1} step={0.05} value={binP} onChange={(e) => setBinP(Math.max(0, Math.min(1, Number(e.target.value))))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">Successes k</span>
                  <input type="number" min={0} max={binN} value={binK} onChange={(e) => setBinK(Math.max(0, Math.floor(Number(e.target.value))))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
                </label>
              </div>
            )}

            {distType === 'poisson' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="space-y-1">
                  <span className="text-slate-500">Rate λ</span>
                  <input type="number" min={0.1} step={0.5} value={poisLambda} onChange={(e) => setPoisLambda(Math.max(0.1, Number(e.target.value)))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">Events k</span>
                  <input type="number" min={0} value={poisK} onChange={(e) => setPoisK(Math.max(0, Math.floor(Number(e.target.value))))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
                </label>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            {currentHistoryItem && tab === 'distributions' && (
              <ResultActionsBar compact item={currentHistoryItem} />
            )}
            {(() => {
              try {
                if (distType === 'normal') {
                  const pdf = normalPDF(normX, mu, sigma);
                  const cdf = normalCDF(normX, mu, sigma);
                  return (
                    <div className="grid grid-cols-3 gap-3 font-mono">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                        <div className="text-[11px] text-slate-500">PDF f(x)</div>
                        <div className="text-base font-bold text-blue-600 dark:text-cyan-300">{pdf.toPrecision(6)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                        <div className="text-[11px] text-slate-500">CDF P(X ≤ x)</div>
                        <div className="text-base font-bold text-blue-600 dark:text-cyan-300">{cdf.toPrecision(6)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                        <div className="text-[11px] text-slate-500">Upper Tail P(X &gt; x)</div>
                        <div className="text-base font-bold text-blue-600 dark:text-cyan-300">{(1 - cdf).toPrecision(6)}</div>
                      </div>
                    </div>
                  );
                }
                if (distType === 'binomial') {
                  const pmf = binomialPMF(binK, binN, binP);
                  const cdf = binomialCDF(binK, binN, binP);
                  return (
                    <div className="grid grid-cols-3 gap-3 font-mono">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                        <div className="text-[11px] text-slate-500">PMF P(X = {binK})</div>
                        <div className="text-base font-bold text-blue-600 dark:text-cyan-300">{pmf.toPrecision(6)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                        <div className="text-[11px] text-slate-500">CDF P(X ≤ {binK})</div>
                        <div className="text-base font-bold text-blue-600 dark:text-cyan-300">{cdf.toPrecision(6)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                        <div className="text-[11px] text-slate-500">Mean / StdDev</div>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-200">
                          {(binN * binP).toPrecision(4)} / {Math.sqrt(binN * binP * (1 - binP)).toPrecision(4)}
                        </div>
                      </div>
                    </div>
                  );
                }
                const pmf = poissonPMF(poisK, poisLambda);
                const cdf = poissonCDF(poisK, poisLambda);
                return (
                  <div className="grid grid-cols-3 gap-3 font-mono">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                      <div className="text-[11px] text-slate-500">PMF P(X = {poisK})</div>
                      <div className="text-base font-bold text-blue-600 dark:text-cyan-300">{pmf.toPrecision(6)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                      <div className="text-[11px] text-slate-500">CDF P(X ≤ {poisK})</div>
                      <div className="text-base font-bold text-blue-600 dark:text-cyan-300">{cdf.toPrecision(6)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                      <div className="text-[11px] text-slate-500">Mean / Variance</div>
                      <div className="text-base font-bold text-slate-800 dark:text-slate-200">{poisLambda} / {poisLambda}</div>
                    </div>
                  </div>
                );
              } catch (err: any) {
                return <p className="text-sm text-rose-500">{err?.message || 'Invalid distribution parameters.'}</p>;
              }
            })()}
          </div>
        </div>
      )}

      {tab === 'hypothesis' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <h2 className="text-sm font-semibold">One-Sample Hypothesis Test</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="space-y-1">
                <span className="text-slate-500">Test Type</span>
                <select value={testType} onChange={(e) => setTestType(e.target.value as 't-test' | 'z-test')} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5">
                  <option value="t-test">Student's t-test</option>
                  <option value="z-test">One-Sample z-test</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-slate-500">Alternative H₁</span>
                <select value={hTail} onChange={(e) => setHTail(e.target.value as 'two-sided' | 'greater' | 'less')} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5">
                  <option value="two-sided">Two-sided (μ ≠ μ₀)</option>
                  <option value="greater">Right-tailed (μ &gt; μ₀)</option>
                  <option value="less">Left-tailed (μ &lt; μ₀)</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-slate-500">Sample Mean x̄</span>
                <input type="number" step="any" value={hMean} onChange={(e) => setHMean(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
              </label>
              <label className="space-y-1">
                <span className="text-slate-500">Null Mean μ₀</span>
                <input type="number" step="any" value={hNull} onChange={(e) => setHNull(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
              </label>
              <label className="space-y-1">
                <span className="text-slate-500">Std Dev (s or σ)</span>
                <input type="number" step="any" value={hStd} onChange={(e) => setHStd(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
              </label>
              <label className="space-y-1">
                <span className="text-slate-500">Sample Size n</span>
                <input type="number" min={2} value={hN} onChange={(e) => setHN(Math.max(2, Math.floor(Number(e.target.value))))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
              </label>
              <label className="space-y-1 col-span-2">
                <span className="text-slate-500">Significance Level α</span>
                <input type="number" step="0.01" min={0.001} max={0.25} value={hAlpha} onChange={(e) => setHAlpha(Number(e.target.value))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 font-mono" />
              </label>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            {currentHistoryItem && tab === 'hypothesis' && (
              <ResultActionsBar compact item={currentHistoryItem} />
            )}
            {hypError ? (
              <p className="text-sm text-rose-500">{hypError}</p>
            ) : hypRes ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                    <div className="text-[11px] text-slate-500">{testType === 't-test' ? 't-Statistic' : 'z-Statistic'}</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-cyan-300">{hypRes.statistic.toPrecision(6)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                    <div className="text-[11px] text-slate-500">p-Value</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-cyan-300">{hypRes.pValue.toPrecision(5)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                    <div className="text-[11px] text-slate-500">Standard Error</div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{hypRes.standardError.toPrecision(5)}</div>
                  </div>
                </div>
                <div
                  className={`p-3 rounded-lg border text-sm font-medium ${
                    hypRes.rejectNull
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {hypRes.conclusion}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

const RegressionPlot: React.FC<{ xs: number[]; ys: number[]; slope: number; intercept: number }> = ({
  xs,
  ys,
  slope,
  intercept,
}) => {
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys, slope * minX + intercept, slope * maxX + intercept);
  const maxY = Math.max(...ys, slope * minX + intercept, slope * maxX + intercept);
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const W = 500,
    H = 230,
    P = 24;

  const toX = (x: number) => P + ((x - minX) / spanX) * (W - 2 * P);
  const toY = (y: number) => H - P - ((y - minY) / spanY) * (H - 2 * P);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56 rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#070B14]">
      <line
        x1={toX(minX)}
        y1={toY(slope * minX + intercept)}
        x2={toX(maxX)}
        y2={toY(slope * maxX + intercept)}
        stroke="#3B82F6"
        strokeWidth="2.5"
      />
      {xs.map((x, i) => (
        <circle key={i} cx={toX(x)} cy={toY(ys[i])} r="4.5" fill="#06B6D4" />
      ))}
    </svg>
  );
};
