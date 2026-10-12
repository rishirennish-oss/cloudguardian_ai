import React, { useCallback } from 'react';
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  History,
  Activity,
  Layers,
} from 'lucide-react';
import { getServers, getSummary } from '../api';
import usePolling from '../hooks/usePolling';
import SummaryCard from '../components/dashboard/SummaryCard';
import ServerCard from '../components/dashboard/ServerCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBanner from '../components/common/ErrorBanner';

export default function DashboardPage() {
  const fetchDashboardData = useCallback(async () => {
    const [serversData, summaryData] = await Promise.all([
      getServers(),
      getSummary(),
    ]);
    return { servers: serversData, summary: summaryData };
  }, []);

  const { data, loading, error, refetch } = usePolling(fetchDashboardData, 5000);

  if (loading && !data) {
    return <LoadingSpinner message="Loading cluster metrics..." size="lg" />;
  }

  const servers = data?.servers || [];
  const summary = data?.summary || {
    totalServers: servers.length,
    healthyServers: servers.filter(s => s.status === 'healthy').length,
    openAlerts: 0,
    recoveriesToday: 0,
    uptimePercent: 100,
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-sky-400" />
            Infrastructure Overview
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry and autonomous self-healing fleet monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Auto-refreshing every 5s
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* 5 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          title="Total Servers"
          value={summary.totalServers ?? servers.length}
          subtext="Configured instances"
          icon={Layers}
          colorScheme="sky"
        />
        <SummaryCard
          title="Healthy"
          value={summary.healthyServers ?? 0}
          subtext={`${summary.degradedServers ?? 0} degraded, ${summary.downServers ?? 0} down`}
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <SummaryCard
          title="Open Alerts"
          value={summary.openAlerts ?? 0}
          subtext={summary.openAlerts > 0 ? "Requires attention" : "All clear"}
          icon={AlertTriangle}
          colorScheme={summary.openAlerts > 0 ? "rose" : "emerald"}
        />
        <SummaryCard
          title="Recoveries Today"
          value={summary.recoveriesToday ?? 0}
          subtext={`${summary.successfulRecoveries ?? 0} autonomous actions`}
          icon={History}
          colorScheme="purple"
        />
        <SummaryCard
          title="Uptime %"
          value={`${summary.uptimePercent ?? 100}%`}
          subtext="Cluster availability"
          icon={Activity}
          colorScheme="emerald"
        />
      </div>

      {/* Servers Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-sky-400" />
            Monitored Nodes ({servers.length})
          </h3>
          <span className="text-xs text-slate-400">Click a node to inspect detailed time-series telemetry</span>
        </div>

        {servers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
            No servers currently reporting.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {servers.map((server) => (
              <ServerCard key={server.serverId} server={server} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

