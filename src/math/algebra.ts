import { StepItem } from '../types/calculator';
import { formatComplex } from './complex';
import { buildScope, math, nodeToCleanLatex, preprocessExpression } from './engine';

export interface LinearEquationResult {
  ok: boolean;
  status: 'unique' | 'infinite' | 'inconsistent';
  root?: number;
  latex: string;
  steps: StepItem[];
  error?: string;
}

export function solveLinearEquation(a: number, b: number, rhs = 0): LinearEquationResult {
  if (![a, b, rhs].every(Number.isFinite)) {
    return { ok: false, status: 'inconsistent', latex: '', steps: [], error: 'Coefficients must be finite numbers.' };
  }
  const cNet = b - rhs;
  const steps: StepItem[] = [
    {
      title: '1. Standard Linear Form',
      latex: `${a}x ${b >= 0 ? '+' : ''} ${b} = ${rhs}`,
      explanation: 'Identified linear equation ax + b = c.',
    },
    {
      title: '2. Isolate the Variable Term',
      latex: `${a}x = ${Number((rhs - b).toPrecision(10))}`,
      explanation: `Subtracted ${b} from both sides to isolate the x-term.`,
    },
  ];

  if (Math.abs(a) < 1e-14) {
    if (Math.abs(cNet) < 1e-14) {
      steps.push({
        title: '3. Identity (0 = 0)',
        latex: '0 = 0 \\implies x \\in \\mathbb{R}',
        explanation: 'Both sides are identically equal for all real numbers x.',
      });
      return { ok: true, status: 'infinite', latex: 'x \\in \\mathbb{R}', steps };
    }
    steps.push({
      title: '3. Contradiction',
      latex: `0 = ${Number((rhs - b).toPrecision(10))}`,
      explanation: 'Variable cancelled leaving a false statement; no solution exists.',
    });
    return { ok: true, status: 'inconsistent', latex: '\\varnothing', steps };
  }

  const rootRaw = (rhs - b) / a;
  const root = Math.abs(rootRaw) < 1e-12 ? 0 : Number(rootRaw.toPrecision(10));
  steps.push({
    title: '3. Divide by Leading Coefficient',
    latex: `x = \\frac{${Number((rhs - b).toPrecision(10))}}{${a}} = ${root}`,
    explanation: `Divided both sides by a = ${a} to obtain the exact unique root.`,
  });

  return { ok: true, status: 'unique', root, latex: `x = ${root}`, steps };
}

export interface QuadraticResult {
  ok: boolean;
  discriminant: number;
  vertex: { x: number; y: number };
  roots: string[];
  rootsLatex: string;
  factoredForm: string;
  steps: StepItem[];
  error?: string;
}

export function solveQuadratic(a: number, b: number, c: number): QuadraticResult {
  if (![a, b, c].every(Number.isFinite)) {
    return { ok: false, discriminant: NaN, vertex: { x: 0, y: 0 }, roots: [], rootsLatex: '', factoredForm: '', steps: [], error: 'Coefficients must be finite numbers.' };
  }
  if (Math.abs(a) < 1e-14) {
    if (Math.abs(b) < 1e-14) {
      return {
        ok: false,
        discriminant: 0,
        vertex: { x: 0, y: c },
        roots: [],
        rootsLatex: '',
        factoredForm: '',
        steps: [],
        error: Math.abs(c) < 1e-14 ? 'Identity 0 = 0 (all real numbers are solutions).' : 'Contradiction (no solution).',
      };
    }
    const x = -c / b;
    const xClean = Number(x.toPrecision(10));
    return {
      ok: true,
      discriminant: b * b,
      vertex: { x: 0, y: c },
      roots: [String(xClean)],
      rootsLatex: `x = ${xClean}`,
      factoredForm: `${b}(x ${xClean >= 0 ? '-' : '+'} ${Math.abs(xClean)})`,
      steps: [
        {
          title: '1. Degenerate Linear Case (a = 0)',
          latex: `${b}x + (${c}) = 0 \\implies x = -\\frac{${c}}{${b}} = ${xClean}`,
          explanation: 'Since quadratic coefficient a = 0, isolated x linearly.',
        },
      ],
    };
  }

  const delta = b * b - 4 * a * c;
  const vx = -b / (2 * a);
  const vy = a * vx * vx + b * vx + c;
  const steps: StepItem[] = [
    {
      title: '1. Standard Form & Coefficients',
      latex: `${a}x^2 ${b >= 0 ? '+' : ''} ${b}x ${c >= 0 ? '+' : ''} ${c} = 0`,
      explanation: `Identified a = ${a}, b = ${b}, c = ${c}.`,
    },
    {
      title: '2. Compute Discriminant Δ = b² − 4ac',
      latex: `\\Delta = (${b})^2 - 4(${a})(${c}) = ${Number(delta.toPrecision(10))}`,
      explanation:
        delta > 1e-12
          ? 'Δ > 0: Two distinct real roots.'
          : Math.abs(delta) <= 1e-12
          ? 'Δ = 0: One repeated real root (multiplicity 2).'
          : 'Δ < 0: Two complex conjugate roots.',
    },
  ];

  let roots: string[] = [];
  let rootsLatex = '';
  let factoredForm = '';

  if (delta > 1e-12) {
    const sqrtD = Math.sqrt(delta);
    const x1 = (-b + sqrtD) / (2 * a);
    const x2 = (-b - sqrtD) / (2 * a);
    const r1 = Number(x1.toPrecision(10));
    const r2 = Number(x2.toPrecision(10));
    roots = [String(r1), String(r2)];
    rootsLatex = `x_1 = ${r1}, \\quad x_2 = ${r2}`;
    const leadCoeff = a === 1 ? '' : a === -1 ? '-' : String(a);
    factoredForm = `${leadCoeff}(x ${r1 >= 0 ? '-' : '+'} ${Math.abs(r1)})(x ${r2 >= 0 ? '-' : '+'} ${Math.abs(r2)})`;
    steps.push({
      title: '3. Apply Quadratic Formula',
      latex: `x = \\frac{-(${b}) \\pm \\sqrt{${Number(delta.toPrecision(8))}}}{2(${a})} \\implies x_1 = ${r1},\\; x_2 = ${r2}`,
      explanation: 'Evaluated both ± branches of the quadratic formula.',
    });
  } else if (Math.abs(delta) <= 1e-12) {
    const x0 = Number(vx.toPrecision(10));
    roots = [String(x0)];
    rootsLatex = `x = ${x0}`;
    const leadCoeff = a === 1 ? '' : a === -1 ? '-' : String(a);
    factoredForm = `${leadCoeff}(x ${x0 >= 0 ? '-' : '+'} ${Math.abs(x0)})^2`;
    steps.push({
      title: '3. Repeated Root',
      latex: `x = \\frac{-b}{2a} = ${x0}`,
      explanation: 'Zero discriminant produces a single vertex touch on the x-axis.',
    });
  } else {
    const re = -b / (2 * a);
    const im = Math.sqrt(-delta) / (2 * Math.abs(a));
    const z1 = formatComplex(re, im, 8);
    const z2 = formatComplex(re, -im, 8);
    roots = [z1, z2];
    rootsLatex = `x_1 = ${z1}, \\quad x_2 = ${z2}`;
    factoredForm = 'Irreducible over ℝ (complex conjugate roots)';
    steps.push({
      title: '3. Complex Conjugate Roots',
      latex: `x = \\frac{-(${b}) \\pm i\\sqrt{${Number((-delta).toPrecision(8))}}}{2(${a})}`,
      explanation: 'Negative discriminant yields a complex conjugate pair.',
    });
  }

  return {
    ok: true,
    discriminant: delta,
    vertex: { x: Number(vx.toPrecision(8)), y: Number(vy.toPrecision(8)) },
    roots,
    rootsLatex,
    factoredForm,
    steps,
  };
}

