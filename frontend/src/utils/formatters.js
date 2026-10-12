// Prettifies snake_case / camelCase / enums for clean UI display
export function prettifyEnum(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Color classes based on serverStatus and riskLevel
// Rule: healthy/low green, degraded/medium yellow, high orange, down/critical red
export function getStatusColor(status) {
  switch (status) {
    case 'healthy':
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400',
        ring: 'ring-emerald-400/20',
      };
    case 'degraded':
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        dot: 'bg-amber-400',
        ring: 'ring-amber-400/20',
      };
    case 'down':
      return {
        text: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        dot: 'bg-rose-400',
        ring: 'ring-rose-400/20',
      };
    default:
      return {
        text: 'text-slate-400',
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/20',
        badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        dot: 'bg-slate-400',
        ring: 'ring-slate-400/20',
      };
  }
}

export function getRiskColor(riskLevel) {
  switch (riskLevel) {
    case 'low':
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        bar: 'bg-emerald-500',
      };
    case 'medium':
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        bar: 'bg-amber-500',
      };
    case 'high':
      return {
        text: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        bar: 'bg-orange-500',
      };
    case 'critical':
      return {
        text: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        bar: 'bg-rose-500',
      };
    default:
      return {
        text: 'text-slate-400',
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/20',
        badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        bar: 'bg-slate-500',
      };
  }
}

export function getAlertStatusColor(status) {
  switch (status) {
    case 'open':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    case 'recovering':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse';
    case 'resolved':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    default:
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
}

export function formatTimestamp(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  } catch {
    return isoString;
  }
}

