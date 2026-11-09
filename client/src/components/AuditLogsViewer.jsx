import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import Skeleton from './ui/Skeleton';
import { fetchAuditLogs } from '../services/api';

export default function AuditLogsViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuditLogs();
      if (res.ok) {
        setLogs(res.data?.logs || res.data || []);
      } else {
        setError(res.error || 'Failed to fetch audit logs.');
      }
    } catch (err) {
      setError(err.message || 'Network error fetching audit logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="rounded-2xl border border-cyan-500/15 bg-[#060b18]/80 p-5 sm:p-6 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/30">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              Immutable Security Audit Trail
              <span className="text-[10px] bg-violet-500/10 text-violet-300 px-2 py-0.5 rounded border border-violet-500/20">
                Trigger Guarded
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Audit log table is append-only. Modification or deletion triggers SQL exception.
            </p>
          </div>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center justify-center space-x-1.5 rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-1.5 text-xs font-mono text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {error ? (
        <div className="mt-4 flex items-start space-x-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-semibold">Audit Retrieval Access Required</p>
            <p className="text-rose-300/90">{error}</p>
          </div>
        </div>
      ) : logs.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-[#050914]/90 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Details / Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-[11px]">
              {logs.map((log) => {
                const dateStr = log.created_at
                  ? new Date(log.created_at).toISOString().replace('T', ' ').substring(0, 19)
                  : 'N/A';
                return (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3 text-cyan-400">#{log.id}</td>
                    <td className="px-4 py-3 text-slate-400">{dateStr}</td>
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {log.username || `User #${log.user_id || 'N/A'}`}
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-md truncate">
                      {typeof log.details === 'object'
                        ? JSON.stringify(log.details)
                        : String(log.details || log.metadata || '')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-8 text-center text-xs text-slate-400 font-mono">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full rounded" />
              <Skeleton className="h-6 w-3/4 rounded mx-auto" />
              <Skeleton className="h-6 w-1/2 rounded mx-auto" />
            </div>
          ) : (
            'No audit events captured yet. Authentication attempts and financial actions are logged automatically.'
          )}
        </div>
      )}
    </div>
  );
}
