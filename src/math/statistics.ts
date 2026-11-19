export interface DescriptiveStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  range: number;
  mean: number;
  median: number;
  modes: number[];
  q1: number;
  q3: number;
  iqr: number;
  varianceSample: number;
  variancePop: number;
  stdSample: number;
  stdPop: number;
  standardError: number;
  skewness: number;
}

export function parseNumberList(raw: string): number[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

function medianOfSorted(arr: number[]): number {
  const n = arr.length;
  if (n === 0) return NaN;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

export function computeDescriptiveStats(data: number[]): DescriptiveStats {
  if (data.length === 0) throw new Error('Provide at least one numeric observation.');
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const min = sorted[0];
  const max = sorted[n - 1];
  const median = medianOfSorted(sorted);

  const lowerHalf = sorted.slice(0, Math.floor(n / 2));
  const upperHalf = sorted.slice(Math.ceil(n / 2));
  const q1 = lowerHalf.length > 0 ? medianOfSorted(lowerHalf) : min;
  const q3 = upperHalf.length > 0 ? medianOfSorted(upperHalf) : max;

  // Modes
  const freq = new Map<number, number>();
  let maxFreq = 0;
  for (const x of sorted) {
    const f = (freq.get(x) ?? 0) + 1;
    freq.set(x, f);
    if (f > maxFreq) maxFreq = f;
  }
  const modes = maxFreq > 1 ? Array.from(freq.entries()).filter(([, f]) => f === maxFreq).map(([v]) => v) : [];

  const ss = sorted.reduce((acc, x) => acc + (x - mean) ** 2, 0);
  const variancePop = ss / n;
  const varianceSample = n > 1 ? ss / (n - 1) : 0;
  const stdPop = Math.sqrt(variancePop);
  const stdSample = Math.sqrt(varianceSample);
  const standardError = stdSample / Math.sqrt(n);

  const m3 = sorted.reduce((acc, x) => acc + (x - mean) ** 3, 0) / n;
  const skewness = stdPop > 0 ? m3 / stdPop ** 3 : 0;

  return {
    count: n,
    sum,
    min,
    max,
    range: max - min,
    mean,
    median,
    modes,
    q1,
    q3,
    iqr: q3 - q1,
    varianceSample,
    variancePop,
    stdSample,
    stdPop,
    standardError,
    skewness,
  };
}

export interface RegressionResult {
  n: number;
  slope: number;
  intercept: number;
  r: number;
  rSquared: number;
  covarianceSample: number;
  residualStdError: number;
  equation: string;
}

export function computeLinearRegression(xs: number[], ys: number[]): RegressionResult {
  if (xs.length !== ys.length || xs.length < 2) {
    throw new Error('Linear regression requires at least 2 paired (X, Y) values of equal length.');
  }
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  if (sxx === 0) throw new Error('All X values are identical; slope is undefined.');

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  const rSquared = syy === 0 ? 0 : r * r;
  const covarianceSample = sxy / (n - 1);

  let sse = 0;
  for (let i = 0; i < n; i++) {
    const pred = slope * xs[i] + intercept;
    sse += (ys[i] - pred) ** 2;
  }
  const residualStdError = n > 2 ? Math.sqrt(sse / (n - 2)) : 0;

  return {
    n,
    slope,
    intercept,
    r,
    rSquared,
    covarianceSample,
    residualStdError,
    equation: `y = ${Number(slope.toPrecision(6))}x ${intercept >= 0 ? '+' : '-'} ${Number(Math.abs(intercept).toPrecision(6))}`,
  };
}

// Error function approximation (Abramowitz & Stegun 7.1.26, max error 1.5e-7)
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) *
      Math.exp(-ax * ax);
  return sign * y;
}

