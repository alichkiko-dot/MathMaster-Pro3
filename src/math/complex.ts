export interface ComplexRect {
  re: number;
  im: number;
}

export interface ComplexFull {
  re: number;
  im: number;
  modulus: number;
  argRad: number;
  argDeg: number;
  cartesian: string;
  polarDeg: string;
  eulerForm: string;
  conjugate: ComplexRect;
}

function cleanZero(n: number): number {
  return Math.abs(n) < 1e-13 ? 0 : n;
}

export function formatComplex(reRaw: number, imRaw: number, digits = 8): string {
  const re = cleanZero(reRaw);
  const im = cleanZero(imRaw);
  const reS = String(Number(re.toPrecision(digits)));
  const imAbs = String(Number(Math.abs(im).toPrecision(digits)));
  if (im === 0) return reS;
  if (re === 0) return im === 1 ? 'i' : im === -1 ? '-i' : `${im < 0 ? '-' : ''}${imAbs}i`;
  const sign = im >= 0 ? ' + ' : ' - ';
  const unit = Math.abs(im) === 1 ? 'i' : `${imAbs}i`;
  return `${reS}${sign}${unit}`;
}

export function analyzeComplex(reRaw: number, imRaw: number): ComplexFull {
  const re = cleanZero(reRaw);
  const im = cleanZero(imRaw);
  const modulus = Math.hypot(re, im);
  const argRad = Math.atan2(im, re);
  const argDeg = (argRad * 180) / Math.PI;
  const rStr = Number(modulus.toPrecision(8));
  const radStr = Number(argRad.toPrecision(6));
  const degStr = Number(argDeg.toPrecision(6));
  return {
    re,
    im,
    modulus,
    argRad,
    argDeg,
    cartesian: formatComplex(re, im),
    polarDeg: `${rStr} ∠ ${degStr}°`,
    eulerForm: `${rStr} · e^(${radStr}i)`,
    conjugate: { re, im: cleanZero(-im) },
  };
}

export function polarToCartesian(r: number, angle: number, unit: 'RAD' | 'DEG'): ComplexRect {
  const rad = unit === 'DEG' ? (angle * Math.PI) / 180 : angle;
  return {
    re: cleanZero(r * Math.cos(rad)),
    im: cleanZero(r * Math.sin(rad)),
  };
}

export function complexAdd(a: ComplexRect, b: ComplexRect): ComplexRect {
  return { re: cleanZero(a.re + b.re), im: cleanZero(a.im + b.im) };
}

export function complexSub(a: ComplexRect, b: ComplexRect): ComplexRect {
  return { re: cleanZero(a.re - b.re), im: cleanZero(a.im - b.im) };
}

export function complexMul(a: ComplexRect, b: ComplexRect): ComplexRect {
  return {
    re: cleanZero(a.re * b.re - a.im * b.im),
    im: cleanZero(a.re * b.im + a.im * b.re),
  };
}

export function complexDiv(a: ComplexRect, b: ComplexRect): ComplexRect {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) throw new Error('Division by zero complex number (0 + 0i).');
  return {
    re: cleanZero((a.re * b.re + a.im * b.im) / denom),
    im: cleanZero((a.im * b.re - a.re * b.im) / denom),
  };
}

export function deMoivrePower(z: ComplexRect, n: number): ComplexFull {
  const r = Math.hypot(z.re, z.im);
  const theta = Math.atan2(z.im, z.re);
  const rn = Math.pow(r, n);
  const nTheta = n * theta;
  return analyzeComplex(rn * Math.cos(nTheta), rn * Math.sin(nTheta));
}

export function complexNthRoots(z: ComplexRect, n: number): ComplexFull[] {
  if (!Number.isInteger(n) || n < 1 || n > 24) {
    throw new Error('Root index n must be an integer between 1 and 24.');
  }
  const r = Math.hypot(z.re, z.im);
  const theta = Math.atan2(z.im, z.re);
  const rRoot = Math.pow(r, 1 / n);
  const roots: ComplexFull[] = [];
  for (let k = 0; k < n; k++) {
    const angle = (theta + 2 * Math.PI * k) / n;
    roots.push(analyzeComplex(rRoot * Math.cos(angle), rRoot * Math.sin(angle)));
  }
  return roots;
}
