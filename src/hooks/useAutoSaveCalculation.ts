import { useEffect, useRef } from 'react';
import { NewHistoryItemInput, useAppContext } from '../context/AppContext';

/**
 * Automatically saves a settled valid calculation to history after a debounce delay,
 * skipping the initial mount state so navigating to a module does not create noise.
 */
export function useAutoSaveCalculation(
  signature: string,
  enabled: boolean,
  buildItem: () => NewHistoryItemInput | null,
  delayMs = 1500
) {
  const { addHistoryItem } = useAppContext();
  const initialSigRef = useRef<string | null>(null);
  const lastSavedSigRef = useRef<string>('');
  const buildItemRef = useRef(buildItem);
  buildItemRef.current = buildItem;

  useEffect(() => {
    if (initialSigRef.current === null) {
      initialSigRef.current = signature;
      return;
    }
    if (!enabled || !signature || signature === initialSigRef.current || signature === lastSavedSigRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      const payload = buildItemRef.current();
      if (payload) {
        addHistoryItem(payload);
        lastSavedSigRef.current = signature;
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [signature, enabled, delayMs, addHistoryItem]);
}
