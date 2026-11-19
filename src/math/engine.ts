import { all, create, MathNode } from 'mathjs';
import { AngleMode, EvaluationResult, NumberFormat, StepItem } from '../types/calculator';
import { EULER_MASCHERONI, GOLDEN_RATIO } from './constants';

export const math = create(all, {
  number: 'number',
  precision: 64,
});

function doubleFactorial(n: number): number {
  if (!Number.isInteger(n) || n < -1) {
    throw new Error('Double factorial (n!!) requires an integer ≥ -1.');
  }
  if (n <= 0) return 1;
  let res = 1;
  for (let k = n; k >= 2; k -= 2) {
    res *= k;
  }
  return res;
}

function gcdMulti(...args: number[]): number {
  if (args.length === 0) throw new Error('gcd requires at least 1 argument.');
  const ints = args.map((v) => {
    if (!Number.isInteger(v)) throw new Error('gcd requires integer arguments.');
    return Math.abs(v);
  });
  return ints.reduce((acc, val) => math.gcd(acc, val));
}

function lcmMulti(...args: number[]): number {
  if (args.length === 0) throw new Error('lcm requires at least 1 argument.');
  const ints = args.map((v) => {
    if (!Number.isInteger(v)) throw new Error('lcm requires integer arguments.');
    return Math.abs(v);
  });
  return ints.reduce((acc, val) => math.lcm(acc, val));
}

function toRadians(val: number | any, mode: AngleMode): any {
  if (mode === 'RAD') return val;
  const factor = mode === 'DEG' ? Math.PI / 180 : Math.PI / 200;
  return math.multiply(val, factor);
}

function fromRadians(val: number | any, mode: AngleMode): any {
  if (mode === 'RAD') return val;
  const factor = mode === 'DEG' ? 180 / Math.PI : 200 / Math.PI;
  return math.multiply(val, factor);
}

