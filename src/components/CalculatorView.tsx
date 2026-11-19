import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Delete,
  LineChart,
  Plus,
  Redo2,
  RotateCcw,
  Trash2,
  Undo2,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAutoSaveCalculation } from '../hooks/useAutoSaveCalculation';
import { evaluateExpression, expressionToLatex } from '../math/engine';
import { EvaluationResult } from '../types/calculator';
import { MathDisplay } from './MathDisplay';
import { ResultActionsBar } from './ResultActionsBar';
import { SymbolKeyboard } from './SymbolKeyboard';

export const CalculatorView: React.FC = () => {
  const {
    angleMode,
    setAngleMode,
    precision,
    numberFormat,
    variables,
    setVariable,
    deleteVariable,
    memoryValue,
    memoryClear,
    memoryStore,
    memoryAdd,
    memorySubtract,
    calculatorDraft,
    setCalculatorDraft,
    reopenRequest,
    clearReopenRequest,
    addHistoryItem,
    history,
    sendToGrapher,
    t,
  } = useAppContext();

  const [expr, setExpr] = useState<string>(calculatorDraft);
  const [undoStack, setUndoStack] = useState<string[]>([calculatorDraft]);
  const [undoIdx, setUndoIdx] = useState<number>(0);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [lastAns, setLastAns] = useState<string>('');
  const [showSteps, setShowSteps] = useState<boolean>(true);
  const [newVarName, setNewVarName] = useState<string>('');
  const [newVarVal, setNewVarVal] = useState<string>('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (calculatorDraft !== expr) {
      pushExpr(calculatorDraft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatorDraft]);

  useEffect(() => {
    if (reopenRequest && reopenRequest.item.module === 'calculator') {
      pushExpr(reopenRequest.item.expression);
      clearReopenRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reopenRequest]);

  useEffect(() => {
    const evalRes = evaluateExpression(expr, {
      angleMode,
      precision,
      format: numberFormat,
      variables,
    });
    setResult(evalRes);
  }, [expr, angleMode, precision, numberFormat, variables]);

  useAutoSaveCalculation(
    result?.ok ? `${expr}::${result.numericValue}::${angleMode}` : '',
    Boolean(result?.ok && expr.trim()),
    () => {
      if (!result?.ok || !expr.trim()) return null;
      return {
        expression: expr,
        latex: result.latexInput,
        result: result.numericValue,
        exactResult: result.exactValue,
        isExact: result.isExact,
        module: 'calculator',
        category: result.isSymbolic ? 'Symbolic' : result.isComplex ? 'Complex' : 'Scientific',
        steps: result.steps,
      };
    },
    1800
  );

  const pushExpr = (next: string) => {
    setExpr(next);
    setCalculatorDraft(next);
    const sliced = undoStack.slice(0, undoIdx + 1);
    if (sliced[sliced.length - 1] !== next) {
      const updated = [...sliced, next].slice(-50);
      setUndoStack(updated);
      setUndoIdx(updated.length - 1);
    }
  };

  const handleUndo = () => {
    if (undoIdx > 0) {
      const nextIdx = undoIdx - 1;
      setUndoIdx(nextIdx);
      setExpr(undoStack[nextIdx]);
      setCalculatorDraft(undoStack[nextIdx]);
    }
  };

  const handleRedo = () => {
    if (undoIdx < undoStack.length - 1) {
      const nextIdx = undoIdx + 1;
      setUndoIdx(nextIdx);
      setExpr(undoStack[nextIdx]);
      setCalculatorDraft(undoStack[nextIdx]);
    }
  };

  const insertAtCursor = (rawToken: string) => {
    const cursorMarker = '{cursor}';
    const markerIdx = rawToken.indexOf(cursorMarker);
    const cleanToken = rawToken.replace(cursorMarker, '');

    const el = inputRef.current;
    if (!el) {
      pushExpr(expr + cleanToken);
      return;
    }
    const start = el.selectionStart ?? expr.length;
    const end = el.selectionEnd ?? expr.length;
    const next = expr.slice(0, start) + cleanToken + expr.slice(end);
    pushExpr(next);
    requestAnimationFrame(() => {
      el.focus();
      const targetPos = markerIdx >= 0 ? start + markerIdx : start + cleanToken.length;
      el.setSelectionRange(targetPos, targetPos);
    });
  };

  const handleBackspace = () => {
    const el = inputRef.current;
    if (!el) {
      pushExpr(expr.slice(0, -1));
      return;
    }
    const start = el.selectionStart ?? expr.length;
    const end = el.selectionEnd ?? expr.length;
    if (start !== end) {
      const next = expr.slice(0, start) + expr.slice(end);
      pushExpr(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, start);
      });
    } else if (start > 0) {
      const next = expr.slice(0, start - 1) + expr.slice(start);
      pushExpr(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start - 1, start - 1);
      });
    }
  };

  const handleEvaluateCommit = () => {
    const evalRes = evaluateExpression(expr, {
      angleMode,
      precision,
      format: numberFormat,
      variables,
    });
    setResult(evalRes);
    if (evalRes.ok) {
      if (!evalRes.isSymbolic && evalRes.numericValue && evalRes.numericValue !== '∞' && evalRes.numericValue !== '-∞') {
        setLastAns(evalRes.numericValue);
      }
      if (evalRes.assignedVariable) {
        setVariable(evalRes.assignedVariable.name, evalRes.assignedVariable.value);
      }
      addHistoryItem({
        expression: expr,
        latex: evalRes.latexInput,
        result: evalRes.numericValue,
        exactResult: evalRes.exactValue,
        isExact: evalRes.isExact,
        module: 'calculator',
        category: evalRes.isSymbolic ? 'Symbolic' : evalRes.isComplex ? 'Complex' : 'Scientific',
        steps: evalRes.steps,
      });
    }
  };

  const handlePaste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) insertAtCursor(clip);
    } catch {
      // ignore clipboard permission errors
    }
  };

  const numericForMemory = (): number | null => {
    if (!result?.ok) return null;
    const n = Number(result.numericValue);
    return Number.isFinite(n) ? n : null;
  };

  const latexPreview = expressionToLatex(expr);
  const canPlot = /\bx\b/.test(expr) && result?.ok;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEvaluateCommit();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
    }
  };

  const handleAddVariable = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newVarName.trim();
    if (!/^[a-zA-Zαβγδθλμσω][a-zA-Z0-9_]*$/.test(cleanName)) return;
    setVariable(cleanName, newVarVal.trim() || '0');
    setNewVarName('');
    setNewVarVal('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* Primary Calculator Column */}
      <div className="xl:col-span-8 space-y-5">
        <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-4 sm:p-5 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-[#182848]">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#070E1F] border border-slate-200 dark:border-[#1E3158]">
              {(['RAD', 'DEG', 'GRAD'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAngleMode(m)}
                  className={`px-3 py-1 text-xs font-mono font-semibold rounded-md transition-colors cursor-pointer ${
                    angleMode === m
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoIdx <= 0}
                title="Undo (Ctrl+Z)"
                className="p-2 rounded-lg border border-slate-200 dark:border-[#1E3158] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#13203E] disabled:opacity-40 cursor-pointer"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={undoIdx >= undoStack.length - 1}
                title="Redo (Ctrl+Y)"
                className="p-2 rounded-lg border border-slate-200 dark:border-[#1E3158] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#13203E] disabled:opacity-40 cursor-pointer"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handlePaste}
                title="Paste expression"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E3158] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#13203E] cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Paste</span>
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                title="Delete character"
                className="p-2 rounded-lg border border-slate-200 dark:border-[#1E3158] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#13203E] cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => pushExpr('')}
                title="Clear expression"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 text-xs font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Memory Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              {[
                { label: 'MC', fn: memoryClear, title: 'Memory Clear' },
                {
                  label: 'MR',
                  fn: () => memoryValue !== null && insertAtCursor(String(memoryValue)),
                  title: 'Memory Recall',
                  disabled: memoryValue === null,
                },
                {
                  label: 'M+',
                  fn: () => {
                    const v = numericForMemory();
                    if (v !== null) memoryAdd(v);
                  },
                  title: 'Add result to Memory',
                },
                {
                  label: 'M−',
                  fn: () => {
                    const v = numericForMemory();
                    if (v !== null) memorySubtract(v);
                  },
                  title: 'Subtract result from Memory',
                },
                {
                  label: 'MS',
                  fn: () => {
                    const v = numericForMemory();
                    if (v !== null) memoryStore(v);
                  },
                  title: 'Store result in Memory',
                },
              ].map((m) => (
                <button
                  key={m.label}
                  type="button"
                  disabled={m.disabled}
                  title={m.title}
                  onClick={m.fn}
                  className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#081022] font-mono font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-400 disabled:opacity-40 cursor-pointer"
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="font-mono text-slate-600 dark:text-slate-300">
              Memory M ={' '}
              <span className="text-blue-700 dark:text-cyan-300 font-semibold">
                {memoryValue === null ? 'Empty' : Number(memoryValue.toPrecision(10))}
              </span>
            </div>
          </div>

          {/* Expression Editor */}
          <div>
            <label htmlFor="calc-expression" className="sr-only">
              Mathematical expression
            </label>
            <textarea
              id="calc-expression"
              ref={inputRef}
              rows={2}
              value={expr}
              onChange={(e) => pushExpr(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter expression, e.g. sin(pi/4)^2 + sqrt(16) or a = 3*pi"
              className="w-full resize-none rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-4 py-3 font-mono text-base sm:text-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Live KaTeX Preview + Evaluate Button */}
          {expr.trim() && (
            <div className="px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-[#081022] border border-slate-200 dark:border-[#1E3158] flex items-center justify-between gap-4">
              <div className="overflow-x-auto text-slate-900 dark:text-slate-100 text-base sm:text-lg">
                <MathDisplay latex={latexPreview} />
              </div>
              <button
                type="button"
                onClick={handleEvaluateCommit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-semibold hover:brightness-110 transition-all shrink-0 cursor-pointer"
              >
                <span>{t.common.evaluate}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Result Output Display */}
          <div className="rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#060B18] p-4">
            {!expr.trim() ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Type a mathematical expression or use the scientific keypad below.
                </p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {['sin(pi/4)^2 + cos(pi/4)^2', 'e^(i*pi) + 1', 'log2(1024)', '5!! + nCr(8, 3)'].map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => pushExpr(ex)}
                      className="px-2.5 py-1 rounded border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] font-mono text-slate-700 dark:text-cyan-300 hover:border-cyan-400 cursor-pointer"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : result?.ok ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-blue-700 dark:text-cyan-400">
                      {result.isSymbolic
                        ? t.common.symbolic
                        : result.isExact
                        ? t.common.exact
                        : t.common.approximate}
                    </span>
                    {result.isComplex && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Complex ℂ</span>
                      </>
                    )}
                    {result.assignedVariable && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Stored {result.assignedVariable.name}</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canPlot && (
                      <button
                        type="button"
                        onClick={() => sendToGrapher(expr)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-[#1E3158] text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400 cursor-pointer"
                      >
                        <LineChart className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Plot f(x)</span>
                      </button>
                    )}
                    <ResultActionsBar
                      compact
                      item={{
                        expression: expr,
                        latex: result.latexInput,
                        result: result.numericValue,
                        exactResult: result.exactValue,
                        isExact: result.isExact,
                        module: 'calculator',
                        category: result.isSymbolic ? 'Symbolic' : result.isComplex ? 'Complex' : 'Scientific',
                        steps: result.steps,
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white break-all tabular-nums">
                    {result.numericValue}
                  </div>
                  {result.exactValue && result.exactValue !== result.numericValue && (
                    <div className="text-sm text-blue-700 dark:text-cyan-300 flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Exact:</span>
                      <MathDisplay latex={result.exactLatex || result.exactValue} />
                    </div>
                  )}
                </div>

                {(result.domainWarning || result.roundingNote) && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {result.domainWarning || result.roundingNote}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-sm text-rose-600 dark:text-rose-400 font-medium">
                {result?.error || 'Unable to evaluate expression.'}
              </div>
            )}
          </div>

          {/* Step-by-Step Accordion */}
          {result?.ok && result.steps.length > 0 && (
            <div className="border-t border-slate-200 dark:border-[#182848] pt-3">
              <button
                type="button"
                onClick={() => setShowSteps((s) => !s)}
                className="flex items-center justify-between w-full text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-300 cursor-pointer"
              >
                <span>{showSteps ? t.common.hideSteps : t.common.showSteps} ({result.steps.length})</span>
                {showSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showSteps && (
                <ol className="mt-3 space-y-2">
                  {result.steps.map((step, i) => (
                    <li
                      key={i}
                      className="rounded-lg bg-slate-50 dark:bg-[#081022] border border-slate-200 dark:border-[#1E3158] p-3 text-xs space-y-1"
                    >
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{step.title}</div>
                      {step.latex ? (
                        <div className="text-sm text-blue-700 dark:text-cyan-300">
                          <MathDisplay latex={step.latex} />
                        </div>
                      ) : step.expression ? (
                        <div className="font-mono text-blue-700 dark:text-cyan-300">{step.expression}</div>
                      ) : null}
                      <p className="text-slate-600 dark:text-slate-400">{step.explanation}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </section>

        {/* Complete Scientific Calculator Keyboard */}
        <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-4 sm:p-5">
          <SymbolKeyboard
            onInsert={insertAtCursor}
            hasAns={!!lastAns}
            onAction={(act) => {
              if (act === 'evaluate') handleEvaluateCommit();
              else if (act === 'clear') pushExpr('');
              else if (act === 'backspace') handleBackspace();
              else if (act === 'ans' && lastAns) insertAtCursor(`(${lastAns})`);
            }}
          />
        </section>
      </div>

      {/* Right Rail: Variables & Quick History */}
      <aside className="xl:col-span-4 space-y-5">
        <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Custom Variables</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">Tap to insert</span>
          </div>

          <form onSubmit={handleAddVariable} className="grid grid-cols-12 gap-2">
            <input
              type="text"
              value={newVarName}
              onChange={(e) => setNewVarName(e.target.value)}
              placeholder="Name"
              className="col-span-4 rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={newVarVal}
              onChange={(e) => setNewVarVal(e.target.value)}
              placeholder="Value (e.g. 2*pi)"
              className="col-span-6 rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              title="Add variable"
              className="col-span-2 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-[#182848] max-h-48 overflow-y-auto">
            {Object.keys(variables).length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                No custom variables defined. Assign one via a = 5.
              </p>
            ) : (
              Object.entries(variables).map(([name, val]) => (
                <div key={name} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => insertAtCursor(name)}
                    className="font-mono text-left hover:text-cyan-400 cursor-pointer truncate"
                  >
                    <span className="font-semibold text-blue-700 dark:text-cyan-300">{name}</span>
                    <span className="text-slate-400 mx-1.5">=</span>
                    <span className="text-slate-800 dark:text-slate-200">{val}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteVariable(name)}
                    aria-label={`Delete variable ${name}`}
                    className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Evaluations</h2>
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Press Enter or Evaluate to save calculations here.
            </p>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {history.slice(0, 12).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pushExpr(item.expression)}
                  className="w-full text-left rounded-lg border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#081022] p-2.5 hover:border-cyan-400 transition-colors cursor-pointer"
                >
                  <div className="font-mono text-xs text-slate-600 dark:text-slate-300 truncate">
                    {item.expression}
                  </div>
                  <div className="font-mono text-sm font-semibold text-blue-700 dark:text-cyan-300 truncate mt-0.5">
                    = {item.result}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
};
