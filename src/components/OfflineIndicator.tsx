import { WifiOff } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';

export const OfflineIndicator: React.FC = () => {
  const { t } = useAppContext();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/95 px-3 py-1.5 text-xs font-medium text-slate-950 shadow-lg">
      <WifiOff className="w-3.5 h-3.5" />
      <span>{t.common.offlineMode}</span>
    </div>
  );
};
