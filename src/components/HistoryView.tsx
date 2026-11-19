import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  Filter,
  FolderPlus,
  RotateCcw,
  Search,
  Share2,
  Star,
  Trash2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  filterAndSearchHistory,
  formatBatchShareText,
  formatCalculationShareText,
  generateCalculationPDF,
  generateHistoryCSV,
  getCategoryDisplay,
  getModuleLabel,
} from '../math/exportHistory';
import { HistoryItem } from '../types/calculator';
import { copyTextToClipboard, downloadCsvFile, shareReportText } from '../utils/shareAndDownload';
import { MathDisplay } from './MathDisplay';

const CATEGORY_OPTIONS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Categories' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'algebra', label: 'Algebra' },
  { id: 'calculus', label: 'Calculus' },
  { id: 'linear-algebra', label: 'Matrices' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'complex', label: 'Complex Numbers' },
  { id: 'numerical', label: 'Numerical Methods' },
  { id: 'number-theory', label: 'Number Theory' },
  { id: 'discrete', label: 'Discrete Math' },
];

export const HistoryView: React.FC = () => {
  const {
    history,
    folders,
    toggleFavorite,
    deleteHistoryItem,
    clearHistory,
    moveHistoryToFolder,
    createFolder,
    deleteFolder,
    reopenHistoryItem,
    loadIntoCalculator,
    t,
  } = useAppContext();

  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);
  const [itemFeedback, setItemFeedback] = useState<{ id: string; text: string } | null>(null);
  const [globalNotice, setGlobalNotice] = useState<string>('');

  const filtered = useMemo(
    () =>
      filterAndSearchHistory(history, {
        folderId: selectedFolder,
        category: selectedCategory,
        onlyFavorites,
        query: searchQuery,
        dateRange,
        sortBy,
      }),
    [history, selectedFolder, selectedCategory, onlyFavorites, searchQuery, dateRange, sortBy]
  );

  const showGlobalNotice = (msg: string) => {
    setGlobalNotice(msg);
    window.setTimeout(() => {
      setGlobalNotice((prev) => (prev === msg ? '' : prev));
    }, 2400);
  };

  const flashItem = (id: string, text: string) => {
    setItemFeedback({ id, text });
    window.setTimeout(() => {
      setItemFeedback((prev) => (prev?.id === id && prev.text === text ? null : prev));
    }, 1800);
  };

  const handleExportCSV = () => {
    const csv = generateHistoryCSV(filtered, folders);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsvFile(csv, `mathmaster_history_${stamp}.csv`);
    showGlobalNotice(`Exported ${filtered.length} record${filtered.length === 1 ? '' : 's'} to CSV.`);
  };

  const handleExportBatchPDF = () => {
    const scopeParts: string[] = [];
    if (selectedCategory !== 'all') scopeParts.push(getModuleLabel(selectedCategory));
    if (selectedFolder !== 'all') {
      scopeParts.push(folders.find((f) => f.id === selectedFolder)?.name || 'Folder');
    }
    if (onlyFavorites) scopeParts.push('Favorites');
    const filterLabel = scopeParts.length > 0 ? scopeParts.join(' · ') : 'All History Records';

    const res = generateCalculationPDF(filtered, {
      subtitle: 'Academic Calculation History & Step-by-Step Report',
      filterLabel,
      download: true,
    });
    showGlobalNotice(`Generated ${res.filename} (${res.pageCount} page${res.pageCount === 1 ? '' : 's'}).`);
  };

  const handleShareBatch = async () => {
    if (filtered.length === 0) return;
    const text = formatBatchShareText(filtered);
    const outcome = await shareReportText('MathMaster Pro — Calculation History', text);
    if (outcome.status !== 'cancelled') {
      showGlobalNotice(outcome.message);
    }
  };

  const handleExportSinglePDF = (item: HistoryItem) => {
    generateCalculationPDF([item], {
      subtitle: `${getCategoryDisplay(item)} — Academic Solution Report`,
      filterLabel: getCategoryDisplay(item),
      download: true,
    });
    flashItem(item.id, 'PDF Exported');
  };

  const handleCopyExpr = async (item: HistoryItem) => {
    const ok = await copyTextToClipboard(item.expression);
    if (ok) flashItem(item.id, 'Copied Expr');
  };

  const handleCopyResult = async (item: HistoryItem) => {
    const ok = await copyTextToClipboard(item.result);
    if (ok) flashItem(item.id, 'Copied Result');
  };

  const handleShareItem = async (item: HistoryItem) => {
    const text = formatCalculationShareText(item);
    const outcome = await shareReportText(`MathMaster Pro: ${getCategoryDisplay(item)}`, text);
    if (outcome.status === 'shared' || outcome.status === 'copied') {
      flashItem(item.id, outcome.status === 'copied' ? 'Copied Report' : 'Shared');
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const id = createFolder(newFolderName.trim());
    setNewFolderName('');
    setSelectedFolder(id);
  };

  const toggleStepsExpanded = (id: string) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: history.length };
    for (const item of history) {
      map[item.module] = (map[item.module] || 0) + 1;
    }
    return map;
  }, [history]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Folders & Category Summary Sidebar */}
      <aside className="lg:col-span-4 space-y-4">
        <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Calculation Folders</h2>
            <span className="text-[11px] font-mono text-slate-500">{history.length} total</span>
          </div>
          <form onSubmit={handleCreateFolder} className="flex gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-3 py-1.5 text-xs"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 cursor-pointer shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedFolder('all')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex justify-between cursor-pointer ${
                selectedFolder === 'all' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>All Calculations</span>
              <span className="font-mono">{history.length}</span>
            </button>
            {folders.map((folder) => {
              const count = history.filter((h) => h.folderId === folder.id).length;
              return (
                <div key={folder.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`flex-1 min-w-0 text-left px-3 py-2 rounded-lg text-xs font-medium flex justify-between cursor-pointer ${
                      selectedFolder === folder.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{folder.name}</span>
                    <span className="font-mono ml-2">{count}</span>
                  </button>
                  {folder.id !== 'general' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedFolder === folder.id) setSelectedFolder('all');
                        deleteFolder(folder.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                      title="Delete folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Category Filter Breakdown */}
        <section className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filter by Category</span>
          </div>
          <div className="flex flex-wrap lg:flex-col gap-1">
            {CATEGORY_OPTIONS.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    active
                      ? 'bg-blue-600/15 border border-blue-500/40 text-blue-700 dark:text-cyan-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                  <span className="font-mono text-[11px] opacity-75">{count}</span>
                </button>
              );
            })}
          </div>
        </section>
      </aside>

      {/* Main History List & Export Toolbar */}
      <section className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-4 sm:p-5 space-y-4 min-w-0">
        {/* Search & Filter Row */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expressions, results, categories, or steps..."
                className="w-full rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'all' | 'today' | '7d' | '30d')}
              aria-label="Date range filter"
              className="rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-2 text-xs"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              aria-label="Sort order"
              className="rounded-lg border border-slate-300 dark:border-[#243B6B] bg-slate-50 dark:bg-[#060B18] px-2.5 py-2 text-xs"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {/* Export, Share, Favorites & Clear Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyFavorites((f) => !f)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                  onlyFavorites
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'border-slate-300 dark:border-[#243B6B] text-slate-700 dark:text-slate-300'
                }`}
              >
                <Star className="w-3.5 h-3.5" fill={onlyFavorites ? 'currentColor' : 'none'} />
                <span>Favorites</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filtered.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#243B6B] text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-500" />
                <span>{t.common.exportCsv}</span>
              </button>

              <button
                type="button"
                onClick={handleExportBatchPDF}
                disabled={filtered.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t.common.exportPdf} Report</span>
              </button>

              <button
                type="button"
                onClick={handleShareBatch}
                disabled={filtered.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#243B6B] text-xs font-medium hover:border-cyan-400 disabled:opacity-40 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Share Summary</span>
              </button>
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-900/60 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Inline Clear Confirmation (No window.confirm) */}
        {confirmClearAll && (
          <div className="rounded-lg border border-rose-400/50 bg-rose-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-medium text-rose-700 dark:text-rose-300">
              Delete all {history.length} saved calculation record{history.length === 1 ? '' : 's'}? This cannot be undone.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="px-3 py-1 rounded-md border border-slate-300 dark:border-[#243B6B] bg-white dark:bg-[#060B18] text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearHistory();
                  setConfirmClearAll(false);
                  showGlobalNotice('All calculation history cleared.');
                }}
                className="px-3 py-1 rounded-md bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer"
              >
                Confirm Clear All
              </button>
            </div>
          </div>
        )}

        {/* Global Export/Share Feedback Toast */}
        {globalNotice && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{globalNotice}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filtered.length}</strong> of {history.length} saved calculations
          </span>
          {(selectedCategory !== 'all' || selectedFolder !== 'all' || onlyFavorites || searchQuery || dateRange !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedFolder('all');
                setOnlyFavorites(false);
                setSearchQuery('');
                setDateRange('all');
              }}
              className="text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* History Records List */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            No saved calculations match your filter. Evaluate expressions in any MathMaster Pro module to build automatic history.
          </div>
        ) : (
          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {filtered.map((item) => {
              const stepCount = item.steps?.length ?? 0;
              const isExpanded = !!expandedSteps[item.id];
              const badgeText = itemFeedback?.id === item.id ? itemFeedback.text : '';

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 dark:border-[#1E3158] bg-slate-50 dark:bg-[#060B18]/60 p-3.5 sm:p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-600/10 border border-blue-500/30 font-semibold text-blue-700 dark:text-cyan-300">
                          {getCategoryDisplay(item)}
                        </span>
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                        {stepCount > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleStepsExpanded(item.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200/70 dark:bg-[#0B1328] text-slate-700 dark:text-slate-300 hover:text-cyan-400 cursor-pointer"
                          >
                            <span>{stepCount} steps</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                        {badgeText && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <Check className="w-3 h-3" />
                            {badgeText}
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-slate-900 dark:text-slate-100 overflow-x-auto">
                        <MathDisplay latex={item.latex || item.expression} />
                      </div>
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400 break-all">
                        {item.expression}
                      </div>

                      <div className="font-mono text-base font-bold text-blue-600 dark:text-cyan-300 tabular-nums break-words">
                        = {item.result}
                        {item.exactResult && item.exactResult !== item.result && (
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-2">
                            (Exact: {item.exactResult})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(item.id)}
                        className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer ${
                          item.favorite ? 'text-amber-500' : 'text-slate-400'
                        }`}
                        title="Toggle Favorite"
                      >
                        <Star className="w-4 h-4" fill={item.favorite ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteHistoryItem(item.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Step-by-Step Solution */}
                  {stepCount > 0 && isExpanded && (
                    <div className="rounded-lg border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] p-3 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Step-by-Step Solution
                      </div>
                      {item.steps!.map((step, sIdx) => (
                        <div key={sIdx} className="text-xs space-y-0.5 border-l-2 border-cyan-500/60 pl-2.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {sIdx + 1}. {step.title}
                          </div>
                          {step.latex ? (
                            <div className="overflow-x-auto text-blue-700 dark:text-cyan-300">
                              <MathDisplay latex={step.latex} />
                            </div>
                          ) : step.expression ? (
                            <div className="font-mono text-blue-700 dark:text-cyan-300">{step.expression}</div>
                          ) : null}
                          <p className="text-slate-500 dark:text-slate-400">{step.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Entry Footer Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-[#1E3158]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        value={item.folderId}
                        onChange={(e) => moveHistoryToFolder(item.id, e.target.value)}
                        aria-label="Move to folder"
                        className="rounded-md border border-slate-300 dark:border-[#243B6B] bg-white dark:bg-[#0B1328] px-2 py-1 text-xs"
                      >
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleCopyExpr(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400 cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>Expr</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyResult(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400 cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-cyan-400" />
                        <span>Result</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportSinglePDF(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400 cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-blue-500 dark:text-cyan-300" />
                        <span>PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareItem(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400 cursor-pointer"
                      >
                        <Share2 className="w-3 h-3 text-cyan-400" />
                        <span>Share</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.module !== 'calculator' && (
                        <button
                          type="button"
                          onClick={() => loadIntoCalculator(item.expression)}
                          className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-[#1E3158] bg-white dark:bg-[#0B1328] text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-cyan-400 cursor-pointer"
                        >
                          Calc
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => reopenHistoryItem(item)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-blue-600/15 text-blue-600 dark:text-cyan-300 text-xs font-semibold hover:bg-blue-600/25 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reopen &amp; Reuse</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
