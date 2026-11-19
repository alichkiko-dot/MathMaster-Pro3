import React, { useEffect, useMemo, useState } from 'react';
import { NewHistoryItemInput, useAppContext } from '../context/AppContext';
import { useAutoSaveCalculation } from '../hooks/useAutoSaveCalculation';
import {
  addMatrices,
  determinantMatrix,
  eigenvaluesAndVectors,
  gaussianEliminationRREF,
  inverseMatrixWithSteps,
  luDecomposition,
  Matrix,
  matrixToLatex,
  multiplyMatrices,
  solveLinearSystem,
  subtractMatrices,
  transposeMatrix,
} from '../math/linearAlgebra';
import { StepItem } from '../types/calculator';
import { MathDisplay } from './MathDisplay';
import { ResultActionsBar } from './ResultActionsBar';

type LinAlgOp = 'add' | 'sub' | 'mul' | 'det' | 'inv' | 'trans' | 'rref' | 'lu' | 'eig' | 'solve';

function createMatrix(rows: number, cols: number, fill = 0): Matrix {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (fill === -1 ? (r === c ? 1 : 0) : fill))
  );
}

export const LinearAlgebraView: React.FC = () => {
  const { reopenRequest, clearReopenRequest } = useAppContext();
  const [rowsA, setRowsA] = useState(3);
  const [colsA, setColsA] = useState(3);
  const [matA, setMatA] = useState<Matrix>([
    [2, 1, -1],
    [-3, -1, 2],
    [-2, 1, 2],
  ]);

  const [rowsB, setRowsB] = useState(3);
  const [colsB, setColsB] = useState(3);
  const [matB, setMatB] = useState<Matrix>([
    [1, 0, 2],
    [0, 3, -1],
    [4, 1, 1],
  ]);

  const [vecB, setVecB] = useState<number[]>([8, -11, -3]);
  const [activeOp, setActiveOp] = useState<LinAlgOp>('solve');

  useEffect(() => {
    if (!reopenRequest || reopenRequest.item.module !== 'linear-algebra') return;
    const p = reopenRequest.item.payload as Record<string, any> | undefined;
    if (p) {
      if (p.activeOp) setActiveOp(p.activeOp as LinAlgOp);
      if (Array.isArray(p.matA) && p.matA.length > 0) {
        setMatA(p.matA);
        setRowsA(p.matA.length);
        setColsA(p.matA[0]?.length || 3);
      }
      if (Array.isArray(p.matB) && p.matB.length > 0) {
        setMatB(p.matB);
        setRowsB(p.matB.length);
        setColsB(p.matB[0]?.length || 3);
      }
      if (Array.isArray(p.vecB)) setVecB(p.vecB);
    }
    clearReopenRequest();
  }, [reopenRequest, clearReopenRequest]);

  const resizeMatrix = (
    current: Matrix,
    newR: number,
    newC: number,
    setR: (r: number) => void,
    setC: (c: number) => void,
    setM: (m: Matrix) => void
  ) => {
    setR(newR);
    setC(newC);
    const next = Array.from({ length: newR }, (_, r) =>
      Array.from({ length: newC }, (_, c) => current[r]?.[c] ?? 0)
    );
    setM(next);
  };

  const resizeA = (r: number, c: number) => {
    resizeMatrix(matA, r, c, setRowsA, setColsA, setMatA);
    setVecB((prev) => Array.from({ length: r }, (_, i) => prev[i] ?? 0));
  };

  let outputLatex = '';
  let outputText = '';
  let plainResult = '';
  let steps: StepItem[] = [];
  let error = '';

  const formatMatPlain = (m: Matrix) =>
    `[${m.map((r) => `[${r.map((v) => Number(v.toPrecision(6))).join(', ')}]`).join(', ')}]`;

  try {
    if (activeOp === 'add') {
      const res = addMatrices(matA, matB);
      outputLatex = `A + B = ${matrixToLatex(res)}`;
      plainResult = formatMatPlain(res);
    } else if (activeOp === 'sub') {
      const res = subtractMatrices(matA, matB);
      outputLatex = `A - B = ${matrixToLatex(res)}`;
      plainResult = formatMatPlain(res);
    } else if (activeOp === 'mul') {
      const res = multiplyMatrices(matA, matB);
      outputLatex = `A \\cdot B = ${matrixToLatex(res)}`;
      plainResult = formatMatPlain(res);
    } else if (activeOp === 'trans') {
      const res = transposeMatrix(matA);
      outputLatex = `A^T = ${matrixToLatex(res)}`;
      plainResult = formatMatPlain(res);
    } else if (activeOp === 'det') {
      const res = determinantMatrix(matA);
      const val = Number(res.det.toPrecision(10));
      outputLatex = `\\det(A) = ${val}`;
      plainResult = `det(A) = ${val}`;
      steps = res.steps;
    } else if (activeOp === 'inv') {
      const res = inverseMatrixWithSteps(matA);
      outputLatex = `A^{-1} = ${matrixToLatex(res.inverse)}`;
      plainResult = formatMatPlain(res.inverse);
      steps = res.steps;
    } else if (activeOp === 'rref') {
      const res = gaussianEliminationRREF(matA);
      outputLatex = `\\text{RREF}(A) = ${matrixToLatex(res.rref)}, \\quad \\text{rank}(A) = ${res.rank}`;
      plainResult = `rank=${res.rank}, RREF=${formatMatPlain(res.rref)}`;
      steps = res.steps;
    } else if (activeOp === 'lu') {
      const res = luDecomposition(matA);
      outputLatex = `L = ${matrixToLatex(res.L)}, \\quad U = ${matrixToLatex(res.U)}`;
      outputText = `Permutation vector P = [${res.P.join(', ')}]`;
      plainResult = `L=${formatMatPlain(res.L)}, U=${formatMatPlain(res.U)}, P=[${res.P.join(', ')}]`;
      steps = res.steps;
    } else if (activeOp === 'eig') {
      const res = eigenvaluesAndVectors(matA);
      outputText = `Eigenvalues λ: ${res.values.join(', ')}`;
      plainResult = outputText;
      if (res.vectors.length > 0) {
        outputLatex = res.vectors
          .map((v, i) => `\\lambda_${i + 1} = ${res.values[i]},\\; \\mathbf{v}_${i + 1} = \\begin{pmatrix} ${v.join(' \\\\ ')} \\end{pmatrix}`)
          .join(' \\quad ');
      }
    } else if (activeOp === 'solve') {
      const res = solveLinearSystem(matA, vecB);
      steps = res.steps;
      if (res.status === 'unique' && res.solution) {
        const solFormatted = res.solution.map((v) => Number(v.toPrecision(7)));
        outputLatex = `\\mathbf{x} = \\begin{pmatrix} ${solFormatted.join(' \\\\ ')} \\end{pmatrix}`;
        plainResult = `x = [${solFormatted.join(', ')}]`;
      } else if (res.status === 'infinite') {
        outputText = 'Infinitely many solutions (free variables present in RREF).';
        plainResult = outputText;
        outputLatex = `\\text{RREF}([A\\mid b]) = ${matrixToLatex(res.rref)}`;
      } else {
        outputText = 'System is inconsistent (no solution exists).';
        plainResult = outputText;
        outputLatex = `\\text{RREF}([A\\mid b]) = ${matrixToLatex(res.rref)}`;
      }
    }
  } catch (err: any) {
    error = err?.message || 'Matrix operation error.';
  }

  const OP_NAMES: Record<LinAlgOp, string> = {
    solve: 'Linear System Ax = b',
    rref: 'RREF & Rank',
    det: 'Determinant',
    inv: 'Matrix Inverse',
    trans: 'Matrix Transpose',
    lu: 'LU Decomposition',
    eig: 'Eigenvalues & Eigenvectors',
    add: 'Matrix Addition',
    sub: 'Matrix Subtraction',
    mul: 'Matrix Multiplication',
  };

  const currentHistoryItem: NewHistoryItemInput | null = useMemo(() => {
    if (error || !plainResult) return null;
    const matAStr = formatMatPlain(matA);
    const expr =
      activeOp === 'solve'
        ? `Solve A=${matAStr}, b=[${vecB.join(', ')}]`
        : activeOp === 'add' || activeOp === 'sub' || activeOp === 'mul'
        ? `${activeOp.toUpperCase()}: A=${matAStr}, B=${formatMatPlain(matB)}`
        : `${OP_NAMES[activeOp]}: A=${matAStr}`;
    return {
      expression: expr,
      latex: outputLatex || expr,
      result: plainResult,
      exactResult: null,
      isExact: false,
      module: 'linear-algebra',
      category: OP_NAMES[activeOp],
      steps,
      payload: { activeOp, matA, matB, vecB },
    };
  }, [error, plainResult, activeOp, matA, matB, vecB, outputLatex, steps]);

  useAutoSaveCalculation(
    currentHistoryItem ? `${activeOp}::${currentHistoryItem.expression}::${currentHistoryItem.result}` : '',
    Boolean(currentHistoryItem),
    () => currentHistoryItem,
    1600
  );

  return (
    <div className="space-y-5">
      {/* Operations Selector */}
      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328]">
        {[
          { id: 'solve', label: 'Solve Ax = b' },
          { id: 'rref', label: 'Gaussian Elimination (RREF & Rank)' },
          { id: 'det', label: 'Determinant' },
          { id: 'inv', label: 'Inverse A⁻¹' },
          { id: 'trans', label: 'Transpose Aᵀ' },
          { id: 'lu', label: 'LU Decomposition' },
          { id: 'eig', label: 'Eigenvalues & Vectors' },
          { id: 'add', label: 'A + B' },
          { id: 'sub', label: 'A − B' },
          { id: 'mul', label: 'A × B' },
        ].map((op) => (
          <button
            key={op.id}
            type="button"
            onClick={() => setActiveOp(op.id as LinAlgOp)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeOp === op.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-[#060B18] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      {/* Matrix Editors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Matrix A */}
        <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Matrix A ({rowsA}×{colsA})</h2>
            <div className="flex items-center gap-2 text-xs">
              <select
                value={rowsA}
                onChange={(e) => resizeA(Number(e.target.value), colsA)}
                className="rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1 font-mono"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} rows</option>
                ))}
              </select>
              <span>×</span>
              <select
                value={colsA}
                onChange={(e) => resizeA(rowsA, Number(e.target.value))}
                className="rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1 font-mono"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} cols</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setMatA(createMatrix(rowsA, colsA, -1))}
                className="px-2 py-1 rounded border border-slate-300 dark:border-[#243B6B] hover:border-blue-500 cursor-pointer"
              >
                Identity
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="inline-grid gap-1.5" style={{ gridTemplateColumns: `repeat(${colsA}, minmax(58px, 1fr))` }}>
              {matA.map((row, r) =>
                row.map((val, c) => (
                  <input
                    key={`${r}-${c}`}
                    type="number"
                    step="any"
                    value={val}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMatA((prev) => prev.map((rw, ri) => rw.map((cell, ci) => (ri === r && ci === c ? (Number.isFinite(v) ? v : 0) : cell))));
                    }}
                    className="w-full rounded-md border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 text-center font-mono text-xs"
                  />
                ))
              )}
            </div>
          </div>
        </section>

        {/* Matrix B or Vector b */}
        {activeOp === 'solve' ? (
          <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-4 space-y-3">
            <h2 className="text-sm font-semibold">Right-Hand Vector b ({rowsA}×1)</h2>
            <div className="grid grid-cols-1 gap-1.5 max-w-[140px]">
              {vecB.map((val, idx) => (
                <input
                  key={idx}
                  type="number"
                  step="any"
                  value={val}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVecB((prev) => prev.map((it, i) => (i === idx ? (Number.isFinite(v) ? v : 0) : it)));
                  }}
                  className="rounded-md border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 text-center font-mono text-xs"
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Matrix B ({rowsB}×{colsB})</h2>
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={rowsB}
                  onChange={(e) => resizeMatrix(matB, Number(e.target.value), colsB, setRowsB, setColsB, setMatB)}
                  className="rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1 font-mono"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n} rows</option>
                  ))}
                </select>
                <span>×</span>
                <select
                  value={colsB}
                  onChange={(e) => resizeMatrix(matB, rowsB, Number(e.target.value), setRowsB, setColsB, setMatB)}
                  className="rounded border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1 font-mono"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n} cols</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="inline-grid gap-1.5" style={{ gridTemplateColumns: `repeat(${colsB}, minmax(58px, 1fr))` }}>
                {matB.map((row, r) =>
                  row.map((val, c) => (
                    <input
                      key={`${r}-${c}`}
                      type="number"
                      step="any"
                      value={val}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setMatB((prev) => prev.map((rw, ri) => rw.map((cell, ci) => (ri === r && ci === c ? (Number.isFinite(v) ? v : 0) : cell))));
                      }}
                      className="w-full rounded-md border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2 py-1.5 text-center font-mono text-xs"
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Output & Steps */}
      <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-blue-600 dark:text-cyan-300">Result</h3>
          {currentHistoryItem && <ResultActionsBar compact item={currentHistoryItem} />}
        </div>
        {error ? (
          <div className="text-sm text-rose-500 font-medium">{error}</div>
        ) : (
          <div className="space-y-4">
            {outputText && <div className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">{outputText}</div>}
            {outputLatex && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#060B18] border border-slate-200 dark:border-[#1E3158] overflow-x-auto">
                <MathDisplay latex={outputLatex} displayMode />
              </div>
            )}
            {steps.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Row Reduction & Computation Steps</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {steps.map((s, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 dark:border-[#1E3158] p-3 text-xs space-y-1.5 overflow-x-auto">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{s.title}</div>
                      {s.latex && <MathDisplay latex={s.latex} />}
                      <p className="text-slate-500 dark:text-slate-400">{s.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