export function solveCubic(a: number, b: number, c: number, d: number): {
  ok: boolean;
  roots: string[];
  steps: StepItem[];
  error?: string;
} {
  if (Math.abs(a) < 1e-14) {
    const q = solveQuadratic(b, c, d);
    return { ok: q.ok, roots: q.roots, steps: q.steps, error: q.error };
  }
  // Depressed cubic t^3 + p t + q = 0 where x = t - b/(3a)
  const b1 = b / a;
  const c1 = c / a;
  const d1 = d / a;
  const p = c1 - (b1 * b1) / 3;
  const q = (2 * b1 * b1 * b1) / 27 - (b1 * c1) / 3 + d1;
  const disc = (q * q) / 4 + (p * p * p) / 27;
  const shift = -b1 / 3;

  const steps: StepItem[] = [
    {
      title: '1. Monic Reduction & Depressed Cubic',
      latex: `t^3 + (${Number(p.toPrecision(6))})t + (${Number(q.toPrecision(6))}) = 0, \\quad x = t ${shift >= 0 ? '+' : '-'} ${Number(Math.abs(shift).toPrecision(6))}`,
      explanation: 'Eliminated quadratic term via substitution x = t − b/(3a).',
    },
    {
      title: '2. Cubic Discriminant (q²/4 + p³/27)',
      latex: `D = ${Number(disc.toPrecision(8))}`,
      explanation: disc > 1e-12 ? 'D > 0: 1 real root and 2 complex conjugate roots.' : 'D ≤ 0: 3 real roots (Cardano trigonometric case).',
    },
  ];

  const roots: string[] = [];
  if (disc > 1e-12) {
    const sqrtD = Math.sqrt(disc);
    const u = Math.cbrt(-q / 2 + sqrtD);
    const v = Math.cbrt(-q / 2 - sqrtD);
    const realRoot = u + v + shift;
    const compRe = -(u + v) / 2 + shift;
    const compIm = (Math.sqrt(3) / 2) * Math.abs(u - v);
    roots.push(String(Number(realRoot.toPrecision(10))));
    roots.push(formatComplex(compRe, compIm, 8));
    roots.push(formatComplex(compRe, -compIm, 8));
  } else if (Math.abs(p) < 1e-14 && Math.abs(q) < 1e-14) {
    const r = String(Number(shift.toPrecision(10)));
    roots.push(r, r, r);
  } else {
    const r = Math.sqrt(-p / 3);
    const cosArg = Math.max(-1, Math.min(1, (-q / 2) / Math.pow(-p / 3, 1.5)));
    const phi = Math.acos(cosArg);
    for (let k = 0; k < 3; k++) {
      const tk = 2 * r * Math.cos((phi + 2 * Math.PI * k) / 3);
      roots.push(String(Number((tk + shift).toPrecision(10))));
    }
  }

  return { ok: true, roots, steps };
}

export interface PolynomialSolveResult {
  ok: boolean;
  degree: number;
  realRoots: number[];
  complexRoots: { re: number; im: number; formatted: string }[];
  allRootsFormatted: string[];
  factoredForm: string;
  factoredLatex: string;
  steps: StepItem[];
  error?: string;
}

interface CNum {
  re: number;
  im: number;
}