export function buildScope(
  angleMode: AngleMode,
  variables: Record<string, number | string> = {},
  extraScope: Record<string, any> = {}
): Record<string, any> {
  const scope: Record<string, any> = {
    pi: Math.PI,
    π: Math.PI,
    e: Math.E,
    phi: GOLDEN_RATIO,
    φ: GOLDEN_RATIO,
    eulergamma: EULER_MASCHERONI,
    gamma_c: EULER_MASCHERONI,
    γ: EULER_MASCHERONI,
    i: math.complex(0, 1),
    Infinity: Infinity,
    inf: Infinity,
    ln: (x: any) => {
      if (typeof x === 'number' && x <= 0) {
        if (x === 0) throw new Error('Domain error: ln(0) is undefined (-∞).');
        return math.log(math.complex(x, 0));
      }
      return math.log(x);
    },
    log10: (x: any) => {
      if (typeof x === 'number' && x <= 0) {
        if (x === 0) throw new Error('Domain error: log₁₀(0) is undefined (-∞).');
        return math.divide(math.log(math.complex(x, 0)), Math.LN10);
      }
      return math.log10(x);
    },
    log2: (x: any) => {
      if (typeof x === 'number' && x <= 0) {
        if (x === 0) throw new Error('Domain error: log₂(0) is undefined (-∞).');
        return math.divide(math.log(math.complex(x, 0)), Math.LN2);
      }
      return math.log2(x);
    },
    doubleFactorial,
    nCr: (n: number, r: number) => math.combinations(n, r),
    nPr: (n: number, r: number) => math.permutations(n, r),
    C: (n: number, r: number) => math.combinations(n, r),
    P: (n: number, r: number) => math.permutations(n, r),
    gcd: gcdMulti,
    lcm: lcmMulti,
    // Angle-mode-aware trig functions
    sin: (x: any) => math.sin(toRadians(x, angleMode)),
    cos: (x: any) => math.cos(toRadians(x, angleMode)),
    tan: (x: any) => {
      if (typeof x === 'number') {
        const rad = toRadians(x, angleMode) as number;
        const cosVal = Math.cos(rad);
        if (Math.abs(cosVal) < 1e-15) {
          throw new Error(`Domain error: tan(${x}) is undefined (asymptote where cos = 0).`);
        }
      }
      return math.tan(toRadians(x, angleMode));
    },
    csc: (x: any) => math.csc(toRadians(x, angleMode)),
    sec: (x: any) => math.sec(toRadians(x, angleMode)),
    cot: (x: any) => math.cot(toRadians(x, angleMode)),
    asin: (x: any) => fromRadians(math.asin(x), angleMode),
    acos: (x: any) => fromRadians(math.acos(x), angleMode),
    atan: (x: any) => fromRadians(math.atan(x), angleMode),
    atan2: (y: any, x: any) => fromRadians(math.atan2(y, x), angleMode),
    acsc: (x: any) => fromRadians(math.acsc(x), angleMode),
    asec: (x: any) => fromRadians(math.asec(x), angleMode),
    acot: (x: any) => fromRadians(math.acot(x), angleMode),
    arcsin: (x: any) => fromRadians(math.asin(x), angleMode),
    arccos: (x: any) => fromRadians(math.acos(x), angleMode),
    arctan: (x: any) => fromRadians(math.atan(x), angleMode),
    arsinh: (x: any) => math.asinh(x),
    arcosh: (x: any) => math.acosh(x),
    artanh: (x: any) => math.atanh(x),
    arcsinh: (x: any) => math.asinh(x),
    arccosh: (x: any) => math.acosh(x),
    arctanh: (x: any) => math.atanh(x),
    sum: (...args: any[]) => {
      if (args.length === 4 && typeof args[0] === 'string' && typeof args[1] === 'string') {
        const [exprStr, varName, start, end] = args;
        const compiled = math.compile(preprocessExpression(exprStr));
        let total = 0;
        for (let k = Math.trunc(start); k <= Math.trunc(end); k++) {
          total += Number(compiled.evaluate({ ...scope, [varName]: k }));
        }
        return total;
      }
      return math.sum(...(args as [any]));
    },
    prod: (...args: any[]) => {
      if (args.length === 4 && typeof args[0] === 'string' && typeof args[1] === 'string') {
        const [exprStr, varName, start, end] = args;
        const compiled = math.compile(preprocessExpression(exprStr));
        let total = 1;
        for (let k = Math.trunc(start); k <= Math.trunc(end); k++) {
          total *= Number(compiled.evaluate({ ...scope, [varName]: k }));
        }
        return total;
      }
      return math.prod(...(args as [any]));
    },
  };

  // Inject user variables safely
  for (const [key, rawVal] of Object.entries(variables)) {
    if (typeof rawVal === 'number') {
      scope[key] = rawVal;
    } else if (typeof rawVal === 'string' && rawVal.trim() !== '') {
      try {
        const parsed = math.evaluate(preprocessExpression(rawVal), { ...scope });
        scope[key] = parsed;
      } catch {
        // Ignore unresolvable variable expressions
      }
    }
  }

  return { ...scope, ...extraScope };
}

/**
 * Normalizes mathematical shorthand, Unicode operators, subscripts/superscripts,
 * mixed numbers, percentages, and absolute value pipes into safe mathjs syntax.
 */
