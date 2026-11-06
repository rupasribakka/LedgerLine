import React from 'react';
import {
  ShieldCheck,
  Lock,
  Scale,
  Coins,
  KeyRound,
  BotOff,
  Cpu
} from 'lucide-react';

const DEFENSE_NODES = [
  {
    id: 'arithmetic',
    label: 'Integer Arithmetic',
    detail: 'Paise precision (₹1 = 100p)',
    status: 'ENFORCED',
    icon: Coins,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-950/40',
    glowColor: 'shadow-cyan-500/20',
  },
  {
    id: 'double-entry',
    label: 'Double-Entry Invariant',
    detail: 'Balanced debit/credit parity',
    status: 'ACTIVE',
    icon: Scale,
    color: 'text-violet-400',
    borderColor: 'border-violet-500/30',
    bgColor: 'bg-violet-950/40',
    glowColor: 'shadow-violet-500/20',
  },
  {
    id: 'concurrency',
    label: 'Pessimistic Row Lock',
    detail: 'SELECT FOR UPDATE isolation',
    status: 'ARMED',
    icon: Lock,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-950/40',
    glowColor: 'shadow-blue-500/20',
  },
  {
    id: 'idempotency',
    label: 'Idempotency Shield',
    detail: 'UUIDv4 replay barrier',
    status: 'ACTIVE',
    icon: KeyRound,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-950/40',
    glowColor: 'shadow-emerald-500/20',
  },
  {
    id: 'firewall',
    label: 'AI Transfer Firewall',
    detail: 'Zero autonomous approval',
    status: 'BLOCKED',
    icon: BotOff,
    color: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    bgColor: 'bg-rose-950/40',
    glowColor: 'shadow-rose-500/20',
  },
];

export default function SecurityVisualization() {
  return (
    <div className="relative overflow-hidden rounded-2xl cyber-glass p-6 md:p-8">
      {/* Top Header & Telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500/20 via-blue-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-950/50">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold tracking-wide text-white">
                Security Core & Invariant Command
              </h3>
              <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-400 border border-emerald-500/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>INTEGRITY VERIFIED</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous cryptographic and mathematical invariant enforcement
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-3 text-xs font-mono">
          <div className="rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-1.5 text-slate-300">
            <span className="text-slate-500">ENGINE:</span> <span className="text-cyan-400">DOUBLE_ENTRY_V1</span>
          </div>
          <div className="rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-1.5 text-slate-300">
            <span className="text-slate-500">PRECISION:</span> <span className="text-emerald-400">INTEGER_PAISE</span>
          </div>
        </div>
      </div>

      {/* Main Visual Centerpiece & Satellite Nodes */}
      <div className="relative mt-8 flex flex-col lg:flex-row items-center justify-between gap-8 py-4">
        {/* Central Futuristic Scanning Core */}
        <div className="relative flex h-64 w-64 shrink-0 items-center justify-center mx-auto">
          {/* Outer scanning ring with radar tick marks */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-radar-sweep">
            <div className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
            <div className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-blue-500/50" />
          </div>

          {/* Middle counter-rotating ring */}
          <div className="absolute inset-4 rounded-full border border-dashed border-violet-500/30 animate-reverse-radar" />

          {/* Third concentric glowing ring */}
          <div className="absolute inset-10 rounded-full border border-blue-500/25 animate-radar-sweep" style={{ animationDuration: '6s' }}>
            <div className="absolute right-0 top-1/2 h-1.5 w-1.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400 shadow-[0_0_8px_#8b5cf6]" />
          </div>

          {/* Radial radar sweep glow slice */}
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none opacity-40">
            <div 
              className="h-full w-full animate-radar-sweep origin-center"
              style={{
                background: 'conic-gradient(from 0deg, rgba(6,182,212,0.2) 0deg, rgba(59,130,246,0.05) 45deg, transparent 90deg, transparent 360deg)'
              }}
            />
          </div>

          {/* Center Digital Shield Core */}
          <div className="relative z-10 flex h-28 w-28 flex-col items-center justify-center rounded-full bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.25)] backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-tr from-cyan-500/20 to-violet-500/20 text-cyan-300">
              <ShieldCheck className="h-7 w-7 animate-pulse text-cyan-400" />
            </div>
            <span className="mt-1 text-[10px] font-mono font-bold tracking-widest text-cyan-400">
              SHIELD_OK
            </span>
          </div>
        </div>

        {/* Defense Nodes Grid */}
        <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 flex-1">
          {DEFENSE_NODES.map((node) => {
            const Icon = node.icon;
            return (
              <div
                key={node.id}
                className={`relative overflow-hidden rounded-xl border ${node.borderColor} ${node.bgColor} p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${node.glowColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/80 border border-slate-800">
                      <Icon className={`h-4 w-4 ${node.color}`} />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-100">{node.label}</h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{node.detail}</p>
                    </div>
                  </div>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider ${
                    node.status === 'BLOCKED'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {node.status}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Summary / Protocol Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-center">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <Cpu className="h-4 w-4 text-cyan-400" />
              <span>Invariants Protection</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Mathematical guarantees enforced server-side before any ledger state mutation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
