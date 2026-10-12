import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { getAlerts, resolveAlert } from '../api';
import usePolling from '../hooks/usePolling';
import { RiskBadge, AlertStatusBadge } from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBanner from '../components/common/ErrorBanner';
import EmptyState from '../components/common/EmptyState';
import {
  prettifyEnum,
  formatDateTime,
} from '../utils/formatters';

export default function AlertsPage() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [resolvingId, setResolvingId] = useState(null);

  const fetchAlertsData = useCallback(async () => {
    const statusParam = filterStatus === 'all' ? undefined : filterStatus;
    return await getAlerts(statusParam);
  }, [filterStatus]);

  const { data: alerts, loading, error, refetch } = usePolling(
    fetchAlertsData,
    5000,
    [filterStatus]
  );

  const handleResolve = async (id) => {
    try {
      setResolvingId(id);
      await resolveAlert(id);
      await refetch();
    } catch (err) {
      alert(`Failed to resolve alert: ${err.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  const openCount = alerts ? alerts.filter((a) => a.status === 'open').length : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            System Incidents & Alerts
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Predictive anomaly alerts, severity assessments, and recommended remediation steps.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <Filter className="w-4 h-4 text-slate-500 ml-2 mr-1" />
          {['all', 'open', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                filterStatus === status
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {loading && !alerts ? (
        <LoadingSpinner message="Loading alerts..." size="lg" />
      ) : !alerts || alerts.length === 0 ? (
        <EmptyState
          title="No alerts - system healthy"
          description="There are currently no active alerts matching this filter criteria."
          icon={ShieldCheck}
        />
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-4">Server</th>
                  <th className="py-3.5 px-4">Failure Type</th>
                  <th className="py-3.5 px-4">Risk Level</th>
                  <th className="py-3.5 px-4">Probability %</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Explanation</th>
                  <th className="py-3.5 px-4">Recommended Actions</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {alerts.map((alert) => (
                  <tr
                    key={alert._id}
                    className="hover:bg-slate-800/30 transition-colors align-top"
                  >
                    {/* Time */}
                    <td className="py-4 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {formatDateTime(alert.createdAt)}
                    </td>

                    {/* Server */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <Link
                        to={`/servers/${alert.serverId}`}
                        className="font-mono text-xs font-semibold text-sky-400 hover:text-sky-300 hover:underline"
                      >
                        {alert.serverId}
                      </Link>
                    </td>

                    {/* Failure Type */}
                    <td className="py-4 px-4 font-medium text-slate-200 whitespace-nowrap">
                      {prettifyEnum(alert.failureType)}
                    </td>

                    {/* Risk Level */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <RiskBadge riskLevel={alert.riskLevel} />
                    </td>

                    {/* Probability % */}
                    <td className="py-4 px-4 font-mono text-xs font-bold text-slate-200 whitespace-nowrap">
                      {Math.round((alert.failureProbability || 0) * 100)}%
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <AlertStatusBadge status={alert.status} />
                    </td>

                    {/* Explanation */}
                    <td className="py-4 px-4 text-xs text-slate-300 max-w-xs leading-relaxed">
                      {alert.explanation || '—'}
                    </td>

                    {/* Recommended Actions */}
                    <td className="py-4 px-4 text-xs max-w-sm">
                      {alert.recommendedActions && alert.recommendedActions.length > 0 ? (
                        <ul className="space-y-1 list-disc list-inside text-slate-300">
                          {alert.recommendedActions.map((action, idx) => (
                            <li key={idx} className="leading-tight">
                              {action}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Resolve Button */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      {alert.status === 'open' ? (
                        <button
                          onClick={() => handleResolve(alert._id)}
                          disabled={resolvingId === alert._id}
                          className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {resolvingId === alert._id ? 'Resolving...' : 'Resolve'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Resolved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
