import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading system data...', size = 'md' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size] || 'w-8 h-8';

  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
      <Loader2 className={`${sizeClasses} animate-spin text-sky-400`} />
      {message && <p className="text-sm font-medium tracking-wide">{message}</p>}
    </div>
  );
}

