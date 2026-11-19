import { StepItem } from '../types/calculator';
import { math } from './engine';

export type Matrix = number[][];

export function formatMatrix(m: Matrix, digits = 6): string {
  return m
    .map((row) => '[ ' + row.map((v) => Number((Math.abs(v) < 1e-12 ? 0 : v).toPrecision(digits))).join(', ') + ' ]')
    .join('\n');
}

export function matrixToLatex(m: Matrix, digits = 5): string {
  const rows = m
    .map((row) =>
      row
        .map((v) => {
          const clean = Math.abs(v) < 1e-12 ? 0 : Number(v.toPrecision(digits));
          return String(clean);
        })
        .join(' & ')
    )
    .join(' \\\\ ');
  return `\\begin{pmatrix} ${rows} \\end{pmatrix}`;
}

export function addMatrices(A: Matrix, B: Matrix): Matrix {
  if (A.length !== B.length || A[0].length !== B[0].length) {
    throw new Error(`Dimension mismatch: A is ${A.length}×${A[0].length}, B is ${B.length}×${B[0].length}.`);
  }
  return A.map((r, i) => r.map((v, j) => v + B[i][j]));
}

export function subtractMatrices(A: Matrix, B: Matrix): Matrix {
  if (A.length !== B.length || A[0].length !== B[0].length) {
    throw new Error(`Dimension mismatch: A is ${A.length}×${A[0].length}, B is ${B.length}×${B[0].length}.`);
  }
  return A.map((r, i) => r.map((v, j) => v - B[i][j]));
}

export function multiplyMatrices(A: Matrix, B: Matrix): Matrix {
  if (A[0].length !== B.length) {
    throw new Error(`Cannot multiply ${A.length}×${A[0].length} matrix by ${B.length}×${B[0].length} matrix.`);
  }
  const rows = A.length;
  const cols = B[0].length;
  const inner = B.length;
  const out: Matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let k = 0; k < inner; k++) sum += A[i][k] * B[k][j];
      out[i][j] = Math.abs(sum) < 1e-12 ? 0 : sum;
    }
  }
  return out;
}

export function transposeMatrix(A: Matrix): Matrix {
  return A[0].map((_, j) => A.map((row) => row[j]));
}

export function determinantMatrix(A: Matrix): { det: number; steps: StepItem[] } {
  if (A.length !== A[0].length) {
    throw new Error(`Determinant requires a square matrix (got ${A.length}×${A[0].length}).`);
  }
  const n = A.length;
  const M = A.map((r) => [...r]);
  let det = 1;
  let swaps = 0;
  const steps: StepItem[] = [
    {
      title: '1. Initial Square Matrix',
      latex: `\\det${matrixToLatex(M)}`,
      explanation: `Computing determinant of ${n}×${n} matrix via Gaussian elimination to upper-triangular form.`,
    },
  ];

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivotRow][col])) pivotRow = r;
    }
    if (Math.abs(M[pivotRow][col]) < 1e-12) {
      steps.push({
        title: `2. Zero Pivot at Column ${col + 1}`,
        explanation: 'A zero column pivot means the matrix is singular and det(A) = 0.',
      });
      return { det: 0, steps };
    }
    if (pivotRow !== col) {
      [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
      swaps++;
    }
    det *= M[col][col];
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / M[col][col];
      for (let c = col; c < n; c++) M[r][c] -= factor * M[col][c];
    }
  }

  const finalDet = (swaps % 2 === 1 ? -1 : 1) * det;
  steps.push({
    title: '2. Upper Triangular Product',
    latex: `U = ${matrixToLatex(M)}, \\quad \\det(A) = (-1)^{${swaps}} \\prod U_{ii} = ${Number(finalDet.toPrecision(10))}`,
    explanation: `Applied ${swaps} row swap(s); multiplied diagonal entries.`,
  });

  return { det: Math.abs(finalDet) < 1e-12 ? 0 : finalDet, steps };
}