export function preprocessExpression(raw: string): string {
  let expr = raw.trim();
  if (!expr) return '';

  // Unicode operators & symbols
  expr = expr
    .replace(/×/g, '*')
    .replace(/·/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/–/g, '-')
    .replace(/π/g, 'pi')
    .replace(/φ/g, 'phi')
    .replace(/∞/g, 'Infinity')
    .replace(/γ/g, 'gamma_c')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/⁵/g, '^5')
    .replace(/⁻¹/g, '^(-1)')
    .replace(/ˣ/g, '^x')
    .replace(/ⁿ/g, '^n')
    .replace(/√\(/g, 'sqrt(')
    .replace(/√([a-zA-Z0-9_.]+)/g, 'sqrt($1)')
    .replace(/∛\(/g, 'cbrt(')
    .replace(/∛([a-zA-Z0-9_.]+)/g, 'cbrt($1)');

  // Fix implicit multiplication with `e` not followed by exponent digits/sign (`2e` -> `2*e`, keep `1e-5` / `1e5`)
  expr = expr.replace(/(\d)e(?![+\-\d])/g, '$1*e');
  expr = expr.replace(/(\d)(pi|phi|gamma_c)\b/g, '$1*$2');

  // Subscript log2, log10, log_a
  expr = expr.replace(/log₂\(/g, 'log2(');
  expr = expr.replace(/log₁₀\(/g, 'log10(');
  expr = expr.replace(/log_([0-9]+(?:\.[0-9]+)?)\(([^)]+)\)/g, 'log($2, $1)');

  // Convert bare `log(` (single-arg base 10) vs `log(x, b)` (2-arg arbitrary base)
  // We handle log(x) -> log10(x) only when single argument, keeping log(x, b) intact!
  expr = transformSingleArgLog(expr);

  // Mixed numbers like `2 3/4` -> `(2 + 3/4)` (integer space integer slash integer)
  expr = expr.replace(/(^|[^a-zA-Z0-9_.])(\d+)\s+(\d+)\/(\d+)(?![a-zA-Z0-9_.])/g, '$1($2 + $3/$4)');

  // Double factorial: n!! -> doubleFactorial(n)
  expr = expr.replace(/(\([^()]+\)|[a-zA-Z0-9_.]+)!!/g, 'doubleFactorial($1)');

  // Modulo vs Percentage:
  // If `%` is followed by a number, identifier, or `(`, treat as modulo `mod` (`17 % 5` -> `17 mod 5`)
  // Otherwise (trailing `%` like `25%` or `(10+15)%`), treat as `/100`.
  expr = expr.replace(/(\S)\s*%\s*(?=[a-zA-Z0-9_(])/g, '$1 mod ');
  expr = expr.replace(/(\([^()]+\)|\d+(?:\.\d+)?)\s*%/g, '($1 / 100)');

  // Absolute value pipes |...| -> abs(...)
  expr = replaceAbsPipes(expr);

  return expr;
}

function transformSingleArgLog(expr: string): string {
  // Replace `log(` with `log10(` ONLY if top-level inside those parens has no comma
  let out = '';
  let i = 0;
  while (i < expr.length) {
    if (
      expr.slice(i, i + 4) === 'log(' &&
      (i === 0 || !/[a-zA-Z0-9_]/.test(expr[i - 1]))
    ) {
      let depth = 1;
      let j = i + 4;
      let hasComma = false;
      while (j < expr.length && depth > 0) {
        if (expr[j] === '(') depth++;
        else if (expr[j] === ')') depth--;
        else if (expr[j] === ',' && depth === 1) hasComma = true;
        j++;
      }
      out += hasComma ? 'log(' : 'log10(';
      i += 4;
    } else {
      out += expr[i];
      i++;
    }
  }
  return out;
}

function replaceAbsPipes(expr: string): string {
  if (!expr.includes('|')) return expr;
  let result = '';
  let open = false;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '|') {
      if (!open) {
        result += 'abs(';
        open = true;
      } else {
        result += ')';
        open = false;
      }
    } else {
      result += ch;
    }
  }
  if (open) result += ')';
  return result;
}

export function expressionToLatex(rawExpr: string): string {
  try {
    const norm = preprocessExpression(rawExpr);
    if (!norm) return '';
    const node = math.parse(norm);
    return nodeToCleanLatex(node);
  } catch {
    return rawExpr;
  }
}

export function nodeToCleanLatex(node: MathNode): string {
  let tex = node.toTex({ parenthesis: 'keep' });
  tex = tex
    .replace(/\\mathrm\{log10\}/g, '\\log_{10}')
    .replace(/\\mathrm\{log2\}/g, '\\log_{2}')
    .replace(/\\mathrm\{ln\}/g, '\\ln')
    .replace(/\\mathrm\{gamma\\_c\}/g, '\\gamma')
    .replace(/\\mathrm\{phi\}/g, '\\varphi')
    .replace(/\\mathrm\{doubleFactorial\}\\left\(([^)]+)\\right\)/g, '$1!!');
  return tex;
}

