import React from 'react';
import { Server, Activity, Clock, RefreshCw, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';

export default function SystemHealthCard({ healthData, isChecking, onRefresh }) {
  const isHealthy = healthData && healthData.ok;
  const serverInfo = healthData?.data || {};

  return (
    <div className="relative overflow-hidden rounded-2xl cyber-glass p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-md shadow-cyan-950/40">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white">
              System Health & Runtime Monitor
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live diagnostics from Express Financial Core API (`/api/health`)
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isChecking}
          className="mt-3 sm:mt-0 flex items-center space-x-2 rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-3.5 py-2 text-xs font-mono font-medium text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400 transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.1)]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin text-cyan-400' : ''}`} />
          <span>{isChecking ? 'PINGING...' : 'REFRESH PING'}</span>
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Core Status */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>API Gateway</span>
            {isHealthy ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            )}
          </div>
          <div className="mt-2 text-lg font-mono font-bold">
            {isHealthy ? (
              <span className="text-emerald-400">{serverInfo.status || 'OPERATIONAL'}</span>
            ) : (
              <span className="text-rose-400">UNREACHABLE</span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-mono">
            {isHealthy ? 'Port 5000 • Express REST' : 'Check backend process on :5000'}
          </p>
        </div>

        {/* Latency */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Roundtrip Latency</span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-lg font-mono font-bold text-white">
            {healthData?.responseTime !== undefined ? `${healthData.responseTime} ms` : '—'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-mono">Real-time HTTP health probe</p>
        </div>

        {/* Process Uptime */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Process Uptime</span>
            <Clock className="h-4 w-4 text-violet-400" />
          </div>
          <div className="mt-2 text-lg font-mono font-bold text-white">
            {serverInfo.uptime ? `${Math.round(serverInfo.uptime)} s` : '—'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-mono">Node.js server runtime</p>
        </div>

        {/* Cryptographic Protection */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Security Invariants</span>
            <Shield className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-lg font-mono font-bold text-cyan-400">
            ENFORCED
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-mono">Integer Paise • Row Locks</p>
        </div>
      </div>

      {!isHealthy && healthData?.error && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs font-mono text-rose-300">
          <span className="font-semibold text-rose-400">Diagnostic Warning:</span> {healthData.error}
        </div>
      )}
    </div>
  );
}
