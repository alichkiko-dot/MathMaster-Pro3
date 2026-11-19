import {
  simplifyAndExpandAlgebra,
  solveCubic,
  solveGeneralEquation,
  solveLinearEquation,
  solvePolynomial,
  solveQuadratic,
  solveQuadraticInequality,
} from './algebra';
import {
  computeDefiniteIntegral,
  computeDerivative,
  computeGradient,
  computeIndefiniteIntegral,
  computeLimit,
  computeNumericalDerivative,
  computeTaylorSeries,
} from './calculus';
import {
  AD_BANNER_ALLOWED_SECTIONS,
  AD_PROTECTED_MATH_SECTIONS,
  canShowBannerOnSection,
  canShowInterstitialNow,
  createDefaultAdMobConfig,
  GOOGLE_OFFICIAL_ANDROID_TEST_IDS,
  resolveAdUnit,
} from '../services/admob/admobConfig';
import { HistoryFolder, HistoryItem } from '../types/calculator';
import { complexDiv, complexNthRoots, deMoivrePower } from './complex';
import { evaluateExpression } from './engine';
import {
  filterAndSearchHistory,
  formatBatchShareText,
  formatCalculationShareText,
  generateCalculationPDF,
  generateHistoryCSV,
  isDuplicateTopHistory,
  sanitizePdfMathText,
} from './exportHistory';
import {
  analyzeExplicitFunctions,
  evaluateTracePoints,
  normalizeImplicitExpression,
  panBounds,
  sampleExplicitSegments,
  sampleImplicitSegments,
  sampleParametricCurve,
  samplePolarCurve,
  sanitizeBounds,
  zoomBounds,
  zoomBoundsAt,
} from './graphing';
import {
  addMatrices,
  determinantMatrix,
  eigenvaluesAndVectors,
  inverseMatrixWithSteps,
  multiplyMatrices,
  solveLinearSystem,
} from './linearAlgebra';
import { evaluateTruthTable, extendedGCD, isPrime, primeFactorization } from './numberTheoryDiscrete';
import {
  bisectionMethod,
  lagrangeInterpolation,
  newtonRaphson,
  numericalIntegrationComparison,
  secantMethod,
} from './numericalMethods';
import {
  binomialCDF,
  binomialPMF,
  computeDescriptiveStats,
  computeLinearRegression,
  normalCDF,
  poissonCDF,
  poissonPMF,
} from './statistics';

