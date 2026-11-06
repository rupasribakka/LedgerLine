import React from 'react';
import { History, CheckCircle2, Shield, Terminal, ArrowRight } from 'lucide-react';

const EVENTS = [
  {
    id: 1,
    title: 'Security Subsystem Initialized',
    desc: 'Integer paise arithmetic, idempotency key tracking, and row-level locks armed.',
    time: 'Boot',
    badge: 'VERIFIED',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
  },
  {
    id: 2,
    title: 'Core API Handshake Established',
    desc: 'Express API operational with Helmet security headers and CORS protection.',
    time: 'Active',
    badge: 'OPERATIONAL',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 3,
    title: 'Double-Entry Ledger Engine Mounted',
    desc: 'T-account balanced debits and credits ledger schema ready for transaction intake.',
    time: 'Ready',
    badge: 'ARMED',
    color: 'text-violet-400',
    borderColor: 'border-violet-500/30',
  },
  {
    id: 4,
    title: 'AI Transfer Firewall Enforced',
    desc: 'Strict policy active: AI assistants blocked from autonomous money movement.',
    time: 'Enforced',
    badge: 'GUARDED',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/30',
  },
];

export default function ActivityTimeline() {
  return (
    <div className="relative overflow-hidden rounded-2xl cyber-glass p-6">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/25">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white">
              Audit & Activity History
            </h3>
            <p className="text-xs text-slate-400">
              System initialization & security event logs
            </p>
          </div>
        </div>

        <span className="rounded-md bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] font-mono text-slate-300">
          LOGS: REAL-TIME
        </span>
      </div>

      {/* Timeline items */}
      <div className="mt-5 space-y-4">
        {EVENTS.map((event, idx) => (
          <div
            key={event.id}
            className="group relative flex items-start space-x-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/60"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-300 group-hover:border-cyan-500/40">
              <CheckCircle2 className={`h-4 w-4 ${event.color}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  {event.title}
                </h4>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider border ${event.borderColor} ${event.color} bg-slate-950`}>
                  {event.badge}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                {event.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
