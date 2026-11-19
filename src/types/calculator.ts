export type NavSection =
  | 'home'
  | 'calculator'
  | 'algebra'
  | 'graphing'
  | 'calculus'
  | 'linear-algebra'
  | 'statistics'
  | 'complex'
  | 'numerical'
  | 'history'
  | 'settings';

export type AngleMode = 'RAD' | 'DEG' | 'GRAD';

export type NumberFormat = 'auto' | 'decimal' | 'scientific' | 'engineering' | 'fraction';

export type LanguageCode = 'en' | 'fr' | 'es' | 'de';

export interface StepItem {
  title: string;
  expression?: string;
  latex?: string;
  explanation: string;
}

export interface EvaluationResult {
  ok: boolean;
  input: string;
  normalizedExpression: string;
  latexInput: string;
  exactValue: string | null;
  exactLatex: string | null;
  numericValue: string;
  numericLatex: string;
  isExact: boolean;
  isComplex: boolean;
  isSymbolic: boolean;
  roundingNote?: string;
  domainWarning?: string;
  error?: string;
  steps: StepItem[];
  assignedVariable?: { name: string; value: string };
}

export interface HistoryFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface HistoryItem {
  id: string;
  expression: string;
  latex: string;
  result: string;
  exactResult: string | null;
  isExact: boolean;
  module: NavSection | 'number-theory' | 'discrete';
  category?: string;
  timestamp: number;
  favorite: boolean;
  folderId: string;
  steps?: StepItem[];
  payload?: Record<string, unknown>;
}

export interface GraphFunction {
  id: string;
  type: 'explicit' | 'parametric' | 'polar' | 'implicit';
  expression: string;
  expressionY?: string; // for parametric y(t)
  color: string;
  visible: boolean;
  tMin?: number;
  tMax?: number;
  label?: string;
}

export interface Point2D {
  x: number;
  y: number;
  label?: string;
  kind?: 'root' | 'y-intercept' | 'max' | 'min' | 'intersection';
}