export interface TestCaseResult {
  category: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export function runMathMasterTestSuite(): TestCaseResult[] {
  const results: TestCaseResult[] = [];
  const check = (category: string, name: string, cond: boolean, expected: string, actual: string) => {
    results.push({ category, name, passed: cond, expected, actual });
  };

  // 1. Basic Arithmetic & Precedence
  const r1 = evaluateExpression('2 + 3 * 4^2 - (10 / 2)');
  check('Basic Arithmetic', 'Operator precedence 2 + 3*4^2 - 10/2', r1.ok && r1.numericValue === '45', '45', r1.numericValue);

  const rMixed = evaluateExpression('2 3/4 + 1 1/4');
  check('Basic Arithmetic', 'Mixed numbers 2 3/4 + 1 1/4', rMixed.ok && rMixed.numericValue === '4', '4', rMixed.numericValue);

  const rPct = evaluateExpression('200 * 15%');
  check('Basic Arithmetic', 'Percentage 200 * 15%', rPct.ok && rPct.numericValue === '30', '30', rPct.numericValue);

  const rDblFact = evaluateExpression('5!!');
  check('Basic Arithmetic', 'Double factorial 5!!', rDblFact.ok && rDblFact.numericValue === '15', '15', rDblFact.numericValue);

  const rImp = evaluateExpression('sin(2π) + ln(e)');
  check('Basic Arithmetic', 'Implicit 2π + ln(e) = 1', rImp.ok && rImp.numericValue === '1', '1', rImp.numericValue);

  // 1b. Algebra Module
  const aq = solveQuadratic(1, -5, 6);
  check('Algebra', 'Quadratic x² - 5x + 6 = 0 roots 3, 2', aq.ok && aq.roots.includes('3') && aq.roots.includes('2'), '3, 2', aq.roots.join(', '));

  const ac = solveCubic(1, -6, 11, -6);
  check('Algebra', 'Cubic x³ - 6x² + 11x - 6 = 0 roots 1, 2, 3', ac.ok && ac.roots.includes('1') && ac.roots.includes('2') && ac.roots.includes('3'), '1, 2, 3', ac.roots.join(', '));

  const ag = solveGeneralEquation('2*x + 6 = 14');
  check('Algebra', 'Equation 2x + 6 = 14 → x = 4', ag.ok && ag.roots.includes(4), '4', ag.roots.join(', '));

  const agTan = solveGeneralEquation('(x - 2.1)^2 = 0');
  check('Algebra', 'Tangent equation (x - 2.1)² = 0 → x = 2.1', agTan.ok && agTan.roots.some((r) => Math.abs(r - 2.1) < 1e-5), '2.1', agTan.roots.join(', '));

  const agLn = solveGeneralEquation('ln(x) = 1');
  check('Algebra', 'Transcendental ln(x) = 1 → x = e', agLn.ok && agLn.roots.some((r) => Math.abs(r - Math.E) < 1e-6), String(Math.E), agLn.roots.join(', '));

  const asimp = simplifyAndExpandAlgebra('(x + 1)^2');
  check('Algebra', 'Expand (x+1)²', asimp.ok && asimp.expanded.includes('x ^ 2'), 'x^2 + 2x + 1', asimp.expanded);

  const afac1 = simplifyAndExpandAlgebra('x^2 - 5*x + 6');
  check('Algebra', 'Factor x² - 5x + 6', afac1.ok && afac1.factored === '(x - 2)(x - 3)', '(x - 2)(x - 3)', afac1.factored);

  const afac2 = simplifyAndExpandAlgebra('x^3 - 1');
  check('Algebra', 'Factor x³ - 1', afac2.ok && afac2.factored.includes('(x - 1)'), '(x - 1)(x^2 + x + 1)', afac2.factored);

  const aiq = solveQuadraticInequality(1, -4, 3, '<');
  check('Algebra', 'Inequality x² - 4x + 3 < 0', aiq.interval === '(1, 3)', '(1, 3)', aiq.interval);

  // 2. Complex Expressions & Constants
  const rEuler = evaluateExpression('e^(i * π) + 1');
  check('Complex Expressions', 'Euler identity e^(iπ) + 1', rEuler.ok && rEuler.numericValue === '0', '0', rEuler.numericValue);

  const rPhi = evaluateExpression('φ^2 - φ - 1');
  check('Complex Expressions', 'Golden ratio identity φ² - φ - 1', rPhi.ok && rPhi.numericValue === '0', '0', rPhi.numericValue);

  // 3. Trigonometric Identities (DEG & RAD)
  const rTrigDeg = evaluateExpression('sin(30)^2 + cos(30)^2', { angleMode: 'DEG' });
  check('Trigonometry', 'sin²(30°) + cos²(30°) = 1', rTrigDeg.ok && rTrigDeg.numericValue === '1', '1', rTrigDeg.numericValue);

  const rAsin = evaluateExpression('arcsin(0.5)', { angleMode: 'DEG' });
  check('Trigonometry', 'arcsin(0.5) in DEG', rAsin.ok && Math.abs(Number(rAsin.numericValue) - 30) < 1e-9, '30', rAsin.numericValue);

  // 4. Logarithms & Exponents
  const rLn = evaluateExpression('ln(e^5)');
  check('Logarithms', 'ln(e^5) = 5', rLn.ok && rLn.numericValue === '5', '5', rLn.numericValue);

  const rLog2 = evaluateExpression('log₂(1024)');
  check('Logarithms', 'log₂(1024) = 10', rLog2.ok && rLog2.numericValue === '10', '10', rLog2.numericValue);

  const rLog10 = evaluateExpression('log(1000)');
  check('Logarithms', 'log₁₀(1000) = 3', rLog10.ok && rLog10.numericValue === '3', '3', rLog10.numericValue);

  // 5. Calculus: Derivatives, Partials, Integrals, Limits, Taylor
  const d1 = computeDerivative('x^3 * sin(x)', 'x', 1, 0);
  check('Calculus', 'd/dx (x³ sin x) at x=0', d1.ok && d1.evaluatedAt === 0, '0', String(d1.evaluatedAt));

  const dAsin = computeDerivative('arcsin(x)', 'x', 1, 0.5);
  check('Calculus', 'd/dx arcsin(x) at x=0.5', dAsin.ok && Math.abs((dAsin.evaluatedAt ?? 0) - 2 / Math.sqrt(3)) < 1e-9, '1.1547', String(dAsin.evaluatedAt));

  const grad = computeGradient('x^2*y + sin(y*z)', ['x', 'y', 'z']);
  check('Calculus', 'Partial gradient ∂f/∂x, ∂f/∂y, ∂f/∂z', grad.every((g) => g.ok) && grad[0].expression.includes('x'), 'all partials ok', grad.map((g) => g.expression).join('; '));

  const intIndef = computeIndefiniteIntegral('3*x^2 + cos(x)', 'x');
  check('Calculus', 'Indefinite integral ∫(3x² + cos x)dx', intIndef.ok && intIndef.symbolicFound, 'x^3 + sin(x) + C', intIndef.antiderivative);

  const intSqrt = computeIndefiniteIntegral('sqrt(x)', 'x');
  check('Calculus', 'Indefinite integral ∫√x dx', intSqrt.ok && intSqrt.symbolicFound, '2/3*x^(3/2) + C', intSqrt.antiderivative);

  const intIbp = computeIndefiniteIntegral('x*e^x', 'x');
  check('Calculus', 'Indefinite integral ∫x·eˣ dx (IBP)', intIbp.ok && intIbp.symbolicFound, '(x - 1)e^x + C', intIbp.antiderivative);

  const intAtan = computeIndefiniteIntegral('1/(x^2 + 4)', 'x');
  check('Calculus', 'Indefinite integral ∫1/(x²+4) dx', intAtan.ok && intAtan.symbolicFound, '0.5 atan(0.5x) + C', intAtan.antiderivative);

  const intDef = computeDefiniteIntegral('x^2', 'x', 0, 3);
  check('Calculus', 'Definite integral ∫₀³ x² dx = 9', intDef.ok && Math.abs(intDef.value - 9) < 1e-9, '9', String(intDef.value));

  const lim1 = computeLimit('sin(x)/x', 'x', '0');
  check('Calculus', 'Limit sin(x)/x as x→0', lim1.ok && lim1.value === '1', '1', lim1.value);

  const lim2 = computeLimit('(1 - cos(x))/x^2', 'x', '0');
  check('Calculus', 'Limit (1-cos x)/x² as x→0', lim2.ok && Math.abs(Number(lim2.value) - 0.5) < 1e-7, '0.5', lim2.value);

  const tay = computeTaylorSeries('e^x', 'x', 0, 4);
  check('Calculus', 'Maclaurin series e^x degree 4', tay.ok && tay.terms.length === 5, '5 terms', `${tay.terms.length} terms`);

  const tayAsin = computeTaylorSeries('arcsin(x)', 'x', 0, 3);
  check('Calculus', 'Maclaurin series arcsin(x) deg 3', tayAsin.ok && tayAsin.terms.length === 2, 'x + x^3/6', tayAsin.polynomial);

  // 6. Linear Algebra
  const A = [
    [2, 1],
    [5, 3],
  ];
  const detRes = determinantMatrix(A);
  check('Linear Algebra', 'det([[2,1],[5,3]]) = 1', Math.abs(detRes.det - 1) < 1e-9, '1', String(detRes.det));

  const addRes = addMatrices([[1, 2], [3, 4]], [[5, 6], [7, 8]]);
  check('Linear Algebra', 'Matrix addition', addRes[0][0] === 6 && addRes[1][1] === 12, '[[6,8],[10,12]]', JSON.stringify(addRes));

  const invRes = inverseMatrixWithSteps(A);
  const prod = multiplyMatrices(A, invRes.inverse);
  check('Linear Algebra', 'A * A⁻¹ = I₂', Math.abs(prod[0][0] - 1) < 1e-9 && Math.abs(prod[0][1]) < 1e-9, 'I₂', JSON.stringify(prod));

  const sysRes = solveLinearSystem(A, [5, 13]);
  check('Linear Algebra', 'Solve 2x+y=5, 5x+3y=13', sysRes.status === 'unique' && Math.abs(sysRes.solution![0] - 2) < 1e-9 && Math.abs(sysRes.solution![1] - 1) < 1e-9, '[2, 1]', JSON.stringify(sysRes.solution));

  const eigRes = eigenvaluesAndVectors([[4, 1], [2, 3]]);
  check('Linear Algebra', 'Eigenvalues of [[4,1],[2,3]] are 5 and 2', eigRes.values.includes('5') && eigRes.values.includes('2') && eigRes.vectors.length === 2, '2, 5 + 2 vectors', eigRes.values.join(', '));

  // 7. Complex Numbers
  const cDiv = complexDiv({ re: 3, im: 2 }, { re: 1, im: -1 });
  check('Complex Numbers', '(3+2i)/(1-i) = 0.5 + 2.5i', Math.abs(cDiv.re - 0.5) < 1e-9 && Math.abs(cDiv.im - 2.5) < 1e-9, '0.5 + 2.5i', `${cDiv.re} + ${cDiv.im}i`);

  const dm = deMoivrePower({ re: 1, im: 1 }, 4);
  check('Complex Numbers', 'De Moivre (1+i)⁴ = -4', Math.abs(dm.re + 4) < 1e-9 && Math.abs(dm.im) < 1e-9, '-4', dm.cartesian);

  const roots = complexNthRoots({ re: 1, im: 0 }, 4);
  check('Complex Numbers', '4th roots of unity count = 4', roots.length === 4, '4', String(roots.length));

  // 8. Statistics
  const st = computeDescriptiveStats([2, 4, 4, 4, 5, 5, 7, 9]);
  check('Statistics', 'Mean=5, Median=4.5, PopStdDev=2', st.mean === 5 && st.median === 4.5 && Math.abs(st.stdPop - 2) < 1e-9, 'mean=5, median=4.5, σ=2', `mean=${st.mean}, med=${st.median}, σ=${st.stdPop}`);

  const reg = computeLinearRegression([1, 2, 3, 4], [2, 4, 6, 8]);
  check('Statistics', 'Perfect linear regression y = 2x', Math.abs(reg.slope - 2) < 1e-9 && Math.abs(reg.rSquared - 1) < 1e-9, 'm=2, R²=1', `m=${reg.slope}, R²=${reg.rSquared}`);

  const regConst = computeLinearRegression([1, 2, 3], [5, 5, 5]);
  check('Statistics', 'Constant Y linear regression r = 0', regConst.slope === 0 && regConst.r === 0, 'r=0, R²=0', `r=${regConst.r}, R²=${regConst.rSquared}`);

  const ncdf = normalCDF(0, 0, 1);
  check('Statistics', 'Standard Normal CDF(0) = 0.5', Math.abs(ncdf - 0.5) < 1e-6, '0.5', String(ncdf));

  const bino = binomialPMF(5, 10, 0.5);
  const pois = poissonCDF(3, 4);
  check('Statistics', 'Binomial & Poisson distributions', Math.abs(bino - 0.24609375) < 1e-6 && Math.abs(pois - 0.43347) < 1e-4 && binomialCDF(10, 10, 0.5) === 1 && poissonPMF(0, 2) > 0.13, 'Binomial=0.2461, Poisson=0.4335', `B=${bino.toFixed(4)}, P=${pois.toFixed(4)}`);

  // 9. Number Theory & Discrete & Numerical
  const pf = primeFactorization(360);
  check('Number Theory', 'Prime factorization of 360', pf.formatted === '2^3 × 3^2 × 5' && isPrime(97), '2^3 × 3^2 × 5', pf.formatted);

  const egcd = extendedGCD(240, 46);
  check('Number Theory', 'Extended GCD(240, 46) = 2', egcd.gcd === 2 && 240 * egcd.x + 46 * egcd.y === 2, 'gcd=2', `gcd=${egcd.gcd}`);

  const tt = evaluateTruthTable('P -> P');
  check('Discrete Math', 'Law of identity P → P is Tautology', tt.classification === 'Tautology', 'Tautology', tt.classification);

  const nr = newtonRaphson('x^2 - 2', 1.5);
  check('Numerical Methods', 'Newton-Raphson √2', nr.ok && Math.abs(nr.root - Math.SQRT2) < 1e-9, String(Math.SQRT2), String(nr.root));

  const nrLn = newtonRaphson('x*ln(x) - 1', 1.5);
  check('Numerical Methods', 'Newton-Raphson x·ln(x) - 1 quadratic convergence', nrLn.ok && Math.abs(nrLn.root - 1.763222834) < 1e-9 && nrLn.iterations.length <= 6, '1.76322 in ≤6 iters', `${nrLn.root} in ${nrLn.iterations.length} iters`);

  const bs = bisectionMethod('x^3 - x - 2', 1, 2);
  check('Numerical Methods', 'Bisection x³ - x - 2 = 0', bs.ok && Math.abs(bs.root - 1.5213797068) < 1e-6, '1.52138', String(bs.root));

  const bsEnd = bisectionMethod('x^2 - 4', 2, 3);
  check('Numerical Methods', 'Bisection root on left endpoint [2, 3]', bsEnd.ok && Math.abs(bsEnd.root - 2) < 1e-9, '2', String(bsEnd.root));

  const sec = secantMethod('cos(x) - x', 0, 1);
  check('Numerical Methods', 'Secant cos(x) - x = 0', sec.ok && Math.abs(sec.root - 0.7390851332) < 1e-9, '0.739085', String(sec.root));

  const numInt = numericalIntegrationComparison('x^3', 0, 1, 12);
  check('Numerical Methods', 'Simpson & Romberg exact on ∫₀¹ x³ dx', Math.abs(numInt.simpson13 - 0.25) < 1e-12 && Math.abs(numInt.romberg - 0.25) < 1e-12, '0.25', String(numInt.romberg));

  const lag = lagrangeInterpolation([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 7 }], 3);
  check('Numerical Methods', 'Lagrange interpolation P(3)', Math.abs(lag.value - 13) < 1e-9, '13', String(lag.value));

