import React from 'react';
import { Activity, Radio, Zap } from 'lucide-react';

export default function TransactionActivityChart() {
  return (
    <div className="relative overflow-hidden rounded-2xl cyber-glass p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/25">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white">
              Transaction Activity & Telemetry
            </h3>
            <p className="text-xs text-slate-400">
              Real-time ingestion throughput & network heartbeat monitor
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
          </span>
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            Gateway Standby
          </span>
        </div>
      </div>

      {/* Cyber Waveform / Telemetry Graph */}
      <div className="relative mt-5 h-40 w-full overflow-hidden rounded-xl border border-slate-800/80 bg-[#060b18]/90 p-4">
        {/* Subtle grid lines in background */}
        <div className="absolute inset-0 cyber-grid-overlay opacity-40 pointer-events-none" />

        {/* Oscilloscope baseline heartbeat SVG */}
        <svg
          className="h-full w-full overflow-visible"
          viewBox="0 0 500 120"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cyberWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cyberLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path
            d="M 0,90 Q 60,85 120,90 T 240,90 Q 270,30 285,100 T 300,90 Q 360,92 420,88 T 500,90 L 500,120 L 0,120 Z"
            fill="url(#cyberWaveGrad)"
          />

          {/* Glowing waveform stroke */}
          <path
            d="M 0,90 Q 60,85 120,90 T 240,90 Q 270,30 285,100 T 300,90 Q 360,92 420,88 T 500,90"
            fill="none"
            stroke="url(#cyberLineGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
          />

          {/* Glowing pulse node at active peak */}
          <circle cx="270" cy="30" r="4" fill="#06b6d4" className="animate-ping" opacity="0.6" />
          <circle cx="270" cy="30" r="3" fill="#ffffff" />
        </svg>

        {/* Standby overlay badge */}
        <div className="absolute bottom-3 right-4 flex items-center space-x-2 text-[10px] font-mono text-slate-400">
          <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
          <span>AWAITING INGESTION FEED</span>
        </div>
      </div>

      {/* Telemetry Metrics Row */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2.5">
          <div className="text-[10px] font-mono uppercase text-slate-400">Current Rate</div>
          <div className="mt-1 text-sm font-mono font-bold text-white">0.00 tx/s</div>
        </div>
        <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2.5">
          <div className="text-[10px] font-mono uppercase text-slate-400">Batch Window</div>
          <div className="mt-1 text-sm font-mono font-bold text-cyan-400">0 ms (Instant)</div>
        </div>
        <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2.5">
          <div className="text-[10px] font-mono uppercase text-slate-400">Settlement Lock</div>
          <div className="mt-1 text-sm font-mono font-bold text-emerald-400">SERIALIZED</div>
        </div>
        <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2.5">
          <div className="text-[10px] font-mono uppercase text-slate-400">Replay Protection</div>
          <div className="mt-1 text-sm font-mono font-bold text-violet-400">100% ARMED</div>
        </div>
      </div>
    </div>
  );
}
