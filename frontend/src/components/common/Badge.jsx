import React from 'react';
import { prettifyEnum, getStatusColor, getRiskColor, getAlertStatusColor } from '../../utils/formatters';

export function StatusBadge({ status }) {
  const styles = getStatusColor(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {prettifyEnum(status)}
    </span>
  );
}

export function RiskBadge({ riskLevel }) {
  const styles = getRiskColor(riskLevel);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider ${styles.badge}`}
    >
      {prettifyEnum(riskLevel)}
    </span>
  );
}

export function AlertStatusBadge({ status }) {
  const colorClass = getAlertStatusColor(status);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider ${colorClass}`}
    >
      {prettifyEnum(status)}
    </span>
  );
}

export function TypeBadge({ type }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
      {type}
    </span>
  );
}