const cAdd = (a: CNum, b: CNum): CNum => ({ re: a.re + b.re, im: a.im + b.im });
const cSub = (a: CNum, b: CNum): CNum => ({ re: a.re - b.re, im: a.im - b.im });
const cMul = (a: CNum, b: CNum): CNum => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const cDiv = (a: CNum, b: CNum): CNum => {
  const den = b.re * b.re + b.im * b.im;
  if (den < 1e-30) return { re: NaN, im: NaN };
  return { re: (a.re * b.re + a.im * b.im) / den, im: (a.im * b.re - a.re * b.im) / den };
};
const cAbs = (a: CNum): number => Math.hypot(a.re, a.im);

function evalPolyAndDerivComplex(coeffsDesc: number[], z: CNum): { p: CNum; dp: CNum } {
  let p: CNum = { re: coeffsDesc[0], im: 0 };
  let dp: CNum = { re: 0, im: 0 };
  for (let i = 1; i < coeffsDesc.length; i++) {
    dp = cAdd(cMul(dp, z), p);
    p = cAdd(cMul(p, z), { re: coeffsDesc[i], im: 0 });
  }
  return { p, dp };
}

function aberthEhrlichRoots(coeffsDesc: number[]): CNum[] {
  const n = coeffsDesc.length - 1;
  if (n <= 0) return [];
  const lead = coeffsDesc[0];
  const monic = coeffsDesc.map((c) => c / lead);

  // Cauchy root bound R = 1 + max |a_i|
  const maxCoeff = Math.max(...monic.slice(1).map((c) => Math.abs(c)));
  const radius = Math.max(0.5, 1 + maxCoeff * 0.5);
  const center = -monic[1] / n;

  // Initialize distinct non-symmetric points on circle
  const roots: CNum[] = Array.from({ length: n }, (_, k) => {
    const angle = (2 * Math.PI * k) / n + 0.37;
    return {
      re: center + radius * Math.cos(angle),
      im: radius * Math.sin(angle),
    };
  });

  for (let iter = 0; iter < 120; iter++) {
    let maxStep = 0;
    for (let i = 0; i < n; i++) {
      const { p, dp } = evalPolyAndDerivComplex(monic, roots[i]);
      if (cAbs(p) < 1e-14) continue;
      if (cAbs(dp) < 1e-24) continue;
      const ratio = cDiv(p, dp);
      let sumInv: CNum = { re: 0, im: 0 };
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const diff = cSub(roots[i], roots[j]);
        if (cAbs(diff) > 1e-20) {
          sumInv = cAdd(sumInv, cDiv({ re: 1, im: 0 }, diff));
        }
      }
      const denom = cSub({ re: 1, im: 0 }, cMul(ratio, sumInv));
      const w = cDiv(ratio, denom);
      if (Number.isFinite(w.re) && Number.isFinite(w.im)) {
        roots[i] = cSub(roots[i], w);
        maxStep = Math.max(maxStep, cAbs(w));
      }
    }
    if (maxStep < 1e-13) break;
  }

  return roots;
}

/**
 * Solves any polynomial equation a_n x^n + ... + a_1 x + a_0 = 0 (descending coefficients).
 * Combines zero-root factoring, Rational Root Theorem synthetic division, closed-form quadratic/cubic,
 * and Aberth-Ehrlich numerical root-finding for degree >= 4.
 */