function snapNearZero(val: number): { value: number; snapped: boolean } {
  if (Math.abs(val) > 0 && Math.abs(val) < 1e-14) {
    return { value: 0, snapped: true };
  }
  const rounded = Math.round(val);
  if (Math.abs(val - rounded) > 0 && Math.abs(val - rounded) < 1e-13 && Math.abs(rounded) > 0) {
    return { value: rounded, snapped: true };
  }
  return { value: val, snapped: false };
}

export function detectExactForm(val: number): { text: string; latex: string } | null {
  if (!Number.isFinite(val)) return null;
  const { value } = snapNearZero(val);
  if (value === 0) return { text: '0', latex: '0' };

  // Integer
  if (Number.isInteger(value) && Math.abs(value) < 1e15) {
    return { text: String(value), latex: String(value) };
  }

  // Simple rational fraction check
  try {
    const frac = math.fraction(value);
    const fn = Number(frac.n);
    const fd = Number(frac.d);
    const fs = Number(frac.s);
    if (fd <= 10000 && Math.abs(value - fs * (fn / fd)) < 1e-13) {
      const sign = fs < 0 ? '-' : '';
      return {
        text: `${sign}${fn}/${fd}`,
        latex: `${sign}\\frac{${fn}}{${fd}}`,
      };
    }
  } catch {
    // ignore
  }

  // Multiple of pi check
  const piRatio = value / Math.PI;
  try {
    const fracPi = math.fraction(piRatio);
    const fn = Number(fracPi.n);
    const fd = Number(fracPi.d);
    const fs = Number(fracPi.s);
    if (fd <= 24 && Math.abs(piRatio - fs * (fn / fd)) < 1e-12) {
      const sign = fs < 0 ? '-' : '';
      const numStr = fn === 1 ? '' : String(fn);
      if (fd === 1) {
        return { text: `${sign}${numStr}π`, latex: `${sign}${numStr}\\pi` };
      }
      return {
        text: `${sign}${numStr}π/${fd}`,
        latex: `${sign}\\frac{${numStr}\\pi}{${fd}}`,
      };
    }
  } catch {
    // ignore
  }

  // Quadratic radical check: sqrt(k) or sqrt(k)/d for small k, d
  const sq = value * value;
  const sign = value < 0 ? '-' : '';
  for (const d of [1, 2, 3, 4, 6]) {
    const k = sq * d * d;
    const kr = Math.round(k);
    if (kr > 1 && kr <= 200 && Math.abs(k - kr) < 1e-11 && !Number.isInteger(Math.sqrt(kr))) {
      if (d === 1) {
        return { text: `${sign}√${kr}`, latex: `${sign}\\sqrt{${kr}}` };
      }
      return { text: `${sign}√${kr}/${d}`, latex: `${sign}\\frac{\\sqrt{${kr}}}{${d}}` };
    }
  }

  return null;
}

export function formatNumericValue(val: any, precision: number, format: NumberFormat): string {
  if (val === undefined || val === null) return '';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') {
    if (Number.isNaN(val)) return 'Undefined (NaN)';
    if (!Number.isFinite(val)) return val > 0 ? '∞' : '-∞';
    const { value } = snapNearZero(val);

    if (format === 'fraction') {
      const exact = detectExactForm(value);
      if (exact) return exact.text;
    }
    if (format === 'scientific') {
      return value.toExponential(Math.min(precision - 1, 12));
    }
    if (format === 'engineering') {
      if (value === 0) return '0';
      const exp = Math.floor(Math.log10(Math.abs(value)) / 3) * 3;
      const mantissa = value / Math.pow(10, exp);
      return `${Number(mantissa.toPrecision(precision))}e${exp >= 0 ? '+' : ''}${exp}`;
    }
    if (format === 'decimal') {
      return Number(value.toPrecision(precision)).toString();
    }
    // auto
    if (Math.abs(value) !== 0 && (Math.abs(value) >= 1e12 || Math.abs(value) < 1e-7)) {
      return value.toExponential(Math.min(precision - 1, 10));
    }
    return Number(value.toPrecision(precision)).toString();
  }

  if (val && typeof val === 'object' && 're' in val && 'im' in val) {
    const re = snapNearZero(val.re).value;
    const im = snapNearZero(val.im).value;
    const reStr = formatNumericValue(re, precision, format);
    const imAbs = Math.abs(im);
    const imStr = formatNumericValue(imAbs, precision, format);
    if (im === 0) return reStr;
    if (re === 0) return im === 1 ? 'i' : im === -1 ? '-i' : `${im < 0 ? '-' : ''}${imStr}i`;
    const op = im >= 0 ? ' + ' : ' - ';
    const unit = imAbs === 1 ? 'i' : `${imStr}i`;
    return `${reStr}${op}${unit}`;
  }

  return math.format(val, { precision });
}