  // 10. Graphing 2D Analysis, Zoom/Pan & Sampling
  const segTan = sampleExplicitSegments('tan(x)', { xMin: -4, xMax: 4, yMin: -6, yMax: 6 }, 240);
  check('Graphing', '2D asymptote split for tan(x)', segTan.length >= 3, '≥3 continuous segments', `${segTan.length} segments`);

  const zB = zoomBounds({ xMin: -8, xMax: 8, yMin: -6, yMax: 6 }, 0.5);
  const zCorner = zoomBoundsAt({ xMin: 0, xMax: 10, yMin: 0, yMax: 10 }, 0.5, 0, 1);
  const pB = panBounds({ xMin: -8, xMax: 8, yMin: -6, yMax: 6 }, 100, 0, 400, 300);
  const safeB = sanitizeBounds({ xMin: 5, xMax: 2, yMin: -6, yMax: 6 });
  check('Graphing', 'Zoom, cursor-anchored zoom, pan & bounds guard', zB.xMax === 4 && zCorner.xMin === 0 && zCorner.yMin === 0 && pB.xMin === -12 && safeB.xMax > safeB.xMin, 'zoom=[-4,4], corner=[0,5], pan=[-12,4]', `zMax=${zB.xMax}, cornerX=${zCorner.xMax}`);