export function solvePolynomial(coeffsDescInput: number[]): PolynomialSolveResult {
  try {
    if (!coeffsDescInput.length || !coeffsDescInput.every(Number.isFinite)) {
      throw new Error('Polynomial coefficients must be finite numbers.');
    }
    const coeffs = [...coeffsDescInput];
    while (coeffs.length > 1 && Math.abs(coeffs[0]) < 1e-14) {
      coeffs.shift();
    }
    const deg = coeffs.length - 1;
    if (deg <= 0) {
      const c = coeffs[0] ?? 0;
      return {
        ok: true,
        degree: 0,
        realRoots: [],
        complexRoots: [],
        allRootsFormatted: [],
        factoredForm: String(c),
        factoredLatex: String(c),
        steps: [
          {
            title: '1. Constant Equation',
            latex: `${c} = 0`,
            explanation: Math.abs(c) < 1e-14 ? 'Identity 0 = 0 (all real numbers satisfy).' : 'Non-zero constant = 0 has no solution.',
          },
        ],
      };
    }

    const asc = [...coeffs].reverse();
    const fac = factorUnivariatePolynomial(asc, 'x');
    const steps: StepItem[] = [
      {
        title: `1. Degree-${deg} Polynomial Standard Form`,
        latex: `${formatPolyLatex(asc, 'x')} = 0`,
        explanation: `Normalized leading term and inspected degree-${deg} polynomial.`,
      },
    ];

    if (deg === 1) {
      const lin = solveLinearEquation(coeffs[0], coeffs[1], 0);
      const r = lin.root ?? 0;
      return {
        ok: true,
        degree: 1,
        realRoots: [r],
        complexRoots: [],
        allRootsFormatted: [String(r)],
        factoredForm: fac.factored,
        factoredLatex: fac.factoredLatex,
        steps: lin.steps,
      };
    }

    if (deg === 2) {
      const q = solveQuadratic(coeffs[0], coeffs[1], coeffs[2]);
      const realRoots: number[] = [];
      const complexRoots: { re: number; im: number; formatted: string }[] = [];
      if (q.discriminant >= -1e-12) {
        q.roots.forEach((rs) => {
          const val = Number(rs);
          if (Number.isFinite(val)) realRoots.push(val);
        });
      } else {
        const re = -coeffs[1] / (2 * coeffs[0]);
        const im = Math.sqrt(-q.discriminant) / (2 * Math.abs(coeffs[0]));
        complexRoots.push({ re, im, formatted: q.roots[0] }, { re, im: -im, formatted: q.roots[1] });
      }
      realRoots.sort((a, b) => a - b);
      return {
        ok: q.ok,
        degree: 2,
        realRoots,
        complexRoots,
        allRootsFormatted: q.roots,
        factoredForm: q.factoredForm,
        factoredLatex: fac.factoredLatex,
        steps: q.steps,
        error: q.error,
      };
    }

    if (fac.isFactored) {
      steps.push({
        title: '2. Rational Factorization',
        latex: `${fac.factoredLatex} = 0`,
        explanation: 'Factored polynomial over ℚ using GCF extraction and Rational Root Theorem.',
      });
    }

    const allComplex = aberthEhrlichRoots(coeffs);
    const realRoots: number[] = [];
    const complexRoots: { re: number; im: number; formatted: string }[] = [];
    const allRootsFormatted: string[] = [];

    for (const z of allComplex) {
      const cleanRe = Math.abs(z.re) < 1e-9 ? 0 : Number(z.re.toPrecision(10));
      const cleanIm = Math.abs(z.im) < 1e-7 ? 0 : z.im;
      if (cleanIm === 0) {
        realRoots.push(cleanRe);
        allRootsFormatted.push(String(cleanRe));
      } else {
        const fmt = formatComplex(cleanRe, cleanIm, 8);
        complexRoots.push({ re: cleanRe, im: cleanIm, formatted: fmt });
        allRootsFormatted.push(fmt);
      }
    }

    realRoots.sort((a, b) => a - b);
    const uniqueRealRoots: number[] = [];
    for (const r of realRoots) {
      if (!uniqueRealRoots.some((u) => Math.abs(u - r) < 1e-6)) uniqueRealRoots.push(r);
    }

    steps.push({
      title: `${steps.length + 1}. Complete Root Extraction (${deg} Roots over ℂ)`,
      expression: `Real: ${uniqueRealRoots.length ? uniqueRealRoots.join(', ') : 'None'}${
        complexRoots.length ? ` | Complex: ${complexRoots.map((c) => c.formatted).join(', ')}` : ''
      }`,
      explanation: `Extracted all ${deg} roots via ${deg >= 4 ? 'Aberth-Ehrlich simultaneous iteration' : 'rational deflation & algebraic root finding'}.`,
    });

    return {
      ok: true,
      degree: deg,
      realRoots: uniqueRealRoots,
      complexRoots,
      allRootsFormatted,
      factoredForm: fac.factored,
      factoredLatex: fac.factoredLatex,
      steps,
    };
  } catch (err: any) {
    return {
      ok: false,
      degree: 0,
      realRoots: [],
      complexRoots: [],
      allRootsFormatted: [],
      factoredForm: '',
      factoredLatex: '',
      steps: [],
      error: err?.message || 'Unable to solve polynomial equation.',
    };
  }
}