function buildAstSteps(node: MathNode, scope: Record<string, any>, precision: number): StepItem[] {
  const steps: StepItem[] = [];
  const simplified = safeSimplify(node);

  steps.push({
    title: '1. Parsed Expression',
    expression: node.toString(),
    latex: nodeToCleanLatex(node),
    explanation: 'Parsed with standard mathematical operator precedence (parentheses, exponents, multiplication/division, addition/subtraction).',
  });

  if (simplified && simplified.toString() !== node.toString()) {
    steps.push({
      title: '2. Symbolic Simplification',
      expression: simplified.toString(),
      latex: nodeToCleanLatex(simplified),
      explanation: 'Combined like terms and applied algebraic simplification identities.',
    });
  }

  // Evaluate sub-expressions bottom-up (only non-trivial Compound nodes, capped at 8 steps)
  const subSteps: StepItem[] = [];
  const collectSub = (n: MathNode) => {
    if (subSteps.length >= 6) return;
    if (n.type === 'OperatorNode' || n.type === 'FunctionNode') {
      const anyNode = n as any;
      if (Array.isArray(anyNode.args)) {
        anyNode.args.forEach((child: MathNode) => collectSub(child));
      }
      if (n.toString() !== node.toString()) {
        try {
          const val = n.evaluate(scope);
          if (typeof val === 'number' && Number.isFinite(val)) {
            subSteps.push({
              title: `Evaluate ${n.toString()}`,
              expression: `${n.toString()} = ${formatNumericValue(val, precision, 'auto')}`,
              latex: `${nodeToCleanLatex(n)} = ${formatNumericValue(val, precision, 'auto')}`,
              explanation: n.type === 'FunctionNode' ? `Evaluated function ${anyNode.fn?.name ?? ''}.` : `Evaluated binary/unary operation (${anyNode.op ?? ''}).`,
            });
          }
        } catch {
          // skip symbolic subnodes
        }
      }
    } else if (n.type === 'ParenthesisNode') {
      collectSub((n as any).content);
    }
  };
  collectSub(node);

  subSteps.forEach((st, idx) => {
    steps.push({
      ...st,
      title: `${steps.length + 1}. ${st.title}`,
    });
  });

  return steps;
}

function safeSimplify(node: MathNode): MathNode | null {
  try {
    return math.simplify(node);
  } catch {
    return null;
  }
}

