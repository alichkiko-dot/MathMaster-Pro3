import { jsPDF } from 'jspdf';
import { HistoryFolder, HistoryItem, StepItem } from '../types/calculator';

export interface HistoryFilterOptions {
  folderId?: string;
  category?: string;
  onlyFavorites?: boolean;
  query?: string;
  dateRange?: 'all' | 'today' | '7d' | '30d';
  sortBy?: 'newest' | 'oldest';
  nowMs?: number;
}

export interface PdfReportOptions {
  title?: string;
  subtitle?: string;
  filterLabel?: string;
  exportDate?: Date;
  download?: boolean;
  fileName?: string;
}

export interface GeneratedPdfResult {
  doc: jsPDF;
  arrayBuffer: ArrayBuffer;
  filename: string;
  pageCount: number;
}

const MODULE_LABELS: Record<string, string> = {
  calculator: 'Calculator',
  algebra: 'Algebra',
  calculus: 'Calculus',
  'linear-algebra': 'Matrices',
  statistics: 'Statistics',
  complex: 'Complex Numbers',
  numerical: 'Numerical Methods',
  'number-theory': 'Number Theory',
  discrete: 'Discrete Math',
  graphing: 'Graphing',
  home: 'General',
  history: 'History',
  settings: 'Settings',
};

export function getModuleLabel(module: string): string {
  return MODULE_LABELS[module] || module;
}

export function getCategoryDisplay(item: Pick<HistoryItem, 'module' | 'category'>): string {
  const modLabel = getModuleLabel(item.module);
  if (item.category && item.category.trim() && item.category.toLowerCase() !== modLabel.toLowerCase()) {
    return `${modLabel} — ${item.category}`;
  }
  return modLabel;
}

/**
 * Normalizes mathematical Unicode symbols to WinAnsi-safe ASCII/Latin-1 text
 * so jsPDF standard Helvetica/Courier fonts render every mathematical symbol
 * crisply without mojibake or missing glyph boxes.
 */
export function sanitizePdfMathText(raw: string): string {
  if (!raw) return '';
  const replacements: [RegExp, string][] = [
    [/\r\n/g, '\n'],
    [/\u2212|\u2013|\u2014/g, '-'],
    [/\u00d7/g, '*'],
    [/\u00f7/g, '/'],
    [/\u00b1/g, '+/-'],
    [/\u221a/g, 'sqrt'],
    [/\u221b/g, 'cbrt'],
    [/\u222b/g, 'integral '],
    [/\u222c/g, 'double integral '],
    [/\u2202/g, 'd'],
    [/\u2207/g, 'grad'],
    [/\u2211/g, 'Sum'],
    [/\u220f/g, 'Prod'],
    [/\u221e/g, 'infinity'],
    [/\u2192|\u21d2/g, '->'],
    [/\u2194|\u21d4/g, '<->'],
    [/\u2248/g, '~'],
    [/\u2260/g, '!='],
    [/\u2264/g, '<='],
    [/\u2265/g, '>='],
    [/\u2227/g, ' AND '],
    [/\u2228/g, ' OR '],
    [/\u2295/g, ' XOR '],
    [/\u00ac/g, 'NOT '],
    [/\u222a/g, ' U '],
    [/\u2229/g, ' intersect '],
    [/\u25b3/g, ' symDiff '],
    [/\u2208/g, ' in '],
    [/\u2209/g, ' not in '],
    [/\u00b7/g, '*'],
    [/\u2022/g, '-'],
    [/\u2026/g, '...'],
    [/\u03c0/g, 'pi'],
    [/\u03b1/g, 'alpha'],
    [/\u03b2/g, 'beta'],
    [/\u03b3/g, 'gamma'],
    [/\u03b4/g, 'delta'],
    [/\u0394/g, 'Delta'],
    [/\u03b8/g, 'theta'],
    [/\u03bb/g, 'lambda'],
    [/\u03bc/g, 'mu'],
    [/\u03c3/g, 'sigma'],
    [/\u03c6/g, 'phi'],
    [/\u03c9/g, 'omega'],
    [/\u2102/g, 'C'],
    [/\u211d/g, 'R'],
    [/\u00b2/g, '^2'],
    [/\u00b3/g, '^3'],
    [/\u2074/g, '^4'],
    [/\u2075/g, '^5'],
    [/\u2076/g, '^6'],
    [/\u2077/g, '^7'],
    [/\u2078/g, '^8'],
    [/\u2079/g, '^9'],
    [/\u2070/g, '^0'],
    [/\u207b\u00b9/g, '^-1'],
    [/\u207b/g, '^-'],
    [/\u207f/g, '^n'],
    [/\u1d40/g, '^T'],
    [/\u02e3/g, '^x'],
    [/\u2080/g, '_0'],
    [/\u2081/g, '_1'],
    [/\u2082/g, '_2'],
    [/\u2083/g, '_3'],
    [/\u2084/g, '_4'],
    [/\u2085/g, '_5'],
    [/\u2086/g, '_6'],
    [/\u2087/g, '_7'],
    [/\u2088/g, '_8'],
    [/\u2089/g, '_9'],
    [/\u00b0/g, ' deg'],
    [/x\u0304/g, 'x_bar'],
    [/z\u0304/g, 'z_bar'],
    [/\u2033/g, '\'\''],
    [/\u2032/g, '\''],
    [/\u2223/g, '|'],
    [/\u25a1/g, '[]'],
  ];

  let out = raw;
  for (const [pattern, rep] of replacements) {
    out = out.replace(pattern, rep);
  }
  // Strip combining marks or non-printable / out-of-WinAnsi characters safely
  return out.replace(/[^\x09\x0a\x20-\x7e\u00a0-\u00ff]/g, '').trim();
}