export function solveGeneralEquation(
  rawEquation: string,
  domainMin = -50,
  domainMax = 50
): {
  ok: boolean;
  equationKind: 'linear' | 'quadratic' | 'polynomial' | 'transcendental';
  roots: number[];
  allRootsFormatted: string[];
  simplifiedDiff: string;
  latexDiff: string;
  steps: StepItem[];
  error?: string;
} {
  try {
    const parts = rawEquation.split('=');
    const lhsRaw = parts[0]?.trim() || '';
    const rhsRaw = parts[1]?.trim() || '0';
    if (!lhsRaw) throw new Error('Enter an equation such as x^2 - 5*x + 6 = 0.');
    const combined = `(${preprocessExpression(lhsRaw)}) - (${preprocessExpression(rhsRaw)})`;
    const node = math.parse(combined);
    const simplified = math.simplify(node);

    // Check if equation reduces to a univariate polynomial in x
    try {
      const rat = math.rationalize(simplified.toString(), {}, true) as any;
      if (
        Array.isArray(rat?.coefficients) &&
        (!rat.variables?.length || (rat.variables.length === 1 && rat.variables[0] === 'x'))
      ) {
        const asc: number[] = rat.coefficients;
        const desc = [...asc].reverse();
        while (desc.length > 1 && Math.abs(desc[0]) < 1e-14) desc.shift();
        const deg = desc.length - 1;

        if (deg <= 1) {
          const a = deg === 1 ? desc[0] : 0;
          const b = deg === 1 ? desc[1] : desc[0];
          const lin = solveLinearEquation(a, b, 0);
          const roots = lin.status === 'unique' && lin.root !== undefined ? [lin.root] : [];
          return {
            ok: true,
            equationKind: 'linear',
            roots,
            allRootsFormatted:
              lin.status === 'unique'
                ? roots.map(String)
                : lin.status === 'infinite'
                ? ['All real numbers (ℝ)']
                : [],
            simplifiedDiff: simplified.toString(),
            latexDiff: nodeToCleanLatex(simplified),
            steps: [
              {
                title: '1. Rewrite LHS − RHS = 0',
                latex: `${nodeToCleanLatex(simplified)} = 0`,
                explanation: 'Classified equation as Linear (degree 1).',
              },
              ...lin.steps,
            ],
          };
        }

        if (deg === 2) {
          const polyRes = solvePolynomial(desc);
          return {
            ok: true,
            equationKind: 'quadratic',
            roots: polyRes.realRoots,
            allRootsFormatted: polyRes.allRootsFormatted,
            simplifiedDiff: simplified.toString(),
            latexDiff: nodeToCleanLatex(simplified),
            steps: polyRes.steps,
          };
        }

        if (deg >= 3 && deg <= 8) {
          const polyRes = solvePolynomial(desc);
          return {
            ok: true,
            equationKind: 'polynomial',
            roots: polyRes.realRoots,
            allRootsFormatted: polyRes.allRootsFormatted,
            simplifiedDiff: simplified.toString(),
            latexDiff: nodeToCleanLatex(simplified),
            steps: polyRes.steps,
          };
        }
      }
    } catch {
      // Non-polynomial / transcendental expression -> proceed with numerical scan below
    }

    const scope = buildScope('RAD');
    const compiled = simplified.compile();
    const f = (x: number) => {
      try {
        const v = compiled.evaluate({ ...scope, x });
        return typeof v === 'number' && Number.isFinite(v) ? v : NaN;
      } catch {
        return NaN;
      }
    };

    const N = 1200;
    const step = (domainMax - domainMin) / N;
    const found: number[] = [];

    const refineRoot = (a: number, b: number) => {
      let lo = a,
        hi = b,
        flo = f(lo);
      for (let i = 0; i < 44; i++) {
        const mid = (lo + hi) / 2;
        const fm = f(mid);
        if (!Number.isFinite(fm)) break;
        if (Math.abs(fm) < 1e-13) return mid;
        if (flo * fm <= 0) hi = mid;
        else {
          lo = mid;
          flo = fm;
        }
      }
      return (lo + hi) / 2;
    };

    const refineAbsMin = (aInit: number, bInit: number) => {
      const invPhi = (Math.sqrt(5) - 1) / 2;
      let lo = aInit;
      let hi = bInit;
      let c = hi - invPhi * (hi - lo);
      let d = lo + invPhi * (hi - lo);
      let fc = Math.abs(f(c));
      let fd = Math.abs(f(d));
      for (let i = 0; i < 48; i++) {
        if (!Number.isFinite(fc) || !Number.isFinite(fd)) break;
        if (fc < fd) {
          hi = d;
          d = c;
          fd = fc;
          c = hi - invPhi * (hi - lo);
          fc = Math.abs(f(c));
        } else {
          lo = c;
          c = d;
          fc = fd;
          d = lo + invPhi * (hi - lo);
          fd = Math.abs(f(d));
        }
      }
      return (lo + hi) / 2;
    };

    const pushRoot = (r: number) => {
      const clean = Math.abs(r) < 1e-10 ? 0 : Number(r.toPrecision(10));
      if (!found.some((ex) => Math.abs(ex - clean) < 1e-4)) {
        found.push(clean);
      }
    };

    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= N; i++) {
      const cx = domainMin + i * step;
      xs.push(cx);
      ys.push(f(cx));
    }

    for (let i = 1; i <= N; i++) {
      const prevX = xs[i - 1];
      const prevY = ys[i - 1];
      const cx = xs[i];
      const cy = ys[i];

      if (Number.isFinite(prevY) && Number.isFinite(cy)) {
        if (Math.abs(cy) < 1e-10) {
          pushRoot(cx);
        } else if (prevY * cy < 0 && Math.abs(prevY - cy) < 1e6) {
          const r = refineRoot(prevX, cx);
          const fLeft = f(r - step * 0.01);
          const fRight = f(r + step * 0.01);
          if (Math.abs(f(r)) < 1e-5 && Number.isFinite(fLeft) && Number.isFinite(fRight) && Math.abs(fLeft - fRight) < 1e3) {
            pushRoot(r);
          }
        }
      }

      if (i >= 2 && Number.isFinite(ys[i - 2]) && Number.isFinite(prevY) && Number.isFinite(cy)) {
        if (Math.abs(prevY) <= Math.abs(ys[i - 2]) && Math.abs(prevY) <= Math.abs(cy) && Math.abs(prevY) < 25) {
          const rMin = refineAbsMin(xs[i - 2], cx);
          if (Math.abs(f(rMin)) < 1e-7) {
            pushRoot(rMin);
          }
        }
      }
    }

    found.sort((a, b) => a - b);

    const steps: StepItem[] = [
      {
        title: '1. Rewrite in Homogeneous Form f(x) = 0',
        latex: `${nodeToCleanLatex(simplified)} = 0`,
        explanation: 'Moved right-hand side to left-hand side and simplified transcendental expression.',
      },
      {
        title: `2. Real Root Search on [${domainMin}, ${domainMax}]`,
        expression: found.length ? `Roots: ${found.join(', ')}` : 'No real roots detected in interval.',
        explanation: 'Performed multi-scale sign-change bisection & golden-section tangent root refinement (tolerance 10⁻¹³).',
      },
    ];

    return {
      ok: true,
      equationKind: 'transcendental',
      roots: found,
      allRootsFormatted: found.map(String),
      simplifiedDiff: simplified.toString(),
      latexDiff: nodeToCleanLatex(simplified),
      steps,
    };
  } catch (err: any) {
    return {
      ok: false,
      equationKind: 'transcendental',
      roots: [],
      allRootsFormatted: [],
      simplifiedDiff: '',
      latexDiff: '',
      steps: [],
      error: err?.message || 'Unable to parse equation.',
    };
  }
}

function intGcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function positiveDivisors(n: number): number[] {
  const absN = Math.abs(Math.round(n));
  if (absN === 0) return [1];
  const divs: number[] = [];
  for (let i = 1; i * i <= absN; i++) {
    if (absN % i === 0) {
      divs.push(i);
      if (i !== absN / i) divs.push(absN / i);
    }
  }
  return divs.sort((a, b) => a - b);
}