  const gAnal = analyzeExplicitFunctions(
    [
      { id: '1', type: 'explicit', expression: '(x - 1.5)^2', color: '#3B82F6', visible: true },
      { id: '2', type: 'explicit', expression: '1', color: '#06B6D4', visible: true },
    ],
    { xMin: -4, xMax: 6, yMin: -4, yMax: 6 }
  );
  check(
    'Graphing',
    'Coordinate analysis: tangent root, extremum & intersections',
    gAnal.roots.some((r) => Math.abs(r.x - 1.5) < 1e-4) &&
      gAnal.extrema.some((e) => e.kind === 'min' && Math.abs(e.x - 1.5) < 1e-4 && Math.abs(e.y) < 1e-4) &&
      gAnal.intersections.length === 2,
    'root=1.5, min=(1.5,0), 2 intersections',
    `roots=${gAnal.roots.map((r) => r.x.toFixed(2))}, int=${gAnal.intersections.length}`
  );

  const gExtrema = analyzeExplicitFunctions(
    [{ id: '1', type: 'explicit', expression: 'x^3 - 3*x', color: '#3B82F6', visible: true }],
    { xMin: -3, xMax: 3, yMin: -5, yMax: 5 }
  );
  const hasMax = gExtrema.extrema.some((e) => e.kind === 'max' && Math.abs(e.x + 1) < 1e-3 && Math.abs(e.y - 2) < 1e-3);
  const hasMin = gExtrema.extrema.some((e) => e.kind === 'min' && Math.abs(e.x - 1) < 1e-3 && Math.abs(e.y + 2) < 1e-3);
  check('Graphing', 'Local Max (-1,2) & Local Min (1,-2) for x³-3x', hasMax && hasMin, 'Max(-1,2) & Min(1,-2)', JSON.stringify(gExtrema.extrema));

