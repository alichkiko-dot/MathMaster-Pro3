import { compileCalculusFunction, computeDerivative } from './calculus';
import { compileRealFunction } from './engine';

export interface RootIteration {
  iter: number;
  x: number;
  fx: number;
  error: number;
}

export interface RootFindingResult {
  ok: boolean;
  root: number;
  iterations: RootIteration[];
  converged: boolean;
  error?: string;
}

export function newtonRaphson(
  expr: string,
  x0: number,
  tol = 1e-10,
  maxIter = 40
): RootFindingResult {
  const f = compileRealFunction(expr, {}, 'RAD');
  if (!f) return { ok: false, root: NaN, iterations: [], converged: false, error: 'Invalid function f(x).' };

  const deriv = computeDerivative(expr, 'x', 1);
  const df = deriv.ok ? compileCalculusFunction(deriv.expression) : null;
  const dfNumeric = (x: number) => {
    if (df) return df({ x });
    const h = 1e-6;
    return (f({ x: x + h }) - f({ x: x - h })) / (2 * h);
  };

  let x = x0;
  const iterations: RootIteration[] = [];
  let converged = false;

  for (let i = 1; i <= maxIter; i++) {
    const fx = f({ x });
    const dfx = dfNumeric(x);
    if (!Number.isFinite(fx) || !Number.isFinite(dfx)) {
      return { ok: false, root: x, iterations, converged: false, error: `Function undefined at x = ${x}.` };
    }
    if (Math.abs(dfx) < 1e-14) {
      return {
        ok: false,
        root: x,
        iterations,
        converged: false,
        error: `Zero derivative f′(x) ≈ 0 at x = ${x.toPrecision(6)}; Newton-Raphson cannot divide by zero.`,
      };
    }
    const nextX = x - fx / dfx;
    const err = Math.abs(nextX - x);
    iterations.push({ iter: i, x: nextX, fx: f({ x: nextX }), error: err });
    x = nextX;
    if (err < tol || Math.abs(f({ x })) < tol) {
      converged = true;
      break;
    }
  }

  return { ok: true, root: x, iterations, converged };
}

export function bisectionMethod(
  expr: string,
  aInit: number,
  bInit: number,
  tol = 1e-10,
  maxIter = 60
): RootFindingResult {
  const f = compileRealFunction(expr, {}, 'RAD');
  if (!f) return { ok: false, root: NaN, iterations: [], converged: false, error: 'Invalid function f(x).' };

  let a = aInit;
  let b = bInit;
  let fa = f({ x: a });
  let fb = f({ x: b });
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
    return { ok: false, root: NaN, iterations: [], converged: false, error: 'f(a) or f(b) is undefined.' };
  }
  if (Math.abs(fa) <= tol) {
    return { ok: true, root: a, iterations: [{ iter: 1, x: a, fx: fa, error: 0 }], converged: true };
  }
  if (Math.abs(fb) <= tol) {
    return { ok: true, root: b, iterations: [{ iter: 1, x: b, fx: fb, error: 0 }], converged: true };
  }
  if (fa * fb > 0) {
    return {
      ok: false,
      root: NaN,
      iterations: [],
      converged: false,
      error: `f(${a}) = ${fa.toPrecision(5)} and f(${b}) = ${fb.toPrecision(5)} have the same sign. Bisection requires opposite signs at bracket endpoints.`,
    };
  }

  const iterations: RootIteration[] = [];
  let mid = (a + b) / 2;
  let converged = false;

  for (let i = 1; i <= maxIter; i++) {
    mid = (a + b) / 2;
    const fm = f({ x: mid });
    if (!Number.isFinite(fm)) {
      return { ok: false, root: mid, iterations, converged: false, error: `Function undefined at midpoint x = ${mid}.` };
    }
    const err = Math.abs(b - a) / 2;
    iterations.push({ iter: i, x: mid, fx: fm, error: err });
    if (Math.abs(fm) < tol || err < tol) {
      converged = true;
      break;
    }
    if (fa * fm < 0) {
      b = mid;
      fb = fm;
    } else {
      a = mid;
      fa = fm;
    }
  }

  return { ok: true, root: mid, iterations, converged };
}

export function secantMethod(
  expr: string,
  x0Init: number,
  x1Init: number,
  tol = 1e-10,
  maxIter = 45
): RootFindingResult {
  const f = compileRealFunction(expr, {}, 'RAD');
  if (!f) return { ok: false, root: NaN, iterations: [], converged: false, error: 'Invalid function f(x).' };

  let x0 = x0Init;
  let x1 = x1Init;
  const iterations: RootIteration[] = [];
  let converged = false;

  for (let i = 1; i <= maxIter; i++) {
    const f0 = f({ x: x0 });
    const f1 = f({ x: x1 });
    if (!Number.isFinite(f0) || !Number.isFinite(f1)) {
      return { ok: false, root: x1, iterations, converged: false, error: 'Function became undefined during Secant iteration.' };
    }
    if (Math.abs(f1 - f0) < 1e-15) {
      return { ok: false, root: x1, iterations, converged: false, error: 'Secant denominator f(x₁) − f(x₀) ≈ 0.' };
    }
    const x2 = x1 - (f1 * (x1 - x0)) / (f1 - f0);
    if (!Number.isFinite(x2)) {
      return { ok: false, root: x1, iterations, converged: false, error: 'Secant iterate diverged.' };
    }
    const err = Math.abs(x2 - x1);
    const f2 = f({ x: x2 });
    iterations.push({ iter: i, x: x2, fx: f2, error: err });
    x0 = x1;
    x1 = x2;
    if (err < tol || Math.abs(f2) < tol) {
      converged = true;
      break;
    }
  }

  return { ok: true, root: x1, iterations, converged };
}