export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateHistoryCSV(
  items: HistoryItem[],
  folders: HistoryFolder[] = []
): string {
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));
  const header = [
    'Date',
    'Category',
    'Module',
    'Folder',
    'Expression',
    'Result',
    'Exact Result',
    'Steps Count',
    'Favorite',
  ];

  const rows = items.map((item) => {
    const folderName = folderMap.get(item.folderId) || 'General';
    return [
      escapeCsvCell(new Date(item.timestamp).toISOString()),
      escapeCsvCell(getCategoryDisplay(item)),
      escapeCsvCell(getModuleLabel(item.module)),
      escapeCsvCell(folderName),
      escapeCsvCell(item.expression),
      escapeCsvCell(item.result),
      escapeCsvCell(item.exactResult || ''),
      escapeCsvCell(item.steps?.length ?? 0),
      escapeCsvCell(item.favorite ? 'Yes' : 'No'),
    ].join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

export function filterAndSearchHistory(
  history: HistoryItem[],
  options: HistoryFilterOptions = {}
): HistoryItem[] {
  const {
    folderId = 'all',
    category = 'all',
    onlyFavorites = false,
    query = '',
    dateRange = 'all',
    sortBy = 'newest',
    nowMs = Date.now(),
  } = options;

  const trimmedQuery = query.trim().toLowerCase();

  let cutoffMs = 0;
  if (dateRange === 'today') {
    const startOfDay = new Date(nowMs);
    startOfDay.setHours(0, 0, 0, 0);
    cutoffMs = startOfDay.getTime();
  } else if (dateRange === '7d') {
    cutoffMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  } else if (dateRange === '30d') {
    cutoffMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  }

  const filtered = history.filter((item) => {
    if (folderId !== 'all' && item.folderId !== folderId) return false;
    if (category !== 'all' && item.module !== category) return false;
    if (onlyFavorites && !item.favorite) return false;
    if (cutoffMs > 0 && item.timestamp < cutoffMs) return false;

    if (trimmedQuery) {
      const haystackParts = [
        item.expression,
        item.result,
        item.exactResult || '',
        item.module,
        getModuleLabel(item.module),
        item.category || '',
        ...(item.steps || []).flatMap((s) => [s.title, s.expression || '', s.explanation]),
      ];
      const matches = haystackParts.some((part) => part.toLowerCase().includes(trimmedQuery));
      if (!matches) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) =>
    sortBy === 'oldest' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
  );
}

export function isDuplicateTopHistory(
  history: HistoryItem[],
  candidate: Pick<HistoryItem, 'module' | 'expression' | 'result' | 'category'>
): boolean {
  const top = history[0];
  if (!top) return false;
  return (
    top.module === candidate.module &&
    (top.category || '') === (candidate.category || '') &&
    top.expression.trim() === candidate.expression.trim() &&
    top.result.trim() === candidate.result.trim()
  );
}

export function formatStepLine(step: StepItem, idx: number): string {
  const exprPart = step.expression ? ` | ${step.expression}` : '';
  return `  ${idx + 1}. ${step.title}${exprPart}\n     ${step.explanation}`;
}

export function formatCalculationShareText(item: Pick<HistoryItem, 'expression' | 'result' | 'exactResult' | 'module' | 'category' | 'timestamp' | 'steps'>): string {
  const lines: string[] = [
    'MathMaster Pro — Calculation Report',
    `Date: ${new Date(item.timestamp || Date.now()).toLocaleString()}`,
    `Category: ${getCategoryDisplay(item)}`,
    '',
    `Equation / Expression: ${item.expression}`,
    `Result: ${item.result}`,
  ];

  if (item.exactResult && item.exactResult !== item.result) {
    lines.push(`Exact Form: ${item.exactResult}`);
  }

  if (item.steps && item.steps.length > 0) {
    lines.push('', 'Step-by-Step Solution:');
    item.steps.forEach((step, idx) => {
      lines.push(formatStepLine(step, idx));
    });
  }

  return lines.join('\n');
}

export function formatBatchShareText(items: HistoryItem[], maxItems = 25): string {
  const subset = items.slice(0, maxItems);
  const lines: string[] = [
    'MathMaster Pro — Academic Calculation Summary',
    `Exported: ${new Date().toLocaleString()}`,
    `Calculations Included: ${subset.length}${items.length > maxItems ? ` (of ${items.length})` : ''}`,
    '========================================',
  ];

  subset.forEach((item, idx) => {
    lines.push(
      `#${idx + 1} [${getCategoryDisplay(item)}] (${new Date(item.timestamp).toLocaleString()})`,
      `  Expr: ${item.expression}`,
      `  Result: ${item.result}${item.exactResult && item.exactResult !== item.result ? ` (Exact: ${item.exactResult})` : ''}`
    );
    if (item.steps && item.steps.length > 0) {
      lines.push(`  Steps (${item.steps.length}):`);
      item.steps.forEach((step, sIdx) => {
        lines.push(`    ${sIdx + 1}. ${step.title}${step.expression ? `: ${step.expression}` : ''} — ${step.explanation}`);
      });
    }
    lines.push('');
  });

  return lines.join('\n').trim();
}

export function generateCalculationPDF(
  items: HistoryItem[],
  options: PdfReportOptions = {}
): GeneratedPdfResult {
  const {
    title = 'MathMaster Pro',
    subtitle = 'Academic Mathematical Calculation Report',
    filterLabel = 'All Selected Calculations',
    exportDate = new Date(),
    download = false,
    fileName,
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 18;

  // Academic navy header band
  doc.setFillColor(11, 19, 40);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setFillColor(6, 182, 212);
  doc.rect(0, 30, pageWidth, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(sanitizePdfMathText(title), margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(165, 243, 252);
  doc.text(sanitizePdfMathText(subtitle), margin, 20);

  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const dateText = `Export Date: ${exportDate.toLocaleString()}`;
  doc.text(sanitizePdfMathText(dateText), pageWidth - margin, 13, { align: 'right' });
  doc.text(
    sanitizePdfMathText(`Entries: ${items.length} | Scope: ${filterLabel}`),
    pageWidth - margin,
    20,
    { align: 'right' }
  );

  let y = 39;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      doc.addPage();
      y = 18;
    }
  };

  if (items.length === 0) {
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('No calculation records were selected for this report.', margin, y + 6);
  } else {
    items.forEach((item, index) => {
      ensureSpace(34);

      // Section header bar for each entry
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const entryHeading = sanitizePdfMathText(
        `#${index + 1}  ${getCategoryDisplay(item)}`
      );
      doc.text(entryHeading, margin + 3, y + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const timeLabel = sanitizePdfMathText(new Date(item.timestamp).toLocaleString());
      doc.text(timeLabel, pageWidth - margin - 3, y + 5.5, { align: 'right' });
      y += 11;

      // Expression / Problem
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 64, 175);
      doc.text('Equation / Expression:', margin + 2, y);
      y += 4.5;

      doc.setFont('courier', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const exprLines = doc.splitTextToSize(
        sanitizePdfMathText(item.expression || '-'),
        contentWidth - 6
      ) as string[];
      exprLines.forEach((line) => {
        ensureSpace(5);
        doc.text(line, margin + 3, y);
        y += 4.5;
      });
      y += 1.5;

      // Result Block
      const resultText = sanitizePdfMathText(item.result || '-');
      const exactText =
        item.exactResult && item.exactResult !== item.result
          ? `Exact Form: ${sanitizePdfMathText(item.exactResult)}`
          : '';
      const resultLines = doc.splitTextToSize(
        `= ${resultText}`,
        contentWidth - 8
      ) as string[];
      const exactLines = exactText
        ? (doc.splitTextToSize(exactText, contentWidth - 8) as string[])
        : [];
      const boxHeight = 6 + resultLines.length * 4.8 + exactLines.length * 4.2;

      ensureSpace(boxHeight + 4);
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(147, 197, 253);
      doc.roundedRect(margin + 1, y, contentWidth - 2, boxHeight, 1.5, 1.5, 'FD');

      let innerY = y + 5;
      doc.setFont('courier', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(3, 105, 161);
      resultLines.forEach((line) => {
        doc.text(line, margin + 4, innerY);
        innerY += 4.8;
      });

      if (exactLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 58, 138);
        exactLines.forEach((line) => {
          doc.text(line, margin + 4, innerY);
          innerY += 4.2;
        });
      }
      y += boxHeight + 4;

      // Step-by-Step Solution
      if (item.steps && item.steps.length > 0) {
        ensureSpace(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text(`Step-by-Step Solution (${item.steps.length} steps):`, margin + 2, y);
        y += 5;

        item.steps.forEach((step, sIdx) => {
          const titleLine = sanitizePdfMathText(`Step ${sIdx + 1}: ${step.title}`);
          const stepExprLines = step.expression
            ? (doc.splitTextToSize(
                sanitizePdfMathText(step.expression),
                contentWidth - 12
              ) as string[])
            : [];
          const stepExpLines = step.explanation
            ? (doc.splitTextToSize(
                sanitizePdfMathText(step.explanation),
                contentWidth - 12
              ) as string[])
            : [];

          const needed = 6 + stepExprLines.length * 4.2 + stepExpLines.length * 4.0;
          ensureSpace(needed + 2);

          doc.setDrawColor(226, 232, 240);
          doc.line(margin + 3, y - 2.5, margin + 3, y + needed - 3.5);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59);
          doc.text(titleLine, margin + 6, y);
          y += 4.2;

          if (stepExprLines.length > 0) {
            doc.setFont('courier', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(2, 132, 199);
            stepExprLines.forEach((line) => {
              doc.text(line, margin + 6, y);
              y += 4.2;
            });
          }

          if (stepExpLines.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            stepExpLines.forEach((line) => {
              doc.text(line, margin + 6, y);
              y += 4.0;
            });
          }

          y += 2;
        });
      }

      y += 4;
    });
  }

  // Academic Footer with Page Numbers across all pages
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      sanitizePdfMathText(`MathMaster Pro — Academic Report (${exportDate.toLocaleDateString()})`),
      margin,
      pageHeight - 8.5
    );
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin, pageHeight - 8.5, {
      align: 'right',
    });
  }

  const stamp = exportDate.toISOString().slice(0, 10);
  const resolvedFilename =
    fileName ||
    (items.length === 1
      ? `mathmaster_calculation_${stamp}.pdf`
      : `mathmaster_history_report_${stamp}.pdf`);

  const arrayBuffer = doc.output('arraybuffer');

  if (download) {
    doc.save(resolvedFilename);
  }

  return {
    doc,
    arrayBuffer,
    filename: resolvedFilename,
    pageCount,
  };
}
