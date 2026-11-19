import katex from 'katex';
import React, { useMemo } from 'react';

interface MathDisplayProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export const MathDisplay: React.FC<MathDisplayProps> = ({
  latex,
  displayMode = false,
  className = '',
}) => {
  const html = useMemo(() => {
    if (!latex || !latex.trim()) return '';
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: false,
      });
    } catch {
      return '';
    }
  }, [latex, displayMode]);

  if (!html) {
    return <span className={`font-mono text-sm ${className}`}>{latex}</span>;
  }

  return (
    <span
      className={`katex-wrapper overflow-x-auto max-w-full inline-block align-middle ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