export function evaluateExpression(
  rawInput: string,
  options: {
    angleMode?: AngleMode;
    precision?: number;
    format?: NumberFormat;
    variables?: Record<string, number | string>;
  } = {}
): EvaluationResult {
  const angleMode = options.angleMode ?? 'RAD';
  const precision = options.precision ?? 12;
  const format = options.format ?? 'auto';
  const variables = options.variables ?? {};

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      ok: false,
      input: rawInput,
      normalizedExpression: '',
      latexInput: '',
      exactValue: null,
      exactLatex: null,
      numericValue: '',
      numericLatex: '',
      isExact: false,
      isComplex: false,
      isSymbolic: false,
      error: 'Enter a mathematical expression to evaluate.',
      steps: [],
    };
  }

  // Check for variable assignment syntax: `a = 5` or `let a = 5`
  const assignMatch = trimmed.match(/^(?:let\s+)?([a-zA-Zαβγδθλμσω][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
  if (assignMatch && !trimmed.includes('==')) {
    const varName = assignMatch[1];
    const rhsRaw = assignMatch[2];
    const reserved = ['pi', 'e', 'i', 'Infinity', 'sin', 'cos', 'tan', 'ln', 'log', 'sqrt'];
    if (reserved.includes(varName)) {
      return {
        ok: false,
        input: rawInput,
        normalizedExpression: trimmed,
        latexInput: trimmed,
        exactValue: null,
        exactLatex: null,
        numericValue: '',
        numericLatex: '',
        isExact: false,
        isComplex: false,
        isSymbolic: false,
        error: `Cannot overwrite reserved mathematical constant or function "${varName}".`,
        steps: [],
      };
    }
    const rhsEval = evaluateExpression(rhsRaw, options);
    if (!rhsEval.ok) return rhsEval;
    return {
      ...rhsEval,
      input: rawInput,
      assignedVariable: { name: varName, value: rhsEval.numericValue },
      steps: [
        ...rhsEval.steps,
        {
          title: 'Variable Assignment',
          expression: `${varName} = ${rhsEval.numericValue}`,
          latex: `${varName} = ${rhsEval.numericLatex}`,
          explanation: `Stored evaluated value into custom variable "${varName}".`,
        },
      ],
    };
  }

  const normalized = preprocessExpression(trimmed);
  let node: MathNode;
  try {
    node = math.parse(normalized);
  } catch (err: any) {
    return {
      ok: false,
      input: rawInput,
      normalizedExpression: normalized,
      latexInput: trimmed,
      exactValue: null,
      exactLatex: null,
      numericValue: '',
      numericLatex: '',
      isExact: false,
      isComplex: false,
      isSymbolic: false,
      error: `Syntax error: ${err?.message || 'Unable to parse expression. Check parentheses and operators.'}`,
      steps: [],
    };
  }

  const latexInput = nodeToCleanLatex(node);
  const scope = buildScope(angleMode, variables);

  try {
    const rawVal = node.evaluate(scope);

    // Check for division by zero or Infinity
    if (typeof rawVal === 'number') {
      if (Number.isNaN(rawVal)) {
        return {
          ok: false,
          input: rawInput,
          normalizedExpression: normalized,
          latexInput,
          exactValue: null,
          exactLatex: null,
          numericValue: 'Undefined',
          numericLatex: '\\text{Undefined}',
          isExact: false,
          isComplex: false,
          isSymbolic: false,
          error: 'Undefined mathematical result (indeterminate form such as 0/0 or ∞ - ∞).',
          steps: [],
        };
      }
      if (!Number.isFinite(rawVal)) {
        return {
          ok: true,
          input: rawInput,
          normalizedExpression: normalized,
          latexInput,
          exactValue: rawVal > 0 ? '∞' : '-∞',
          exactLatex: rawVal > 0 ? '\\infty' : '-\\infty',
          numericValue: rawVal > 0 ? '∞' : '-∞',
          numericLatex: rawVal > 0 ? '\\infty' : '-\\infty',
          isExact: true,
          isComplex: false,
          isSymbolic: false,
          domainWarning: 'Result diverges to infinity (possible division by zero or vertical asymptote).',
          steps: buildAstSteps(node, scope, precision),
        };
      }

      const snapped = snapNearZero(rawVal);
      const exact = detectExactForm(snapped.value);
      const numericValue = formatNumericValue(snapped.value, precision, format);
      const isExact = exact !== null && (exact.text === numericValue || Number.isInteger(snapped.value));

      const steps = buildAstSteps(node, scope, precision);
      steps.push({
        title: `${steps.length + 1}. Final Result`,
        expression: exact ? `${exact.text} ≈ ${numericValue}` : numericValue,
        latex: exact && exact.text !== numericValue ? `${exact.latex} \\approx ${numericValue}` : numericValue,
        explanation: isExact
          ? 'Exact value computed without floating-point truncation.'
          : exact
          ? `Exact symbolic form ${exact.text}; decimal approximation shown to ${precision} significant digits.`
          : `Numerical IEEE-754 floating-point evaluation (${precision} significant digits).`,
      });

      return {
        ok: true,
        input: rawInput,
        normalizedExpression: normalized,
        latexInput,
        exactValue: exact ? exact.text : null,
        exactLatex: exact ? exact.latex : null,
        numericValue,
        numericLatex: numericValue,
        isExact,
        isComplex: false,
        isSymbolic: false,
        roundingNote: snapped.snapped
          ? 'IEEE-754 floating-point residual (< 10⁻¹³) snapped to exact boundary.'
          : undefined,
        steps,
      };
    }

    // Complex number result
    if (rawVal && typeof rawVal === 'object' && 're' in rawVal && 'im' in rawVal) {
      const reSnap = snapNearZero(rawVal.re);
      const imSnap = snapNearZero(rawVal.im);
      const formatted = formatNumericValue({ re: reSnap.value, im: imSnap.value }, precision, format);
      const isReal = imSnap.value === 0;
      const exactReal = isReal ? detectExactForm(reSnap.value) : null;
      const steps = buildAstSteps(node, scope, precision);
      steps.push({
        title: `${steps.length + 1}. Complex Evaluation`,
        expression: formatted,
        latex: formatted,
        explanation: isReal
          ? 'Imaginary component vanished within numerical tolerance; real result obtained.'
          : 'Evaluated over the complex field ℂ.',
      });

      return {
        ok: true,
        input: rawInput,
        normalizedExpression: normalized,
        latexInput,
        exactValue: exactReal ? exactReal.text : null,
        exactLatex: exactReal ? exactReal.latex : null,
        numericValue: formatted,
        numericLatex: formatted,
        isExact: isReal && exactReal !== null,
        isComplex: !isReal,
        isSymbolic: false,
        roundingNote: reSnap.snapped || imSnap.snapped ? 'Sub-10⁻¹³ complex floating-point residual snapped to zero.' : undefined,
        steps,
      };
    }

    // Matrix / Array / Unit / Boolean
    const formatted = formatNumericValue(rawVal, precision, format);
    return {
      ok: true,
      input: rawInput,
      normalizedExpression: normalized,
      latexInput,
      exactValue: null,
      exactLatex: null,
      numericValue: formatted,
      numericLatex: formatted,
      isExact: typeof rawVal === 'boolean',
      isComplex: false,
      isSymbolic: false,
      steps: buildAstSteps(node, scope, precision),
    };
  } catch (err: any) {
    // If numeric evaluation failed because of unbound symbolic variables (like x^2 + x^2), return symbolic simplification!
    const msg = String(err?.message || '');
    if (msg.includes('Undefined symbol')) {
      const simplified = safeSimplify(node);
      if (simplified) {
        const symStr = simplified.toString();
        const symTex = nodeToCleanLatex(simplified);
        return {
          ok: true,
          input: rawInput,
          normalizedExpression: normalized,
          latexInput,
          exactValue: symStr,
          exactLatex: symTex,
          numericValue: symStr,
          numericLatex: symTex,
          isExact: true,
          isComplex: false,
          isSymbolic: true,
          steps: [
            {
              title: '1. Parsed Symbolic Expression',
              expression: node.toString(),
              latex: latexInput,
              explanation: 'Expression contains unbound symbolic variables; switching to symbolic algebra mode.',
            },
            {
              title: '2. Simplified Symbolic Form',
              expression: symStr,
              latex: symTex,
              explanation: 'Applied algebraic simplification rules.',
            },
          ],
        };
      }
    }

    return {
      ok: false,
      input: rawInput,
      normalizedExpression: normalized,
      latexInput,
      exactValue: null,
      exactLatex: null,
      numericValue: '',
      numericLatex: '',
      isExact: false,
      isComplex: false,
      isSymbolic: false,
      error: msg || 'Evaluation error.',
      steps: [],
    };
  }
}

export function compileRealFunction(
  expr: string,
  variables: Record<string, number | string> = {},
  angleMode: AngleMode = 'RAD'
): ((vars: Record<string, number>) => number) | null {
  try {
    const norm = preprocessExpression(expr);
    if (!norm) return null;
    const compiled = math.compile(norm);
    const baseScope = buildScope(angleMode, variables);
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
