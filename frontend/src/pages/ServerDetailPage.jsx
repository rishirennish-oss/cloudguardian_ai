import React, { useCallback, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Cpu,
  Clock,
  HardDrive,
  Database,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { getServer, getServerMetrics, getAlerts, resolveAlert } from '../api';
import usePolling from '../hooks/usePolling';
import { StatusBadge, RiskBadge, AlertStatusBadge } from '../components/common/Badge';
import { getServerTypeIcon } from '../components/dashboard/ServerCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBanner from '../components/common/ErrorBanner';
import EmptyState from '../components/common/EmptyState';
import {
  prettifyEnum,
  formatDateTime,
  formatTimestamp,
  getRiskColor,
} from '../utils/formatters';

export default function ServerDetailPage() {
  const { serverId } = useParams();
  const [resolvingId, setResolvingId] = useState(null);

  const fetchServerData = useCallback(async () => {
    const [serverData, metricsData, alertsData] = await Promise.all([
      getServer(serverId),
      getServerMetrics(serverId, 50),
      getAlerts(),
    ]);

    const serverAlerts = (alertsData || []).filter(
      (a) => a.serverId === serverId
    );

    return {
      server: serverData,
      metrics: metricsData || [],
      alerts: serverAlerts,
    };
  }, [serverId]);

  const { data, loading, error, refetch } = usePolling(fetchServerData, 5000, [serverId]);

  const handleResolveAlert = async (alertId) => {
    try {
      setResolvingId(alertId);
      await resolveAlert(alertId);
      await refetch();
    } catch (err) {
      alert(`Failed to resolve alert: ${err.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  if (loading && !data) {
    return <LoadingSpinner message={`Loading metrics for ${serverId}...`} size="lg" />;
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <ErrorBanner message={error} onRetry={refetch} />
      </div>
    );
  }

  const server = data?.server;
  const metrics = data?.metrics || [];
  const alerts = data?.alerts || [];

  if (!server) {
    return (
      <div className="space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <EmptyState
          title={`Server ${serverId} not found`}
          description="The requested server identifier does not match any registered node."
        />
      </div>
    );
  }

  const TypeIcon = getServerTypeIcon(server.type);
  const prob = Number(server.failureProbability || 0);
  const probPercent = Math.min(100, Math.max(0, Math.round(prob * 100)));
  const riskStyles = getRiskColor(server.riskLevel);

  // Prepare chart data with formatted times
  const chartData = metrics.map((m) => ({
    ...m,
    time: formatTimestamp(m.timestamp),
  }));

  const CustomTooltip = ({ active, payload, label, unit = '' }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-2.5 rounded-lg shadow-lg text-xs">
          <p className="text-slate-400 mb-1">{label}</p>
          <p className="font-semibold text-white">
            {payload[0].name}: <span className="font-mono">{payload[0].value}{unit}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Fleet Overview
        </Link>
      </div>

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Header with Server status/risk */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-slate-800/80 text-sky-400 border border-slate-700/60">
            <TypeIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{server.name}</h1>
              <span className="text-xs font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                {server.type}
              </span>
            </div>
            <p className="text-sm font-mono text-slate-400 mt-1">
              ID: {server.serverId} &bull; Last updated:{' '}
              {formatDateTime(server.lastUpdated)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <StatusBadge status={server.status} />
              <RiskBadge riskLevel={server.riskLevel} />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Failure Prob:{' '}
              <span className={`font-mono font-bold ${riskStyles.text}`}>
                {probPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 LineCharts Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-400" />
          Telemetry Metrics (Last {metrics.length} points)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. CPU Usage */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                CPU Usage (%)
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Current: {metrics[metrics.length - 1]?.cpuUsage ?? '—'}%
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip unit="%" />} />
                  <Line
                    type="monotone"
                    dataKey="cpuUsage"
                    name="CPU Usage"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Memory Usage */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                Memory Usage (%)
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Current: {metrics[metrics.length - 1]?.memoryUsage ?? '—'}%
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip unit="%" />} />
                  <Line
                    type="monotone"
                    dataKey="memoryUsage"
                    name="Memory Usage"
                    stroke="#0284c7"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Disk Usage */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-400" />
                Disk Usage (%)
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Current: {metrics[metrics.length - 1]?.diskUsage ?? '—'}%
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip unit="%" />} />
                  <Line
                    type="monotone"
                    dataKey="diskUsage"
                    name="Disk Usage"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Response Time */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-400" />
                Response Time (ms)
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Current: {metrics[metrics.length - 1]?.responseTimeMs ?? '—'} ms
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip unit=" ms" />} />
                  <Line
                    type="monotone"
                    dataKey="responseTimeMs"
                    name="Response Time"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Server Alerts Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          Alerts for {server.name} ({alerts.length})
        </h2>

        {alerts.length === 0 ? (
          <EmptyState
            title="No alerts for this server"
            description="This instance has zero open or historical incidents recorded."
            icon={CheckCircle2}
          />
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Time</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Risk</th>
                    <th className="py-3.5 px-4">Probability</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Explanation</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {alerts.map((alert) => (
                    <tr key={alert._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {formatDateTime(alert.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200 whitespace-nowrap">
                        {prettifyEnum(alert.failureType)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <RiskBadge riskLevel={alert.riskLevel} />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {Math.round((alert.failureProbability || 0) * 100)}%
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <AlertStatusBadge status={alert.status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300 max-w-xs">
                        {alert.explanation || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {alert.status === 'open' && (
                          <button
                            onClick={() => handleResolveAlert(alert._id)}
                            disabled={resolvingId === alert._id}
                            className="px-3 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            {resolvingId === alert._id ? 'Resolving...' : 'Resolve'}
                          </button>
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
    </div>
  );
}