  const gSqrt = analyzeExplicitFunctions(
    [{ id: '1', type: 'explicit', expression: 'sqrt(x - 1)', color: '#10B981', visible: true }],
    { xMin: -2, xMax: 5, yMin: -2, yMax: 4 }
  );
  check('Graphing', 'Domain-boundary root sqrt(x - 1) at x = 1', gSqrt.roots.some((r) => Math.abs(r.x - 1) < 1e-3), '(1, 0)', JSON.stringify(gSqrt.roots));

  const paramSegs = sampleParametricCurve('2*cos(t)', '2*sin(t)', 0, 2 * Math.PI, 120);
  const polarSegs = samplePolarCurve('3*cos(2*theta)', 0, 2 * Math.PI, 180);
  const impNorm = normalizeImplicitExpression('x^2 + y^2 = 9');
  const impSegs = sampleImplicitSegments('x^2 + y^2 = 9', { xMin: -4, xMax: 4, yMin: -4, yMax: 4 }, 40, 40);
  const impSaddle = sampleImplicitSegments('x^2 - y^2 = 0', { xMin: -2, xMax: 2, yMin: -2, yMax: 2 }, 30, 30);
  const trSamples = evaluateTracePoints([{ id: '1', type: 'explicit', expression: 'x^2 + 1', color: '#fff', visible: true }], 2);
  check(
    'Graphing',
    'Parametric, Polar, Implicit (= form & saddle) & Trace',
    paramSegs.length === 1 &&
      polarSegs.length === 1 &&
      impNorm.includes('-') &&
      impSegs.length > 20 &&
      impSaddle.length > 10 &&
      trSamples[0]?.y === 5,
    'all curve samplers & trace ok',
    `p=${paramSegs.length}, pol=${polarSegs.length}, imp=${impSegs.length}, tr=${trSamples[0]?.y}`
  );

  // 11. Extended Calculus: Numerical Derivatives, Point Gradient, Extended Integrals & Limits
  const numD1 = computeNumericalDerivative('sin(x)', 'x', 1, Math.PI / 3);
  const numD2 = computeNumericalDerivative('e^(2*x)', 'x', 2, 0);
  const absNumFallback = computeDerivative('abs(x)', 'x', 1, -2);
  check(
    'Calculus',
    'Numerical 5-point derivative & fallback',
    numD1.ok && Math.abs(numD1.value - 0.5) < 1e-9 && numD2.ok && Math.abs(numD2.value - 4) < 1e-6 && absNumFallback.ok && Math.abs((absNumFallback.evaluatedAt ?? 0) + 1) < 1e-6,
    'd/dx sin(π/3)=0.5, d²/dx² e^(2x)|0=4, d/dx|x||-2=-1',
    `${numD1.value.toFixed(6)}, ${numD2.value.toFixed(4)}, ${absNumFallback.evaluatedAt}`
  );

  const gradEval = computeGradient('x^2*y + sin(y*z)', ['x', 'y', 'z'], { x: 2, y: 0, z: 3 });
  check(
    'Calculus',
    'Gradient vector ∇f evaluated at (2, 0, 3)',
    gradEval.every((g) => g.ok) && gradEval[0].evaluatedAt === 0 && Math.abs((gradEval[1].evaluatedAt ?? 0) - 7) < 1e-9 && gradEval[2].evaluatedAt === 0,
    '(0, 7, 0)',
    `(${gradEval.map((g) => g.evaluatedAt).join(', ')})`
  );

  const intRecipSq = computeIndefiniteIntegral('1/x^2', 'x');
  const intLinDen = computeIndefiniteIntegral('1/(2*x + 3)', 'x');
  const intXlnX = computeIndefiniteIntegral('x*ln(x)', 'x');
  const intPartFrac = computeIndefiniteIntegral('1/(x^2 - 4)', 'x');
  check(
    'Calculus',
    'Indefinite integrals: 1/x², 1/(2x+3), x·ln(x), 1/(x²-4)',
    intRecipSq.symbolicFound && intLinDen.symbolicFound && intXlnX.symbolicFound && intPartFrac.symbolicFound,
    'all 4 symbolic forms found',
    `${intRecipSq.antiderivative} | ${intXlnX.antiderivative}`
  );

  const limEuler = computeLimit('(1 + 1/x)^x', 'x', 'inf');
  const limInfInf = computeLimit('ln(x)/x', 'x', 'inf');
  check(
    'Calculus',
    'Indeterminate 1^∞ & ∞/∞ limits at ∞',
    limEuler.ok && Math.abs(Number(limEuler.value) - Math.E) < 1e-6 && limInfInf.ok && limInfInf.value === '0',
    `e≈2.7182818, 0`,
    `${limEuler.value}, ${limInfInf.value}`
  );

  // 12. Extended Equation Solver: Linear, Polynomial Degree 4+, 4x4 Systems & Steps
  const linU = solveLinearEquation(3, -6, 9);
  const linId = solveLinearEquation(0, 5, 5);
  const linCon = solveLinearEquation(0, 2, 7);
  check(
    'Algebra',
    'Linear solver unique, identity & contradiction',
    linU.status === 'unique' && linU.root === 5 && linId.status === 'infinite' && linCon.status === 'inconsistent' && linU.steps.length === 3,
    'x=5, infinite, inconsistent',
    `${linU.root}, ${linId.status}, ${linCon.status}`
  );

