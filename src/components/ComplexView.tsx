import React, { useEffect, useMemo, useState } from 'react';
import { NewHistoryItemInput, useAppContext } from '../context/AppContext';
import { useAutoSaveCalculation } from '../hooks/useAutoSaveCalculation';
import {
  analyzeComplex,
  complexAdd,
  complexDiv,
  complexMul,
  complexNthRoots,
  complexSub,
  deMoivrePower,
  polarToCartesian,
} from '../math/complex';
import { ResultActionsBar } from './ResultActionsBar';

export const ComplexView: React.FC = () => {
  const { reopenRequest, clearReopenRequest } = useAppContext();
  const [z1Re, setZ1Re] = useState(3);
  const [z1Im, setZ1Im] = useState(4);
  const [z2Re, setZ2Re] = useState(1);
  const [z2Im, setZ2Im] = useState(-2);
  const [powerN, setPowerN] = useState(3);
  const [rootN, setRootN] = useState(4);

  // Polar input helper
  const [polR, setPolR] = useState(2);
  const [polDeg, setPolDeg] = useState(60);

  const z1 = { re: z1Re, im: z1Im };
  const z2 = { re: z2Re, im: z2Im };
  const info1 = analyzeComplex(z1Re, z1Im);
  const info2 = analyzeComplex(z2Re, z2Im);

  const sum = analyzeComplex(complexAdd(z1, z2).re, complexAdd(z1, z2).im);
  const diff = analyzeComplex(complexSub(z1, z2).re, complexSub(z1, z2).im);
  const prod = analyzeComplex(complexMul(z1, z2).re, complexMul(z1, z2).im);
  let quot: ReturnType<typeof analyzeComplex> | null = null;
  let quotErr = '';
  try {
    const q = complexDiv(z1, z2);
    quot = analyzeComplex(q.re, q.im);
  } catch (e: any) {
    quotErr = e.message;
  }

  const deMoivre = deMoivrePower(z1, powerN);
  const roots = complexNthRoots(z1, Math.max(1, Math.min(12, rootN)));
  const polarRect = polarToCartesian(polR, polDeg, 'DEG');

  useEffect(() => {
    if (!reopenRequest || reopenRequest.item.module !== 'complex') return;
    const p = reopenRequest.item.payload as Record<string, any> | undefined;
    if (p) {
      if (typeof p.z1Re === 'number') setZ1Re(p.z1Re);
      if (typeof p.z1Im === 'number') setZ1Im(p.z1Im);
      if (typeof p.z2Re === 'number') setZ2Re(p.z2Re);
      if (typeof p.z2Im === 'number') setZ2Im(p.z2Im);
      if (typeof p.powerN === 'number') setPowerN(p.powerN);
      if (typeof p.rootN === 'number') setRootN(p.rootN);
    }
    clearReopenRequest();
  }, [reopenRequest, clearReopenRequest]);

  const currentHistoryItem: NewHistoryItemInput = useMemo(
    () => ({
      expression: `z1 = ${info1.cartesian}, z2 = ${info2.cartesian}, power n=${powerN}, roots k=${rootN}`,
      latex: `z_1 = ${info1.cartesian},\\; z_2 = ${info2.cartesian}`,
      result: `z1+z2 = ${sum.cartesian}; z1*z2 = ${prod.cartesian}; z1^${powerN} = ${deMoivre.cartesian}`,
      exactResult: null,
      isExact: false,
      module: 'complex',
      category: 'Complex Arithmetic & De Moivre',
      steps: [
        { title: 'Polar & Euler Forms', expression: `z1 = ${info1.polarDeg} = ${info1.eulerForm}`, explanation: `Modulus |z1| = ${info1.modulus.toPrecision(6)}, arg = ${info1.argDeg.toFixed(2)} deg.` },
        { title: 'Binary Operations', expression: `z1+z2 = ${sum.cartesian}, z1-z2 = ${diff.cartesian}, z1*z2 = ${prod.cartesian}`, explanation: quot ? `Division z1/z2 = ${quot.cartesian}.` : `Division error: ${quotErr}` },
        { title: `De Moivre Power & ${rootN}-th Roots`, expression: `z1^${powerN} = ${deMoivre.cartesian} (${deMoivre.polarDeg})`, explanation: roots.map((r, i) => `w_${i} = ${r.cartesian}`).join(', ') },
      ],
      payload: { z1Re, z1Im, z2Re, z2Im, powerN, rootN },
    }),
    [info1, info2, powerN, rootN, sum, diff, prod, quot, quotErr, deMoivre, roots, z1Re, z1Im, z2Re, z2Im]
  );

  useAutoSaveCalculation(
    `${z1Re},${z1Im}::${z2Re},${z2Im}::${powerN}::${rootN}`,
    true,
    () => currentHistoryItem,
    1600
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Inputs & Forms */}
        <div className="lg:col-span-6 space-y-5">
          <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Complex Operands z₁ and z₂</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-medium text-blue-600 dark:text-cyan-400">z₁ = a + bi</div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="any" value={z1Re} onChange={(e) => setZ1Re(Number(e.target.value) || 0)} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-2 font-mono text-xs text-slate-900 dark:text-white" placeholder="Re(z₁)" />
                  <input type="number" step="any" value={z1Im} onChange={(e) => setZ1Im(Number(e.target.value) || 0)} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-2 font-mono text-xs text-slate-900 dark:text-white" placeholder="Im(z₁)" />
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-0.5">
                  <div>|z₁| = {info1.modulus.toPrecision(6)} · arg = {info1.argDeg.toFixed(2)}°</div>
                  <div>Polar: {info1.polarDeg}</div>
                  <div>Euler: {info1.eulerForm}</div>
                  <div>Conjugate z̄₁ = {analyzeComplex(info1.conjugate.re, info1.conjugate.im).cartesian}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400">z₂ = c + di</div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="any" value={z2Re} onChange={(e) => setZ2Re(Number(e.target.value) || 0)} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-2 font-mono text-xs text-slate-900 dark:text-white" placeholder="Re(z₂)" />
                  <input type="number" step="any" value={z2Im} onChange={(e) => setZ2Im(Number(e.target.value) || 0)} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-2 font-mono text-xs text-slate-900 dark:text-white" placeholder="Im(z₂)" />
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-0.5">
                  <div>|z₂| = {info2.modulus.toPrecision(6)} · arg = {info2.argDeg.toFixed(2)}°</div>
                  <div>Polar: {info2.polarDeg}</div>
                  <div>Euler: {info2.eulerForm}</div>
                  <div>Conjugate z̄₂ = {analyzeComplex(info2.conjugate.re, info2.conjugate.im).cartesian}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Binary Operations */}
          <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Complex Arithmetic</h3>
              <ResultActionsBar compact item={currentHistoryItem} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                <div className="text-slate-500">z₁ + z₂</div>
                <div className="font-semibold text-sm text-slate-900 dark:text-sky-300">{sum.cartesian}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                <div className="text-slate-500">z₁ − z₂</div>
                <div className="font-semibold text-sm text-slate-900 dark:text-sky-300">{diff.cartesian}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                <div className="text-slate-500">z₁ × z₂</div>
                <div className="font-semibold text-sm text-slate-900 dark:text-sky-300">{prod.cartesian}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158]">
                <div className="text-slate-500">z₁ ÷ z₂</div>
                <div className="font-semibold text-sm text-slate-900 dark:text-sky-300">
                  {quot ? quot.cartesian : <span className="text-rose-500">{quotErr}</span>}
                </div>
              </div>
            </div>
          </section>

          {/* Polar -> Cartesian Quick Converter */}
          <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <h3 className="text-sm font-semibold">Polar / Euler Converter (r·e^(iθ))</h3>
            <div className="grid grid-cols-3 gap-2 items-end text-xs">
              <label className="space-y-1">
                <span className="text-slate-500">Modulus r</span>
                <input type="number" step="any" value={polR} onChange={(e) => setPolR(Number(e.target.value) || 0)} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono" />
              </label>
              <label className="space-y-1">
                <span className="text-slate-500">Angle θ (deg)</span>
                <input type="number" step="any" value={polDeg} onChange={(e) => setPolDeg(Number(e.target.value) || 0)} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono" />
              </label>
              <button
                type="button"
                onClick={() => {
                  setZ1Re(Number(polarRect.re.toPrecision(6)));
                  setZ1Im(Number(polarRect.im.toPrecision(6)));
                }}
                className="py-1.5 px-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 cursor-pointer"
              >
                Load as z₁
              </button>
            </div>
            <div className="font-mono text-xs text-slate-700 dark:text-sky-300">
              Cartesian: {analyzeComplex(polarRect.re, polarRect.im).cartesian}
            </div>
          </section>
        </div>

        {/* De Moivre, Roots, and Argand Plane */}
        <div className="lg:col-span-6 space-y-5">
          <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <h3 className="text-sm font-semibold">Argand Plane Visualization</h3>
            <ArgandPlot z1={z1} z2={z2} roots={roots} />
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">De Moivre's Theorem & n-th Roots of z₁</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span className="text-slate-500">Power z₁ⁿ (n)</span>
                <input type="number" min={-10} max={12} value={powerN} onChange={(e) => setPowerN(Math.trunc(Number(e.target.value)))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono" />
              </label>
              <label className="space-y-1">
                <span className="text-slate-500">Roots z₁^(1/k) (k)</span>
                <input type="number" min={1} max={12} value={rootN} onChange={(e) => setRootN(Math.max(1, Math.min(12, Math.trunc(Number(e.target.value)))))} className="w-full rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono" />
              </label>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158] font-mono text-xs">
              <span className="text-slate-500">z₁^{powerN} = </span>
              <span className="font-semibold text-blue-600 dark:text-sky-300">{deMoivre.cartesian}</span>
              <span className="text-slate-500 ml-2">({deMoivre.polarDeg})</span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-xs">
              {roots.map((rt, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-[#1E3158] last:border-0">
                  <span>w_{idx} = {rt.cartesian}</span>
                  <span className="text-slate-500">{rt.polarDeg}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const ArgandPlot: React.FC<{
  z1: { re: number; im: number };
  z2: { re: number; im: number };
  roots: { re: number; im: number }[];
}> = ({ z1, z2, roots }) => {
  const maxCoord = Math.max(
    4,
    Math.abs(z1.re),
    Math.abs(z1.im),
    Math.abs(z2.re),
    Math.abs(z2.im),
    ...roots.flatMap((r) => [Math.abs(r.re), Math.abs(r.im)])
  ) * 1.2;

  const S = 260;
  const cx = S / 2;
  const cy = S / 2;
  const toX = (re: number) => cx + (re / maxCoord) * (S * 0.44);
  const toY = (im: number) => cy - (im / maxCoord) * (S * 0.44);

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[300px] mx-auto aspect-square rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#070B14]">
      <line x1={0} y1={cy} x2={S} y2={cy} stroke="#475569" strokeWidth="1" />
      <line x1={cx} y1={0} x2={cx} y2={S} stroke="#475569" strokeWidth="1" />
      <text x={S - 24} y={cy - 6} fontSize="10" fill="#94A3B8" fontFamily="monospace">Re</text>
      <text x={cx + 6} y={14} fontSize="10" fill="#94A3B8" fontFamily="monospace">Im</text>

      {/* z1 vector */}
      <line x1={cx} y1={cy} x2={toX(z1.re)} y2={toY(z1.im)} stroke="#3B82F6" strokeWidth="2.5" />
      <circle cx={toX(z1.re)} cy={toY(z1.im)} r="4.5" fill="#3B82F6" />

      {/* z2 vector */}
      <line x1={cx} y1={cy} x2={toX(z2.re)} y2={toY(z2.im)} stroke="#06B6D4" strokeWidth="2" />
      <circle cx={toX(z2.re)} cy={toY(z2.im)} r="4" fill="#06B6D4" />

      {/* n-th roots */}
      {roots.map((r, idx) => (
        <circle key={idx} cx={toX(r.re)} cy={toY(r.im)} r="3.5" fill="#F59E0B" />
      ))}
    </svg>
  );
};