function formatPolyString(coeffs: number[], variable = 'x'): string {
  const parts: string[] = [];
  for (let p = coeffs.length - 1; p >= 0; p--) {
    const c = coeffs[p];
    if (Math.abs(c) < 1e-12) continue;
    const absC = Math.abs(c);
    const sign = c < 0 ? '-' : '+';
    const coeffStr = p === 0 ? String(absC) : absC === 1 ? '' : String(absC);
    const varStr = p === 0 ? '' : p === 1 ? variable : `${variable}^${p}`;
    const body = coeffStr && varStr ? `${coeffStr}*${varStr}` : `${coeffStr}${varStr}`;
    if (parts.length === 0) {
      parts.push(c < 0 ? `-${body}` : body);
    } else {
      parts.push(`${sign} ${body}`);
    }
  }
  return parts.length > 0 ? parts.join(' ') : '0';
}

function formatPolyLatex(coeffs: number[], variable = 'x'): string {
  const parts: string[] = [];
  for (let p = coeffs.length - 1; p >= 0; p--) {
    const c = coeffs[p];
    if (Math.abs(c) < 1e-12) continue;
    const absC = Math.abs(c);
    const sign = c < 0 ? '-' : '+';
    const coeffStr = p === 0 ? String(absC) : absC === 1 ? '' : String(absC);
    const varStr = p === 0 ? '' : p === 1 ? variable : `${variable}^{${p}}`;
    const body = `${coeffStr}${varStr}`;
    if (parts.length === 0) {
      parts.push(c < 0 ? `-${body}` : body);
    } else {
      parts.push(`${sign} ${body}`);
    }
  }
  return parts.length > 0 ? parts.join(' ') : '0';
}

