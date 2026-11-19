import { StepItem } from '../types/calculator';

export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n === 2 || n === 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

export function primeFactorization(nRaw: number): {
  n: number;
  factors: { prime: number; power: number }[];
  formatted: string;
  divisors: number[];
  totient: number;
} {
  const n = Math.floor(Math.abs(nRaw));
  if (!Number.isFinite(n) || n < 2 || n > 1e13) {
    throw new Error('Enter an integer between 2 and 10¹³.');
  }
  let rem = n;
  const factors: { prime: number; power: number }[] = [];
  let d = 2;
  while (d * d <= rem) {
    if (rem % d === 0) {
      let power = 0;
      while (rem % d === 0) {
        rem = Math.floor(rem / d);
        power++;
      }
      factors.push({ prime: d, power });
    }
    d += d === 2 ? 1 : 2;
  }
  if (rem > 1) factors.push({ prime: rem, power: 1 });

  const formatted = factors.map((f) => (f.power > 1 ? `${f.prime}^${f.power}` : `${f.prime}`)).join(' × ');

  // Divisors
  const divisors: number[] = [];
  if (n <= 1e7) {
    for (let i = 1; i * i <= n; i++) {
      if (n % i === 0) {
        divisors.push(i);
        if (i !== n / i) divisors.push(n / i);
      }
    }
    divisors.sort((a, b) => a - b);
  }

  // Euler's totient φ(n) = n * Π (1 - 1/p)
  let totient = n;
  for (const f of factors) {
    totient = (totient / f.prime) * (f.prime - 1);
  }

  return { n, factors, formatted, divisors, totient };
}

export function extendedGCD(aRaw: number, bRaw: number): {
  gcd: number;
  lcm: number;
  x: number;
  y: number;
  steps: StepItem[];
} {
  let a = Math.trunc(aRaw);
  let b = Math.trunc(bRaw);
  if (a === 0 && b === 0) throw new Error('gcd(0, 0) is undefined.');

  const steps: StepItem[] = [];
  let oldR = Math.abs(a),
    r = Math.abs(b);
  let oldS = a >= 0 ? 1 : -1,
    s = 0;
  let oldT = 0,
    t = b >= 0 ? 1 : -1;

  while (r !== 0) {
    const q = Math.floor(oldR / r);
    const nextR = oldR - q * r;
    steps.push({
      title: `Division Step`,
      expression: `${oldR} = ${q} × ${r} + ${nextR}`,
      explanation: `Remainder becomes ${nextR}.`,
    });
    [oldR, r] = [r, nextR];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }

  const gcd = oldR;
  const lcm = Math.abs(a * b) / gcd;
  steps.push({
    title: "Bézout's Identity",
    expression: `(${a})(${oldS}) + (${b})(${oldT}) = ${gcd}`,
    explanation: `Extended Euclidean algorithm yields x = ${oldS}, y = ${oldT}.`,
  });

  return { gcd, lcm, x: oldS, y: oldT, steps };
}

export function modPow(base: number, exp: number, mod: number): number {
  if (!Number.isInteger(base) || !Number.isInteger(exp) || !Number.isInteger(mod) || mod <= 0 || exp < 0) {
    throw new Error('Modular exponentiation requires integer base, exponent ≥ 0, and modulus > 0.');
  }
  let b = BigInt(base) % BigInt(mod);
  if (b < 0n) b += BigInt(mod);
  let e = BigInt(exp);
  const m = BigInt(mod);
  let res = 1n;
  while (e > 0n) {
    if (e % 2n === 1n) res = (res * b) % m;
    b = (b * b) % m;
    e /= 2n;
  }
  return Number(res);
}

export function modInverse(a: number, m: number): number | null {
  const res = extendedGCD(a, m);
  if (res.gcd !== 1) return null;
  return ((res.x % m) + m) % m;
}

