import { NavSection } from '../types/calculator';

export interface FormulaItem {
  id: string;
  title: string;
  category:
    | 'Calculus'
    | 'Algebra'
    | 'Trigonometry'
    | 'Linear Algebra'
    | 'Statistics'
    | 'Complex Numbers'
    | 'Number Theory'
    | 'Discrete Math'
    | 'Physics';
  latex: string;
  sampleExpression?: string;
  targetModule?: NavSection;
  notes: string;
}

export const FORMULA_LIBRARY: FormulaItem[] = [
  {
    id: 'quad-formula',
    title: 'Quadratic Formula',
    category: 'Algebra',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    sampleExpression: '(-5 + sqrt(5^2 - 4*1*6)) / (2*1)',
    targetModule: 'calculator',
    notes: 'Roots of ax² + bx + c = 0 where a ≠ 0. Discriminant Δ = b² - 4ac determines root nature.',
  },
  {
    id: 'euler-identity',
    title: "Euler's Formula & Identity",
    category: 'Complex Numbers',
    latex: 'e^{i\\theta} = \\cos(\\theta) + i\\sin(\\theta), \\quad e^{i\\pi} + 1 = 0',
    sampleExpression: 'e^(i*pi) + 1',
    targetModule: 'complex',
    notes: 'Connects complex exponentials to trigonometric functions and fundamental constants.',
  },
  {
    id: 'de-moivre',
    title: "De Moivre's Theorem",
    category: 'Complex Numbers',
    latex: '\\left(r(\\cos\\theta + i\\sin\\theta)\\right)^n = r^n(\\cos(n\\theta) + i\\sin(n\\theta))',
    targetModule: 'complex',
    notes: 'Efficiently computes integer powers and n-th roots of complex numbers in polar form.',
  },
  {
    id: 'pythagorean-trig',
    title: 'Pythagorean Trigonometric Identity',
    category: 'Trigonometry',
    latex: '\\sin^2(\\theta) + \\cos^2(\\theta) = 1',
    sampleExpression: 'sin(pi/5)^2 + cos(pi/5)^2',
    targetModule: 'calculator',
    notes: 'Fundamental identity derived from the unit circle in Euclidean geometry.',
  },
  {
    id: 'law-of-cosines',
    title: 'Law of Cosines',
    category: 'Trigonometry',
    latex: 'c^2 = a^2 + b^2 - 2ab\\cos(\\gamma)',
    sampleExpression: 'sqrt(3^2 + 4^2 - 2*3*4*cos(pi/3))',
    targetModule: 'calculator',
    notes: 'Generalizes the Pythagorean theorem to arbitrary planar triangles.',
  },
  {
    id: 'product-rule',
    title: 'Product Rule of Differentiation',
    category: 'Calculus',
    latex: '\\frac{d}{dx}[u(x)v(x)] = u\'(x)v(x) + u(x)v\'(x)',
    sampleExpression: 'x^2 * sin(x)',
    targetModule: 'calculus',
    notes: 'Derivative of a product of two differentiable functions.',
  },
  {
    id: 'chain-rule',
    title: 'Chain Rule',
    category: 'Calculus',
    latex: '\\frac{d}{dx}f(g(x)) = f\'(g(x)) \\cdot g\'(x)',
    sampleExpression: 'sin(x^3 + 2*x)',
    targetModule: 'calculus',
    notes: 'Computes derivatives of composite functions.',
  },
  {
    id: 'ftc',
    title: 'Fundamental Theorem of Calculus',
    category: 'Calculus',
    latex: '\\int_a^b f(x)\\,dx = F(b) - F(a), \\quad F\'(x) = f(x)',
    sampleExpression: 'x^2 * e^x',
    targetModule: 'calculus',
    notes: 'Links definite integration with antiderivative evaluation at endpoints.',
  },
  {
    id: 'integration-by-parts',
    title: 'Integration by Parts',
    category: 'Calculus',
    latex: '\\int u\\,dv = uv - \\int v\\,du',
    targetModule: 'calculus',
    notes: 'Inverse counterpart to the product rule for products of functions.',
  },
  {
    id: 'taylor-series',
    title: 'Taylor Series Expansion',
    category: 'Calculus',
    latex: 'f(x) = \\sum_{k=0}^{\\infty} \\frac{f^{(k)}(x_0)}{k!}(x - x_0)^k',
    sampleExpression: 'cos(x)',
    targetModule: 'calculus',
    notes: 'Approximates smooth functions locally around x₀ using higher-order derivatives.',
  },
  {
    id: 'gaussian-integral',
    title: 'Gaussian Integral',
    category: 'Calculus',
    latex: '\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}',
    sampleExpression: 'e^(-x^2)',
    targetModule: 'graphing',
    notes: 'Foundational integral in probability theory and quantum mechanics.',
  },
  {
    id: 'det-2x2',
    title: '2×2 Matrix Determinant & Inverse',
    category: 'Linear Algebra',
    latex: 'A^{-1} = \\frac{1}{ad - bc}\\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}',
    targetModule: 'linear-algebra',
    notes: 'Invertible if and only if det(A) = ad - bc ≠ 0.',
  },
  {
    id: 'eigen-eq',
    title: 'Eigenvalue Equation',
    category: 'Linear Algebra',
    latex: 'A\\mathbf{v} = \\lambda\\mathbf{v}, \\quad \\det(A - \\lambda I) = 0',
    targetModule: 'linear-algebra',
    notes: 'Characteristic polynomial determines eigenvalues λ and eigenspaces.',
  },
  {
    id: 'normal-pdf',
    title: 'Normal Distribution PDF',
    category: 'Statistics',
    latex: 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}\\exp\\left(-\\frac{(x-\\mu)^2}{2\\sigma^2}\\right)',
    targetModule: 'statistics',
    notes: 'Continuous Gaussian distribution parameterized by mean μ and standard deviation σ.',
  },
  {
    id: 'bayes-theorem',
    title: "Bayes' Theorem",
    category: 'Statistics',
    latex: 'P(A \\mid B) = \\frac{P(B \\mid A)P(A)}{P(B)}',
    targetModule: 'statistics',
    notes: 'Updates prior probability P(A) given observed evidence B.',
  },
  {
    id: 'pearson-r',
    title: 'Pearson Correlation Coefficient',
    category: 'Statistics',
    latex: 'r = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sqrt{\\sum (x_i - \\bar{x})^2 \\sum (y_i - \\bar{y})^2}}',
    targetModule: 'statistics',
    notes: 'Measures linear association between two paired variables in [-1, 1].',
  },
  {
    id: 'binomial-coeff',
    title: 'Combinations & Permutations',
    category: 'Discrete Math',
    latex: '\\binom{n}{r} = \\frac{n!}{r!(n-r)!}, \\quad P(n,r) = \\frac{n!}{(n-r)!}',
    sampleExpression: 'combinations(10, 3)',
    targetModule: 'calculator',
    notes: 'Counts unordered vs ordered selections of r items from n distinct elements.',
  },
  {
    id: 'bezout-identity',
    title: "Bézout's Identity",
    category: 'Number Theory',
    latex: 'ax + by = \\gcd(a, b) \\quad (x, y \\in \\mathbb{Z})',
    targetModule: 'numerical',
    notes: 'Extended Euclidean algorithm finds integer coefficients x and y.',
  },
  {
    id: 'euler-totient',
    title: "Euler's Theorem & Totient",
    category: 'Number Theory',
    latex: 'a^{\\varphi(n)} \\equiv 1 \\pmod{n} \\quad \\text{for } \\gcd(a, n) = 1',
    targetModule: 'numerical',
    notes: 'Generalizes Fermat’s little theorem; foundational to RSA cryptography.',
  },
  {
    id: 'newton-raphson',
    title: 'Newton–Raphson Iteration',
    category: 'Calculus',
    latex: 'x_{n+1} = x_n - \\frac{f(x_n)}{f\'(x_n)}',
    targetModule: 'numerical',
    notes: 'Quadratic-convergence root-finding method using tangent line approximations.',
  },
  {
    id: 'schrodinger-e',
    title: 'Planck–Einstein & de Broglie Relations',
    category: 'Physics',
    latex: 'E = h\\nu = \\hbar\\omega, \\quad \\lambda = \\frac{h}{p}',
    targetModule: 'calculator',
    notes: 'Wave-particle duality relations connecting energy, frequency, momentum, and wavelength.',
  },
];