export function numericalDifferentiation(expr: string, x0: number, h = 1e-4) {
  const f = compileRealFunction(expr, {}, 'RAD');
  if (!f) throw new Error('Invalid function f(x).');
  const fx = f({ x: x0 });
  const fPlus = f({ x: x0 + h });
  const fMinus = f({ x: x0 - h });
  const fPlus2 = f({ x: x0 + 2 * h });
  const fMinus2 = f({ x: x0 - 2 * h });

  const forward = (fPlus - fx) / h;
  const backward = (fx - fMinus) / h;
  const central2 = (fPlus - fMinus) / (2 * h);
  const central4 = (-fPlus2 + 8 * fPlus - 8 * fMinus + fMinus2) / (12 * h);
  const secondDeriv = (fPlus - 2 * fx + fMinus) / (h * h);

  return { forward, backward, central2, central4, secondDeriv };
}

export function numericalIntegrationComparison(expr: string, a: number, b: number, nRaw = 24) {
  const f = compileRealFunction(expr, {}, 'RAD');
  if (!f) throw new Error('Invalid integrand f(x).');
  const n = Math.max(6, nRaw % 6 === 0 ? nRaw : nRaw + (6 - (nRaw % 6)));
  const h = (b - a) / n;

  const sample = (x: number) => {
    const v = f({ x });
    if (!Number.isFinite(v)) {
      throw new Error(`Integrand is undefined or singular at x = ${x.toPrecision(6)}.`);
    }
    return v;
  };

  const fa = sample(a);
  const fb = sample(b);

  // Trapezoidal
  let trapSum = 0.5 * (fa + fb);
  for (let i = 1; i < n; i++) trapSum += sample(a + i * h);
  const trapezoidal = trapSum * h;

  // Simpson 1/3
  let s13 = fa + fb;
  for (let i = 1; i < n; i++) s13 += (i % 2 === 1 ? 4 : 2) * sample(a + i * h);
  const simpson13 = (s13 * h) / 3;

  // Simpson 3/8 (n divisible by 3)
  let s38 = fa + fb;
  for (let i = 1; i < n; i++) s38 += (i % 3 === 0 ? 2 : 3) * sample(a + i * h);
  const simpson38 = (s38 * 3 * h) / 8;

  // Romberg R(4,4)
  const R: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (let k = 0; k < 5; k++) {
    const m = 1 << k;
    const hk = (b - a) / m;
    let sum = 0.5 * (fa + fb);
    for (let i = 1; i < m; i++) sum += sample(a + i * hk);
    R[k][0] = sum * hk;
    for (let j = 1; j <= k; j++) {
      R[k][j] = R[k][j - 1] + (R[k][j - 1] - R[k - 1][j - 1]) / (Math.pow(4, j) - 1);
    }
  }

  return {
    subintervals: n,
    trapezoidal,
    simpson13,
    simpson38,
    romberg: R[4][4],
    rombergErrorEst: Math.abs(R[4][4] - R[3][3]),
  };
}

export function lagrangeInterpolation(points: { x: number; y: number }[], evalX: number) {
  if (points.length < 2) throw new Error('Provide at least 2 distinct data points.');
  const xs = points.map((p) => p.x);
  if (new Set(xs).size !== xs.length) throw new Error('All x coordinates must be distinct.');

  // Evaluate P(evalX)
  let value = 0;
  for (let i = 0; i < points.length; i++) {
    let li = 1;
    for (let j = 0; j < points.length; j++) {
      if (i !== j) li *= (evalX - points[j].x) / (points[i].x - points[j].x);
    }
    value += points[i].y * li;
  }

  // Compute polynomial coefficients in standard basis via Newton divided differences -> expanded form
  const n = points.length;
  const dd = points.map((p) => p.y);
  for (let j = 1; j < n; j++) {
    for (let i = n - 1; i >= j; i--) {
      dd[i] = (dd[i] - dd[i - 1]) / (points[i].x - points[i - j].x);
    }
  }
  let coeffs = [dd[n - 1]];
  for (let k = n - 2; k >= 0; k--) {
    const next = Array(coeffs.length + 1).fill(0);
    for (let i = 0; i < coeffs.length; i++) {
      next[i + 1] += coeffs[i];
      next[i] -= coeffs[i] * points[k].x;
    }
    next[0] += dd[k];
    coeffs = next;
  }

  const terms: string[] = [];
  for (let p = coeffs.length - 1; p >= 0; p--) {
    const c = coeffs[p];
    if (Math.abs(c) < 1e-12) continue;
    const cClean = Number(c.toPrecision(6));
    if (p === 0) terms.push(`${cClean}`);
    else if (p === 1) terms.push(`${cClean}*x`);
    else terms.push(`${cClean}*x^${p}`);
  }
  const polynomial = terms.length > 0 ? terms.join(' + ').replace(/\+ -/g, '- ') : '0';

  return { value, polynomial, degree: n - 1 };
}
