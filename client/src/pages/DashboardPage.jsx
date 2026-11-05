import React from 'react';
import {
  ShieldCheck,
  Coins,
  Cpu,
  Layers,
  Info,
  Server
} from 'lucide-react';
import StatCard from '../components/StatCard';
import SystemHealthCard from '../components/SystemHealthCard';
import SecurityPillars from '../components/SecurityPillars';
import LedgerTableShell from '../components/LedgerTableShell';

export default function DashboardPage({ backendHealth, isCheckingHealth, onRefreshHealth, currentRole }) {
  return (
    <div className="space-y-6">
      {/* Phase 1 Setup Notice Banner */}
      <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-linear-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 p-5">
        <div className="flex items-start space-x-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Info className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-white">
                LedgerLine Phase 1 — Architecture & Core Setup Active
              </h2>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
                Setup Stage
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              Workspace initialized with React + Vite frontend, Express backend, Tailwind CSS, and strict financial security invariants.
              In accordance with project guidelines, deposit/withdrawal/transfer execution remains disabled until Phase 2 database models and double-entry engines are approved.
            </p>
          </div>
        </div>
      </div>

      {/* Top Architectural Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Arithmetic Engine"
          value="Integer Paise"
          badge="Zero Float"
          subtext="₹1.00 = 100 paise. Prevents IEEE 754 precision rounding leaks."
          icon={Coins}
          accentColor="blue"
        />
        <StatCard
          title="Ledger Architecture"
          value="Double-Entry"
          badge="ACID"
          subtext="T-Account debit/credit parity enforced for every transaction."
          icon={Layers}
          accentColor="violet"
        />
        <StatCard
          title="Concurrency Guard"
          value="Row Locking"
          badge="Pessimistic"
          subtext="PostgreSQL SELECT FOR UPDATE eliminates race conditions."
          icon={ShieldCheck}
          accentColor="emerald"
        />
        <StatCard
          title="Backend Runtime"
          value="Express Core"
          badge={backendHealth?.ok ? 'Connected' : 'Listening'}
          subtext="Modular Express API with Helmet, CORS, and health probe."
          icon={Cpu}
          accentColor="indigo"
        />
      </div>

      {/* Real-time Health Diagnostics */}
      <SystemHealthCard
        healthData={backendHealth}
        isChecking={isCheckingHealth}
        onRefresh={onRefreshHealth}
      />

      {/* Security and Architecture Guarantees */}
      <SecurityPillars />

      {/* Ledger Journal Shell */}
      <LedgerTableShell />
    </div>
  );
}
