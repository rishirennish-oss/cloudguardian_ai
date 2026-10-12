import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  AlertTriangle,
  History,
  Zap,
  Shield,
} from 'lucide-react';
import { useStatus } from '../../context/StatusContext';

export default function Sidebar() {
  const { summary } = useStatus();
  const openAlerts = summary?.openAlerts ?? 0;

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/alerts', label: 'Alerts', icon: AlertTriangle, badge: openAlerts > 0 ? openAlerts : null },
    { to: '/recoveries', label: 'Recoveries', icon: History },
    { to: '/simulate', label: 'Fault Simulator', icon: Zap },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Logo Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 ring-1 ring-white/20">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent">
            CloudGuardian AI
          </h1>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
            Autonomous SRE
          </p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Monitoring
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/25 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500 text-white shadow-sm">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 bg-slate-950/20">
        <div className="flex items-center justify-between text-[11px]">
          <span>Stack</span>
          <span className="text-slate-400">Vite + React</span>
        </div>
        <div className="flex items-center justify-between text-[11px] mt-1">
          <span>Mode</span>
          <span className="text-sky-400 font-mono">
            {String(import.meta.env.VITE_USE_MOCK).toLowerCase() === 'true' ? 'MOCK' : 'LIVE'}
          </span>
        </div>
      </div>
    </aside>
  );
}

