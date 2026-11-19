import { AngleMode, GraphFunction, Point2D } from '../types/calculator';
import { compileRealFunction } from './engine';

export interface Bounds2D {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface GraphAnalysisResult {
  roots: Point2D[];
  yIntercepts: Point2D[];
  extrema: Point2D[];
  intersections: Point2D[];
}

export interface TraceSample {
  id: string;
  expression: string;
  color: string;
  x: number;
  y: number;
}

export function sanitizeBounds(bounds: Bounds2D): Bounds2D {
  let xMin = Number.isFinite(bounds.xMin) ? bounds.xMin : -8;
  let xMax = Number.isFinite(bounds.xMax) ? bounds.xMax : 8;
  let yMin = Number.isFinite(bounds.yMin) ? bounds.yMin : -6;
  let yMax = Number.isFinite(bounds.yMax) ? bounds.yMax : 6;

  if (xMax <= xMin + 1e-9) {
    const cx = (xMin + xMax) / 2;
    xMin = cx - 1;
    xMax = cx + 1;
  }
  if (yMax <= yMin + 1e-9) {
    const cy = (yMin + yMax) / 2;
    yMin = cy - 1;
    yMax = cy + 1;
  }
  return { xMin, xMax, yMin, yMax };
}

export function zoomBounds(rawBounds: Bounds2D, factor: number): Bounds2D {
  return zoomBoundsAt(rawBounds, factor, 0.5, 0.5);
}

export function zoomBoundsAt(
  rawBounds: Bounds2D,
  factor: number,
  normX = 0.5,
  normY = 0.5
): Bounds2D {
  const b = sanitizeBounds(rawBounds);
  const safeFactor = Math.max(0.05, Math.min(20, factor));
  const nx = Math.max(0, Math.min(1, normX));
  const ny = Math.max(0, Math.min(1, normY));
  const spanX = b.xMax - b.xMin;
  const spanY = b.yMax - b.yMin;
  const anchorX = b.xMin + nx * spanX;
  const anchorY = b.yMax - ny * spanY;
  const newSpanX = Math.max(2e-6, spanX * safeFactor);
  const newSpanY = Math.max(2e-6, spanY * safeFactor);
  const xMin = anchorX - nx * newSpanX;
  const yMax = anchorY + ny * newSpanY;
  return {
    xMin,
    xMax: xMin + newSpanX,
    yMin: yMax - newSpanY,
    yMax,
  };
}

export function panBounds(
  startBounds: Bounds2D,
  dxPx: number,
  dyPx: number,
  width: number,
  height: number
): Bounds2D {
  const b = sanitizeBounds(startBounds);
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const spanX = b.xMax - b.xMin;
  const spanY = b.yMax - b.yMin;
  const shiftX = (dxPx / safeW) * spanX;
  const shiftY = (dyPx / safeH) * spanY;
  return {
    xMin: b.xMin - shiftX,
    xMax: b.xMax - shiftX,
    yMin: b.yMin + shiftY,
    yMax: b.yMax + shiftY,
  };
}

export function niceGridStep(range: number): number {
  const safeRange = Math.max(1e-9, Math.abs(range));
  const raw = safeRange / 8;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  if (norm < 1.5) return pow;
  if (norm < 3.5) return 2 * pow;
  if (norm < 7.5) return 5 * pow;
  return 10 * pow;
}

export function normalizeImplicitExpression(rawExpr: string): string {
  const parts = rawExpr.split('=');
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return `(${parts[0].trim()}) - (${parts[1].trim()})`;
  }
  return rawExpr.trim();
}

export function sampleExplicitSegments(
  expr: string,
  rawBounds: Bounds2D,
  samples = 400,
  variables: Record<string, number | string> = {},
  angleMode: AngleMode = 'RAD'
): { x: number; y: number }[][] {
  const fn = compileRealFunction(expr, variables, angleMode);
  if (!fn) return [];
  const b = sanitizeBounds(rawBounds);
  const ySpan = b.yMax - b.yMin;
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  let prevY: number | null = null;

  for (let i = 0; i <= samples; i++) {
    const x = b.xMin + (i / samples) * (b.xMax - b.xMin);
    const y = fn({ x });
    if (!Number.isFinite(y) || Math.abs(y) > 1e6) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      prevY = null;
      continue;
    }
    if (prevY !== null && Math.abs(y - prevY) > ySpan * 0.75) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
    }
    current.push({ x, y });
    prevY = y;
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

