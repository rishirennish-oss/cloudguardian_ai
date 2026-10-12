import React, { useState, useEffect } from 'react';
import {
  Zap,
  RotateCcw,
  AlertTriangle,
  Play,
  CheckCircle2,
  Server,
  Info,
} from 'lucide-react';
import { getServers, simulateFault, simulateReset } from '../api';
import { prettifyEnum } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBanner from '../components/common/ErrorBanner';

// The 5 non-"none" faultType values per shared/CONTRACT.md
const FAULT_TYPES = [
  {
    value: 'memory_leak',
    label: 'Memory Leak',
    desc: 'Simulates progressive heap exhaustion reaching 97% memory over 60s.',
    expectedAction: 'restart_service',
  },
  {
    value: 'cpu_overload',
    label: 'CPU Overload',
    desc: 'Simulates intensive compute load driving CPU utilization to 95%.',
    expectedAction: 'scale_up',
  },
  {
    value: 'disk_full',
    label: 'Disk Full',
    desc: 'Simulates log flood consuming disk storage up to 98% capacity.',
    expectedAction: 'cleanup_disk',
  },
  {
    value: 'network_congestion',
    label: 'Network Congestion',
    desc: 'Simulates saturation of network interfaces at 900 Mbps.',
    expectedAction: 'throttle_traffic',
  },
  {
    value: 'service_crash',
    label: 'Service Crash',
    desc: 'Simulates immediate daemon shutdown with status down and 0 req/sec.',
    expectedAction: 'restart_service (or failover)',
  },
];

export default function SimulatePage() {
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState('');
  const [selectedFault, setSelectedFault] = useState('memory_leak');

  const [loadingServers, setLoadingServers] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadServers() {
      try {
        setLoadingServers(true);
        const list = await getServers();
        setServers(list || []);
        if (list && list.length > 0) {
          setSelectedServer(list[0].serverId);
        }
      } catch (err) {
        setError(`Failed to load server list: ${err.message}`);
      } finally {
        setLoadingServers(false);
      }
    }
    loadServers();
  }, []);

  const handleInjectFault = async () => {
    if (!selectedServer || !selectedFault) return;
    try {
      setExecuting(true);
      setError(null);
      const res = await simulateFault(selectedServer, selectedFault);
      setResult({
        type: 'fault_injected',
        timestamp: new Date().toISOString(),
        serverId: selectedServer,
        faultType: selectedFault,
        data: res,
      });
    } catch (err) {
      setError(`Failed to inject fault: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleReset = async () => {
    if (!selectedServer) return;
    try {
      setExecuting(true);
      setError(null);
      const res = await simulateReset(selectedServer);
      setResult({
        type: 'reset',
        timestamp: new Date().toISOString(),
        serverId: selectedServer,
        data: res,
      });
    } catch (err) {
      setError(`Failed to reset server: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const currentFaultInfo = FAULT_TYPES.find((f) => f.value === selectedFault);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-400" />
          Fault Injection Simulator
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Trigger controlled infrastructure anomalies to observe real-time AI anomaly detection and autonomous self-healing.
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setError(null)} />}

      {loadingServers ? (
        <LoadingSpinner message="Loading servers..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Simulation Control Card */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-6">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Server className="w-5 h-5 text-sky-400" />
              Configure Target & Fault Type
            </h3>

            {/* Select Server */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Target Server Instance
              </label>
              <select
                value={selectedServer}
                onChange={(e) => setSelectedServer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              >
                {servers.map((s) => (
                  <option key={s.serverId} value={s.serverId}>
                    {s.name} ({s.serverId}) &mdash; {prettifyEnum(s.status)} &bull; {s.type}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Fault Type (5 non-none values) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Fault Type (Failure Scenario)
              </label>
              <select
                value={selectedFault}
                onChange={(e) => setSelectedFault(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              >
                {FAULT_TYPES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label} ({f.value})
                  </option>
                ))}
              </select>

              {/* Selected fault details card */}
              {currentFaultInfo && (
                <div className="mt-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1.5">
                  <div className="text-slate-300 font-medium">
                    {currentFaultInfo.desc}
                  </div>
                  <div className="text-sky-400 flex items-center gap-1.5 pt-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>
                      Expected Autonomous Recovery:{' '}
                      <strong className="font-mono text-sky-300">
                        {currentFaultInfo.expectedAction}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-4">
              <button
                onClick={handleInjectFault}
                disabled={executing || !selectedServer}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                {executing ? 'Executing...' : 'Inject Fault'}
              </button>

              <button
                onClick={handleReset}
                disabled={executing || !selectedServer}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                Reset Server
              </button>
            </div>
          </div>

          {/* Result Display Panel */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Execution Result
              </h3>

              {result ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                        result.type === 'fault_injected'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {result.type === 'fault_injected' ? 'Fault Active' : 'Reset Complete'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400">
                    Target:{' '}
                    <span className="font-mono text-slate-200 font-bold">
                      {result.serverId}
                    </span>
                  </div>

                  {result.faultType && (
                    <div className="text-xs text-slate-400">
                      Fault:{' '}
                      <span className="font-mono text-amber-300 font-semibold">
                        {prettifyEnum(result.faultType)}
                      </span>
                    </div>
                  )}

                  <div className="mt-3">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                      Raw Response Payload
                    </label>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-sky-300 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="mt-8 text-center text-slate-500 text-xs py-12">
                  No simulation action triggered yet. Select an instance and click &quot;Inject Fault&quot; or &quot;Reset&quot;.
                </div>
              )}
            </div>

            {/* Workflow Hint */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <strong className="text-slate-300 block">AI Recovery Workflow:</strong>
              <p>
                1. Metrics collected by agent every 5s.
              </p>
              <p>
                2. ML model predicts anomaly &amp; assigns risk.
              </p>
              <p>
                3. Recovery service executes action automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
