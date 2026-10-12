import React from 'react';

export default function SummaryCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  colorScheme = 'sky',
}) {
  const colorMap = {
    sky: {
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      iconText: 'text-sky-400',
      iconBg: 'bg-sky-500/15',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      iconText: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      iconText: 'text-amber-400',
      iconBg: 'bg-amber-500/15',
    },
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      iconText: 'text-rose-400',
      iconBg: 'bg-rose-500/15',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      iconText: 'text-purple-400',
      iconBg: 'bg-purple-500/15',
    },
  }[colorScheme] || {
    bg: 'bg-slate-800/40',
    border: 'border-slate-800',
    iconText: 'text-slate-300',
    iconBg: 'bg-slate-800',
  };

  return (
    <div
      className={`rounded-2xl p-5 bg-slate-900/70 border border-slate-800/80 shadow-sm hover:border-slate-700/80 transition-all`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-xl ${colorMap.iconBg} ${colorMap.iconText}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">
          {value}
        </span>
        {trend && (
          <span className="text-xs font-medium text-slate-400">
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-1 text-xs text-slate-400 font-medium">
          {subtext}
        </p>
      )}
    </div>
  );
}

