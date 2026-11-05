import React from 'react';
import { Activity, Server, Clock, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function SystemHealthCard({ healthData, isChecking, onRefresh }) {
  const isHealthy = healthData && healthData.ok;
  const serverInfo = healthData?.data || {};

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0f1524] p-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Backend Health & Runtime</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live diagnostics from Express API service (`/api/health`)
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isChecking}
          className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin text-blue-400' : ''}`} />
          <span>{isChecking ? 'Pinging...' : 'Ping Endpoint'}</span>
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Status */}
        <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>API Status</span>
            {isHealthy ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            )}
          </div>
          <div className="mt-2 text-lg font-bold">
            {isHealthy ? (
              <span className="text-emerald-400">{serverInfo.status || 'UP'}</span>
            ) : (
              <span className="text-rose-400">OFFLINE</span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {isHealthy ? 'Express core responding' : 'Server not running on :5000'}
          </p>
        </div>

        {/* Latency */}
        <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Roundtrip Latency</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-white">
            {healthData?.responseTime !== undefined ? `${healthData.responseTime} ms` : '—'}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">HTTP /api/health probe</p>
        </div>

        {/* Uptime */}
        <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Process Uptime</span>
            <Clock className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-white">
            {serverInfo.uptime ? `${Math.round(serverInfo.uptime)} s` : '—'}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Node.js server process</p>
        </div>

        {/* Target Phase */}
        <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Stage</span>
            <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
              Dev
            </span>
          </div>
          <div className="mt-2 text-lg font-bold text-slate-200">
            {serverInfo.phase || 'Phase 1 Setup'}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Next: DB Schema & Models</p>
        </div>
      </div>

      {!isHealthy && healthData?.error && (
        <div className="mt-4 rounded-lg border border-rose-900/50 bg-rose-950/20 p-3 text-xs text-rose-300">
          <span className="font-semibold">Backend Diagnostic:</span> {healthData.error}
        </div>
      )}
    </div>
  );
}
