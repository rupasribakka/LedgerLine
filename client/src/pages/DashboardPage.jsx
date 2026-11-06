import React from 'react';
import {
  Wallet,
  ShieldCheck,
  Scale,
  Coins,
  ArrowLeftRight,
  History,
  Terminal,
  Activity,
  Layers
} from 'lucide-react';
import StatCard from '../components/StatCard';
import SecurityVisualization from '../components/SecurityVisualization';
import TransactionActivityChart from '../components/TransactionActivityChart';
import ActivityTimeline from '../components/ActivityTimeline';
import SystemHealthCard from '../components/SystemHealthCard';
import LedgerTableShell from '../components/LedgerTableShell';

export default function DashboardPage({
  backendHealth,
  isCheckingHealth,
  onRefreshHealth,
  currentRole
}) {
  return (
    <div className="space-y-7">
      {/* Top Key Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Accounts"
          value="0 Active"
          badge="READY"
          subtext="Cryptographic accounts ready for user onboarding."
          icon={Wallet}
          accentColor="cyan"
        />
        <StatCard
          title="Settled Volume"
          value="₹0.00"
          badge="0 PAISE"
          subtext="Strict integer precision arithmetic. Zero floating-point error."
          icon={Coins}
          accentColor="blue"
        />
        <StatCard
          title="Security Status"
          value="OPTIMAL"
          badge="ARMED"
          subtext="Pessimistic row locks & double-entry invariants active."
          icon={ShieldCheck}
          accentColor="emerald"
        />
        <StatCard
          title="Idempotency Shield"
          value="100% Active"
          badge="UUIDv4"
          subtext="Deduplication active. Duplicate transfers blocked."
          icon={Layers}
          accentColor="violet"
        />
      </div>

      {/* Central Animated Security Monitoring Centerpiece */}
      <SecurityVisualization />

      {/* Grid: Transaction Activity Waveform & Audit Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TransactionActivityChart />
        <ActivityTimeline />
      </div>

      {/* Double-Entry Ledger Journal */}
      <LedgerTableShell />

      {/* Real-time System Diagnostics & Health Indicator */}
      <SystemHealthCard
        healthData={backendHealth}
        isChecking={isCheckingHealth}
        onRefresh={onRefreshHealth}
      />
    </div>
  );
}