  const poly4 = solvePolynomial([1, 0, -5, 0, 4]); // (x^2-1)(x^2-4)
  const poly4Complex = solvePolynomial([1, 0, 0, 0, -1]); // x^4 - 1 = 0 -> ±1, ±i
  check(
    'Algebra',
    'Degree-4 polynomial solver (real & complex roots)',
    poly4.ok &&
      poly4.realRoots.length === 4 &&
      Math.abs(poly4.realRoots[0] + 2) < 1e-6 &&
      Math.abs(poly4.realRoots[3] - 2) < 1e-6 &&
      poly4Complex.ok &&
      poly4Complex.realRoots.length === 2 &&
      poly4Complex.complexRoots.length === 2,
    '[-2,-1,1,2] and ±1, ±i',
    `${poly4.realRoots.join(',')} | ${poly4Complex.allRootsFormatted.join(',')}`
  );

  const eqLinClass = solveGeneralEquation('3*(x - 2) + 4 = 2*x + 7');
  const eqQuadComplex = solveGeneralEquation('x^2 + 1 = 0');
  check(
    'Algebra',
    'General equation classification & steps',
    eqLinClass.ok && eqLinClass.equationKind === 'linear' && eqLinClass.roots[0] === 9 && eqQuadComplex.equationKind === 'quadratic' && eqQuadComplex.allRootsFormatted.length === 2,
    'linear x=9, quadratic ±i',
    `${eqLinClass.equationKind}:${eqLinClass.roots[0]}, ${eqQuadComplex.allRootsFormatted.join(',')}`
  );

  const sys4 = solveLinearSystem(
    [
      [2, 1, -1, 1],
      [1, 3, 2, -1],
      [-1, 1, 4, 2],
      [3, -1, 1, 5],
    ],
    [4, 7, 13, 19]
  );
  check(
    'Linear Algebra',
    '4×4 linear system with Gauss-Jordan steps',
    sys4.status === 'unique' && !!sys4.solution && sys4.solution.length === 4 && sys4.steps.length >= 4,
    'unique 4-vector + steps',
    `${sys4.status}, steps=${sys4.steps.length}`
  );

  // 13. Invalid Inputs, Division by Zero, Large & Small Values
  const divZero = evaluateExpression('1 / 0');
  check('Edge Cases', 'Division by zero 1/0 handled safely', divZero.ok && divZero.numericValue === '∞' && !!divZero.domainWarning, '∞ + warning', divZero.numericValue);

  const badSyntax = evaluateExpression('2 + * 5');
  check('Edge Cases', 'Invalid syntax rejected cleanly', !badSyntax.ok && !!badSyntax.error, 'Syntax error', badSyntax.error || '');

  const largeSmall = evaluateExpression('1e15 * 1e-12');
  check('Edge Cases', 'Large & small scientific notation', largeSmall.ok && largeSmall.numericValue === '1000', '1000', largeSmall.numericValue);

  // 14. Export (PDF & CSV), Calculation History & Share System
  const now = 1_750_000_000_000;
  const mockFolders: HistoryFolder[] = [
    { id: 'general', name: 'General', createdAt: 1 },
    { id: 'calculus', name: 'Calculus & Analysis', createdAt: 2 },
  ];
  const mockHistory: HistoryItem[] = [
    {
      id: 'h1',
      expression: 'solve("x^2 - 5x + 6 = 0", x)',
      latex: 'x^2 - 5x + 6 = 0',
      result: 'x1 = 3, x2 = 2',
      exactResult: '(x - 2)(x - 3)',
      isExact: true,
      module: 'algebra',
      category: 'Quadratic Equation',
      timestamp: now - 1000,
      favorite: true,
      folderId: 'general',
      steps: [
        { title: 'Discriminant', expression: 'Δ = (-5)² - 4(1)(6) = 1', explanation: 'Positive discriminant yields two distinct real roots.' },
        { title: 'Quadratic Formula', expression: 'x = (5 ± √1) / 2', explanation: 'Evaluate both roots: x1 = 3 and x2 = 2.' },
      ],
    },
    {
      id: 'h2',
      expression: '∫[0, pi] sin(x) dx',
      latex: '\\int_0^\\pi \\sin(x)\\,dx',
      result: '2',
      exactResult: '2',
      isExact: true,
      module: 'calculus',
      category: 'Definite Integral',
      timestamp: now - 86_400_000 * 3,
      favorite: false,
      folderId: 'calculus',
      steps: [
        { title: 'Antiderivative', expression: 'F(x) = -cos(x)', explanation: 'Fundamental Theorem of Calculus: F(π) - F(0) = 1 - (-1) = 2.' },
      ],
    },
    {
      id: 'h3',
      expression: 'sin(30°)^2 + cos(30°)^2, "quoted"',
      latex: '\\sin^2(30^\\circ) + \\cos^2(30^\\circ)',
      result: '1',
      exactResult: '1',
      isExact: true,
      module: 'calculator',
      category: 'Scientific',
      timestamp: now - 86_400_000 * 45,
      favorite: false,
      folderId: 'general',
      steps: [],
    },
  ];