export function factorUnivariatePolynomial(
  coeffsInput: number[],
  variable = 'x'
): { factored: string; factoredLatex: string; isFactored: boolean } {
  // Trim leading zeros
  const coeffs = [...coeffsInput];
  while (coeffs.length > 1 && Math.abs(coeffs[coeffs.length - 1]) < 1e-12) {
    coeffs.pop();
  }
  const deg = coeffs.length - 1;
  if (deg <= 0) {
    const c = coeffs[0] ?? 0;
    return { factored: String(c), factoredLatex: String(c), isFactored: false };
  }

  // Convert rational coefficients to integer polynomial via fraction scaling
  const dens: number[] = [];
  const nums: number[] = [];
  for (const c of coeffs) {
    if (Math.abs(c) < 1e-12) {
      nums.push(0);
      dens.push(1);
      continue;
    }
    try {
      const fr = math.fraction(c);
      const fd = Number(fr.d);
      const fn = Number(fr.s) * Number(fr.n);
      if (fd <= 10000 && Math.abs(c - fn / fd) < 1e-11) {
        nums.push(fn);
        dens.push(fd);
      } else {
        return {
          factored: formatPolyString(coeffs, variable),
          factoredLatex: formatPolyLatex(coeffs, variable),
          isFactored: false,
        };
      }
    } catch {
      return {
        factored: formatPolyString(coeffs, variable),
        factoredLatex: formatPolyLatex(coeffs, variable),
        isFactored: false,
      };
    }
  }

  const lcmDen = dens.reduce((acc, d) => (acc * d) / intGcd(acc, d), 1);
  let intPoly = nums.map((n, idx) => Math.round((n * lcmDen) / dens[idx]));

  // Pull out common integer GCD and overall sign if leading term is negative
  let content = intPoly.reduce((acc, v) => (v === 0 ? acc : intGcd(acc, v)), 0) || 1;
  if (intPoly[intPoly.length - 1] < 0) content = -content;
  intPoly = intPoly.map((v) => Math.round(v / content));

  // Pull out common x^k factor
  let xPower = 0;
  while (intPoly.length > 1 && intPoly[0] === 0) {
    xPower++;
    intPoly.shift();
  }

  const linearFactors: { q: number; p: number; mult: number }[] = [];
  const addLinearFactor = (q: number, p: number) => {
    const g = intGcd(q, p);
    let nq = q / g;
    let np = p / g;
    if (nq < 0) {
      nq = -nq;
      np = -np;
    }
    const existing = linearFactors.find((f) => f.q === nq && f.p === np);
    if (existing) existing.mult++;
    else linearFactors.push({ q: nq, p: np, mult: 1 });
  };

  // Rational Root Theorem + Synthetic Division
  let madeProgress = true;
  while (intPoly.length - 1 >= 1 && madeProgress) {
    madeProgress = false;
    const d = intPoly.length - 1;
    if (d === 1) {
      // b + a*x -> (a*x + b) = 0 -> root = -b/a => q=a, p=-b
      addLinearFactor(intPoly[1], -intPoly[0]);
      intPoly = [1];
      break;
    }
    const a0 = intPoly[0];
    const an = intPoly[d];
    const pDivs = positiveDivisors(a0);
    const qDivs = positiveDivisors(an);

    outer: for (const pAbs of pDivs) {
      for (const qAbs of qDivs) {
        if (intGcd(pAbs, qAbs) !== 1) continue;
        for (const sign of [1, -1]) {
          const p = sign * pAbs;
          const q = qAbs;
          // Synthetic division of intPoly (ascending) by (q*x - p)
          // Convert to descending for standard synthetic division
          const desc = [...intPoly].reverse();
          const quotDesc: number[] = [];
          let rem = 0;
          let exact = true;
          for (let i = 0; i < desc.length; i++) {
            const cur = desc[i] + rem;
            if (i < desc.length - 1) {
              if (cur % q !== 0) {
                exact = false;
                break;
              }
              const qCoeff = cur / q;
              quotDesc.push(qCoeff);
              rem = qCoeff * p;
            } else {
              rem = cur;
            }
          }
          if (exact && rem === 0) {
            addLinearFactor(q, p);
            intPoly = quotDesc.reverse();
            madeProgress = true;
            break outer;
          }
        }
      }
    }
  }

  // Check if remaining polynomial is a biquadratic (a*x^4 + b*x^2 + c) or even factorable quadratic over radicals
  const extraFactorsText: string[] = [];
  const extraFactorsLatex: string[] = [];
  if (intPoly.length - 1 === 4 && intPoly[1] === 0 && intPoly[3] === 0) {
    // a*u^2 + b*u + c where u = x^2
    const c4 = intPoly[4],
      c2 = intPoly[2],
      c0 = intPoly[0];
    const discU = c2 * c2 - 4 * c4 * c0;
    const sqU = Math.round(Math.sqrt(Math.max(0, discU)));
    if (discU >= 0 && sqU * sqU === discU) {
      const u1Num = -c2 + sqU;
      const u2Num = -c2 - sqU;
      const den = 2 * c4;
      const g1 = intGcd(den, u1Num);
      const q1 = den / g1;
      const r1 = -u1Num / g1;
      const g2 = intGcd(den, u2Num);
      const q2 = den / g2;
      const r2 = -u2Num / g2;
      if (q1 * q2 === c4) {
        const fmtQuad = (qa: number, rc: number, tex: boolean) => {
          const lead = qa === 1 ? '' : tex ? `${qa}` : `${qa}*`;
          const s = rc >= 0 ? `+ ${rc}` : `- ${Math.abs(rc)}`;
          return `(${lead}${variable}${tex ? '^{2}' : '^2'} ${s})`;
        };
        extraFactorsText.push(fmtQuad(q1, r1, false), fmtQuad(q2, r2, false));
        extraFactorsLatex.push(fmtQuad(q1, r1, true), fmtQuad(q2, r2, true));
        intPoly = [1];
      }
    }
  }

  if (intPoly.length > 1) {
    extraFactorsText.push(`(${formatPolyString(intPoly, variable)})`);
    extraFactorsLatex.push(`(${formatPolyLatex(intPoly, variable)})`);
  }

  // Assemble clean factored output
  const factorCount =
    (xPower > 0 ? 1 : 0) +
    linearFactors.reduce((s, f) => s + f.mult, 0) +
    extraFactorsText.length;

  // Constant prefix (content / lcmDen)
  const factorPartsText: string[] = [];
  const factorPartsLatex: string[] = [];

  if (content !== lcmDen) {
    if (lcmDen === 1) {
      if (content === -1 && factorCount > 0) {
        factorPartsText.push('-');
        factorPartsLatex.push('-');
      } else if (content !== 1) {
        factorPartsText.push(String(content));
        factorPartsLatex.push(String(content));
      }
    } else {
      const gOut = intGcd(content, lcmDen);
      const nOut = content / gOut;
      const dOut = lcmDen / gOut;
      if (dOut === 1) {
        factorPartsText.push(nOut === -1 && factorCount > 0 ? '-' : String(nOut));
        factorPartsLatex.push(nOut === -1 && factorCount > 0 ? '-' : String(nOut));
      } else {
        factorPartsText.push(`(${nOut}/${dOut})`);
        factorPartsLatex.push(`\\frac{${nOut}}{${dOut}}`);
      }
    }
  }

  if (xPower > 0) {
    factorPartsText.push(xPower === 1 ? variable : `${variable}^${xPower}`);
    factorPartsLatex.push(xPower === 1 ? variable : `${variable}^{${xPower}}`);
  }

  for (const lf of linearFactors) {
    const qStrText = lf.q === 1 ? '' : `${lf.q}*`;
    const qStrTex = lf.q === 1 ? '' : `${lf.q}`;
    const pSign = lf.p >= 0 ? '-' : '+';
    const pAbs = Math.abs(lf.p);
    const innerText = lf.p === 0 ? `${qStrText}${variable}` : `(${qStrText}${variable} ${pSign} ${pAbs})`;
    const innerTex = lf.p === 0 ? `${qStrTex}${variable}` : `(${qStrTex}${variable} ${pSign} ${pAbs})`;
    factorPartsText.push(lf.mult > 1 ? `${innerText}^${lf.mult}` : innerText);
    factorPartsLatex.push(lf.mult > 1 ? `${innerTex}^{${lf.mult}}` : innerTex);
  }

  factorPartsText.push(...extraFactorsText);
  factorPartsLatex.push(...extraFactorsLatex);

  const joinParts = (parts: string[]) => {
    if (parts.length === 0) return '1';
    if (parts[0] === '-') return '-' + parts.slice(1).join('');
    if (/^-?\d+$/.test(parts[0]) && parts.length > 1) {
      return parts[0] + parts.slice(1).join('');
    }
    return parts.join('');
  };

  const factored = joinParts(factorPartsText);
  const factoredLatex = joinParts(factorPartsLatex);
  const hasMultipleFactors =
    linearFactors.length + extraFactorsText.length + (xPower > 0 ? 1 : 0) > 1 ||
    linearFactors.some((f) => f.mult > 1) ||
    xPower > 1;

  return { factored, factoredLatex, isFactored: hasMultipleFactors };
}