export function generateSequence(
  type: 'fibonacci' | 'primes' | 'triangular' | 'catalan' | 'factorial',
  count: number
): number[] {
  const n = Math.max(1, Math.min(30, Math.floor(count)));
  const out: number[] = [];
  if (type === 'fibonacci') {
    let a = 0,
      b = 1;
    for (let i = 0; i < n; i++) {
      out.push(a);
      [a, b] = [b, a + b];
    }
  } else if (type === 'primes') {
    let cand = 2;
    while (out.length < n) {
      if (isPrime(cand)) out.push(cand);
      cand++;
    }
  } else if (type === 'triangular') {
    for (let k = 1; k <= n; k++) out.push((k * (k + 1)) / 2);
  } else if (type === 'catalan') {
    let c = 1;
    for (let k = 0; k < n; k++) {
      out.push(c);
      c = Math.round((c * 2 * (2 * k + 1)) / (k + 2));
    }
  } else if (type === 'factorial') {
    let f = 1;
    for (let k = 0; k < Math.min(n, 20); k++) {
      if (k > 0) f *= k;
      out.push(f);
    }
  }
  return out;
}

// --- Discrete Math: Logic & Truth Tables ---

export interface TruthTableResult {
  variables: string[];
  rows: { assignment: Record<string, boolean>; result: boolean }[];
  classification: 'Tautology' | 'Contradiction' | 'Contingency';
}

export function evaluateTruthTable(rawFormula: string): TruthTableResult {
  // Supported operators: !, ~, ¬ (NOT); &, &&, ∧, AND; |, ||, ∨, OR; ^, ⊕, XOR; ->, =>, ⇒ (IMPLIES); <->, <=>, ⇔ (IFF)
  const varsSet = new Set<string>();
  const cleanedTokens = rawFormula
    .replace(/¬|~/g, '!')
    .replace(/∧/g, '&&')
    .replace(/∨/g, '||')
    .replace(/⊕/g, '!=')
    .replace(/\bNOT\b/gi, '!')
    .replace(/\bAND\b/gi, '&&')
    .replace(/\bOR\b/gi, '||')
    .replace(/\bXOR\b/gi, '!=')
    .replace(/<->|<=>|⇔/g, '===')
    .replace(/->|=>|⇒/g, 'IMP');

  const matches = cleanedTokens.match(/\b[A-Z]\b/g) || [];
  matches.forEach((v) => varsSet.add(v));
  const variables = Array.from(varsSet).sort().slice(0, 5);
  if (variables.length === 0) throw new Error('Include at least one uppercase propositional variable (e.g., P, Q, R).');

  // Safe recursive-descent boolean parser (no eval!)
  const evalBoolExpr = (env: Record<string, boolean>): boolean => {
    const tokens = tokenizeBool(cleanedTokens);
    let pos = 0;

    const parseIff = (): boolean => {
      let left = parseImp();
      while (tokens[pos] === '===') {
        pos++;
        const right = parseImp();
        left = left === right;
      }
      return left;
    };

    const parseImp = (): boolean => {
      let left = parseOr();
      while (tokens[pos] === 'IMP') {
        pos++;
        const right = parseImp(); // right-associative
        left = !left || right;
      }
      return left;
    };

    const parseOr = (): boolean => {
      let left = parseXor();
      while (tokens[pos] === '||') {
        pos++;
        const right = parseXor();
        left = left || right;
      }
      return left;
    };

    const parseXor = (): boolean => {
      let left = parseAnd();
      while (tokens[pos] === '!=') {
        pos++;
        const right = parseAnd();
        left = left !== right;
      }
      return left;
    };

    const parseAnd = (): boolean => {
      let left = parseUnary();
      while (tokens[pos] === '&&') {
        pos++;
        const right = parseUnary();
        left = left && right;
      }
      return left;
    };

    const parseUnary = (): boolean => {
      if (tokens[pos] === '!') {
        pos++;
        return !parseUnary();
      }
      return parsePrimary();
    };

    const parsePrimary = (): boolean => {
      const tok = tokens[pos];
      if (!tok) throw new Error('Unexpected end of logic formula.');
      if (tok === '(') {
        pos++;
        const val = parseIff();
        if (tokens[pos] !== ')') throw new Error('Mismatched parentheses in logic formula.');
        pos++;
        return val;
      }
      if (tok === 'TRUE' || tok === '1') {
        pos++;
        return true;
      }
      if (tok === 'FALSE' || tok === '0') {
        pos++;
        return false;
      }
      if (/^[A-Z]$/.test(tok)) {
        pos++;
        return env[tok];
      }
      throw new Error(`Unexpected token "${tok}" in logic formula.`);
    };

    const result = parseIff();
    if (pos < tokens.length) throw new Error(`Unexpected trailing token "${tokens[pos]}".`);
    return result;
  };

  const rows: { assignment: Record<string, boolean>; result: boolean }[] = [];
  const total = 1 << variables.length;
  for (let mask = total - 1; mask >= 0; mask--) {
    const assignment: Record<string, boolean> = {};
    variables.forEach((v, idx) => {
      assignment[v] = Boolean((mask >> (variables.length - 1 - idx)) & 1);
    });
    rows.push({ assignment, result: evalBoolExpr(assignment) });
  }

  const allTrue = rows.every((r) => r.result);
  const allFalse = rows.every((r) => !r.result);
  const classification = allTrue ? 'Tautology' : allFalse ? 'Contradiction' : 'Contingency';
  return { variables, rows, classification };
}