  // 14a. CSV Export & RFC-4180 Escaping
  const csvOut = generateHistoryCSV(mockHistory, mockFolders);
  const csvLines = csvOut.split('\n');
  check(
    'Export & History',
    'CSV export includes headers, category, expression, result & escapes quotes/commas',
    csvLines.length === 4 &&
      csvLines[0].startsWith('Date,Category,Module,Folder,Expression,Result') &&
      csvOut.includes('Algebra — Quadratic Equation') &&
      csvOut.includes('"sin(30°)^2 + cos(30°)^2, ""quoted"""'),
    '4 rows + RFC-4180 quoted cells',
    `rows=${csvLines.length}`
  );

  // 14b. PDF Math Text Sanitization
  const sanitized = sanitizePdfMathText('∫₀^π √(x²) → α + ∞ − β ≤ γ');
  check(
    'Export & History',
    'PDF math symbol sanitization avoids WinAnsi mojibake',
    sanitized.includes('integral') &&
      sanitized.includes('sqrt(x^2)') &&
      sanitized.includes('->') &&
      sanitized.includes('infinity') &&
      sanitized.includes('<='),
    'clean ASCII/Latin1 math text',
    sanitized
  );

  // 14c. Single Academic PDF Export with Steps
  const pdfSingle = generateCalculationPDF([mockHistory[0]], {
    exportDate: new Date(now),
    download: false,
  });
  const singleHeader = new TextDecoder('ascii').decode(new Uint8Array(pdfSingle.arrayBuffer.slice(0, 5)));
  check(
    'Export & History',
    'Single calculation PDF generates valid %PDF binary with steps',
    singleHeader === '%PDF-' && pdfSingle.arrayBuffer.byteLength > 1000 && pdfSingle.pageCount === 1,
    '%PDF- valid 1-page report',
    `${singleHeader} (${pdfSingle.arrayBuffer.byteLength} bytes, ${pdfSingle.pageCount}p)`
  );

  // 14d. Batch Multi-Page PDF Pagination
  const manyItems: HistoryItem[] = Array.from({ length: 16 }, (_, idx) => ({
    ...mockHistory[0],
    id: `batch_${idx}`,
    expression: `Problem #${idx + 1}: x^2 + ${idx + 1}*x - 12 = 0`,
    timestamp: now - idx * 60_000,
  }));
  const pdfBatch = generateCalculationPDF(manyItems, {
    exportDate: new Date(now),
    download: false,
  });
  const batchHeader = new TextDecoder('ascii').decode(new Uint8Array(pdfBatch.arrayBuffer.slice(0, 5)));
  check(
    'Export & History',
    'Batch PDF export paginates multi-entry step-by-step reports',
    batchHeader === '%PDF-' && pdfBatch.pageCount >= 2 && pdfBatch.arrayBuffer.byteLength > pdfSingle.arrayBuffer.byteLength,
    '%PDF- with >= 2 pages',
    `${batchHeader} (${pdfBatch.pageCount} pages, ${pdfBatch.arrayBuffer.byteLength} bytes)`
  );

  // 14e. History Search, Category, Favorites & Date Filtering
  const fCat = filterAndSearchHistory(mockHistory, { category: 'calculus', nowMs: now });
  const fSearchStep = filterAndSearchHistory(mockHistory, { query: 'fundamental theorem', nowMs: now });
  const fFav = filterAndSearchHistory(mockHistory, { onlyFavorites: true, nowMs: now });
  const f7d = filterAndSearchHistory(mockHistory, { dateRange: '7d', sortBy: 'oldest', nowMs: now });
  check(
    'Export & History',
    'History filtering by category, step search, favorites & 7d range',
    fCat.length === 1 &&
      fCat[0].id === 'h2' &&
      fSearchStep.length === 1 &&
      fSearchStep[0].id === 'h2' &&
      fFav.length === 1 &&
      fFav[0].id === 'h1' &&
      f7d.length === 2 &&
      f7d[0].id === 'h2',
    'cat=1, stepSearch=1, fav=1, 7d-oldest=[h2,h1]',
    `cat=${fCat.length}, step=${fSearchStep.length}, fav=${fFav.length}, 7d=${f7d.map((x) => x.id).join(',')}`
  );

  // 14f. Share Report Formatting & Consecutive Deduplication
  const shareSingle = formatCalculationShareText(mockHistory[0]);
  const shareBatch = formatBatchShareText(mockHistory);
  const dupTrue = isDuplicateTopHistory(mockHistory, {
    module: 'algebra',
    category: 'Quadratic Equation',
    expression: 'solve("x^2 - 5x + 6 = 0", x)',
    result: 'x1 = 3, x2 = 2',
  });
  const dupFalse = isDuplicateTopHistory(mockHistory, {
    module: 'algebra',
    category: 'Quadratic Equation',
    expression: 'x^2 - 9 = 0',
    result: 'x = ±3',
  });
  check(
    'Export & History',
    'Share report formatting (with steps) & top-history deduplication',
    shareSingle.includes('MathMaster Pro') &&
      shareSingle.includes('Step-by-Step Solution:') &&
      shareBatch.includes('#2 [Calculus — Definite Integral]') &&
      dupTrue &&
      !dupFalse,
    'share formatted + dedupe accurate',
    `singleLen=${shareSingle.length}, dup=${dupTrue}/${dupFalse}`
  );