export function sampleParametricCurve(
  exprX: string,
  exprY: string,
  tMin = 0,
  tMax = 2 * Math.PI,
  samples = 600,
  variables: Record<string, number | string> = {},
  jumpLimit = 500
): { x: number; y: number }[][] {
  const fx = compileRealFunction(exprX, variables, 'RAD');
  const fy = compileRealFunction(exprY, variables, 'RAD');
  if (!fx || !fy || !Number.isFinite(tMin) || !Number.isFinite(tMax) || tMax <= tMin) return [];

  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  let prev: { x: number; y: number } | null = null;

  for (let k = 0; k <= samples; k++) {
    const t = tMin + (k / samples) * (tMax - tMin);
    const x = fx({ t });
    const y = fy({ t });
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1e5 || Math.abs(y) > 1e5) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      prev = null;
      continue;
    }
    if (prev && Math.hypot(x - prev.x, y - prev.y) > jumpLimit) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
    }
    current.push({ x, y });
    prev = { x, y };
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

export function samplePolarCurve(
  exprR: string,
  thetaMin = 0,
  thetaMax = 2 * Math.PI,
  samples = 720,
  variables: Record<string, number | string> = {},
  jumpLimit = 500
): { x: number; y: number }[][] {
  const fr = compileRealFunction(exprR, variables, 'RAD');
  if (!fr || !Number.isFinite(thetaMin) || !Number.isFinite(thetaMax) || thetaMax <= thetaMin) return [];

  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  let prev: { x: number; y: number } | null = null;

  for (let k = 0; k <= samples; k++) {
    const theta = thetaMin + (k / samples) * (thetaMax - thetaMin);
    const r = fr({ theta, θ: theta, t: theta });
    if (!Number.isFinite(r) || Math.abs(r) > 1e5) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      prev = null;
      continue;
    }
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    if (prev && Math.hypot(x - prev.x, y - prev.y) > jumpLimit) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
    }
    current.push({ x, y });
    prev = { x, y };
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

export function sampleImplicitSegments(
  rawExpr: string,
  rawBounds: Bounds2D,
  cols = 140,
  rows = 105,
  variables: Record<string, number | string> = {},
  angleMode: AngleMode = 'RAD'
): [{ x: number; y: number }, { x: number; y: number }][] {
  const normalized = normalizeImplicitExpression(rawExpr);
  const F = compileRealFunction(normalized, variables, angleMode);
  if (!F) return [];

  const b = sanitizeBounds(rawBounds);
  const dx = (b.xMax - b.xMin) / cols;
  const dy = (b.yMax - b.yMin) / rows;
  const grid: number[][] = [];

  for (let i = 0; i <= cols; i++) {
    grid[i] = [];
    const x = b.xMin + i * dx;
    for (let j = 0; j <= rows; j++) {
      const y = b.yMin + j * dy;
      grid[i][j] = F({ x, y });
    }
  }

  const out: [{ x: number; y: number }, { x: number; y: number }][] = [];
  const interp = (a: number, c: number, va: number, vc: number) =>
    Math.abs(vc - va) < 1e-12 ? (a + c) / 2 : a + ((0 - va) / (vc - va)) * (c - a);

  // Threshold to reject vertical-asymptote sign flips (e.g. 1/x - y = 0 across x = 0)
  const asymptoteGuard = Math.max(500, Math.max(b.xMax - b.xMin, b.yMax - b.yMin) * 80);

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const v00 = grid[i][j];
      const v10 = grid[i + 1][j];
      const v11 = grid[i + 1][j + 1];
      const v01 = grid[i][j + 1];
      if (![v00, v10, v11, v01].every(Number.isFinite)) continue;
      if (Math.max(Math.abs(v00), Math.abs(v10), Math.abs(v11), Math.abs(v01)) > asymptoteGuard) {
        const minV = Math.min(v00, v10, v11, v01);
        const maxV = Math.max(v00, v10, v11, v01);
        if (maxV - minV > asymptoteGuard * 0.5) continue;
      }

      const x0 = b.xMin + i * dx;
      const x1 = x0 + dx;
      const y0 = b.yMin + j * dy;
      const y1 = y0 + dy;
      const pts: { x: number; y: number }[] = [];

      if (v00 * v10 <= 0) pts.push({ x: interp(x0, x1, v00, v10), y: y0 });
      if (v10 * v11 <= 0) pts.push({ x: x1, y: interp(y0, y1, v10, v11) });
      if (v11 * v01 <= 0) pts.push({ x: interp(x0, x1, v01, v11), y: y1 });
      if (v01 * v00 <= 0) pts.push({ x: x0, y: interp(y0, y1, v00, v01) });

      if (pts.length >= 2) {
        out.push([pts[0], pts[1]]);
      }
      if (pts.length === 4) {
        out.push([pts[2], pts[3]]);
      }
    }
  }

  return out;
}

