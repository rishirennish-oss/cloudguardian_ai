import React from 'react';
import { RefreshCw, Activity, AlertCircle } from 'lucide-react';
import { useStatus } from '../../context/StatusContext';
import { formatTimestamp } from '../../utils/formatters';

export default function TopBar() {
  const { isLive, lastChecked, refreshStatus } = useStatus();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left indicator / context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isLive ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-400 tracking-wide">
                Live
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25">
              <span className="relative flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span className="text-xs font-semibold text-rose-400 tracking-wide flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Backend unreachable
              </span>
            </div>
          )}
        </div>

        <span className="hidden sm:inline-block text-xs text-slate-500">
          Last polled: {lastChecked ? formatTimestamp(lastChecked.toISOString()) : 'Never'}
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={refreshStatus}
          title="Refresh connection status"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 transition-all active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">Sync</span>
        </button>
      </div>
    </header>
  );
}

