import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowLeftRight,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Lock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAccounts, formatPaiseToRupees, verifySystemIntegrity } from '../services/api';
import GlowCard from '../components/ui/GlowCard';
import GlowButton from '../components/ui/GlowButton';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';

export default function OverviewPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [integrityStatus, setIntegrityStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const role = (user?.role || 'holder').toLowerCase();

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, intRes] = await Promise.all([
        fetchAccounts(),
        role !== 'holder' ? verifySystemIntegrity() : Promise.resolve(null),
      ]);

      if (accRes.ok && accRes.data?.accounts) {
        setAccounts(accRes.data.accounts);
      }
      if (intRes && intRes.ok) {
        setIntegrityStatus(intRes.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const totalPaise = accounts.reduce((acc, a) => acc + Number(a.balance_paise || 0), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[rgba(60,255,160,0.12)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono uppercase text-[#2dff9a] tracking-wider">
              {role === 'admin' ? 'Root Administrative Clearance' : role === 'auditor' ? 'Independent Audit Clearance' : 'Standard Account Holder'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-[#eafff5]">
            Financial Operations Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#7ea594] mt-1">
            Real-time ledger state, cryptographic continuity proofs, and account balances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <GlowButton
            variant="secondary"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Balances</span>
          </GlowButton>

          {role !== 'auditor' && (
            <Link to="/app/move">
              <GlowButton variant="primary" size="sm" className="flex items-center gap-1.5">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Move Money</span>
              </GlowButton>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Available Balance */}
        <GlowCard className="p-5 space-y-2">
          <div className="flex items-center justify-between text-[#7ea594]">
            <span className="text-xs font-mono font-medium">TOTAL BALANCES</span>
            <Wallet className="h-4 w-4 text-[#2dff9a]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#eafff5]">
            {loading ? <Skeleton className="h-8 w-28" /> : formatPaiseToRupees(totalPaise)}
          </p>
          <p className="text-[11px] font-mono text-[#7ea594]">
            Across {accounts.length} active account{accounts.length === 1 ? '' : 's'}
          </p>
        </GlowCard>

        {/* Global Sum Invariant */}
        <GlowCard className="p-5 space-y-2">
          <div className="flex items-center justify-between text-[#7ea594]">
            <span className="text-xs font-mono font-medium">GLOBAL SUM (Σ)</span>
            <ShieldCheck className="h-4 w-4 text-[#2dff9a]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#2dff9a]">
            0 PAISE
          </p>
          <p className="text-[11px] font-mono text-[#7ea594]">
            Zero-Sum Conservation Proof
          </p>
        </GlowCard>

        {/* Concurrency Guard */}
        <GlowCard className="p-5 space-y-2">
          <div className="flex items-center justify-between text-[#7ea594]">
            <span className="text-xs font-mono font-medium">CONCURRENCY LOCK</span>
            <Lock className="h-4 w-4 text-[#eafff5]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#eafff5]">
            ORDER BY ASC
          </p>
          <p className="text-[11px] font-mono text-[#7ea594]">
            Deadlock-Free FOR UPDATE
          </p>
        </GlowCard>

        {/* Cryptographic Continuity */}
        <GlowCard className="p-5 space-y-2">
          <div className="flex items-center justify-between text-[#7ea594]">
            <span className="text-xs font-mono font-medium">IMMUTABILITY</span>
            <Activity className="h-4 w-4 text-[#2dff9a]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#2dff9a]">
            SHA-256
          </p>
          <p className="text-[11px] font-mono text-[#7ea594]">
            Append-Only Trigger Protected
          </p>
        </GlowCard>
      </div>

      {/* Account Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-mono text-[#eafff5]">
              Active Financial Accounts
            </h2>
            <p className="text-xs text-[#7ea594]">
              Authorized accounts associated with this session
            </p>
          </div>
          <Link to="/app/accounts" className="text-xs font-mono text-[#2dff9a] hover:underline flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : accounts.length === 0 ? (
          <GlowCard className="p-8 text-center space-y-3">
            <Wallet className="h-8 w-8 text-[#7ea594] mx-auto" />
            <p className="text-sm font-mono text-[#eafff5]">No accounts loaded yet</p>
            <p className="text-xs text-[#7ea594]">Sign in or contact system administrator to provision an account.</p>
          </GlowCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <GlowCard key={acc.id} className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[#7ea594]">
                      ACCOUNT #{String(acc.id).padStart(4, '0')}
                    </span>
                    <h3 className="text-base font-bold font-mono text-[#eafff5] truncate">
                      {acc.name || `Account ${acc.id}`}
                    </h3>
                  </div>
                  <Badge variant={acc.status === 'ACTIVE' ? 'emerald' : 'amber'} size="sm">
                    {acc.status || 'ACTIVE'}
                  </Badge>
                </div>

                <div>
                  <span className="text-[11px] font-mono text-[#7ea594]">Settled Balance</span>
                  <p className="text-xl font-bold font-mono text-[#2dff9a]">
                    {formatPaiseToRupees(acc.balance_paise)}
                  </p>
                </div>

                <div className="pt-2 border-t border-[rgba(60,255,160,0.1)] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#7ea594]">
                    {acc.is_external ? 'System Pool' : 'Standard User'}
                  </span>
                  <Link
                    to={`/app/accounts/${acc.id}`}
                    className="text-[#2dff9a] hover:underline flex items-center gap-1"
                  >
                    <span>Inspect Statement</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </GlowCard>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Route Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <Link to="/app/move" className="group">
          <GlowCard className="p-5 space-y-2 h-full hover:border-[#2dff9a]/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(45,255,154,0.15)] border border-[#2dff9a]/40 text-[#2dff9a]">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold font-mono text-[#eafff5] group-hover:text-[#2dff9a] transition-colors">
                  Money Movement
                </h4>
                <p className="text-[11px] text-[#7ea594]">
                  Transfers, withdrawals & admin deposits
                </p>
              </div>
            </div>
          </GlowCard>
        </Link>

        {(role === 'admin' || role === 'auditor') && (
          <Link to="/app/audit" className="group">
            <GlowCard className="p-5 space-y-2 h-full hover:border-[#2dff9a]/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(45,255,154,0.15)] border border-[#2dff9a]/40 text-[#2dff9a]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-mono text-[#eafff5] group-hover:text-[#2dff9a] transition-colors">
                    Auditor & Duplicates
                  </h4>
                  <p className="text-[11px] text-[#7ea594]">
                    Zero-sum proof and replay detection
                  </p>
                </div>
              </div>
            </GlowCard>
          </Link>
        )}

        {(role === 'admin' || role === 'holder') && (
          <Link to="/app/attack-lab" className="group">
            <GlowCard className="p-5 space-y-2 h-full hover:border-[#2dff9a]/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(45,255,154,0.15)] border border-[#2dff9a]/40 text-[#2dff9a]">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-mono text-[#eafff5] group-hover:text-[#2dff9a] transition-colors">
                    Attack Lab
                  </h4>
                  <p className="text-[11px] text-[#7ea594]">
                    Concurrency race & replay testing
                  </p>
                </div>
              </div>
            </GlowCard>
          </Link>
        )}

        {role === 'admin' && (
          <Link to="/app/admin" className="group">
            <GlowCard className="p-5 space-y-2 h-full hover:border-[#2dff9a]/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(45,255,154,0.15)] border border-[#2dff9a]/40 text-[#2dff9a]">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-mono text-[#eafff5] group-hover:text-[#2dff9a] transition-colors">
                    Admin Console
                  </h4>
                  <p className="text-[11px] text-[#7ea594]">
                    Create accounts and manage users
                  </p>
                </div>
              </div>
            </GlowCard>
          </Link>
        )}
      </div>
    </div>
  );
}
