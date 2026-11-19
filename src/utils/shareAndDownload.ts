export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    if (typeof document !== 'undefined') {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  } catch {
    return false;
  }
  return false;
}

export function downloadCsvFile(csvContent: string, filename: string): void {
  if (typeof document === 'undefined') return;
  // Prefix UTF-8 BOM so Excel/Sheets renders mathematical Unicode symbols cleanly
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ShareOutcome {
  status: 'shared' | 'copied' | 'cancelled' | 'failed';
  message: string;
}

export async function shareReportText(
  title: string,
  text: string
): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return { status: 'shared', message: 'Shared report successfully.' };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { status: 'cancelled', message: 'Share cancelled.' };
      }
      // Fall through to clipboard fallback if Web Share rejects in desktop/iframe environments
    }
  }

  const copied = await copyTextToClipboard(text);
  if (copied) {
    return {
      status: 'copied',
      message: 'Report copied to clipboard for sharing.',
    };
  }
  return {
    status: 'failed',
    message: 'Unable to access share sheet or clipboard.',
  };
}
