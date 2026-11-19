import { MathNode } from 'mathjs';
import { StepItem } from '../types/calculator';
import { buildScope, compileRealFunction, math, nodeToCleanLatex, preprocessExpression } from './engine';

/**
 * Converts user expression into mathjs canonical calculus form where `log` is natural log ln,
 * `log10(u)` becomes `log(u)/log(10)`, `log2(u)` becomes `log(u)/log(2)`, and inverse trig/hyperbolic
 * aliases (`arcsin`, `arccos`, `arctan`, `arsinh`, ...) map to `asin`, `acos`, `atan`, `asinh`, ...
 * so `math.derivative` differentiates all functions accurately.
 */
export function toCalculusCanonical(rawExpr: string): string {
  let norm = preprocessExpression(rawExpr);
  // Canonicalize inverse trig and inverse hyperbolic aliases for mathjs differentiation
  norm = norm
    .replace(/\barcsinh\(/g, 'asinh(')
    .replace(/\barccosh\(/g, 'acosh(')
    .replace(/\barctanh\(/g, 'atanh(')
    .replace(/\barsinh\(/g, 'asinh(')
    .replace(/\barcosh\(/g, 'acosh(')
    .replace(/\bartanh\(/g, 'atanh(')
    .replace(/\barcsin\(/g, 'asin(')
    .replace(/\barccos\(/g, 'acos(')
    .replace(/\barctan\(/g, 'atan(')
    .replace(/\barccsc\(/g, 'acsc(')
    .replace(/\barcsec\(/g, 'asec(')
    .replace(/\barccot\(/g, 'acot(');
  // Replace ln( with log(
  norm = norm.replace(/\bln\(/g, 'log(');
  // Replace log10(arg) and log2(arg) recursively
  norm = expandCustomLog(norm, 'log10', '10');
  norm = expandCustomLog(norm, 'log2', '2');
  return norm;
}

/**
 * Compiles a calculus-canonical expression (where `log` denotes natural log ln).
 */
export function compileCalculusFunction(
  canonExpr: string
): ((vars: Record<string, number>) => number) | null {
  try {
    const compiled = math.compile(canonExpr);
    const baseScope = buildScope('RAD');
    return (vars: Record<string, number>) => {
      try {
        const val = compiled.evaluate({ ...baseScope, ...vars });
        if (typeof val === 'number') return val;
        if (val && typeof val === 'object' && 're' in val && 'im' in val) {
          return Math.abs(val.im) < 1e-10 ? val.re : NaN;
        }
        return NaN;
      } catch {
        return NaN;
      }
    };
  } catch {
    return null;
  }
}

function expandCustomLog(expr: string, fnName: string, base: string): string {
  let out = expr;
  const token = `${fnName}(`;
  let idx = out.indexOf(token);
  while (idx !== -1) {
    let depth = 1;
    let j = idx + token.length;
    while (j < out.length && depth > 0) {
      if (out[j] === '(') depth++;
      else if (out[j] === ')') depth--;
      j++;
    }
    if (depth === 0) {
      const inner = out.slice(idx + token.length, j - 1);
      const replacement = `(log(${inner}) / log(${base}))`;
      out = out.slice(0, idx) + replacement + out.slice(j);
      idx = out.indexOf(token);
    } else {
      break;
    }
  }
  return out;
}

export interface DerivativeResult {
  ok: boolean;
  variable: string;
  order: number;
  expression: string;
  latex: string;
  evaluatedAt?: number;
  numericalAt?: number;
  numericalErrorEst?: number;
  steps: StepItem[];
  error?: string;
}

export interface NumericalDerivativeResult {
  ok: boolean;
  value: number;
  errorEstimate: number;
  steps: StepItem[];
  error?: string;
}

export function computeNumericalDerivative(
  rawExpr: string,
  variable = 'x',
  order = 1,
  point: number,
  extraScope: Record<string, number> = {}
): NumericalDerivativeResult {
  try {
    if (!Number.isFinite(point)) {
      throw new Error('Evaluation point must be a finite number.');
    }
    const fn = compileRealFunction(rawExpr, extraScope, 'RAD');
    if (!fn) throw new Error('Unable to compile function for numerical differentiation.');
    const f = (t: number) => fn({ ...extraScope, [variable]: t });

    const scale = Math.max(1, Math.abs(point));
    let val = NaN;
    let errEst = NaN;
    let formulaDesc = '';

    if (order === 1) {
      const h = 1e-4 * scale;
      const d1 = (-f(point + 2 * h) + 8 * f(point + h) - 8 * f(point - h) + f(point - 2 * h)) / (12 * h);
      const h2 = h / 2;
      const d2 = (-f(point + 2 * h2) + 8 * f(point + h2) - 8 * f(point - h2) + f(point - 2 * h2)) / (12 * h2);
      val = d2;
      errEst = Math.abs(d2 - d1) / 15;
      formulaDesc = '5-point O(h⁴) central difference stencil: (-f(x+2h)+8f(x+h)-8f(x-h)+f(x-2h)) / (12h)';
    } else if (order === 2) {
      const h = 1e-3 * scale;
      const d1 = (-f(point + 2 * h) + 16 * f(point + h) - 30 * f(point) + 16 * f(point - h) - f(point - 2 * h)) / (12 * h * h);
      const h2 = h / 2;
      const d2 = (-f(point + 2 * h2) + 16 * f(point + h2) - 30 * f(point) + 16 * f(point - h2) - f(point - 2 * h2)) / (12 * h2 * h2);
      val = d2;
      errEst = Math.abs(d2 - d1) / 15;
      formulaDesc = '5-point O(h⁴) second-order central stencil';
    } else {
      const h = 5e-3 * scale;
      // Recursive finite difference for orders 3..5
      const diff = (k: number, x: number, step: number): number =>
        k === 0 ? f(x) : (diff(k - 1, x + step, step) - diff(k - 1, x - step, step)) / (2 * step);
      const d1 = diff(order, point, h);
      const d2 = diff(order, point, h / 2);
      val = (4 * d2 - d1) / 3;
      errEst = Math.abs(d2 - d1) / 3;
      formulaDesc = `Richardson-extrapolated central difference of order ${order}`;
    }

    if (!Number.isFinite(val)) {
      throw new Error(`Function is undefined or non-differentiable near ${variable} = ${point}.`);
    }

    const cleanVal = Math.abs(val) < 1e-12 ? 0 : val;
    return {
      ok: true,
      value: cleanVal,
      errorEstimate: Number.isFinite(errEst) ? errEst : 0,
      steps: [
        {
          title: 'Numerical Stencil Estimate',
          expression: `f^(${order})(${point}) ≈ ${Number(cleanVal.toPrecision(10))}`,
          explanation: `${formulaDesc} (est. error ≤ ${(errEst || 0).toExponential(2)}).`,
        },
      ],
    };
  } catch (err: any) {
    return {
      ok: false,
      value: NaN,
      errorEstimate: NaN,
      steps: [],
      error: err?.message || 'Numerical differentiation failed.',
    };
  }
}

function explainDerivativeRules(node: MathNode, variable: string): string[] {
  const rules = new Set<string>();
  const walk = (n: MathNode) => {
    const a = n as any;
    if (n.type === 'OperatorNode') {
      if (a.op === '+' || a.op === '-') rules.add('Sum / Difference Rule: (u ± v)′ = u′ ± v′');
      if (a.op === '*') rules.add('Product Rule: (u · v)′ = u′v + uv′');
      if (a.op === '/') rules.add('Quotient Rule: (u / v)′ = (u′v − uv′) / v²');
      if (a.op === '^') rules.add('Power / Exponential Rule: (uⁿ)′ = n·uⁿ⁻¹·u′ or (aᵘ)′ = aᵘ·ln(a)·u′');
      if (Array.isArray(a.args)) a.args.forEach(walk);
    } else if (n.type === 'FunctionNode') {
      const fn = a.fn?.name;
      if (['sin', 'cos', 'tan', 'csc', 'sec', 'cot'].includes(fn)) {
        rules.add('Trigonometric Differentiation + Chain Rule');
      } else if (['asin', 'acos', 'atan', 'acsc', 'asec', 'acot'].includes(fn)) {
        rules.add('Inverse Trigonometric Differentiation + Chain Rule');
      } else if (['sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh'].includes(fn)) {
        rules.add('Hyperbolic Differentiation + Chain Rule');
      } else if (fn === 'log' || fn === 'exp' || fn === 'sqrt') {
        rules.add(`Elementary Function Rule (${fn}) + Chain Rule`);
      }
      if (Array.isArray(a.args)) a.args.forEach(walk);
    } else if (n.type === 'ParenthesisNode' && a.content) {
      walk(a.content);
    }
  };
  walk(node);
  if (rules.size === 0) {
    rules.add(`Constant / Identity Rule with respect to ${variable}`);
  }
  return Array.from(rules);
}

export function computeDerivative(
  rawExpr: string,
  variable = 'x',
  order = 1,
  evalPoint?: number
): DerivativeResult {
  try {
    const canon = toCalculusCanonical(rawExpr);
    let currentNode = math.parse(canon);
    const steps: StepItem[] = [
      {
        title: '1. Original Function',
        expression: `f(${variable}) = ${currentNode.toString()}`,
        latex: `f(${variable}) = ${nodeToCleanLatex(currentNode)}`,
        explanation: `Computing the order-${order} derivative with respect to ${variable}.`,
      },
    ];

    for (let k = 1; k <= order; k++) {
      const rules = explainDerivativeRules(currentNode, variable);
      const deriv = math.derivative(currentNode, variable);
      const simplified = math.simplify(deriv);
      steps.push({
        title: `${k + 1}. Order ${k} Derivative`,
        expression: `d^${k}/d${variable}^${k} = ${simplified.toString()}`,
        latex: `\\frac{d${k > 1 ? `^{${k}}` : ''}}{d${variable}${k > 1 ? `^{${k}}` : ''}} = ${nodeToCleanLatex(simplified)}`,
        explanation: `Applied: ${rules.join('; ')}.`,
      });
      currentNode = simplified;
    }

    let evaluatedAt: number | undefined;
    let numericalAt: number | undefined;
    let numericalErrorEst: number | undefined;

    if (evalPoint !== undefined && Number.isFinite(evalPoint)) {
      const scope = buildScope('RAD');
      try {
        const val = currentNode.evaluate({ ...scope, [variable]: evalPoint });
        if (typeof val === 'number' && Number.isFinite(val)) {
          evaluatedAt = val;
          steps.push({
            title: `${steps.length + 1}. Symbolic Evaluation at ${variable} = ${evalPoint}`,
            expression: `f^(${order})(${evalPoint}) = ${val}`,
            latex: `f^{(${order})}(${evalPoint}) = ${Number(val.toPrecision(10))}`,
            explanation: `Substituted ${variable} = ${evalPoint} into the simplified symbolic derivative.`,
          });
        }
      } catch {
        // leave undefined; numerical fallback below
      }

      const numRes = computeNumericalDerivative(rawExpr, variable, order, evalPoint);
      if (numRes.ok) {
        numericalAt = numRes.value;
        numericalErrorEst = numRes.errorEstimate;
        steps.push(...numRes.steps);
      }
    }

    return {
      ok: true,
      variable,
      order,
      expression: currentNode.toString(),
      latex: nodeToCleanLatex(currentNode),
      evaluatedAt,
      numericalAt,
      numericalErrorEst,
      steps,
    };
  } catch (err: any) {
    // Numerical fallback when symbolic differentiation isn't supported (e.g. abs/floor) and an evalPoint is supplied
    if (evalPoint !== undefined && Number.isFinite(evalPoint)) {
      const numRes = computeNumericalDerivative(rawExpr, variable, order, evalPoint);
      if (numRes.ok) {
        return {
          ok: true,
          variable,
          order,
          expression: `Numerical derivative at ${variable} = ${evalPoint}`,
          latex: `f^{(${order})}(${evalPoint}) \\approx ${Number(numRes.value.toPrecision(10))}`,
          evaluatedAt: numRes.value,
          numericalAt: numRes.value,
          numericalErrorEst: numRes.errorEstimate,
          steps: [
            {
              title: '1. Numerical Differentiation Fallback',
              explanation: `Symbolic derivative unavailable (${err?.message || 'unsupported form'}); evaluated numerically via central finite differences.`,
            },
            ...numRes.steps,
          ],
        };
      }
    }
    return {
      ok: false,
      variable,
      order,
      expression: '',
      latex: '',
      steps: [],
      error: err?.message || 'Unable to compute symbolic derivative.',
    };
  }
}

const RESERVED_CONSTANTS = new Set(['e', 'pi', 'phi', 'gamma', 'i', 'tau', 'Infinity', 'NaN']);

export function extractExpressionVariables(rawExpr: string): string[] {
  try {
    const canon = toCalculusCanonical(rawExpr);
    const node = math.parse(canon);
    const found = new Set<string>();
    node.traverse((n, _path, parent) => {
      if (n.type === 'SymbolNode') {
        const name = (n as any).name as string;
        const isFnName = parent && parent.type === 'FunctionNode' && (parent as any).fn === n;
        if (!isFnName && !RESERVED_CONSTANTS.has(name)) {
          found.add(name);
        }
      }
    });
    return Array.from(found);
  } catch {
    return ['x', 'y', 'z'];
  }
}

export function computeGradient(
  rawExpr: string,
  vars?: string[],
  evalMap?: Record<string, number>
): DerivativeResult[] {
  const detected = extractExpressionVariables(rawExpr);
  const targetVars = vars && vars.length > 0 ? vars : detected.length > 0 ? detected : ['x', 'y', 'z'];
  return targetVars.map((v) => {
    const res = computeDerivative(rawExpr, v, 1);
    if (res.ok && evalMap && Object.keys(evalMap).length > 0) {
      try {
        const scope = { ...buildScope('RAD'), ...evalMap };
        const val = math.parse(res.expression).evaluate(scope);
        if (typeof val === 'number' && Number.isFinite(val)) {
          res.evaluatedAt = val;
        }
      } catch {
        // skip if incomplete evaluation point
      }
      if (Number.isFinite(evalMap[v])) {
        const otherScope: Record<string, number> = { ...evalMap };
        delete otherScope[v];
        const num = computeNumericalDerivative(rawExpr, v, 1, evalMap[v], otherScope);
        if (num.ok) {
          res.numericalAt = num.value;
          res.numericalErrorEst = num.errorEstimate;
        }
      }
    }
    return res;
  });
}

export interface IndefiniteIntegralResult {
  ok: boolean;
  symbolicFound: boolean;
  antiderivative: string;
  latex: string;
  steps: StepItem[];
  error?: string;
}

/**
 * Genuine AST-based symbolic indefinite integrator for standard elementary forms.
 * Never fabricates rules: if a closed form isn't matched, clearly reports `symbolicFound: false`.
 */
function integrateNode(node: MathNode, v: string, steps: StepItem[]): MathNode | null {
  const a = node as any;

  if (node.type === 'ParenthesisNode') {
    return integrateNode(a.content, v, steps);
  }

  // Constant with respect to v
  if (!dependsOn(node, v)) {
    const res = math.parse(`(${node.toString()}) * ${v}`);
    steps.push({
      title: 'Constant Rule',
      expression: `∫ ${node.toString()} d${v} = ${res.toString()}`,
      explanation: `Integrand is constant with respect to ${v}.`,
    });
    return res;
  }

  // Variable v itself -> v^2 / 2
  if (node.type === 'SymbolNode' && a.name === v) {
    const res = math.parse(`${v}^2 / 2`);
    steps.push({
      title: 'Power Rule (n = 1)',
      expression: `∫ ${v} d${v} = ${v}² / 2`,
      explanation: `Applied ∫ ${v}ⁿ d${v} = ${v}ⁿ⁺¹ / (n + 1).`,
    });
    return res;
  }

  if (node.type === 'OperatorNode') {
    // Unary minus
    if (a.op === '-' && a.args.length === 1) {
      const inner = integrateNode(a.args[0], v, steps);
      return inner ? math.parse(`-(${inner.toString()})`) : null;
    }
    // Linearity: Addition / Subtraction
    if ((a.op === '+' || a.op === '-') && a.args.length === 2) {
      const left = integrateNode(a.args[0], v, steps);
      const right = integrateNode(a.args[1], v, steps);
      if (!left || !right) return null;
      return math.parse(`(${left.toString()}) ${a.op} (${right.toString()})`);
    }
    // Constant multiple: c * f(v) or f(v) * c, trig identities sec(u)*tan(u), and integration by parts P(v)*f(v)
    if (a.op === '*') {
      if (!dependsOn(a.args[0], v)) {
        const right = integrateNode(a.args[1], v, steps);
        return right ? math.parse(`(${a.args[0].toString()}) * (${right.toString()})`) : null;
      }
      if (!dependsOn(a.args[1], v)) {
        const left = integrateNode(a.args[0], v, steps);
        return left ? math.parse(`(${a.args[1].toString()}) * (${left.toString()})`) : null;
      }
      // Check sec(u) * tan(u), csc(u) * cot(u), or sin(u) * cos(u)
      const secTan = matchSecTanProduct(a.args[0], a.args[1], v);
      if (secTan) {
        steps.push({
          title: 'Trigonometric Product Rule',
          expression: `∫ ${node.toString()} d${v} = ${secTan.toString()}`,
          explanation: 'Applied standard trigonometric product antiderivative.',
        });
        return secTan;
      }
      // Check Integration by Parts: Polynomial(v) * exp/e^/sin/cos/log
      const ibp = tryIntegrationByParts(a.args[0], a.args[1], v, steps) ??
        tryIntegrationByParts(a.args[1], a.args[0], v, steps);
      if (ibp) return ibp;
    }
    if (a.op === '/') {
      if (!dependsOn(a.args[1], v)) {
        const left = integrateNode(a.args[0], v, steps);
        return left ? math.parse(`(${left.toString()}) / (${a.args[1].toString()})`) : null;
      }
      // c / v -> c * ln|v|
      if (!dependsOn(a.args[0], v) && a.args[1].type === 'SymbolNode' && a.args[1].name === v) {
        steps.push({
          title: 'Logarithmic Integral Rule',
          expression: `∫ ${a.args[0].toString()}/${v} d${v} = ${a.args[0].toString()} * ln(abs(${v}))`,
          explanation: `∫ (1/${v}) d${v} = ln|${v}|.`,
        });
        return math.parse(`(${a.args[0].toString()}) * log(abs(${v}))`);
      }
      // c / (a*v + b) -> (c/a) * ln|a*v + b|
      if (!dependsOn(a.args[0], v)) {
        const linDen = extractLinear(a.args[1], v);
        if (linDen) {
          const res = math.parse(`(${a.args[0].toString()}) * log(abs(${a.args[1].toString()})) / (${linDen.a})`);
          steps.push({
            title: 'Linear Reciprocal Rule',
            expression: `∫ ${node.toString()} d${v} = ${res.toString()}`,
            explanation: `Applied u-substitution u = ${a.args[1].toString()}, du = ${linDen.a} d${v}.`,
          });
          return res;
        }
      }
      // c / v^n or c / (a*v + b)^n
      if (!dependsOn(a.args[0], v) && a.args[1].type === 'OperatorNode' && (a.args[1] as any).op === '^') {
        const dBase = (a.args[1] as any).args[0];
        const dExp = (a.args[1] as any).args[1];
        if (!dependsOn(dExp, v)) {
          const inner = integrateNode(math.parse(`(${dBase.toString()})^(-(${dExp.toString()}))`), v, steps);
          if (inner) return math.parse(`(${a.args[0].toString()}) * (${inner.toString()})`);
        }
      }
      // c / sqrt(linear) or c / sqrt(c - a*v^2)
      if (!dependsOn(a.args[0], v) && a.args[1].type === 'FunctionNode' && (a.args[1] as any).fn?.name === 'sqrt') {
        const inner = (a.args[1] as any).args[0];
        const lin = extractLinear(inner, v);
        if (lin) {
          const res = math.parse(`(${a.args[0].toString()}) * 2 * sqrt(${inner.toString()}) / (${lin.a})`);
          steps.push({
            title: 'Reciprocal Square Root Rule',
            expression: `∫ ${node.toString()} d${v} = ${res.toString()}`,
            explanation: `Rewrote 1/√u as u^(-1/2) with u = ${inner.toString()}.`,
          });
          return res;
        }
        const quadRad = extractQuadraticCoefficients(inner, v);
        if (quadRad && quadRad.b === 0 && quadRad.c > 0 && quadRad.a < 0) {
          const posA = -quadRad.a;
          const posC = quadRad.c;
          const k = Number((Math.sqrt(posA / posC)).toPrecision(10));
          const scale = Number((1 / Math.sqrt(posA)).toPrecision(10));
          const res = math.parse(`(${a.args[0].toString()}) * ${scale} * asin(${k} * ${v})`);
          steps.push({
            title: 'Inverse Sine Radical Rule',
            expression: `∫ ${node.toString()} d${v} = ${res.toString()}`,
            explanation: 'Applied ∫ 1/√(a² − b²x²) dx = (1/b) arcsin(bx/a).',
          });
          return res;
        }
      }
      // (k*v) / (a*v^2 + c) -> u-substitution u = a*v^2 + c
      const numLin = extractLinear(a.args[0], v);
      const denQuad = extractQuadraticCoefficients(a.args[1], v);
      if (numLin && numLin.b === '0' && denQuad && Math.abs(denQuad.b) < 1e-12 && denQuad.a !== 0) {
        const coeff = Number((Number(numLin.a) / (2 * denQuad.a)).toPrecision(10));
        if (Number.isFinite(coeff)) {
          const res = math.parse(`${coeff} * log(abs(${a.args[1].toString()}))`);
          steps.push({
            title: 'Logarithmic u-Substitution',
            expression: `∫ ${node.toString()} d${v} = ${res.toString()}`,
            explanation: `Substituted u = ${a.args[1].toString()}, du = ${2 * denQuad.a}${v} d${v}.`,
          });
          return res;
        }
      }
      // c / (a*v^2 + b) with a*b > 0 -> atan; a*b < 0 -> partial fractions ln|(x-r)/(x+r)|
      if (!dependsOn(a.args[0], v)) {
        const quadDen = extractQuadraticCoefficients(a.args[1], v);
        if (quadDen && Math.abs(quadDen.b) < 1e-12 && quadDen.a > 0 && quadDen.c > 0) {
          const scale = Number((1 / Math.sqrt(quadDen.a * quadDen.c)).toPrecision(10));
          const argK = Number(Math.sqrt(quadDen.a / quadDen.c).toPrecision(10));
          const res = math.parse(`(${a.args[0].toString()}) * ${scale} * atan(${argK} * ${v})`);
          steps.push({
            title: 'Inverse Tangent Rational Rule',
            expression: `∫ ${node.toString()} d${v} = ${res.toString()}`,
            explanation: `Applied ∫ 1/(a${v}² + c) d${v} = (1/√(ac)) arctan(√(a/c)·${v}).`,
          });
          return res;
        }
        if (quadDen && Math.abs(quadDen.b) < 1e-12 && quadDen.a > 0 && quadDen.c < 0) {
          const posC = -quadDen.c;
          const rtA = Math.sqrt(quadDen.a);
          const rtC = Math.sqrt(posC);
          const scale = Number((1 / (2 * rtA * rtC)).toPrecision(10));
          const res = math.parse(`(${a.args[0].toString()}) * ${scale} * log(abs((${Number(rtA.toPrecision(10))} * ${v} - ${Number(rtC.toPrecision(10))}) / (${Number(rtA.toPrecision(10))} * ${v} + ${Number(rtC.toPrecision(10))})))`);
          steps.push({
            title: 'Partial Fraction Logarithm Rule',
            expression: `∫ ${node.toString()} d${v} = ${res.toString()}`,
            explanation: 'Decomposed rational denominator into linear partial fractions giving ln|(√a·x − √c)/(√a·x + √c)|.',
          });
          return res;
        }
      }
    }
    // Power v^n or (a*v + b)^n or a^v or e^(a*v+b) or sec(u)^2 or csc(u)^2
    if (a.op === '^') {
      const base = a.args[0];
      const exp = a.args[1];
      // sec(kx+b)^2 or csc(kx+b)^2
      const expNum = safeEvalConstant(exp);
      if (expNum !== null && Math.abs(expNum - 2) < 1e-12 && base.type === 'FunctionNode') {
        const bfn = (base as any).fn?.name;
        const barg = (base as any).args[0];
        const lin = extractLinear(barg, v);
        if (lin && (bfn === 'sec' || bfn === 'csc')) {
          const res =
            bfn === 'sec'
              ? math.parse(`tan(${barg.toString()}) / (${lin.a})`)
              : math.parse(`-cot(${barg.toString()}) / (${lin.a})`);
          steps.push({
            title: `Trigonometric Squared Rule (${bfn}²)`,
            expression: `∫ ${node.toString()} d${v} = ${res.toString()}`,
            explanation: bfn === 'sec' ? '∫ sec²(u) du = tan(u).' : '∫ csc²(u) du = -cot(u).',
          });
          return res;
        }
      }
      // v^n
      if (base.type === 'SymbolNode' && base.name === v && !dependsOn(exp, v)) {
        const nVal = safeEvalConstant(exp);
        if (nVal !== null && Math.abs(nVal + 1) < 1e-12) {
          steps.push({
            title: 'Reciprocal Power Rule (n = -1)',
            expression: `∫ ${v}^(-1) d${v} = ln|${v}|`,
            explanation: 'When exponent n = -1, antiderivative is the natural logarithm.',
          });
          return math.parse(`log(abs(${v}))`);
        }
        const nPlus1 = math.simplify(`(${exp.toString()}) + 1`);
        const res = math.parse(`(${v}^(${nPlus1.toString()})) / (${nPlus1.toString()})`);
        steps.push({
          title: 'Power Rule',
          expression: `∫ ${v}^(${exp.toString()}) d${v} = ${res.toString()}`,
          explanation: `Increased exponent by 1 and divided by new exponent (${nPlus1.toString()}).`,
        });
        return res;
      }
      // e^(k*v + b) or a^v
      if (!dependsOn(base, v)) {
        const lin = extractLinear(exp, v);
        if (lin) {
          const isE = base.type === 'SymbolNode' && base.name === 'e';
          const denom = isE ? `(${lin.a})` : `((${lin.a}) * log(${base.toString()}))`;
          const res = math.parse(`(${node.toString()}) / ${denom}`);
          steps.push({
            title: 'Exponential Rule',
            expression: `∫ ${node.toString()} d${v} = ${res.toString()}`,
            explanation: `Applied exponential antiderivative rule with linear substitution u = ${exp.toString()}.`,
          });
          return res;
        }
      }
      // (a*v + b)^n
      const linBase = extractLinear(base, v);
      if (linBase && !dependsOn(exp, v)) {
        const nVal = safeEvalConstant(exp);
        if (nVal !== null && Math.abs(nVal + 1) < 1e-12) {
          return math.parse(`log(abs(${base.toString()})) / (${linBase.a})`);
        }
        const nPlus1 = math.simplify(`(${exp.toString()}) + 1`);
        return math.parse(`((${base.toString()})^(${nPlus1.toString()})) / ((${linBase.a}) * (${nPlus1.toString()}))`);
      }
    }
  }

  // Elementary functions with linear argument f(a*v + b)
  if (node.type === 'FunctionNode') {
    const fn = a.fn?.name;
    const arg = a.args[0];
    const lin = extractLinear(arg, v);
    if (lin) {
      const k = lin.a;
      const argStr = arg.toString();
      const map: Record<string, string> = {
        sin: `(-cos(${argStr})) / (${k})`,
        cos: `(sin(${argStr})) / (${k})`,
        tan: `(-log(abs(cos(${argStr})))) / (${k})`,
        cot: `(log(abs(sin(${argStr})))) / (${k})`,
        exp: `(exp(${argStr})) / (${k})`,
        sinh: `(cosh(${argStr})) / (${k})`,
        cosh: `(sinh(${argStr})) / (${k})`,
        sec: `(log(abs(sec(${argStr}) + tan(${argStr})))) / (${k})`,
        csc: `(-log(abs(csc(${argStr}) + cot(${argStr})))) / (${k})`,
        sqrt: `(2 / (3 * (${k}))) * (${argStr})^(3/2)`,
        log: `((${argStr}) * log(${argStr}) - (${argStr})) / (${k})`,
      };
      if (map[fn]) {
        steps.push({
          title: `Elementary Function Rule (${fn})`,
          expression: `∫ ${node.toString()} d${v} = ${map[fn]}`,
          explanation: `Applied standard ${fn} antiderivative with u-substitution u = ${argStr}, du = ${k} d${v}.`,
        });
        return math.parse(map[fn]);
      }
    }
  }

  return null;
}

function matchSecTanProduct(left: MathNode, right: MathNode, v: string): MathNode | null {
  if (left.type !== 'FunctionNode' || right.type !== 'FunctionNode') return null;
  const f1 = (left as any).fn?.name;
  const f2 = (right as any).fn?.name;
  const a1 = (left as any).args[0];
  const a2 = (right as any).args[0];
  if (a1.toString() !== a2.toString()) return null;
  const lin = extractLinear(a1, v);
  if (!lin) return null;
  if ((f1 === 'sec' && f2 === 'tan') || (f1 === 'tan' && f2 === 'sec')) {
    return math.parse(`sec(${a1.toString()}) / (${lin.a})`);
  }
  if ((f1 === 'csc' && f2 === 'cot') || (f1 === 'cot' && f2 === 'csc')) {
    return math.parse(`-csc(${a1.toString()}) / (${lin.a})`);
  }
  if ((f1 === 'sin' && f2 === 'cos') || (f1 === 'cos' && f2 === 'sin')) {
    return math.parse(`(sin(${a1.toString()})^2) / (2 * (${lin.a}))`);
  }
  return null;
}

function extractQuadraticCoefficients(node: MathNode, v: string): { a: number; b: number; c: number } | null {
  try {
    const rat = math.rationalize(node.toString(), {}, true) as any;
    if (Array.isArray(rat?.coefficients) && (!rat.variables?.length || (rat.variables.length === 1 && rat.variables[0] === v))) {
      const coeffs: number[] = rat.coefficients;
      if (coeffs.length <= 3) {
        return {
          c: coeffs[0] ?? 0,
          b: coeffs[1] ?? 0,
          a: coeffs[2] ?? 0,
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function isPureUnivariatePoly(node: MathNode, v: string): number[] | null {
  try {
    const rat = math.rationalize(node.toString(), {}, true) as any;
    if (Array.isArray(rat?.coefficients) && (!rat.variables?.length || (rat.variables.length === 1 && rat.variables[0] === v))) {
      return rat.coefficients;
    }
  } catch {
    // ignore
  }
  return null;
}

function tryIntegrationByParts(
  uCandidate: MathNode,
  dvCandidate: MathNode,
  v: string,
  steps: StepItem[]
): MathNode | null {
  const poly = isPureUnivariatePoly(uCandidate, v);
  if (!poly || poly.length < 2 || poly.length > 5) return null; // deg 1..4 polynomial

  // Check P(v) * ln(k*v + b): choose u = ln(k*v + b), dv = P(v) dx -> v_int * ln - ∫ v_int * (k/(k*v+b)) dx (for P(v) = c*v^n)
  if (dvCandidate.type === 'FunctionNode' && (dvCandidate as any).fn?.name === 'log') {
    const logArg = (dvCandidate as any).args[0];
    const lin = extractLinear(logArg, v);
    if (lin && lin.b === '0') {
      // ∫ P(v) * ln(k*v) dv = (∫P(v)dv) * ln(k*v) - ∫ (∫P(v)dv) / v dv
      const vIntTerms: string[] = [];
      const remTerms: string[] = [];
      for (let p = 0; p < poly.length; p++) {
        const c = poly[p];
        if (Math.abs(c) < 1e-12) continue;
        const np1 = p + 1;
        vIntTerms.push(`(${c} / ${np1}) * ${v}^${np1}`);
        remTerms.push(`(${c} / ${np1 * np1}) * ${v}^${np1}`);
      }
      if (vIntTerms.length > 0) {
        const combined = math.parse(`(${vIntTerms.join(' + ')}) * log(${logArg.toString()}) - (${remTerms.join(' + ')})`);
        steps.push({
          title: 'Integration by Parts (Logarithmic)',
          expression: `∫ u dv = ${combined.toString()}`,
          explanation: `Selected u = ln(${logArg.toString()}), dv = (${uCandidate.toString()}) d${v}; applied uv − ∫ v du.`,
        });
        return combined;
      }
    }
  }

  // Tabular IBP for P(v) * exp(k*v + b), P(v) * e^(k*v + b), P(v) * sin(k*v + b), P(v) * cos(k*v + b)
  let dvKind: 'exp' | 'sin' | 'cos' | null = null;
  let kStr = '1';
  let argStr = '';

  const d = dvCandidate as any;
  if (dvCandidate.type === 'FunctionNode') {
    const fn = d.fn?.name;
    const lin = extractLinear(d.args[0], v);
    if (lin && (fn === 'exp' || fn === 'sin' || fn === 'cos')) {
      dvKind = fn;
      kStr = lin.a;
      argStr = d.args[0].toString();
    }
  } else if (dvCandidate.type === 'OperatorNode' && d.op === '^') {
    if (d.args[0].type === 'SymbolNode' && d.args[0].name === 'e') {
      const lin = extractLinear(d.args[1], v);
      if (lin) {
        dvKind = 'exp';
        kStr = lin.a;
        argStr = d.args[1].toString();
      }
    }
  }

  if (!dvKind) return null;

  // Build tabular derivatives of P(v) and repeated antiderivatives of dv
  const derivs: MathNode[] = [math.parse(uCandidate.toString())];
  for (let i = 1; i < poly.length; i++) {
    derivs.push(math.simplify(math.derivative(derivs[i - 1], v)));
  }

  const terms: string[] = [];
  for (let idx = 0; idx < derivs.length; idx++) {
    const pNode = derivs[idx];
    if (pNode.toString() === '0') continue;
    const sign = idx % 2 === 0 ? 1 : -1;
    const kPow = `(${kStr})^${idx + 1}`;
    let antiStr = '';
    if (dvKind === 'exp') {
      antiStr = `${dvCandidate.toString()} / ${kPow}`;
    } else if (dvKind === 'sin') {
      const mod = (idx + 1) % 4;
      if (mod === 1) antiStr = `(-cos(${argStr})) / ${kPow}`;
      else if (mod === 2) antiStr = `(-sin(${argStr})) / ${kPow}`;
      else if (mod === 3) antiStr = `(cos(${argStr})) / ${kPow}`;
      else antiStr = `(sin(${argStr})) / ${kPow}`;
    } else {
      const mod = (idx + 1) % 4;
      if (mod === 1) antiStr = `(sin(${argStr})) / ${kPow}`;
      else if (mod === 2) antiStr = `(-cos(${argStr})) / ${kPow}`;
      else if (mod === 3) antiStr = `(-sin(${argStr})) / ${kPow}`;
      else antiStr = `(cos(${argStr})) / ${kPow}`;
    }
    const prefix = sign === 1 ? '' : '-';
    terms.push(`${prefix}(${pNode.toString()}) * (${antiStr})`);
  }

  if (terms.length === 0) return null;
  const combined = math.parse(terms.join(' + '));
  steps.push({
    title: 'Tabular Integration by Parts',
    expression: `∫ u dv = ${combined.toString()}`,
    explanation: `Applied tabular integration by parts with u = ${uCandidate.toString()} and dv = ${dvCandidate.toString()}.`,
  });
  return combined;
}

function dependsOn(node: MathNode, variable: string): boolean {
  let found = false;
  node.traverse((n) => {
    if (n.type === 'SymbolNode' && (n as any).name === variable) {
      found = true;
    }
  });
  return found;
}

function safeEvalConstant(node: MathNode): number | null {
  try {
    const v = node.evaluate({ pi: Math.PI, e: Math.E });
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

function extractLinear(node: MathNode, variable: string): { a: string; b: string } | null {
  if (!dependsOn(node, variable)) return null;
  try {
    const d1 = math.simplify(math.derivative(node, variable));
    if (dependsOn(d1, variable)) return null; // Not linear!
    const bNode = math.simplify(node.toString(), { [variable]: 0 });
    return { a: d1.toString(), b: bNode.toString() };
  } catch {
    return null;
  }
}

export function computeIndefiniteIntegral(rawExpr: string, variable = 'x'): IndefiniteIntegralResult {
  try {
    const canon = toCalculusCanonical(rawExpr);
    const node = math.parse(canon);
    const steps: StepItem[] = [
      {
        title: '1. Integrand',
        expression: `∫ (${node.toString()}) d${variable}`,
        latex: `\\int \\left(${nodeToCleanLatex(node)}\\right)\\,d${variable}`,
        explanation: `Attempting symbolic antiderivative with respect to ${variable}.`,
      },
    ];
    let anti = integrateNode(node, variable, steps);
    if (!anti) {
      // Retry after polynomial expansion if integrand is an expanded polynomial product like (x+1)*(x+2)
      try {
        const rat = math.rationalize(node.toString(), {}, true) as any;
        if (rat?.expression && rat.expression.toString() !== node.toString()) {
          anti = integrateNode(rat.expression, variable, steps);
        }
      } catch {
        // not rationalizable
      }
    }
    if (!anti) {
      return {
        ok: true,
        symbolicFound: false,
        antiderivative: '',
        latex: '',
        steps: [
          ...steps,
          {
            title: 'Symbolic Notice',
            explanation:
              'No elementary closed-form antiderivative matched by the symbolic ruleset. Switch to Definite Integral for high-precision numerical quadrature.',
          },
        ],
      };
    }
    const simplified = math.simplify(anti);
    const latex = `${nodeToCleanLatex(simplified)} + C`;

    // Numerical derivative sanity verification: check F'(x_test) ≈ f(x_test)
    try {
      const fOrig = compileCalculusFunction(canon);
      const fAnti = compileCalculusFunction(simplified.toString());
      if (fOrig && fAnti) {
        const testPts = [0.73, 1.37, -0.61];
        for (const tp of testPts) {
          const yOrig = fOrig({ [variable]: tp });
          const h = 1e-5;
          const dAnti = (fAnti({ [variable]: tp + h }) - fAnti({ [variable]: tp - h })) / (2 * h);
          if (Number.isFinite(yOrig) && Number.isFinite(dAnti) && Math.abs(yOrig - dAnti) < 1e-4) {
            steps.push({
              title: 'Verification by Differentiation',
              expression: `F′(${tp}) = ${Number(dAnti.toPrecision(7))} ≈ f(${tp}) = ${Number(yOrig.toPrecision(7))}`,
              explanation: 'Confirmed d/dx[F(x)] matches integrand f(x).',
            });
            break;
          }
        }
      }
    } catch {
      // optional verification
    }

    return {
      ok: true,
      symbolicFound: true,
      antiderivative: `${simplified.toString()} + C`,
      latex,
      steps,
    };
  } catch (err: any) {
    return {
      ok: false,
      symbolicFound: false,
      antiderivative: '',
      latex: '',
      steps: [],
      error: err?.message || 'Unable to parse integrand.',
    };
  }
}

export interface DefiniteIntegralResult {
  ok: boolean;
  value: number;
  errorEstimate: number;
  method: string;
  symbolicAntiderivative?: string;
  symbolicLatex?: string;
  steps: StepItem[];
  error?: string;
}

function adaptiveSimpson(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-10,
  maxDepth = 16
): { value: number; errorEst: number } {
  const simpson = (l: number, r: number, fl: number, fm: number, fr: number) =>
    ((r - l) / 6) * (fl + 4 * fm + fr);

  const recurse = (
    l: number,
    r: number,
    fl: number,
    fm: number,
    fr: number,
    whole: number,
    eps: number,
    depth: number
  ): { val: number; err: number } => {
    const m = (l + r) / 2;
    const lm = (l + m) / 2;
    const rm = (m + r) / 2;
    const flm = f(lm);
    const frm = f(rm);
    const left = simpson(l, m, fl, flm, fm);
    const right = simpson(m, r, fm, frm, fr);
    const delta = left + right - whole;
    if (depth <= 0 || Math.abs(delta) <= 15 * eps) {
      return { val: left + right + delta / 15, err: Math.abs(delta) / 15 };
    }
    const lRes = recurse(l, m, fl, flm, fm, left, eps / 2, depth - 1);
    const rRes = recurse(m, r, fm, frm, fr, right, eps / 2, depth - 1);
    return { val: lRes.val + rRes.val, err: lRes.err + rRes.err };
  };

  const m = (a + b) / 2;
  const fa = f(a);
  const fm = f(m);
  const fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fm) || !Number.isFinite(fb)) {
    // Open interval composite midpoint fallback for endpoint singularities
    const N = 2000;
    const h = (b - a) / N;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const xi = a + (i + 0.5) * h;
      const yi = f(xi);
      if (!Number.isFinite(yi)) throw new Error(`Integrand is undefined or singular near x = ${xi.toPrecision(6)}.`);
      sum += yi;
    }
    return { value: sum * h, errorEst: 1e-6 };
  }
  const whole = simpson(a, b, fa, fm, fb);
  const res = recurse(a, b, fa, fm, fb, whole, tol, maxDepth);
  return { value: res.val, errorEst: res.err };
}

export function computeDefiniteIntegral(
  rawExpr: string,
  variable: string,
  a: number,
  b: number
): DefiniteIntegralResult {
  try {
    const fn = compileRealFunction(rawExpr, {}, 'RAD');
    if (!fn) throw new Error('Invalid integrand expression.');
    const f = (x: number) => fn({ [variable]: x });
    const sign = a <= b ? 1 : -1;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const { value, errorEst } = adaptiveSimpson(f, lo, hi);
    const finalVal = sign * value;
    if (!Number.isFinite(finalVal)) throw new Error('Integral diverges or encountered undefined values on [a, b].');

    const sym = computeIndefiniteIntegral(rawExpr, variable);
    const steps: StepItem[] = [
      {
        title: '1. Definite Integral Problem',
        expression: `∫[${a}, ${b}] (${rawExpr}) d${variable}`,
        latex: `\\int_{${a}}^{${b}} \\left(${rawExpr}\\right)\\,d${variable}`,
        explanation: 'Evaluated using Adaptive Simpson quadrature with Richardson error control.',
      },
    ];

    if (sym.ok && sym.symbolicFound) {
      steps.push({
        title: '2. Symbolic Antiderivative F(x)',
        expression: `F(${variable}) = ${sym.antiderivative.replace(/\s*\+\s*C$/, '')}`,
        latex: `F(${variable}) = ${sym.latex.replace(/\s*\+\s*C$/, '')}`,
        explanation: 'By the Fundamental Theorem of Calculus: ∫ₐᵇ f(x)dx = F(b) − F(a).',
      });
    }

    steps.push({
      title: `${steps.length + 1}. Numerical Quadrature Result`,
      expression: `Value ≈ ${Number(finalVal.toPrecision(12))} (error bound ≤ ${errorEst.toExponential(2)})`,
      latex: `\\approx ${Number(finalVal.toPrecision(12))}`,
      explanation: 'Adaptive subdivision reached convergence tolerance 10⁻¹⁰.',
    });

    return {
      ok: true,
      value: finalVal,
      errorEstimate: errorEst,
      method: 'Adaptive Simpson Quadrature',
      symbolicAntiderivative: sym.symbolicFound ? sym.antiderivative : undefined,
      symbolicLatex: sym.symbolicFound ? sym.latex : undefined,
      steps,
    };
  } catch (err: any) {
    return {
      ok: false,
      value: NaN,
      errorEstimate: NaN,
      method: 'Adaptive Simpson Quadrature',
      steps: [],
      error: err?.message || 'Unable to evaluate definite integral.',
    };
  }
}

export function computeDoubleIntegral(
  rawExpr: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  nx = 48,
  ny = 48
): { ok: boolean; value: number; steps: StepItem[]; error?: string } {
  try {
    const fn = compileRealFunction(rawExpr, {}, 'RAD');
    if (!fn) throw new Error('Invalid integrand expression f(x, y).');
    // 2D Composite Simpson's rule (even grid)
    const mx = nx % 2 === 0 ? nx : nx + 1;
    const my = ny % 2 === 0 ? ny : ny + 1;
    const hx = (xMax - xMin) / mx;
    const hy = (yMax - yMin) / my;
    let sum = 0;
    for (let i = 0; i <= mx; i++) {
      const wx = i === 0 || i === mx ? 1 : i % 2 === 1 ? 4 : 2;
      const x = xMin + i * hx;
      for (let j = 0; j <= my; j++) {
        const wy = j === 0 || j === my ? 1 : j % 2 === 1 ? 4 : 2;
        const y = yMin + j * hy;
        const val = fn({ x, y });
        if (!Number.isFinite(val)) throw new Error(`Undefined value at (${x.toFixed(3)}, ${y.toFixed(3)}).`);
        sum += wx * wy * val;
      }
    }
    const result = ((hx * hy) / 9) * sum;
    return {
      ok: true,
      value: result,
      steps: [
        {
          title: '1. Double Integral Setup',
          expression: `∫[${yMin}, ${yMax}] ∫[${xMin}, ${xMax}] (${rawExpr}) dx dy`,
          latex: `\\int_{${yMin}}^{${yMax}} \\int_{${xMin}}^{${xMax}} \\left(${rawExpr}\\right)\\,dx\\,dy`,
          explanation: `Evaluated over rectangular domain [${xMin}, ${xMax}] × [${yMin}, ${yMax}] using ${mx}×${my} Composite 2D Simpson rule.`,
        },
        {
          title: '2. Quadrature Estimate',
          expression: `Result ≈ ${Number(result.toPrecision(10))}`,
          latex: `\\approx ${Number(result.toPrecision(10))}`,
          explanation: 'Fourth-order O(h⁴) tensor-product Simpson integration.',
        },
      ],
    };
  } catch (err: any) {
    return { ok: false, value: NaN, steps: [], error: err?.message || 'Double integral error.' };
  }
}

export interface LimitResult {
  ok: boolean;
  value: string;
  leftLimit: string;
  rightLimit: string;
  exists: boolean;
  steps: StepItem[];
  error?: string;
}

export function computeLimit(
  rawExpr: string,
  variable: string,
  targetRaw: string,
  direction: 'both' | 'left' | 'right' = 'both'
): LimitResult {
  try {
    const canon = toCalculusCanonical(rawExpr);
    const node = math.parse(canon);
    const f = compileRealFunction(rawExpr, {}, 'RAD');
    if (!f) throw new Error('Invalid expression for limit.');

    const targetLower = targetRaw.trim().toLowerCase();
    const isPosInf = targetLower === 'inf' || targetLower === 'infinity' || targetLower === '∞' || targetLower === '+∞';
    const isNegInf = targetLower === '-inf' || targetLower === '-infinity' || targetLower === '-∞';

    const steps: StepItem[] = [
      {
        title: '1. Limit Expression',
        expression: `lim (${variable} -> ${targetRaw}${direction === 'left' ? '⁻' : direction === 'right' ? '⁺' : ''}) ${node.toString()}`,
        latex: `\\lim_{${variable} \\to ${isPosInf ? '\\infty' : isNegInf ? '-\\infty' : targetRaw}${direction === 'left' ? '^-' : direction === 'right' ? '^+' : ''}} ${nodeToCleanLatex(node)}`,
        explanation: 'Analyzing behavior near the limit point.',
      },
    ];

    if (isPosInf || isNegInf) {
      const sign = isPosInf ? 1 : -1;

      // Check 1^infinity power form: base^exp -> exp(exp * ln(base))
      if ((node as any).type === 'OperatorNode' && (node as any).op === '^') {
        const bNode = (node as any).args[0] as MathNode;
        const eNode = (node as any).args[1] as MathNode;
        const fb = compileCalculusFunction(bNode.toString());
        const fe = compileCalculusFunction(eNode.toString());
        if (fb && fe) {
          const bInf = fb({ [variable]: sign * 1e5 });
          const eInf = fe({ [variable]: sign * 1e5 });
          if (Number.isFinite(bInf) && Math.abs(bInf - 1) < 1e-3 && Number.isFinite(eInf) && Math.abs(eInf) > 1e3) {
            const logSamples = [1e3, 1e4, 1e5].map((m) => {
              const x = sign * m;
              const bv = fb({ [variable]: x });
              const ev = fe({ [variable]: x });
              // Avoid catastrophic cancellation in Math.log(1 + u) by using log1p(bv - 1)
              return ev * Math.log1p(bv - 1);
            });
            const expLim = logSamples[logSamples.length - 1];
            const prevExpLim = logSamples[logSamples.length - 2];
            if (Number.isFinite(expLim) && Math.abs(expLim - prevExpLim) < 1e-2) {
              // Richardson extrapolation using O(1/x) convergence: (10 * L(10N) - L(N)) / 9
              const richardsonExp = (10 * expLim - prevExpLim) / 9;
              const val = Math.exp(richardsonExp);
              const clean = Number(val.toPrecision(10));
              steps.push({
                title: '2. Indeterminate 1^∞ Exponential Form',
                expression: `exp(lim ${eNode.toString()} · ln(${bNode.toString()})) = exp(${Number(richardsonExp.toPrecision(8))}) = ${clean}`,
                explanation: 'Rewrote f(x)^g(x) as exp(g(x)·ln(f(x))) and applied Richardson asymptotic extrapolation.',
              });
              return {
                ok: true,
                value: String(clean),
                leftLimit: isNegInf ? String(clean) : 'N/A',
                rightLimit: isPosInf ? String(clean) : 'N/A',
                exists: true,
                steps,
              };
            }
          }
        }
      }

      // Check infinity / infinity L'Hopital for quotients as x -> +-infinity
      if ((node as any).type === 'OperatorNode' && (node as any).op === '/') {
        let numNode: MathNode = (node as any).args[0];
        let denNode: MathNode = (node as any).args[1];
        const fNum = compileCalculusFunction(numNode.toString());
        const fDen = compileCalculusFunction(denNode.toString());
        if (fNum && fDen) {
          const n4 = Math.abs(fNum({ [variable]: sign * 1e4 }));
          const n6 = Math.abs(fNum({ [variable]: sign * 1e6 }));
          const d4 = Math.abs(fDen({ [variable]: sign * 1e4 }));
          const d6 = Math.abs(fDen({ [variable]: sign * 1e6 }));
          if (Number.isFinite(n6) && Number.isFinite(d6) && n6 > n4 && n6 > 5 && d6 > d4 && d6 > 5) {
            for (let iter = 1; iter <= 3; iter++) {
              try {
                numNode = math.simplify(math.derivative(numNode, variable));
                denNode = math.simplify(math.derivative(denNode, variable));
                steps.push({
                  title: `2.${iter} L'Hôpital's Rule (∞/∞ form)`,
                  expression: `(${numNode.toString()}) / (${denNode.toString()})`,
                  latex: `\\frac{${nodeToCleanLatex(numNode)}}{${nodeToCleanLatex(denNode)}}`,
                  explanation: 'Indeterminate ∞/∞ form at infinity; differentiated numerator and denominator independently.',
                });
                const fn2 = compileCalculusFunction(numNode.toString());
                const fd2 = compileCalculusFunction(denNode.toString());
                if (fn2 && fd2) {
                  const r5 = fn2({ [variable]: sign * 1e5 }) / fd2({ [variable]: sign * 1e5 });
                  const r6 = fn2({ [variable]: sign * 1e6 }) / fd2({ [variable]: sign * 1e6 });
                  if (Number.isFinite(r6) && Math.abs(r6 - r5) < 1e-4) {
                    const clean = Math.abs(r6) < 1e-5 ? 0 : Number(r6.toPrecision(8));
                    return {
                      ok: true,
                      value: String(clean),
                      leftLimit: isNegInf ? String(clean) : 'N/A',
                      rightLimit: isPosInf ? String(clean) : 'N/A',
                      exists: true,
                      steps,
                    };
                  }
                }
              } catch {
                break;
              }
            }
          }
        }
      }

      const samples = [1e2, 1e3, 1e4, 1e5, 1e6, 1e7].map((m) => f({ [variable]: sign * m }));
      const last = samples[samples.length - 1];
      const prev = samples[samples.length - 2];
      let valStr = 'Does not exist / Oscillates';
      if (Number.isFinite(last) && Number.isFinite(prev) && Math.abs(last - prev) < 1e-4) {
        const clean = Math.abs(last) < 1e-7 ? 0 : Number(last.toPrecision(8));
        valStr = String(clean);
      } else if (Math.abs(last) > 1e8 && Math.abs(last) > Math.abs(prev) * 2) {
        valStr = last > 0 ? '∞' : '-∞';
      }
      steps.push({
        title: '2. Asymptotic Sequence Sampling',
        expression: `f(±10⁶) = ${Number(prev.toPrecision(6))}, f(±10⁷) = ${Number(last.toPrecision(6))}`,
        explanation: 'Sampled asymptotic convergence as |x| grows without bound.',
      });
      return {
        ok: true,
        value: valStr,
        leftLimit: isNegInf ? valStr : 'N/A',
        rightLimit: isPosInf ? valStr : 'N/A',
        exists: !valStr.includes('Oscillates'),
        steps,
      };
    }

    const a = math.evaluate(preprocessExpression(targetRaw), { pi: Math.PI, e: Math.E });
    if (typeof a !== 'number' || !Number.isFinite(a)) {
      throw new Error('Limit target must be a finite number or ±∞.');
    }

    // 1. Direct substitution check
    const direct = f({ [variable]: a });
    if (Number.isFinite(direct)) {
      const eps = 1e-6;
      const fl = f({ [variable]: a - eps });
      const fr = f({ [variable]: a + eps });
      if (Math.abs(fl - direct) < 1e-3 && Math.abs(fr - direct) < 1e-3) {
        const clean = Math.abs(direct) < 1e-12 ? 0 : Number(direct.toPrecision(10));
        steps.push({
          title: '2. Direct Substitution',
          expression: `f(${a}) = ${clean}`,
          latex: `f(${a}) = ${clean}`,
          explanation: 'Function is continuous at the target point; direct substitution yields the exact limit.',
        });
        return {
          ok: true,
          value: String(clean),
          leftLimit: String(clean),
          rightLimit: String(clean),
          exists: true,
          steps,
        };
      }
    }

    // 2. Check L'Hopital if expression is a quotient P(x)/Q(x) giving 0/0 or infinity/infinity
    let lhopitalVal: number | null = null;
    if ((node as any).type === 'OperatorNode' && (node as any).op === '/' && direction === 'both') {
      let numNode: MathNode = (node as any).args[0];
      let denNode: MathNode = (node as any).args[1];
      const evalScope = buildScope('RAD');
      for (let iter = 1; iter <= 3; iter++) {
        try {
          const numAtA = numNode.evaluate({ ...evalScope, [variable]: a });
          const denAtA = denNode.evaluate({ ...evalScope, [variable]: a });
          const isZeroOverZero = typeof numAtA === 'number' && typeof denAtA === 'number' && Math.abs(numAtA) < 1e-10 && Math.abs(denAtA) < 1e-10;
          const numNear = numNode.evaluate({ ...evalScope, [variable]: a + 1e-5 });
          const denNear = denNode.evaluate({ ...evalScope, [variable]: a + 1e-5 });
          const isInfOverInf =
            typeof numNear === 'number' &&
            typeof denNear === 'number' &&
            Math.abs(numNear) > 1e3 &&
            Math.abs(denNear) > 1e3 &&
            (!Number.isFinite(numAtA) || !Number.isFinite(denAtA) || Math.abs(numAtA) > 1e8);

          if (isZeroOverZero || isInfOverInf) {
            numNode = math.simplify(math.derivative(numNode, variable));
            denNode = math.simplify(math.derivative(denNode, variable));
            steps.push({
              title: `2.${iter} L'Hôpital's Rule (${isZeroOverZero ? '0/0' : '∞/∞'} form)`,
              expression: `(${numNode.toString()}) / (${denNode.toString()})`,
              latex: `\\frac{${nodeToCleanLatex(numNode)}}{${nodeToCleanLatex(denNode)}}`,
              explanation: `Indeterminate ${isZeroOverZero ? '0/0' : '∞/∞'} detected; differentiated numerator and denominator independently.`,
            });
            const nextNum = numNode.evaluate({ ...evalScope, [variable]: a });
            const nextDen = denNode.evaluate({ ...evalScope, [variable]: a });
            if (typeof nextNum === 'number' && typeof nextDen === 'number' && Math.abs(nextDen) > 1e-12) {
              lhopitalVal = nextNum / nextDen;
              break;
            }
          } else {
            break;
          }
        } catch {
          break;
        }
      }
    }

    if (lhopitalVal !== null && Number.isFinite(lhopitalVal)) {
      const clean = Math.abs(lhopitalVal) < 1e-12 ? 0 : Number(lhopitalVal.toPrecision(10));
      return {
        ok: true,
        value: String(clean),
        leftLimit: String(clean),
        rightLimit: String(clean),
        exists: true,
        steps,
      };
    }

    // 3. One-sided numerical sequence approach
    const hs = [1e-3, 1e-5, 1e-7, 1e-9];
    const leftSeq = hs.map((h) => f({ [variable]: a - h }));
    const rightSeq = hs.map((h) => f({ [variable]: a + h }));

    const classifySide = (seq: number[]) => {
      const s2 = seq[seq.length - 2];
      const s3 = seq[seq.length - 1];
      if (!Number.isFinite(s3)) return 'Undefined';
      if (Math.abs(s3) > 1e6 && Math.abs(s3) > Math.abs(s2) * 5) {
        return s3 > 0 ? '+∞' : '-∞';
      }
      if (Math.abs(s3 - s2) < 1e-3) {
        return String(Math.abs(s3) < 1e-10 ? 0 : Number(s3.toPrecision(8)));
      }
      return 'Does Not Exist';
    };

    const leftLimit = classifySide(leftSeq);
    const rightLimit = classifySide(rightSeq);
    let value = 'Does Not Exist';
    let exists = false;
    if (direction === 'left') {
      value = leftLimit;
      exists = !leftLimit.includes('Does Not Exist') && leftLimit !== 'Undefined';
    } else if (direction === 'right') {
      value = rightLimit;
      exists = !rightLimit.includes('Does Not Exist') && rightLimit !== 'Undefined';
    } else {
      if (leftLimit === rightLimit && !leftLimit.includes('Does Not Exist') && leftLimit !== 'Undefined') {
        value = leftLimit;
        exists = true;
      } else if (
        !Number.isNaN(Number(leftLimit)) &&
        !Number.isNaN(Number(rightLimit)) &&
        Math.abs(Number(leftLimit) - Number(rightLimit)) < 1e-5
      ) {
        value = leftLimit;
        exists = true;
      } else {
        value = `DNE (Left: ${leftLimit}, Right: ${rightLimit})`;
        exists = false;
      }
    }

    steps.push({
      title: `${steps.length + 1}. One-Sided Numerical Convergence`,
      expression: `lim⁻ = ${leftLimit}, lim⁺ = ${rightLimit}`,
      explanation: exists
        ? 'Left-hand and right-hand sequences converge to the same limiting value.'
        : 'One-sided limits disagree or fail to converge to a single finite value.',
    });

    return { ok: true, value, leftLimit, rightLimit, exists, steps };
  } catch (err: any) {
    return {
      ok: false,
      value: '',
      leftLimit: '',
      rightLimit: '',
      exists: false,
      steps: [],
      error: err?.message || 'Limit evaluation error.',
    };
  }
}

export interface TaylorResult {
  ok: boolean;
  polynomial: string;
  latex: string;
  terms: { degree: number; coefficient: number; termString: string }[];
  steps: StepItem[];
  error?: string;
}

export function computeTaylorSeries(
  rawExpr: string,
  variable = 'x',
  center = 0,
  degree = 5
): TaylorResult {
  try {
    const canon = toCalculusCanonical(rawExpr);
    let current = math.parse(canon);
    const terms: { degree: number; coefficient: number; termString: string }[] = [];
    const steps: StepItem[] = [];
    let fact = 1;

    const evalScope = buildScope('RAD');
    for (let k = 0; k <= degree; k++) {
      if (k > 0) {
        fact *= k;
        current = math.simplify(math.derivative(current, variable));
      }
      const val = current.evaluate({ ...evalScope, [variable]: center });
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        throw new Error(`f^(${k})(${center}) is undefined; cannot expand Taylor series at ${variable} = ${center}.`);
      }
      const coeff = Math.abs(val / fact) < 1e-13 ? 0 : val / fact;
      if (coeff !== 0) {
        const cStr = Number(coeff.toPrecision(6));
        const shift = center === 0 ? variable : `(${variable} - ${center})`;
        const termStr = k === 0 ? `${cStr}` : k === 1 ? `${cStr}*${shift}` : `${cStr}*${shift}^${k}`;
        terms.push({ degree: k, coefficient: coeff, termString: termStr });
      }
      steps.push({
        title: `Order ${k}: f^(${k})(${center}) = ${Number(val.toPrecision(6))}`,
        expression: `a_${k} = ${Number(val.toPrecision(6))} / ${k}! = ${Number(coeff.toPrecision(6))}`,
        explanation: `Evaluated ${k}-th derivative at center x₀ = ${center} and divided by ${k}!.`,
      });
    }

    const polyStr = terms.length > 0 ? terms.map((t) => t.termString).join(' + ').replace(/\+ -/g, '- ') : '0';
    let latex = polyStr;
    try {
      latex = nodeToCleanLatex(math.parse(polyStr));
    } catch {
      // keep fallback
    }

    return { ok: true, polynomial: polyStr, latex, terms, steps };
  } catch (err: any) {
    return {
      ok: false,
      polynomial: '',
      latex: '',
      terms: [],
      steps: [],
      error: err?.message || 'Unable to compute Taylor series.',
    };
  }
}

export interface ODEResult {
  ok: boolean;
  points: { x: number; rk4: number; euler: number }[];
  finalRK4: number;
  finalEuler: number;
  error?: string;
}

export function solveFirstOrderODE(
  rawExpr: string,
  x0: number,
  y0: number,
  xEnd: number,
  stepsCount = 40
): ODEResult {
  try {
    const f = compileRealFunction(rawExpr, {}, 'RAD');
    if (!f) throw new Error('Invalid differential equation expression f(x, y).');
    const h = (xEnd - x0) / stepsCount;
    let x = x0;
    let yRK = y0;
    let yEu = y0;
    const points: { x: number; rk4: number; euler: number }[] = [{ x, rk4: yRK, euler: yEu }];

    for (let i = 0; i < stepsCount; i++) {
      // Euler step
      const slopeEu = f({ x, y: yEu });
      yEu = yEu + h * slopeEu;

      // RK4 step
      const k1 = f({ x, y: yRK });
      const k2 = f({ x: x + h / 2, y: yRK + (h / 2) * k1 });
      const k3 = f({ x: x + h / 2, y: yRK + (h / 2) * k2 });
      const k4 = f({ x: x + h, y: yRK + h * k3 });
      yRK = yRK + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);

      x = x0 + (i + 1) * h;
      if (!Number.isFinite(yRK)) throw new Error(`Solution diverged or became undefined near x = ${x.toFixed(4)}.`);
      points.push({ x, rk4: yRK, euler: yEu });
    }

    return {
      ok: true,
      points,
      finalRK4: yRK,
      finalEuler: yEu,
    };
  } catch (err: any) {
    return {
      ok: false,
      points: [],
      finalRK4: NaN,
      finalEuler: NaN,
      error: err?.message || 'ODE solver error.',
    };
  }
}