export function gaussianEliminationRREF(A: Matrix): { rref: Matrix; rank: number; steps: StepItem[] } {
  const rows = A.length;
  const cols = A[0].length;
  const M = A.map((r) => [...r]);
  const steps: StepItem[] = [
    {
      title: '1. Initial Matrix',
      latex: matrixToLatex(M),
      explanation: `Reducing ${rows}×${cols} matrix to Reduced Row Echelon Form (RREF).`,
    },
  ];

  let lead = 0;
  let rank = 0;
  for (let r = 0; r < rows; r++) {
    if (lead >= cols) break;
    let i = r;
    while (Math.abs(M[i][lead]) < 1e-12) {
      i++;
      if (i === rows) {
        i = r;
        lead++;
        if (lead === cols) break;
      }
    }
    if (lead === cols) break;

    if (i !== r) {
      [M[i], M[r]] = [M[r], M[i]];
      steps.push({
        title: `Swap R${r + 1} ↔ R${i + 1}`,
        latex: matrixToLatex(M),
        explanation: `Moved non-zero pivot into row ${r + 1}.`,
      });
    }

    const pivot = M[r][lead];
    if (Math.abs(pivot - 1) > 1e-12) {
      for (let c = 0; c < cols; c++) M[r][c] /= pivot;
      steps.push({
        title: `Scale R${r + 1} ← R${r + 1} / ${Number(pivot.toPrecision(5))}`,
        latex: matrixToLatex(M),
        explanation: `Normalized leading entry in row ${r + 1} to 1.`,
      });
    }

    let eliminated = false;
    for (let k = 0; k < rows; k++) {
      if (k !== r && Math.abs(M[k][lead]) > 1e-12) {
        const factor = M[k][lead];
        for (let c = 0; c < cols; c++) {
          M[k][c] -= factor * M[r][c];
          if (Math.abs(M[k][c]) < 1e-12) M[k][c] = 0;
        }
        eliminated = true;
      }
    }
    if (eliminated) {
      steps.push({
        title: `Eliminate Column ${lead + 1} Entries`,
        latex: matrixToLatex(M),
        explanation: `Cleared all other entries in pivot column ${lead + 1}.`,
      });
    }

    rank++;
    lead++;
  }

  return { rref: M, rank, steps };
}

export function inverseMatrixWithSteps(A: Matrix): { inverse: Matrix; steps: StepItem[] } {
  if (A.length !== A[0].length) {
    throw new Error(`Matrix inverse requires a square matrix (got ${A.length}×${A[0].length}).`);
  }
  const n = A.length;
  const aug: Matrix = A.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  const { rref, rank, steps } = gaussianEliminationRREF(aug);
  // Check left half is I_n
  for (let i = 0; i < n; i++) {
    if (Math.abs(rref[i][i] - 1) > 1e-9) {
      throw new Error(`Matrix is singular (rank ${rank} < ${n}); inverse does not exist.`);
    }
  }
  const inverse = rref.map((row) => row.slice(n));
  steps.push({
    title: 'Extracted Inverse Matrix A⁻¹',
    latex: `A^{-1} = ${matrixToLatex(inverse)}`,
    explanation: 'Gauss-Jordan elimination transformed [A | I] into [I | A⁻¹].',
  });
  return { inverse, steps };
}

export function luDecomposition(A: Matrix): { L: Matrix; U: Matrix; P: number[]; steps: StepItem[] } {
  if (A.length !== A[0].length) {
    throw new Error('LU decomposition requires a square matrix.');
  }
  const res = math.lup(A) as any;
  const L: Matrix = res.L;
  const U: Matrix = res.U;
  const P: number[] = res.p;
  return {
    L,
    U,
    P,
    steps: [
      {
        title: '1. Lower Triangular Matrix L',
        latex: `L = ${matrixToLatex(L)}`,
        explanation: 'Unit lower triangular matrix storing elimination multipliers.',
      },
      {
        title: '2. Upper Triangular Matrix U',
        latex: `U = ${matrixToLatex(U)}`,
        explanation: 'Upper triangular matrix obtained after partial-pivoted Gaussian elimination (PA = LU).',
      },
    ],
  };
}

