import React from 'react';
import {
  Wallet,
  ShieldCheck,
  Coins,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import SecurityVisualization from '../components/SecurityVisualization';
import TransactionActivityChart from '../components/TransactionActivityChart';
import ActivityTimeline from '../components/ActivityTimeline';
import SystemHealthCard from '../components/SystemHealthCard';
import LedgerTableShell from '../components/LedgerTableShell';
import VerificationCard from '../components/VerificationCard';
import AuditLogsViewer from '../components/AuditLogsViewer';
import { formatPaiseToRupees } from '../services/api';

export default function DashboardPage({
  activeTab = 'overview',
  currentUser,
  accounts = [],
  ledgerEntries = [],
  backendHealth,
  isCheckingHealth,
  onRefreshHealth,
  onOpenAuth,
  onOpenTransfer,
  onOpenDeposit,
  onOpenWithdraw,
  onRefreshData,
  loadingData = false,
}) {
  // Aggregate account balances
  const totalBalancePaise = accounts.reduce(
    (sum, acc) => sum + Number(acc.balance_paise || 0),
    0
  );
  const formattedTotalBalance = formatPaiseToRupees(totalBalancePaise);

  return (
    <div className="space-y-7">
      {/* Sign-In Prompt Banner if Not Authenticated */}
      {!currentUser && (
        <div className="rounded-2xl border border-cyan-500/30 bg-linear-to-r from-cyan-950/40 via-blue-950/30 to-[#060b18] p-5 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                Authentication Required for Transactions
              </h3>
              <p className="text-xs text-slate-400">
                Sign in with seeded demo accounts (<code>admin@ledgerline.local</code>, <code>holder1@...</code>, <code>holder2@...</code>, <code>auditor@...</code>) to manage balances, execute transfers, and inspect ledger proofs.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAuth}
            className="shrink-0 flex items-center justify-center space-x-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-mono font-semibold text-white shadow-lg shadow-cyan-950/50 hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <span>Choose Demo Account</span>
          </button>
        </div>
      )}

      {/* Top Action Bar when Signed In */}
      {currentUser && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-800 bg-[#060b18]/70 p-4 gap-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white font-mono">
                Authenticated as <span className="text-cyan-400">{currentUser.name || currentUser.username}</span> ({currentUser.role})
              </p>
              <p className="text-[11px] text-slate-400">
                {accounts.length} Active Account{accounts.length === 1 ? '' : 's'} • Total Available: {formattedTotalBalance}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenTransfer}
              className="flex items-center space-x-1.5 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-xs font-mono font-semibold text-white shadow-md shadow-cyan-900/30 hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>Transfer</span>
            </button>
            <button
              onClick={onOpenDeposit}
              className="flex items-center space-x-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-xs font-mono font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-all"
            >
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
              <span>Deposit</span>
            </button>
            <button
              onClick={onOpenWithdraw}
              className="flex items-center space-x-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-2 text-xs font-mono font-semibold text-amber-300 hover:bg-amber-500/25 transition-all"
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-amber-400" />
              <span>Withdraw</span>
            </button>
            <button
              onClick={onRefreshData}
              disabled={loadingData}
              title="Refresh ledger state"
              className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* View: Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Top Key Metrics Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Accounts"
              value={`${accounts.length} Active`}
              badge={accounts.length > 0 ? "LIVE" : "READY"}
              subtext="Cryptographic accounts ready for user onboarding."
              icon={Wallet}
              accentColor="cyan"
            />
            <StatCard
              title="Available Balance"
              value={formattedTotalBalance}
              badge={`${totalBalancePaise.toLocaleString()} PAISE`}
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

          {/* Verification Engine */}
          <VerificationCard />

          {/* Double-Entry Ledger Journal Stream */}
          <LedgerTableShell entries={ledgerEntries} title="Active Journal Stream" />

          {/* Grid: Transaction Activity Waveform & Audit Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TransactionActivityChart />
            <ActivityTimeline />
          </div>
        </>
      )}

      {/* View: Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-cyan-500/15 bg-[#060b18]/80 p-6 backdrop-blur-xl">
            <h3 className="text-base font-bold text-white font-mono mb-4 flex items-center justify-between">
              <span>Managed Account Balances</span>
              <span className="text-xs text-cyan-400 font-normal">
                {accounts.length} Account{accounts.length === 1 ? '' : 's'} Found
              </span>
            </h3>

            {accounts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2 hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        Account #{acc.id}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        {acc.status || 'ACTIVE'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-white">
                      {formatPaiseToRupees(acc.balance_paise)}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {Number(acc.balance_paise).toLocaleString()} Paise
                    </p>
                    <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                      Owner ID: {acc.owner_id || acc.user_id} {acc.name ? `• ${acc.name}` : ''} {acc.owner_email ? `(${acc.owner_email})` : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center text-xs text-slate-400 font-mono">
                No accounts available for this view. Please sign in with an Account Holder or Admin credential.
              </div>
            )}
          </div>

          <LedgerTableShell entries={ledgerEntries} title="Recent Journal Entries" />
        </div>
      )}

      {/* View: Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-cyan-500/15 bg-[#060b18]/80 p-6 backdrop-blur-xl">
            <h3 className="text-base font-bold text-white font-mono mb-2">
              Financial Actions Console
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Trigger atomic transactions directly with real-time pessimistic concurrency locking.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={onOpenTransfer}
                className="flex flex-col items-start p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all text-left group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 mb-3 group-hover:scale-105 transition-transform">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-white font-mono group-hover:text-cyan-300">
                  Account Transfer
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Move funds between internal accounts with ordered row locks.
                </span>
              </button>

              <button
                onClick={onOpenDeposit}
                className="flex flex-col items-start p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all text-left group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-3 group-hover:scale-105 transition-transform">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-white font-mono group-hover:text-emerald-300">
                  External Deposit
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Credit account with ACC-EXTERNAL double-entry balancing entry.
                </span>
              </button>

              <button
                onClick={onOpenWithdraw}
                className="flex flex-col items-start p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-amber-500/50 hover:bg-slate-800/60 transition-all text-left group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-3 group-hover:scale-105 transition-transform">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-white font-mono group-hover:text-amber-300">
                  External Withdrawal
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Debit account to ACC-EXTERNAL with strict overdraft prevention.
                </span>
              </button>
            </div>
          </div>

          <LedgerTableShell entries={ledgerEntries} title="Historical Journal Entries" />
        </div>
      )}

      {/* View: Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          <LedgerTableShell entries={ledgerEntries} title="Complete Double-Entry Ledger" />
        </div>
      )}

      {/* View: Security / Verification Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <VerificationCard />
          <SecurityVisualization />
        </div>
      )}

      {/* View: Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <AuditLogsViewer />
        </div>
      )}

      {/* Real-time System Diagnostics Card (Persistent at bottom) */}
      <SystemHealthCard
        healthData={backendHealth}
        isChecking={isCheckingHealth}
        onRefresh={onRefreshHealth}
      />
    </div>
  );
}
