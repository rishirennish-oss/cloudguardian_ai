import React from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { getRecoveries } from '../api';
import usePolling from '../hooks/usePolling';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBanner from '../components/common/ErrorBanner';
import EmptyState from '../components/common/EmptyState';
import {
  prettifyEnum,
  formatDateTime,
} from '../utils/formatters';

export default function RecoveriesPage() {
  const { data: recoveries, loading, error, refetch } = usePolling(
    () => getRecoveries(50),
    5000
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-6 h-6 text-purple-400" />
            Autonomous Recovery Log
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Automated remediation actions executed by CloudGuardian AI across cluster nodes.
          </p>
        </div>
        <div className="text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
          Showing last 50 recovery runs
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {loading && !recoveries ? (
        <LoadingSpinner message="Loading recovery actions..." size="lg" />
      ) : !recoveries || recoveries.length === 0 ? (
        <EmptyState
          title="No recovery actions recorded"
          description="Autonomous self-healing actions will appear here once triggered."
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
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Result</th>
                  <th className="py-3.5 px-4">Message</th>
                  <th className="py-3.5 px-4 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {recoveries.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Time */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {formatDateTime(rec.executedAt)}
                    </td>

                    {/* Server */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Link
                        to={`/servers/${rec.serverId}`}
                        className="font-mono text-xs font-semibold text-sky-400 hover:text-sky-300 hover:underline"
                      >
                        {rec.serverId}
                      </Link>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {prettifyEnum(rec.action)}
                      </span>
                    </td>

                    {/* Result tick/cross */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {rec.success ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Success</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>Failed</span>
                        </div>
                      )}
                    </td>

                    {/* Message */}
                    <td className="py-3.5 px-4 text-xs text-slate-300 max-w-md">
                      {rec.message || '—'}
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-400 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {rec.durationMs != null ? `${rec.durationMs} ms` : '—'}
                      </span>
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