export function evaluateTracePoints(
  functions: GraphFunction[],
  x: number,
  variables: Record<string, number | string> = {},
  angleMode: AngleMode = 'RAD'
): TraceSample[] {
  const out: TraceSample[] = [];
  for (const fnObj of functions) {
    if (!fnObj.visible || fnObj.type !== 'explicit') continue;
    const fn = compileRealFunction(fnObj.expression, variables, angleMode);
    if (!fn) continue;
    const y = fn({ x });
    if (Number.isFinite(y)) {
      out.push({
        id: fnObj.id,
        expression: fnObj.expression,
        color: fnObj.color,
        x,
        y: Math.abs(y) < 1e-12 ? 0 : y,
      });
    }
  }
  return out;
}

function goldenSectionOptimum(
  g: (x: number) => number,
  aInit: number,
  bInit: number,
  maximize: boolean,
  iters = 28
): { x: number; y: number } {
  const invPhi = (Math.sqrt(5) - 1) / 2;
  let a = aInit;
  let b = bInit;
  let c = b - invPhi * (b - a);
  let d = a + invPhi * (b - a);
  let fc = g(c);
  let fd = g(d);

  for (let i = 0; i < iters; i++) {
    if (!Number.isFinite(fc) || !Number.isFinite(fd)) break;
    const pickLeft = maximize ? fc > fd : fc < fd;
    if (pickLeft) {
      b = d;
      d = c;
      fd = fc;
      c = b - invPhi * (b - a);
      fc = g(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + invPhi * (b - a);
      fd = g(d);
    }
  }
  const xm = (a + b) / 2;
  return { x: xm, y: g(xm) };
}

export function analyzeExplicitFunctions(
  functions: GraphFunction[],
  rawBounds: Bounds2D,
  variables: Record<string, number | string> = {},
  angleMode: AngleMode = 'RAD'
): GraphAnalysisResult {
  const bounds = sanitizeBounds(rawBounds);
  const visibleExplicit = functions.filter((f) => f.visible && f.type === 'explicit');
  const roots: Point2D[] = [];
  const yIntercepts: Point2D[] = [];
  const extrema: Point2D[] = [];
  const intersections: Point2D[] = [];

  const compiledList = visibleExplicit
    .map((f) => ({ fnObj: f, evalFn: compileRealFunction(f.expression, variables, angleMode) }))
    .filter((c) => c.evalFn !== null) as { fnObj: GraphFunction; evalFn: (v: Record<string, number>) => number }[];

  const samples = 360;
  const dx = (bounds.xMax - bounds.xMin) / samples;
  const ySpan = bounds.yMax - bounds.yMin;
  const jumpThreshold = Math.max(50, ySpan * 4);

  for (const { fnObj, evalFn } of compiledList) {
    // y-intercept
    if (bounds.xMin <= 0 && bounds.xMax >= 0) {
      const y0 = evalFn({ x: 0 });
      if (Number.isFinite(y0)) {
        yIntercepts.push({
          x: 0,
          y: Math.abs(y0) < 1e-12 ? 0 : y0,
          label: fnObj.expression,
          kind: 'y-intercept',
        });
      }
    }

    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= samples; i++) {
      const x = bounds.xMin + i * dx;
      xs.push(x);
      ys.push(evalFn({ x }));
    }

    const tryPushRoot = (rx: number) => {
      const fRx = evalFn({ x: rx });
      if (!Number.isFinite(fRx) || Math.abs(fRx) > 1e-3) return;
      const fLeft = evalFn({ x: rx - dx * 0.01 });
      const fRight = evalFn({ x: rx + dx * 0.01 });
      const bothFinite = Number.isFinite(fLeft) && Number.isFinite(fRight);
      const oneSidedBoundary =
        (Number.isFinite(fLeft) && Math.abs(fLeft) < Math.max(1, ySpan * 0.5)) ||
        (Number.isFinite(fRight) && Math.abs(fRight) < Math.max(1, ySpan * 0.5));
      const continuous = bothFinite
        ? Math.abs(fLeft - fRight) < Math.max(1, ySpan * 0.5)
        : oneSidedBoundary;

      if (continuous && roots.length < 24) {
        const cleanRx = Math.abs(rx) < 1e-10 ? 0 : rx;
        if (!roots.some((r) => Math.abs(r.x - cleanRx) < dx * 0.75 && r.label === fnObj.expression)) {
          roots.push({ x: cleanRx, y: 0, label: fnObj.expression, kind: 'root' });
        }
      }
    };

    for (let i = 1; i <= samples; i++) {
      const prevX = xs[i - 1];
      const prevY = ys[i - 1];
      const currX = xs[i];
      const currY = ys[i];

      // Domain-boundary zero check (e.g. sqrt(x) at x = 0 or sqrt(x - 1) at x = 1)
      if (!Number.isFinite(prevY) && Number.isFinite(currY)) {
        // Binary search boundary between prevX and currX
        let lo = prevX;
        let hi = currX;
        for (let k = 0; k < 28; k++) {
          const mid = (lo + hi) / 2;
          const fm = evalFn({ x: mid });
          if (Number.isFinite(fm)) hi = mid;
          else lo = mid;
        }
        if (Math.abs(evalFn({ x: hi })) < 1e-3) tryPushRoot(hi);
        continue;
      }
      if (Number.isFinite(prevY) && !Number.isFinite(currY)) {
        let lo = prevX;
        let hi = currX;
        for (let k = 0; k < 28; k++) {
          const mid = (lo + hi) / 2;
          const fm = evalFn({ x: mid });
          if (Number.isFinite(fm)) lo = mid;
          else hi = mid;
        }
        if (Math.abs(evalFn({ x: lo })) < 1e-3) tryPushRoot(lo);
        continue;
      }

      if (!Number.isFinite(prevY) || !Number.isFinite(currY)) continue;
      if (Math.abs(currY - prevY) > jumpThreshold) continue;

      // 1. Odd-multiplicity / sign-change root via bisection
      if (prevY * currY <= 0) {
        let a = prevX;
        let b = currX;
        let fa = prevY;
        let rx = (a + b) / 2;
        if (Math.abs(fa) < 1e-12) {
          rx = a;
        } else if (Math.abs(currY) < 1e-12) {
          rx = b;
        } else {
          for (let k = 0; k < 28; k++) {
            const m = (a + b) / 2;
            const fm = evalFn({ x: m });
            if (!Number.isFinite(fm)) break;
            if (Math.abs(fm) < 1e-12) {
              a = b = m;
              break;
            }
            if (fa * fm <= 0) b = m;
            else {
              a = m;
              fa = fm;
            }
          }
          rx = (a + b) / 2;
        }
        tryPushRoot(rx);
      }

      // 2. Local extrema & tangent (even-multiplicity) roots
      if (i >= 2 && Number.isFinite(ys[i - 2])) {
        const y0 = ys[i - 2];
        const y1 = prevY;
        const y2 = currY;
        if (Math.abs(y1 - y0) < jumpThreshold * 0.25 && Math.abs(y2 - y1) < jumpThreshold * 0.25) {
          // Avoid false extrema on flat constant regions (y0 === y1 === y2)
          const isStrictMax = (y1 > y0 && y1 >= y2) || (y1 >= y0 && y1 > y2);
          const isStrictMin = (y1 < y0 && y1 <= y2) || (y1 <= y0 && y1 < y2);
          if (isStrictMax || isStrictMin) {
            const opt = goldenSectionOptimum((t) => evalFn({ x: t }), xs[i - 2], currX, isStrictMax);
            if (
              Number.isFinite(opt.y) &&
              Math.abs(opt.y - y1) < ySpan * 0.25 &&
              extrema.length < 24
            ) {
              const cleanEx = Math.abs(opt.x) < 1e-10 ? 0 : opt.x;
              const cleanEy = Math.abs(opt.y) < 1e-10 ? 0 : opt.y;
              const kind = isStrictMax ? 'max' : 'min';
              const tag = isStrictMax ? 'Max' : 'Min';
              if (!extrema.some((e) => Math.abs(e.x - cleanEx) < dx * 1.5 && e.kind === kind)) {
                extrema.push({ x: cleanEx, y: cleanEy, label: `${tag} (${fnObj.expression})`, kind });
              }
              if (Math.abs(cleanEy) < 1e-5 && roots.length < 24) {
                if (!roots.some((r) => Math.abs(r.x - cleanEx) < dx * 0.75 && r.label === fnObj.expression)) {
                  roots.push({ x: cleanEx, y: 0, label: fnObj.expression, kind: 'root' });
                }
              }
            }
          }
        }
      }
    }
  }

  // Pairwise intersections between explicit functions
  for (let i = 0; i < compiledList.length; i++) {
    for (let j = i + 1; j < compiledList.length; j++) {
      const f1 = compiledList[i].evalFn;
      const f2 = compiledList[j].evalFn;
      const pairLabel = `${compiledList[i].fnObj.expression} ∩ ${compiledList[j].fnObj.expression}`;
      const diffFn = (x: number) => f1({ x }) - f2({ x });
      let prevDiff = diffFn(bounds.xMin);
      let prevX = bounds.xMin;
      let prevPrevDiff = NaN;
      let prevPrevX = bounds.xMin;

      for (let s = 1; s <= samples; s++) {
        const cx = bounds.xMin + s * dx;
        const diff = diffFn(cx);
        if (Number.isFinite(prevDiff) && Number.isFinite(diff) && Math.abs(diff - prevDiff) < jumpThreshold) {
          if (prevDiff * diff <= 0) {
            let a = prevX;
            let b = cx;
            let fa = prevDiff;
            for (let k = 0; k < 28; k++) {
              const m = (a + b) / 2;
              const fm = diffFn(m);
              if (!Number.isFinite(fm)) break;
              if (Math.abs(fm) < 1e-12) {
                a = b = m;
                break;
              }
              if (fa * fm <= 0) b = m;
              else {
                a = m;
                fa = fm;
              }
            }
            const ix = (a + b) / 2;
            const iy = f1({ x: ix });
            const gap = Math.abs(diffFn(ix));
            if (Number.isFinite(iy) && gap < 1e-3 && intersections.length < 20) {
              const cleanIx = Math.abs(ix) < 1e-10 ? 0 : ix;
              const cleanIy = Math.abs(iy) < 1e-10 ? 0 : iy;
              if (!intersections.some((pt) => Math.abs(pt.x - cleanIx) < dx * 0.75 && Math.abs(pt.y - cleanIy) < dx * 0.75)) {
                intersections.push({ x: cleanIx, y: cleanIy, label: pairLabel, kind: 'intersection' });
              }
            }
          } else if (
            Number.isFinite(prevPrevDiff) &&
            Math.abs(prevDiff) <= Math.abs(prevPrevDiff) &&
            Math.abs(prevDiff) <= Math.abs(diff)
          ) {
            const opt = goldenSectionOptimum((t) => Math.abs(diffFn(t)), prevPrevX, cx, false);
            if (Number.isFinite(opt.y) && opt.y < 1e-5 && intersections.length < 20) {
              const cleanIx = Math.abs(opt.x) < 1e-10 ? 0 : opt.x;
              const iy = f1({ x: cleanIx });
              if (Number.isFinite(iy) && !intersections.some((pt) => Math.abs(pt.x - cleanIx) < dx * 0.75)) {
                intersections.push({
                  x: cleanIx,
                  y: Math.abs(iy) < 1e-10 ? 0 : iy,
                  label: pairLabel,
                  kind: 'intersection',
                });
              }
            }
          }
        }
        prevPrevDiff = prevDiff;
        prevPrevX = prevX;
        prevDiff = diff;
        prevX = cx;
      }
    }
  }

  return { roots, yIntercepts, extrema, intersections };
}
