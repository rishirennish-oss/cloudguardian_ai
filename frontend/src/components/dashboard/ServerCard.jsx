import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Cpu,
  Database,
  Zap,
  HardDrive,
  Activity,
  ArrowRight,
  Server as ServerIcon,
} from 'lucide-react';
import { StatusBadge, RiskBadge } from '../common/Badge';
import { getRiskColor, getStatusColor } from '../../utils/formatters';

export function getServerTypeIcon(type) {
  switch (type) {
    case 'web':
      return Globe;
    case 'api':
      return Cpu;
    case 'database':
      return Database;
    case 'cache':
      return Zap;
    default:
      return ServerIcon;
  }
}

export default function ServerCard({ server }) {
  const navigate = useNavigate();
  const TypeIcon = getServerTypeIcon(server.type);

  const prob = Number(server.failureProbability || 0);
  const probPercent = Math.min(100, Math.max(0, Math.round(prob * 100)));
  const riskStyles = getRiskColor(server.riskLevel);
  const statusStyles = getStatusColor(server.status);

  const cpu = server.latestMetrics?.cpuUsage != null ? Number(server.latestMetrics.cpuUsage).toFixed(1) : '—';
  const mem = server.latestMetrics?.memoryUsage != null ? Number(server.latestMetrics.memoryUsage).toFixed(1) : '—';
  const disk = server.latestMetrics?.diskUsage != null ? Number(server.latestMetrics.diskUsage).toFixed(1) : '—';

  return (
    <div
      onClick={() => navigate(`/servers/${server.serverId}`)}
      className="group rounded-2xl bg-slate-900/80 border border-slate-800 p-5 hover:border-sky-500/50 hover:bg-slate-900/95 transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between"
    >
      {/* Top accent line based on status */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${statusStyles.bg}`} />

      <div>
        {/* Header: Type icon, Name, serverId */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800/90 text-sky-400 group-hover:bg-sky-500/15 group-hover:text-sky-300 transition-colors">
              <TypeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm group-hover:text-sky-300 transition-colors">
                {server.name}
              </h3>
              <p className="text-xs font-mono text-slate-400">{server.serverId}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
        </div>

        {/* Badges */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={server.status} />
          <RiskBadge riskLevel={server.riskLevel} />
        </div>

        {/* Failure Probability Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-400 font-medium">Failure Probability</span>
            <span className={`font-mono font-bold ${riskStyles.text}`}>{probPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${riskStyles.bar}`}
              style={{ width: `${probPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metrics Row (CPU, Memory, Disk) */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/40">
          <div className="text-[11px] text-slate-400 font-medium">CPU</div>
          <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
            {cpu !== '—' ? `${cpu}%` : '—'}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/40">
          <div className="text-[11px] text-slate-400 font-medium">Memory</div>
          <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
            {mem !== '—' ? `${mem}%` : '—'}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/40">
          <div className="text-[11px] text-slate-400 font-medium">Disk</div>
          <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
            {disk !== '—' ? `${disk}%` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