  // =========================================================================
  // 15. CAPACITOR ANDROID & ADMOB SAFETY GUARDRAILS
  // =========================================================================
  const defaultAdCfg = createDefaultAdMobConfig({ PROD: false });
  check(
    'Android & AdMob Safety',
    'Default config keeps monetization disabled and forces testMode in dev',
    !defaultAdCfg.enabled &&
      defaultAdCfg.testMode &&
      defaultAdCfg.isDevEnvironment &&
      defaultAdCfg.productionUnitIds.banner === '',
    'enabled=false, testMode=true, no invented prod IDs',
    `enabled=${defaultAdCfg.enabled}, testMode=${defaultAdCfg.testMode}, prodBanner="${defaultAdCfg.productionUnitIds.banner}"`
  );

  const disabledResolve = resolveAdUnit('banner', defaultAdCfg);
  const devTestEnabledCfg = createDefaultAdMobConfig({
    PROD: false,
    VITE_ADMOB_ENABLED: 'true',
    VITE_ADMOB_TEST_MODE: 'false', // Should still be forced to test mode in dev!
    VITE_ADMOB_ANDROID_BANNER_ID: 'ca-app-pub-1234567890123456/1234567890',
  });
  const devForcedTestBanner = resolveAdUnit('banner', devTestEnabledCfg);
  const devForcedTestInterstitial = resolveAdUnit('interstitial', devTestEnabledCfg);
  const devForcedTestRewarded = resolveAdUnit('rewarded', devTestEnabledCfg);
  check(
    'Android & AdMob Safety',
    'Dev/test environments strictly resolve Google official test IDs (never prod)',
    !disabledResolve.allowed &&
      devForcedTestBanner.allowed &&
      devForcedTestBanner.isTesting &&
      devForcedTestBanner.adUnitId === GOOGLE_OFFICIAL_ANDROID_TEST_IDS.banner &&
      devForcedTestInterstitial.adUnitId === GOOGLE_OFFICIAL_ANDROID_TEST_IDS.interstitial &&
      devForcedTestRewarded.adUnitId === GOOGLE_OFFICIAL_ANDROID_TEST_IDS.rewarded,
    'Uses official Google test IDs only in dev',
    `disabled=${disabledResolve.allowed}, banner=${devForcedTestBanner.adUnitId}`
  );

  const prodMissingIdsCfg = createDefaultAdMobConfig({
    PROD: true,
    VITE_ADMOB_ENABLED: 'true',
    VITE_ADMOB_TEST_MODE: 'false',
  });
  const prodMissingResolve = resolveAdUnit('banner', prodMissingIdsCfg);
  const prodValidIdsCfg = createDefaultAdMobConfig({
    PROD: true,
    VITE_ADMOB_ENABLED: 'true',
    VITE_ADMOB_TEST_MODE: 'false',
    VITE_ADMOB_ANDROID_BANNER_ID: 'ca-app-pub-9876543210987654/1029384756',
  });
  const prodValidResolve = resolveAdUnit('banner', prodValidIdsCfg);
  check(
    'Android & AdMob Safety',
    'Release mode refuses missing/unconfigured IDs and accepts valid release format only',
    !prodMissingResolve.allowed &&
      prodValidResolve.allowed &&
      !prodValidResolve.isTesting &&
      prodValidResolve.adUnitId === 'ca-app-pub-9876543210987654/1029384756',
    'missing rejected, valid release ID accepted',
    `missing=${prodMissingResolve.allowed}, valid=${prodValidResolve.allowed}`
  );

  const allMathProtected = AD_PROTECTED_MATH_SECTIONS.every((s) => !canShowBannerOnSection(s));
  const allowedScreensOk = AD_BANNER_ALLOWED_SECTIONS.every((s) => canShowBannerOnSection(s));
  check(
    'Android & AdMob Safety',
    'Banner ads strictly blocked on keyboards, equations, graphs & results',
    allMathProtected && allowedScreensOk,
    '8 math sections blocked, 3 non-calc screens allowed',
    `mathBlocked=${allMathProtected}, allowedOk=${allowedScreensOk}`
  );

  const noConsentBlock = canShowInterstitialNow({
    config: devTestEnabledCfg,
    section: 'history',
    canRequestAds: false,
    lastShownAtMs: 0,
    shownThisSession: 0,
    nowMs: 500_000,
  });
  const calcInputBlock = canShowInterstitialNow({
    config: devTestEnabledCfg,
    section: 'calculator',
    canRequestAds: true,
    lastShownAtMs: 0,
    shownThisSession: 0,
    nowMs: 500_000,
  });
  const cooldownBlock = canShowInterstitialNow({
    config: devTestEnabledCfg,
    section: 'history',
    canRequestAds: true,
    lastShownAtMs: 450_000,
    shownThisSession: 1,
    nowMs: 500_000,
  });
  const eligibleShow = canShowInterstitialNow({
    config: devTestEnabledCfg,
    section: 'history',
    canRequestAds: true,
    lastShownAtMs: 100_000,
    shownThisSession: 1,
    nowMs: 500_000,
  });
  check(
    'Android & AdMob Safety',
    'Interstitial gating respects UMP consent, calculator non-interruption & cooldown',
    !noConsentBlock.allowed &&
      !calcInputBlock.allowed &&
      !cooldownBlock.allowed &&
      eligibleShow.allowed,
    'blocked w/o consent, on calc, or cooldown; allowed after cooldown',
    `consent=${noConsentBlock.allowed}, calc=${calcInputBlock.allowed}, cd=${cooldownBlock.allowed}, ok=${eligibleShow.allowed}`
  );

  return results;
}
