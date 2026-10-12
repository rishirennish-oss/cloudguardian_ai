import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorBanner({ message = 'An unexpected error occurred.', onRetry }) {
  return (
    <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-4 my-4 flex items-start justify-between gap-4 text-rose-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
        <div>
          <h4 className="text-sm font-semibold text-rose-300">Connection or Service Notice</h4>
          <p className="text-sm text-rose-300/80 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg text-xs font-medium text-rose-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