export function solveLinearSystem(A: Matrix, b: number[]): {
  status: 'unique' | 'infinite' | 'inconsistent';
  solution?: number[];
  rref: Matrix;
  steps: StepItem[];
} {
  if (A.length !== b.length) {
    throw new Error(`Row mismatch: A has ${A.length} rows while vector b has ${b.length} entries.`);
  }
  const nCols = A[0].length;
  const aug: Matrix = A.map((row, i) => [...row, b[i]]);
  const { rref, steps } = gaussianEliminationRREF(aug);

  // Check inconsistency: row [0 ... 0 | nonzero]
  for (let r = 0; r < rref.length; r++) {
    const coeffsZero = rref[r].slice(0, nCols).every((v) => Math.abs(v) < 1e-10);
    if (coeffsZero && Math.abs(rref[r][nCols]) > 1e-10) {
      steps.push({
        title: 'Inconsistent Row Detected',
        latex: `0 = ${Number(rref[r][nCols].toPrecision(6))}`,
        explanation: `Row ${r + 1} reduces to 0 = ${Number(rref[r][nCols].toPrecision(6))}, which is a contradiction; no solution exists.`,
      });
      return { status: 'inconsistent', rref, steps };
    }
  }

  // Count pivots in coeff block
  let pivots = 0;
  for (let r = 0; r < rref.length; r++) {
    if (rref[r].slice(0, nCols).some((v) => Math.abs(v) > 1e-10)) pivots++;
  }

  if (pivots < nCols) {
    steps.push({
      title: 'Underdetermined / Dependent System',
      explanation: `Rank (${pivots}) is less than number of variables (${nCols}), leaving ${nCols - pivots} free parameter(s) and infinitely many solutions.`,
    });
    return { status: 'infinite', rref, steps };
  }

  const solution = Array.from({ length: nCols }, (_, i) =>
    Math.abs(rref[i][nCols]) < 1e-12 ? 0 : rref[i][nCols]
  );

  const varNames = ['x', 'y', 'z', 'w', 'u', 'v'];
  steps.push({
    title: 'Back-Substitution / Solution Vector',
    latex: solution
      .map((val, idx) => `${varNames[idx] ?? `x_${idx + 1}`} = ${Number(val.toPrecision(8))}`)
      .join(',\\; '),
    explanation: 'Every variable has a leading pivot in RREF; read solution directly from the augmented column.',
  });

  return { status: 'unique', solution, rref, steps };
}

export function eigenvaluesAndVectors(A: Matrix): {
  values: string[];
  vectors: string[][];
} {
  if (!A.length || !A[0]?.length || A.length !== A[0].length) {
    throw new Error('Eigenvalues require a non-empty square matrix.');
  }
  const res = math.eigs(A) as any;
  const formatVal = (v: any) => {
    if (typeof v === 'number') return String(Number((Math.abs(v) < 1e-12 ? 0 : v).toPrecision(6)));
    if (v && typeof v === 'object' && 're' in v) {
      const re = Math.abs(v.re) < 1e-12 ? 0 : Number(v.re.toPrecision(5));
      const im = Math.abs(v.im) < 1e-12 ? 0 : Number(v.im.toPrecision(5));
      if (im === 0) return String(re);
      return `${re} ${im >= 0 ? '+' : '-'} ${Math.abs(im)}i`;
    }
    return String(v);
  };

  const rawVals = Array.isArray(res.values) ? res.values : res.values.toArray();
  const vectors: string[][] = [];
  const pairedValues: string[] = [];

  if (Array.isArray(res.eigenvectors) && res.eigenvectors.length > 0) {
    for (const ev of res.eigenvectors) {
      const vecArr = Array.isArray(ev.vector) ? ev.vector : ev.vector.toArray();
      vectors.push(vecArr.map(formatVal));
      pairedValues.push(formatVal(ev.value));
    }
  }

  // Keep full algebraic multiplicity list from rawVals when defective matrix has fewer eigenvectors than eigenvalues
  const values =
    pairedValues.length === rawVals.length ? pairedValues : rawVals.map(formatVal);

  return { values, vectors };
}