export function normalPDF(x: number, mu = 0, sigma = 1): number {
  if (sigma <= 0) throw new Error('Standard deviation σ must be > 0.');
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

export function normalCDF(x: number, mu = 0, sigma = 1): number {
  if (sigma <= 0) throw new Error('Standard deviation σ must be > 0.');
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

function logGamma(z: number): number {
  // Lanczos approximation
  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) x += p[i] / (z + i + 1);
  const t = z + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

export function binomialPMF(k: number, n: number, p: number): number {
  if (p < 0 || p > 1 || n < 0 || !Number.isInteger(n) || !Number.isInteger(k)) {
    throw new Error('Binomial requires integer n ≥ 0, integer k, and 0 ≤ p ≤ 1.');
  }
  if (k < 0 || k > n) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

export function binomialCDF(k: number, n: number, p: number): number {
  let sum = 0;
  for (let i = 0; i <= Math.min(k, n); i++) sum += binomialPMF(i, n, p);
  return Math.min(1, sum);
}

export function poissonPMF(k: number, lambda: number): number {
  if (lambda <= 0 || k < 0 || !Number.isInteger(k)) {
    throw new Error('Poisson requires λ > 0 and integer k ≥ 0.');
  }
  return Math.exp(k * Math.log(lambda) - lambda - logGamma(k + 1));
}

export function poissonCDF(k: number, lambda: number): number {
  let sum = 0;
  for (let i = 0; i <= k; i++) sum += poissonPMF(i, lambda);
  return Math.min(1, sum);
}

// Numerical Student-t CDF via Simpson quadrature on PDF
export function studentTCDF(tVal: number, df: number): number {
  if (df <= 0) throw new Error('Degrees of freedom must be > 0.');
  if (tVal === 0) return 0.5;
  const pdf = (u: number) =>
    Math.exp(logGamma((df + 1) / 2) - logGamma(df / 2)) /
    (Math.sqrt(df * Math.PI) * Math.pow(1 + (u * u) / df, (df + 1) / 2));

  const a = 0;
  const b = Math.abs(tVal);
  const N = 400;
  const h = (b - a) / N;
  let sum = pdf(a) + pdf(b);
  for (let i = 1; i < N; i++) {
    sum += (i % 2 === 1 ? 4 : 2) * pdf(a + i * h);
  }
  const halfArea = (h / 3) * sum;
  return tVal >= 0 ? Math.min(1, 0.5 + halfArea) : Math.max(0, 0.5 - halfArea);
}

export function runHypothesisTest(params: {
  testType: 't-test' | 'z-test';
  sampleMean: number;
  nullMean: number;
  stdDev: number;
  sampleSize: number;
  alpha: number;
  tail: 'two-sided' | 'greater' | 'less';
}) {
  const { testType, sampleMean, nullMean, stdDev, sampleSize, alpha, tail } = params;
  if (sampleSize < 2 || stdDev <= 0) throw new Error('Sample size must be ≥ 2 and σ/s > 0.');
  const se = stdDev / Math.sqrt(sampleSize);
  const stat = (sampleMean - nullMean) / se;
  const df = sampleSize - 1;
  const cdf = testType === 'z-test' ? normalCDF(stat, 0, 1) : studentTCDF(stat, df);

  let pValue = 1;
  if (tail === 'two-sided') {
    pValue = 2 * Math.min(cdf, 1 - cdf);
  } else if (tail === 'greater') {
    pValue = 1 - cdf;
  } else {
    pValue = cdf;
  }

  const reject = pValue < alpha;
  return {
    statistic: stat,
    standardError: se,
    df: testType === 't-test' ? df : undefined,
    pValue,
    rejectNull: reject,
    conclusion: reject
      ? `Reject H₀ at α = ${alpha} (p = ${pValue.toExponential(4)} < ${alpha}). Statistically significant evidence against the null hypothesis.`
      : `Fail to reject H₀ at α = ${alpha} (p = ${pValue.toExponential(4)} ≥ ${alpha}). Insufficient evidence against the null hypothesis.`,
  };
}
