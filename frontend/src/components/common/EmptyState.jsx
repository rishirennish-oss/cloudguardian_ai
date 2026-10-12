import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'Everything is functioning as expected.',
  icon: Icon = ShieldCheck,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
      <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-4">
        <Icon className="w-6 h-6 text-emerald-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-200">{title}</h3>
      <p className="text-sm text-slate-400 mt-1 max-w-sm">{description}</p>
    </div>
  );
}

