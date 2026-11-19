import {
  Download,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { compileRealFunction, math, preprocessExpression } from '../math/engine';
import {
  analyzeExplicitFunctions,
  evaluateTracePoints,
  niceGridStep,
  panBounds,
  sampleExplicitSegments,
  sampleImplicitSegments,
  sampleParametricCurve,
  samplePolarCurve,
  sanitizeBounds,
  zoomBoundsAt,
} from '../math/graphing';
import { GraphFunction, Point2D } from '../types/calculator';

const CURVE_COLORS = ['#3B82F6', '#06B6D4', '#F59E0B', '#EC4899', '#10B981', '#8B5CF6'];

function parseParamBound(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  try {
    const val = math.evaluate(preprocessExpression(trimmed), { pi: Math.PI, e: Math.E });
    return typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  } catch {
    return fallback;
  }
}

function fmtCoord(n: number): string {
  const clean = Math.abs(n) < 1e-10 ? 0 : n;
  return Number(clean.toFixed(3)).toString();
}

export const GraphingView: React.FC = () => {
  const { theme, angleMode, variables, graphDraft } = useAppContext();
  const [mode, setMode] = useState<'2d' | '3d'>('2d');

  // 2D State
  const [functions, setFunctions] = useState<GraphFunction[]>([
    { id: 'f1', type: 'explicit', expression: 'x^2 - 2', color: CURVE_COLORS[0], visible: true },
    { id: 'f2', type: 'explicit', expression: 'sin(x) * 2', color: CURVE_COLORS[1], visible: true },
  ]);
  const [paramRangeText, setParamRangeText] = useState<Record<string, { min: string; max: string }>>({});
  const [bounds, setBounds] = useState({ xMin: -8, xMax: 8, yMin: -6, yMax: 6 });
  const [showGrid, setShowGrid] = useState(true);
  const [polarGrid, setPolarGrid] = useState(false);
  const [showPointLabels, setShowPointLabels] = useState(true);
  const [highlightedPt, setHighlightedPt] = useState<Point2D | null>(null);
  const [tracePos, setTracePos] = useState<{ px: number; py: number; x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; bounds: typeof bounds } | null>(null);

  // 3D State
  const [expr3D, setExpr3D] = useState<string>('x^2 + y^2');
  const [range3D, setRange3D] = useState<number>(3);
  const [rotYaw, setRotYaw] = useState<number>(0.65);
  const [rotPitch, setRotPitch] = useState<number>(0.55);
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [drag3D, setDrag3D] = useState<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  const canvas2DRef = useRef<HTMLCanvasElement | null>(null);
  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (graphDraft && !functions.some((f) => f.expression === graphDraft)) {
      setFunctions((prev) => [
        {
          id: `f_${Date.now()}`,
          type: 'explicit',
          expression: graphDraft,
          color: CURVE_COLORS[prev.length % CURVE_COLORS.length],
          visible: true,
        },
        ...prev,
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphDraft]);

  // Analyze roots, y-intercept, extrema, and pairwise intersections for visible explicit functions
  const analysis = useMemo(
    () => analyzeExplicitFunctions(functions, bounds, variables, angleMode),
    [functions, bounds, variables, angleMode]
  );

  const traceSamples = useMemo(() => {
    if (!tracePos) return [];
    return evaluateTracePoints(functions, tracePos.x, variables, angleMode);
  }, [functions, tracePos, variables, angleMode]);

  // Non-passive wheel listener for smooth cursor-anchored zoom without scrolling the page
  useEffect(() => {
    if (mode !== '2d') return;
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const nx = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5;
      const ny = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5;
      const factor = e.deltaY > 0 ? 1.12 : 0.89;
      setBounds((prev) => zoomBoundsAt(prev, factor, nx, ny));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [mode]);

  // Render 2D Canvas
  useEffect(() => {
    if (mode !== '2d') return;
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(300, Math.floor(rect.height));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const isDark = theme === 'dark';
    ctx.fillStyle = isDark ? '#070B14' : '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const safeBounds = sanitizeBounds(bounds);
    const toPx = (x: number) => ((x - safeBounds.xMin) / (safeBounds.xMax - safeBounds.xMin)) * width;
    const toPy = (y: number) => height - ((y - safeBounds.yMin) / (safeBounds.yMax - safeBounds.yMin)) * height;

    const stepX = niceGridStep(safeBounds.xMax - safeBounds.xMin);
    const stepY = niceGridStep(safeBounds.yMax - safeBounds.yMin);

    if (showGrid) {
      ctx.strokeStyle = isDark ? '#162033' : '#E2E8F0';
      ctx.lineWidth = 1;

      const startX = Math.ceil(safeBounds.xMin / stepX) * stepX;
      for (let x = startX; x <= safeBounds.xMax; x += stepX) {
        const px = toPx(x);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();
      }

      const startY = Math.ceil(safeBounds.yMin / stepY) * stepY;
      for (let y = startY; y <= safeBounds.yMax; y += stepY) {
        const py = toPy(y);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();
      }
    }

    if (polarGrid) {
      const ox = toPx(0);
      const oy = toPy(0);
      const pxPerUnit = width / (safeBounds.xMax - safeBounds.xMin);
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(37, 99, 235, 0.15)';
      ctx.lineWidth = 1;
      for (let r = stepX; r <= Math.max(Math.abs(safeBounds.xMax), Math.abs(safeBounds.xMin)) * 1.5; r += stepX) {
        ctx.beginPath();
        ctx.arc(ox, oy, r * pxPerUnit, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Coordinate Axes
    ctx.strokeStyle = isDark ? '#475569' : '#64748B';
    ctx.lineWidth = 1.5;
    if (safeBounds.yMin <= 0 && safeBounds.yMax >= 0) {
      const ay = toPy(0);
      ctx.beginPath();
      ctx.moveTo(0, ay);
      ctx.lineTo(width, ay);
      ctx.stroke();
    }
    if (safeBounds.xMin <= 0 && safeBounds.xMax >= 0) {
      const ax = toPx(0);
      ctx.beginPath();
      ctx.moveTo(ax, 0);
      ctx.lineTo(ax, height);
      ctx.stroke();
    }

    // Axis Tick Labels
    ctx.fillStyle = isDark ? '#94A3B8' : '#475569';
    ctx.font = '11px "IBM Plex Mono", monospace';
    const xAxisY = Math.min(height - 16, Math.max(14, toPy(0) + 14));
    const yAxisX = Math.min(width - 36, Math.max(6, toPx(0) + 6));
    for (let x = Math.ceil(safeBounds.xMin / stepX) * stepX; x <= safeBounds.xMax; x += stepX) {
      if (Math.abs(x) < stepX * 1e-4) continue;
      ctx.fillText(String(Number(x.toPrecision(4))), toPx(x) + 3, xAxisY);
    }
    for (let y = Math.ceil(safeBounds.yMin / stepY) * stepY; y <= safeBounds.yMax; y += stepY) {
      if (Math.abs(y) < stepY * 1e-4) continue;
      ctx.fillText(String(Number(y.toPrecision(4))), yAxisX, toPy(y) - 3);
    }

    // Plot Functions
    const strokeSegments = (segments: { x: number; y: number }[][]) => {
      ctx.beginPath();
      for (const seg of segments) {
        for (let idx = 0; idx < seg.length; idx++) {
          const px = toPx(seg[idx].x);
          const py = toPy(seg[idx].y);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    };

    for (const fnObj of functions) {
      if (!fnObj.visible) continue;
      ctx.strokeStyle = fnObj.color;
      ctx.lineWidth = 2.25;

      if (fnObj.type === 'explicit') {
        const segs = sampleExplicitSegments(
          fnObj.expression,
          safeBounds,
          Math.max(360, Math.round(width / 1.5)),
          variables,
          angleMode
        );
        strokeSegments(segs);
      } else if (fnObj.type === 'parametric') {
        const t0 = fnObj.tMin ?? 0;
        const t1 = fnObj.tMax ?? 2 * Math.PI;
        const segs = sampleParametricCurve(fnObj.expression, fnObj.expressionY || 'sin(t)', t0, t1, 720, variables);
        strokeSegments(segs);
      } else if (fnObj.type === 'polar') {
        const t0 = fnObj.tMin ?? 0;
        const t1 = fnObj.tMax ?? 2 * Math.PI;
        const segs = samplePolarCurve(fnObj.expression, t0, t1, 720, variables);
        strokeSegments(segs);
      } else if (fnObj.type === 'implicit') {
        const segs = sampleImplicitSegments(fnObj.expression, safeBounds, 140, 105, variables, angleMode);
        ctx.beginPath();
        for (const [p0, p1] of segs) {
          ctx.moveTo(toPx(p0.x), toPy(p0.y));
          ctx.lineTo(toPx(p1.x), toPy(p1.y));
        }
        ctx.stroke();
      }
    }

    // Draw markers + optional coordinate badges for Roots, Extrema, Y-Intercepts & Intersections
    const occupiedLabels: { x: number; y: number }[] = [];
    const drawDot = (pt: Point2D, color: string, tag?: string, highlight = false) => {
      const px = toPx(pt.x);
      const py = toPy(pt.y);
      if (px < -10 || px > width + 10 || py < -10 || py > height + 10) return;

      if (highlight) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, highlight ? 5.5 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isDark ? '#070B14' : '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if ((showPointLabels || highlight) && px >= 0 && px <= width && py >= 0 && py <= height) {
        const text = `${tag ? `${tag} ` : ''}(${fmtCoord(pt.x)}, ${fmtCoord(pt.y)})`;
        const lx = Math.min(width - 110, Math.max(6, px + 7));
        const ly = Math.max(14, py - 8);
        const collides = !highlight && occupiedLabels.some((o) => Math.abs(o.x - lx) < 95 && Math.abs(o.y - ly) < 16);
        if (!collides) {
          occupiedLabels.push({ x: lx, y: ly });
          ctx.font = '10px "IBM Plex Mono", monospace';
          const tw = ctx.measureText(text).width;
          ctx.fillStyle = isDark ? 'rgba(7, 11, 20, 0.84)' : 'rgba(255, 255, 255, 0.88)';
          ctx.fillRect(lx - 3, ly - 10, tw + 6, 13);
          ctx.fillStyle = color;
          ctx.fillText(text, lx, ly);
        }
      }
    };

    analysis.yIntercepts.forEach((p) => drawDot(p, '#38BDF8', 'y-int'));
    analysis.roots.forEach((p) => drawDot(p, '#10B981', 'Root'));
    analysis.extrema.forEach((p) => drawDot(p, '#EC4899', p.kind === 'max' ? 'Max' : 'Min'));
    analysis.intersections.forEach((p) => drawDot(p, '#F59E0B', 'Int'));

    if (highlightedPt) {
      drawDot(highlightedPt, '#22D3EE', '', true);
    }

    // Crosshair & Curve-Snap Trace
    if (tracePos) {
      ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(71,85,105,0.4)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tracePos.px, 0);
      ctx.lineTo(tracePos.px, height);
      ctx.moveTo(0, tracePos.py);
      ctx.lineTo(width, tracePos.py);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const s of traceSamples) {
        const sy = toPy(s.y);
        if (sy >= 0 && sy <= height) {
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(tracePos.px, sy, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isDark ? '#070B14' : '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }
  }, [
    mode,
    functions,
    bounds,
    showGrid,
    polarGrid,
    showPointLabels,
    highlightedPt,
    theme,
    angleMode,
    variables,
    analysis,
    tracePos,
    traceSamples,
  ]);

  // Render 3D Surface Canvas
  useEffect(() => {
    if (mode !== '3d') return;
    const canvas = canvas3DRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(300, Math.floor(rect.height));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const isDark = theme === 'dark';
    ctx.fillStyle = isDark ? '#070B14' : '#F8FAFC';
    ctx.fillRect(0, 0, width, height);

    const f3 = compileRealFunction(expr3D, variables, angleMode);
    if (!f3) return;

    const N = 34;
    const min = -range3D;
    const max = range3D;
    const step = (max - min) / N;

    const pts: { x: number; y: number; z: number }[][] = [];
    let zMin = Infinity,
      zMax = -Infinity;
    for (let i = 0; i <= N; i++) {
      pts[i] = [];
      const x = min + i * step;
      for (let j = 0; j <= N; j++) {
        const y = min + j * step;
        const z = f3({ x, y });
        const safeZ = Number.isFinite(z) ? Math.max(-range3D * 3, Math.min(range3D * 3, z)) : NaN;
        if (Number.isFinite(safeZ)) {
          zMin = Math.min(zMin, safeZ);
          zMax = Math.max(zMax, safeZ);
        }
        pts[i][j] = { x, y, z: safeZ };
      }
    }
    if (!Number.isFinite(zMin)) {
      zMin = -1;
      zMax = 1;
    }
    const zSpan = Math.max(1e-6, zMax - zMin);

    const cosY = Math.cos(rotYaw),
      sinY = Math.sin(rotYaw);
    const cosP = Math.cos(rotPitch),
      sinP = Math.sin(rotPitch);
    const scale = Math.min(width, height) / (range3D * 3.4);

    const project = (x: number, y: number, z: number) => {
      const zn = ((z - (zMin + zMax) / 2) / zSpan) * (range3D * 1.6);
      const x1 = x * cosY - y * sinY;
      const y1 = x * sinY + y * cosY;
      const y2 = y1 * cosP - zn * sinP;
      const z2 = y1 * sinP + zn * cosP;
      const persp = 1 / (1 + z2 * 0.04);
      return {
        sx: width / 2 + x1 * scale * persp,
        sy: height / 2 - y2 * scale * persp,
        depth: z2,
      };
    };

    interface Quad {
      coords: { sx: number; sy: number }[];
      depth: number;
      normZ: number;
    }
    const quads: Quad[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const p00 = pts[i][j],
          p10 = pts[i + 1][j],
          p11 = pts[i + 1][j + 1],
          p01 = pts[i][j + 1];
        if (![p00.z, p10.z, p11.z, p01.z].every(Number.isFinite)) continue;
        const c00 = project(p00.x, p00.y, p00.z);
        const c10 = project(p10.x, p10.y, p10.z);
        const c11 = project(p11.x, p11.y, p11.z);
        const c01 = project(p01.x, p01.y, p01.z);
        const avgZ = (p00.z + p10.z + p11.z + p01.z) / 4;
        quads.push({
          coords: [c00, c10, c11, c01],
          depth: (c00.depth + c10.depth + c11.depth + c01.depth) / 4,
          normZ: (avgZ - zMin) / zSpan,
        });
      }
    }

    quads.sort((a, b) => b.depth - a.depth);

    for (const q of quads) {
      const t = Math.max(0, Math.min(1, q.normZ));
      const r = Math.round(15 + t * 225);
      const g = Math.round(55 + Math.sin(t * Math.PI) * 145 + t * 40);
      const b = Math.round(190 - t * 130);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.88)`;
      ctx.beginPath();
      ctx.moveTo(q.coords[0].sx, q.coords[0].sy);
      ctx.lineTo(q.coords[1].sx, q.coords[1].sy);
      ctx.lineTo(q.coords[2].sx, q.coords[2].sy);
      ctx.lineTo(q.coords[3].sx, q.coords[3].sy);
      ctx.closePath();
      ctx.fill();
      if (showWireframe) {
        ctx.strokeStyle = isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }

    const origin = project(0, 0, (zMin + zMax) / 2);
    const axX = project(range3D * 1.15, 0, (zMin + zMax) / 2);
    const axY = project(0, range3D * 1.15, (zMin + zMax) / 2);
    const axZ = project(0, 0, zMax + zSpan * 0.25);

    const drawAxis = (end: { sx: number; sy: number }, label: string, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(end.sx, end.sy);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = 'bold 12px "IBM Plex Mono", monospace';
      ctx.fillText(label, end.sx + 4, end.sy - 4);
    };

    drawAxis(axX, 'X', '#EF4444');
    drawAxis(axY, 'Y', '#10B981');
    drawAxis(axZ, 'Z', '#38BDF8');
  }, [mode, expr3D, range3D, rotYaw, rotPitch, showWireframe, theme, angleMode, variables]);

  const zoom = (factor: number) => {
    setBounds((prev) => zoomBoundsAt(prev, factor, 0.5, 0.5));
  };

  const handleExportPNG = () => {
    const canvas = mode === '2d' ? canvas2DRef.current : canvas3DRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `mathmaster_${mode}_graph.png`;
    a.click();
  };

  const addFunction = (type: GraphFunction['type']) => {
    const defaults: Record<GraphFunction['type'], { expr: string; exprY?: string }> = {
      explicit: { expr: 'cos(x)' },
      parametric: { expr: '3*cos(t)', exprY: '2*sin(2*t)' },
      polar: { expr: '2*cos(3*theta)' },
      implicit: { expr: 'x^2 + y^2 = 9' },
    };
    const newId = `f_${Date.now()}`;
    setFunctions((prev) => [
      ...prev,
      {
        id: newId,
        type,
        expression: defaults[type].expr,
        expressionY: defaults[type].exprY,
        color: CURVE_COLORS[prev.length % CURVE_COLORS.length],
        visible: true,
        tMin: 0,
        tMax: 2 * Math.PI,
      },
    ]);
  };

  const maxima = analysis.extrema.filter((p) => p.kind === 'max');
  const minima = analysis.extrema.filter((p) => p.kind === 'min');

  return (
    <div className="space-y-5">
      {/* Mode & Presets Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1424] p-4">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setMode('2d')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              mode === '2d' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            2D Graphing
          </button>
          <button
            type="button"
            onClick={() => setMode('3d')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              mode === '3d' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            3D Surface z = f(x, y)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Presets:</span>
          {[
            {
              label: 'x² - 2 & 2sin(x)',
              fn: () => {
                setMode('2d');
                setPolarGrid(false);
                setFunctions([
                  { id: 'p1a', type: 'explicit', expression: 'x^2 - 2', color: CURVE_COLORS[0], visible: true },
                  { id: 'p1b', type: 'explicit', expression: 'sin(x) * 2', color: CURVE_COLORS[1], visible: true },
                ]);
              },
            },
            {
              label: 'x³ - 3x',
              fn: () => {
                setMode('2d');
                setPolarGrid(false);
                setFunctions([{ id: 'p2', type: 'explicit', expression: 'x^3 - 3*x', color: CURVE_COLORS[0], visible: true }]);
              },
            },
            {
              label: 'Polar Rose',
              fn: () => {
                setMode('2d');
                setPolarGrid(true);
                setFunctions([{ id: 'p5', type: 'polar', expression: '3*cos(4*theta)', color: CURVE_COLORS[3], visible: true, tMin: 0, tMax: 2 * Math.PI }]);
              },
            },
            {
              label: 'Lissajous (Param)',
              fn: () => {
                setMode('2d');
                setPolarGrid(false);
                setFunctions([{ id: 'p6', type: 'parametric', expression: '4*sin(3*t)', expressionY: '3*cos(2*t)', color: CURVE_COLORS[1], visible: true, tMin: 0, tMax: 2 * Math.PI }]);
              },
            },
            {
              label: 'Circle x²+y²=9',
              fn: () => {
                setMode('2d');
                setPolarGrid(false);
                setFunctions([{ id: 'p7', type: 'implicit', expression: 'x^2 + y^2 = 9', color: CURVE_COLORS[4], visible: true }]);
              },
            },
            { label: '3D z = x² + y²', fn: () => { setMode('3d'); setExpr3D('x^2 + y^2'); } },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={p.fn}
              className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-700 dark:text-slate-200 hover:border-blue-500 cursor-pointer"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleExportPNG}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PNG</span>
          </button>
        </div>
      </div>

      {mode === '2d' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Function Controls */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1424] p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Equations</h2>
                <div className="flex items-center gap-1 flex-wrap">
                  {(['explicit', 'parametric', 'polar', 'implicit'] as const).map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => addFunction(tp)}
                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-blue-500 cursor-pointer capitalize"
                    >
                      <Plus className="w-3 h-3" />
                      {tp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {functions.map((f) => {
                  const rangeState = paramRangeText[f.id] ?? {
                    min: f.tMin !== undefined ? String(Number(f.tMin.toFixed(4))) : '0',
                    max:
                      f.tMax !== undefined
                        ? Math.abs(f.tMax - 2 * Math.PI) < 1e-4
                          ? '2*pi'
                          : String(Number(f.tMax.toFixed(4)))
                        : '2*pi',
                  };
                  return (
                    <div
                      key={f.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: f.color }} />
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {f.type === 'explicit'
                              ? 'y = f(x)'
                              : f.type === 'polar'
                              ? 'r(θ)'
                              : f.type === 'implicit'
                              ? 'F(x, y) = 0'
                              : 'Parametric (x(t), y(t))'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setFunctions((prev) => prev.map((it) => (it.id === f.id ? { ...it, visible: !it.visible } : it)))
                            }
                            className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            title="Toggle visibility"
                          >
                            {f.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setFunctions((prev) => prev.filter((it) => it.id !== f.id))}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Remove function"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={f.expression}
                        onChange={(e) =>
                          setFunctions((prev) => prev.map((it) => (it.id === f.id ? { ...it, expression: e.target.value } : it)))
                        }
                        placeholder={
                          f.type === 'parametric'
                            ? 'x(t) = ...'
                            : f.type === 'polar'
                            ? 'r(theta) = ...'
                            : f.type === 'implicit'
                            ? 'e.g. x^2 + y^2 = 9'
                            : 'y = f(x)'
                        }
                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B14] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
                      />
                      {f.type === 'parametric' && (
                        <input
                          type="text"
                          value={f.expressionY || ''}
                          onChange={(e) =>
                            setFunctions((prev) =>
                              prev.map((it) => (it.id === f.id ? { ...it, expressionY: e.target.value } : it))
                            )
                          }
                          placeholder="y(t) = ..."
                          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B14] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
                        />
                      )}
                      {(f.type === 'parametric' || f.type === 'polar') && (
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                          <label className="flex items-center gap-1">
                            <span className="text-slate-500 shrink-0">{f.type === 'polar' ? 'θmin' : 'tmin'}</span>
                            <input
                              type="text"
                              value={rangeState.min}
                              onChange={(e) => {
                                const val = e.target.value;
                                setParamRangeText((p) => ({ ...p, [f.id]: { ...rangeState, min: val } }));
                                const parsed = parseParamBound(val, 0);
                                setFunctions((prev) => prev.map((it) => (it.id === f.id ? { ...it, tMin: parsed } : it)));
                              }}
                              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B14] px-1.5 py-0.5 text-xs"
                            />
                          </label>
                          <label className="flex items-center gap-1">
                            <span className="text-slate-500 shrink-0">{f.type === 'polar' ? 'θmax' : 'tmax'}</span>
                            <input
                              type="text"
                              value={rangeState.max}
                              onChange={(e) => {
                                const val = e.target.value;
                                setParamRangeText((p) => ({ ...p, [f.id]: { ...rangeState, max: val } }));
                                const parsed = parseParamBound(val, 2 * Math.PI);
                                setFunctions((prev) => prev.map((it) => (it.id === f.id ? { ...it, tMax: parsed } : it)));
                              }}
                              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070B14] px-1.5 py-0.5 text-xs"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Viewport Bounds & Coordinate Analysis */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1424] p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Viewport & Coordinate Analysis</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['xMin', 'xMax', 'yMin', 'yMax'] as const).map((k) => (
                  <label key={k} className="space-y-1">
                    <span className="text-slate-500 dark:text-slate-400 font-mono">{k}</span>
                    <input
                      type="number"
                      step="0.5"
                      value={Number(bounds[k].toFixed(2))}
                      onChange={(e) => setBounds((b) => ({ ...b, [k]: Number(e.target.value) || 0 }))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 font-mono text-xs"
                    />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                  <span>Cartesian Grid</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={polarGrid} onChange={(e) => setPolarGrid(e.target.checked)} />
                  <span>Polar Rings</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showPointLabels} onChange={(e) => setShowPointLabels(e.target.checked)} />
                  <span>Point Labels</span>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                    Roots (x-intercepts): {analysis.roots.length}
                  </div>
                  <div className="flex flex-wrap gap-1 font-mono">
                    {analysis.roots.length > 0 ? (
                      analysis.roots.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseEnter={() => setHighlightedPt(p)}
                          onMouseLeave={() => setHighlightedPt(null)}
                          className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:border-emerald-400 cursor-pointer"
                          title={p.label}
                        >
                          ({fmtCoord(p.x)}, 0)
                        </button>
                      ))
                    ) : (
                      <span className="text-slate-500">None in view</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-pink-600 dark:text-pink-400 font-semibold mb-1">
                    Local Maxima ({maxima.length}) & Minima ({minima.length})
                  </div>
                  <div className="flex flex-wrap gap-1 font-mono">
                    {analysis.extrema.length > 0 ? (
                      analysis.extrema.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseEnter={() => setHighlightedPt(p)}
                          onMouseLeave={() => setHighlightedPt(null)}
                          className="px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/30 text-pink-700 dark:text-pink-300 hover:border-pink-400 cursor-pointer"
                          title={p.label}
                        >
                          {p.kind === 'max' ? 'Max' : 'Min'} ({fmtCoord(p.x)}, {fmtCoord(p.y)})
                        </button>
                      ))
                    ) : (
                      <span className="text-slate-500">None in view</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sky-600 dark:text-sky-400 font-semibold mb-1">
                    Y-Intercepts: {analysis.yIntercepts.length}
                  </div>
                  <div className="flex flex-wrap gap-1 font-mono">
                    {analysis.yIntercepts.length > 0 ? (
                      analysis.yIntercepts.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseEnter={() => setHighlightedPt(p)}
                          onMouseLeave={() => setHighlightedPt(null)}
                          className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 hover:border-sky-400 cursor-pointer"
                          title={p.label}
                        >
                          (0, {fmtCoord(p.y)})
                        </button>
                      ))
                    ) : (
                      <span className="text-slate-500">None in view</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-amber-600 dark:text-amber-400 font-semibold mb-1">
                    Intersections: {analysis.intersections.length}
                  </div>
                  <div className="flex flex-wrap gap-1 font-mono">
                    {analysis.intersections.length > 0 ? (
                      analysis.intersections.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseEnter={() => setHighlightedPt(p)}
                          onMouseLeave={() => setHighlightedPt(null)}
                          className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:border-amber-400 cursor-pointer"
                          title={p.label}
                        >
                          ({fmtCoord(p.x)}, {fmtCoord(p.y)})
                        </button>
                      ))
                    ) : (
                      <span className="text-slate-500">None in view</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right 2D Interactive Canvas */}
          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1424] p-3 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 px-1">
              <div className="font-mono text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3">
                <span>
                  {tracePos ? `Cursor: (${tracePos.x.toFixed(3)}, ${tracePos.y.toFixed(3)})` : 'Drag to pan · Scroll to zoom · Hover to trace'}
                </span>
                {traceSamples.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1 font-semibold" style={{ color: s.color }}>
                    f({s.x.toFixed(2)}) = {s.y.toFixed(3)}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => zoom(0.75)}
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => zoom(1.33)}
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setBounds({ xMin: -8, xMax: 8, yMin: -6, yMax: 6 })}
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Reset Viewport"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <canvas
              ref={canvas2DRef}
              className="w-full h-[380px] sm:h-[480px] rounded-lg border border-slate-200 dark:border-[#1E3158] cursor-crosshair touch-none"
              onMouseDown={(e) => setDragStart({ x: e.clientX, y: e.clientY, bounds })}
              onMouseUp={() => setDragStart(null)}
              onMouseLeave={() => {
                setDragStart(null);
                setTracePos(null);
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const px = e.clientX - rect.left;
                const py = e.clientY - rect.top;
                if (dragStart) {
                  const dxPx = e.clientX - dragStart.x;
                  const dyPx = e.clientY - dragStart.y;
                  setBounds(panBounds(dragStart.bounds, dxPx, dyPx, rect.width, rect.height));
                } else {
                  const sb = sanitizeBounds(bounds);
                  const x = sb.xMin + (px / rect.width) * (sb.xMax - sb.xMin);
                  const y = sb.yMax - (py / rect.height) * (sb.yMax - sb.yMin);
                  setTracePos({ px, py, x, y });
                }
              }}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY, bounds });
                }
              }}
              onTouchMove={(e) => {
                if (dragStart && e.touches.length === 1) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const dxPx = e.touches[0].clientX - dragStart.x;
                  const dyPx = e.touches[0].clientY - dragStart.y;
                  setBounds(panBounds(dragStart.bounds, dxPx, dyPx, rect.width, rect.height));
                }
              }}
              onTouchEnd={() => setDragStart(null)}
            />
          </div>
        </div>
      ) : (
        /* 3D Surface Plotter */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-4 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">3D Surface Equation</h2>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">z = f(x, y)</span>
              <input
                type="text"
                value={expr3D}
                onChange={(e) => setExpr3D(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-2 font-mono text-sm text-slate-900 dark:text-white"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['x^2 + y^2', 'x^2 - y^2', 'sin(sqrt(x^2 + y^2))', 'cos(x)*sin(y)'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setExpr3D(p)}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-[#1E3158] font-mono text-xs hover:border-cyan-400 cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Domain [-{range3D}, {range3D}]²</span>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={range3D}
                onChange={(e) => setRange3D(Number(e.target.value))}
                className="w-full"
              />
            </label>
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={showWireframe} onChange={(e) => setShowWireframe(e.target.checked)} />
              <span>Show Surface Mesh Grid</span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag directly on the 3D viewport to rotate azimuth and elevation angles.
            </p>
          </div>
          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-3">
            <canvas
              ref={canvas3DRef}
              className="w-full h-[380px] sm:h-[460px] rounded-lg border border-slate-200 dark:border-[#1E3158] cursor-grab active:cursor-grabbing touch-none"
              onMouseDown={(e) => setDrag3D({ x: e.clientX, y: e.clientY, yaw: rotYaw, pitch: rotPitch })}
              onMouseUp={() => setDrag3D(null)}
              onMouseLeave={() => setDrag3D(null)}
              onMouseMove={(e) => {
                if (!drag3D) return;
                setRotYaw(drag3D.yaw + (e.clientX - drag3D.x) * 0.008);
                setRotPitch(Math.max(-1.4, Math.min(1.4, drag3D.pitch + (e.clientY - drag3D.y) * 0.008)));
              }}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  setDrag3D({ x: e.touches[0].clientX, y: e.touches[0].clientY, yaw: rotYaw, pitch: rotPitch });
                }
              }}
              onTouchMove={(e) => {
                if (!drag3D || e.touches.length !== 1) return;
                setRotYaw(drag3D.yaw + (e.touches[0].clientX - drag3D.x) * 0.008);
                setRotPitch(Math.max(-1.4, Math.min(1.4, drag3D.pitch + (e.touches[0].clientY - drag3D.y) * 0.008)));
              }}
              onTouchEnd={() => setDrag3D(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
