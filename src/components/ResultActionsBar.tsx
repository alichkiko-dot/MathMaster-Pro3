import {
  BookmarkPlus,
  Check,
  Copy,
  FileText,
  Share2,
} from 'lucide-react';
import React, { useState } from 'react';
import { NewHistoryItemInput, useAppContext } from '../context/AppContext';
import {
  formatCalculationShareText,
  generateCalculationPDF,
  getCategoryDisplay,
} from '../math/exportHistory';
import { HistoryItem } from '../types/calculator';
import { copyTextToClipboard, shareReportText } from '../utils/shareAndDownload';

interface ResultActionsBarProps {
  item: NewHistoryItemInput;
  compact?: boolean;
  showSaveButton?: boolean;
  showCopyExpression?: boolean;
}

export const ResultActionsBar: React.FC<ResultActionsBarProps> = ({
  item,
  compact = false,
  showSaveButton = true,
  showCopyExpression = true,
}) => {
  const { addHistoryItem } = useAppContext();
  const [feedback, setFeedback] = useState<'expr' | 'result' | 'saved' | 'shared' | 'pdf' | null>(null);
  const [statusLabel, setStatusLabel] = useState<string>('');

  const flash = (kind: typeof feedback, msg = '') => {
    setFeedback(kind);
    setStatusLabel(msg);
    window.setTimeout(() => {
      setFeedback((prev) => (prev === kind ? null : prev));
      setStatusLabel('');
    }, 1800);
  };

  const toHistoryRecord = (): HistoryItem => ({
    ...item,
    id: 'preview',
    timestamp: Date.now(),
    favorite: false,
    folderId: item.folderId || 'general',
  });

  const handleCopyExpr = async () => {
    const ok = await copyTextToClipboard(item.expression);
    if (ok) flash('expr');
  };

  const handleCopyResult = async () => {
    const ok = await copyTextToClipboard(item.result);
    if (ok) flash('result');
  };

  const handleSave = () => {
    addHistoryItem(item);
    flash('saved');
  };

  const handleExportPdf = () => {
    const record = toHistoryRecord();
    generateCalculationPDF([record], {
      subtitle: `${getCategoryDisplay(record)} — Academic Solution Report`,
      filterLabel: getCategoryDisplay(record),
      download: true,
    });
    flash('pdf');
  };

  const handleShare = async () => {
    const record = toHistoryRecord();
    const report = formatCalculationShareText(record);
    const outcome = await shareReportText(`MathMaster Pro: ${getCategoryDisplay(record)}`, report);
    if (outcome.status === 'shared' || outcome.status === 'copied') {
      flash('shared', outcome.status === 'copied' ? 'Copied Report' : 'Shared');
    }
  };

  const btnCls = compact
    ? 'inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#081022] text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400 transition-colors cursor-pointer'
    : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#081022] text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400 transition-colors cursor-pointer';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showCopyExpression && (
        <button
          type="button"
          onClick={handleCopyExpr}
          title="Copy mathematical expression"
          className={btnCls}
        >
          {feedback === 'expr' ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>{feedback === 'expr' ? 'Copied Expr' : 'Copy Expr'}</span>
        </button>
      )}

      <button
        type="button"
        onClick={handleCopyResult}
        title="Copy result value"
        className={btnCls}
      >
        {feedback === 'result' ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-cyan-400" />
        )}
        <span>{feedback === 'result' ? 'Copied' : 'Copy Result'}</span>
      </button>

      <button
        type="button"
        onClick={handleExportPdf}
        title="Export PDF report with equations, result, and steps"
        className={btnCls}
      >
        {feedback === 'pdf' ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-300" />
        )}
        <span>{feedback === 'pdf' ? 'PDF Ready' : 'Export PDF'}</span>
      </button>

      <button
        type="button"
        onClick={handleShare}
        title="Share calculation report"
        className={btnCls}
      >
        {feedback === 'shared' ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Share2 className="w-3.5 h-3.5 text-cyan-400" />
        )}
        <span>{feedback === 'shared' ? statusLabel || 'Shared' : 'Share'}</span>
      </button>

      {showSaveButton && (
        <button
          type="button"
          onClick={handleSave}
          title="Save calculation to History"
          className={btnCls}
        >
          {feedback === 'saved' ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <BookmarkPlus className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          )}
          <span>{feedback === 'saved' ? 'Saved' : 'Save'}</span>
        </button>
      )}
    </div>
  );
};