function tokenizeBool(expr: string): string[] {
  const re = /\s*(===|IMP|&&|\|\||!=|!|\(|\)|TRUE|FALSE|[A-Z]|1|0)\s*/gi;
  const tokens: string[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expr)) !== null) {
    if (m.index !== lastIndex) {
      throw new Error(`Invalid character near "${expr.slice(lastIndex, m.index)}".`);
    }
    tokens.push(m[1].toUpperCase() === 'IMP' ? 'IMP' : m[1].toUpperCase() === 'TRUE' || m[1].toUpperCase() === 'FALSE' ? m[1].toUpperCase() : m[1]);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < expr.length && expr.slice(lastIndex).trim() !== '') {
    throw new Error(`Invalid token "${expr.slice(lastIndex).trim()}".`);
  }
  return tokens;
}

// --- Discrete Math: Sets & Graph Basics ---

export function computeSetOperations(rawA: string, rawB: string) {
  const parseSet = (s: string) =>
    Array.from(
      new Set(
        s
          .split(/[\s,;]+/)
          .map((x) => x.trim())
          .filter(Boolean)
      )
    );
  const A = parseSet(rawA);
  const B = parseSet(rawB);
  const setA = new Set(A);
  const setB = new Set(B);

  const union = Array.from(new Set([...A, ...B]));
  const intersection = A.filter((x) => setB.has(x));
  const diffAB = A.filter((x) => !setB.has(x));
  const diffBA = B.filter((x) => !setA.has(x));
  const symDiff = [...diffAB, ...diffBA];
  const isASubsetB = A.every((x) => setB.has(x));
  const isBSubsetA = B.every((x) => setA.has(x));
  const cartesianProduct =
    A.length * B.length <= 36 ? A.flatMap((a) => B.map((b) => `(${a}, ${b})`)) : [`${A.length * B.length} ordered pairs`];

  return { A, B, union, intersection, diffAB, diffBA, symDiff, isASubsetB, isBSubsetA, cartesianProduct };
}

export function analyzeAdjacencyMatrix(adj: number[][]) {
  const n = adj.length;
  const degrees = adj.map((row) => row.reduce((a, b) => a + (b > 0 ? 1 : 0), 0));
  const edgeCount = degrees.reduce((a, b) => a + b, 0) / 2;

  // Connected components via BFS
  const visited = Array(n).fill(false);
  let components = 0;
  for (let start = 0; start < n; start++) {
    if (!visited[start]) {
      components++;
      const q = [start];
      visited[start] = true;
      while (q.length > 0) {
        const u = q.shift()!;
        for (let v = 0; v < n; v++) {
          if (adj[u][v] > 0 && !visited[v]) {
            visited[v] = true;
            q.push(v);
          }
        }
      }
    }
  }

  // Shortest paths from node 0 via Dijkstra
  const dist = Array(n).fill(Infinity);
  dist[0] = 0;
  const used = Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    let u = -1;
    for (let j = 0; j < n; j++) {
      if (!used[j] && (u === -1 || dist[j] < dist[u])) u = j;
    }
    if (u === -1 || dist[u] === Infinity) break;
    used[u] = true;
    for (let v = 0; v < n; v++) {
      if (adj[u][v] > 0 && dist[u] + adj[u][v] < dist[v]) {
        dist[v] = dist[u] + adj[u][v];
      }
    }
  }

  return {
    vertices: n,
    edges: edgeCount,
    degrees,
    connectedComponents: components,
    isConnected: components === 1,
    shortestFromV1: dist.map((d) => (d === Infinity ? '∞' : String(d))),
  };
}