export function simplifyAndExpandAlgebra(rawExpr: string): {
  ok: boolean;
  simplified: string;
  simplifiedLatex: string;
  expanded: string;
  expandedLatex: string;
  factored: string;
  factoredLatex: string;
  coefficients?: number[];
  steps: StepItem[];
  error?: string;
} {
  try {
    const norm = preprocessExpression(rawExpr);
    if (!norm) throw new Error('Enter an algebraic expression.');
    const node = math.parse(norm);
    const simp = math.simplify(node);
    let expanded = simp.toString();
    let expandedLatex = nodeToCleanLatex(simp);
    let factored = simp.toString();
    let factoredLatex = nodeToCleanLatex(simp);
    let coefficients: number[] | undefined;

    const steps: StepItem[] = [
      {
        title: '1. Original Expression & Algebraic Simplification',
        latex: `${nodeToCleanLatex(node)} = ${nodeToCleanLatex(simp)}`,
        explanation: 'Combined like terms and reduced algebraic identities.',
      },
    ];

    try {
      const rat = math.rationalize(norm, {}, true) as any;
      if (rat && rat.expression) {
        expanded = rat.expression.toString();
        expandedLatex = nodeToCleanLatex(rat.expression);
        steps.push({
          title: '2. Canonical Polynomial Expansion',
          latex: expandedLatex,
          explanation: 'Expanded products and collected powers into canonical polynomial form.',
        });
        if (Array.isArray(rat.coefficients)) {
          coefficients = rat.coefficients;
          const varName = Array.isArray(rat.variables) && rat.variables.length > 0 ? rat.variables[0] : 'x';
          const fac = factorUnivariatePolynomial(rat.coefficients, varName);
          if (fac.isFactored || rat.coefficients.length >= 2) {
            factored = fac.factored;
            factoredLatex = fac.factoredLatex;
            steps.push({
              title: '3. Polynomial Factorization',
              latex: factoredLatex,
              explanation: fac.isFactored
                ? 'Extracted common factors and factored via Rational Root Theorem & synthetic division.'
                : 'Extracted constant content; remaining polynomial is irreducible over ℚ.',
            });
          }
        }
      }
    } catch {
      // Fallback to simplify if expression is non-polynomial (e.g. trig/log)
    }

    return {
      ok: true,
      simplified: simp.toString(),
      simplifiedLatex: nodeToCleanLatex(simp),
      expanded,
      expandedLatex,
      factored,
      factoredLatex,
      coefficients,
      steps,
    };
  } catch (err: any) {
    return {
      ok: false,
      simplified: '',
      simplifiedLatex: '',
      expanded: '',
      expandedLatex: '',
      factored: '',
      factoredLatex: '',
      steps: [],
      error: err?.message || 'Algebraic manipulation error.',
    };
  }
}

export function solveQuadraticInequality(
  a: number,
  b: number,
  c: number,
  op: '>' | '>=' | '<' | '<='
): { interval: string; explanation: string } {
  if (Math.abs(a) < 1e-14) {
    if (Math.abs(b) < 1e-14) {
      const truth =
        op === '>' ? c > 0 : op === '>=' ? c >= 0 : op === '<' ? c < 0 : c <= 0;
      return {
        interval: truth ? '(-∞, ∞)' : '∅ (No solution)',
        explanation: `Constant inequality ${c} ${op} 0 is ${truth ? 'always true' : 'never true'}.`,
      };
    }
    const root = Number((-c / b).toPrecision(8));
    const flip = b < 0;
    const effectiveOp = flip
      ? op === '>' ? '<' : op === '>=' ? '<=' : op === '<' ? '>' : '>='
      : op;
    if (effectiveOp === '>') return { interval: `(${root}, ∞)`, explanation: `Linear solution x > ${root}.` };
    if (effectiveOp === '>=') return { interval: `[${root}, ∞)`, explanation: `Linear solution x ≥ ${root}.` };
    if (effectiveOp === '<') return { interval: `(-∞, ${root})`, explanation: `Linear solution x < ${root}.` };
    return { interval: `(-∞, ${root}]`, explanation: `Linear solution x ≤ ${root}.` };
  }

  const delta = b * b - 4 * a * c;
  const inclusive = op === '>=' || op === '<=';
  const wantPositive = op === '>' || op === '>=';

  if (delta < -1e-12) {
    const alwaysMatches = (a > 0 && wantPositive) || (a < 0 && !wantPositive);
    return {
      interval: alwaysMatches ? '(-∞, ∞)' : '∅ (No solution)',
      explanation: `No real roots (Δ < 0); parabola opens ${a > 0 ? 'upward' : 'downward'} and stays ${a > 0 ? 'strictly positive' : 'strictly negative'}.`,
    };
  }

  if (Math.abs(delta) <= 1e-12) {
    const r = Number((-b / (2 * a)).toPrecision(8));
    const outsideMatches = (a > 0 && wantPositive) || (a < 0 && !wantPositive);
    if (outsideMatches) {
      return {
        interval: inclusive ? '(-∞, ∞)' : `(-∞, ${r}) ∪ (${r}, ∞)`,
        explanation: `Repeated root at x = ${r}.`,
      };
    }
    return {
      interval: inclusive ? `{${r}}` : '∅ (No solution)',
      explanation: `Parabola only touches 0 at x = ${r}.`,
    };
  }

  const s = Math.sqrt(delta);
  const r1Raw = (-b - s) / (2 * a);
  const r2Raw = (-b + s) / (2 * a);
  const lo = Number(Math.min(r1Raw, r2Raw).toPrecision(8));
  const hi = Number(Math.max(r1Raw, r2Raw).toPrecision(8));
  const lb = inclusive ? '[' : '(';
  const rb = inclusive ? ']' : ')';

  const outerInterval = (a > 0 && wantPositive) || (a < 0 && !wantPositive);
  if (outerInterval) {
    return {
      interval: `(-∞, ${lo}${rb} ∪ ${lb}${hi}, ∞)`,
      explanation: `Roots at ${lo} and ${hi}; inequality holds outside the roots.`,
    };
  }
  return {
    interval: `${lb}${lo}, ${hi}${rb}`,
    explanation: `Roots at ${lo} and ${hi}; inequality holds between the roots.`,
  };
}
