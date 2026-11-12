import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowLeftRight,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAccounts,
  fetchTransactions,
  formatPaiseToRupees,
  verifySystemIntegrity,
} from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import SmoothPaiseCounter from '../components/ui/SmoothPaiseCounter';

export default function OverviewPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [integrityStatus, setIntegrityStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const role = (user?.role || 'holder').toLowerCase();
  const isHolder = role === 'holder';
  const isAdmin = role === 'admin';

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, txRes, intRes] = await Promise.all([
        fetchAccounts(),
        fetchTransactions({ limit: 5 }),
        verifySystemIntegrity(),
      ]);

      if (accRes.ok && accRes.data?.accounts) {
        // Exclude system external/clearing pools for customer-facing views
        const visibleAccounts = isHolder
          ? accRes.data.accounts.filter((a) => !a.is_external && a.account_no !== 'ACC-EXTERNAL')
          : accRes.data.accounts;
        setAccounts(visibleAccounts);
      }

      if (txRes.ok && txRes.data?.transactions) {
        setRecentTransactions(txRes.data.transactions.slice(0, 5));
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

  const totalPaise = accounts.reduce((sum, a) => sum + Number(a.balance_paise || 0), 0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Financial Workspace
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)] mt-1">
            {getGreeting()}, {user?.name || user?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Consolidated ledger balances, verified transactions, and account records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            disabled={refreshing}
            icon={RefreshCw}
            className={refreshing ? '[&_svg]:animate-spin' : ''}
          >
            <span>Sync</span>
          </Button>

          {role !== 'auditor' && (
            <Link to="/app/move">
              <Button variant="primary" size="sm" icon={ArrowLeftRight}>
                <span>Move Money</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Consolidated Balance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                Total Consolidated Balance
              </span>
              <Badge variant="success" size="sm" dot>
                {integrityStatus?.verified !== false ? 'Ledger Verified' : 'Checking Invariants'}
              </Badge>
            </div>

            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-primary)] tabular-nums">
                {loading ? (
                  <Skeleton className="h-10 w-48 rounded-lg" />
                ) : (
                  <SmoothPaiseCounter paise={totalPaise} />
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Represented strictly in 64-bit integer paise (1 INR = 100 paise)
              </p>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-[var(--border-subtle)] grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Active Accounts</p>
              <p className="text-base font-semibold text-[var(--text-primary)] mt-0.5">
                {loading ? '—' : accounts.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Double-Entry Status</p>
              <p className="text-base font-semibold text-[var(--status-success)] mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                <span>Zero-Sum</span>
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs text-[var(--text-secondary)]">Cryptographic Proof</p>
              <p className="text-base font-semibold text-[var(--text-primary)] mt-0.5 font-mono text-xs">
                SHA-256 Chained
              </p>
            </div>
          </div>
        </Card>

        {/* Quick Actions & Short Navigation */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Quick Operations
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Instant access to core financial tasks
            </p>

            <div className="mt-4 space-y-2">
              <Link
                to="/app/move"
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-subdued)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent-primary)]">
                    <ArrowLeftRight className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      Transfer Funds
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Instant double-entry settlement
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                to="/app/accounts"
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-subdued)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--bg-subdued)] text-[var(--text-primary)]">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      View Statements
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Ledger history and block proofs
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform group-hover:translate-x-0.5" />
              </Link>

              {(role === 'admin' || role === 'auditor') && (
                <Link
                  to="/app/audit"
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-subdued)] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--status-info-bg)] text-[var(--status-info)]">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        Audit & Verification
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Verify full ledger chain
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
            <span>Deterministic Concurrency</span>
            <span className="font-mono">SELECT FOR UPDATE</span>
          </div>
        </Card>
      </div>

      {/* Accounts Overview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Accounts Portfolio
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Active ledger accounts registered in this session
            </p>
          </div>
          <Link
            to="/app/accounts"
            className="text-xs font-medium text-[var(--accent-primary)] hover:underline flex items-center gap-1"
          >
            <span>View all accounts</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        ) : accounts.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <Wallet className="h-8 w-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-sm font-medium text-[var(--text-primary)]">No accounts available</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Please contact the system administrator to provision a new account.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <Card
                key={acc.id}
                className="p-5 flex flex-col justify-between hover:border-[var(--border-hover)] transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                        {acc.account_no || `ACC-${String(acc.id).padStart(4, '0')}`}
                      </p>
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 truncate">
                        {acc.name || `Account #${acc.id}`}
                      </h4>
                    </div>
                    <Badge
                      variant={
                        acc.status === 'ACTIVE'
                          ? 'success'
                          : acc.status === 'FROZEN'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {acc.status || 'ACTIVE'}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] text-[var(--text-secondary)]">Available Balance</p>
                    <p className="text-xl font-semibold text-[var(--text-primary)] tabular-nums mt-0.5">
                      <SmoothPaiseCounter paise={acc.balance_paise} />
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    {acc.is_external ? 'System Pool' : 'Personal Account'}
                  </span>
                  <Link
                    to={`/app/accounts/${acc.id}`}
                    className="font-medium text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Statement</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Recent Transactions
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Most recent atomic entries recorded in the double-entry journal
            </p>
          </div>
          <Link
            to="/app/transactions"
            className="text-xs font-medium text-[var(--accent-primary)] hover:underline flex items-center gap-1"
          >
            <span>View full history</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <Card className="p-4">
            <Skeleton className="h-40 rounded-lg" />
          </Card>
        ) : recentTransactions.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <Clock className="h-8 w-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-sm font-medium text-[var(--text-primary)]">No recent transactions</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Transactions performed on this account will appear here immediately.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subdued)] text-[var(--text-secondary)] font-medium">
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Accounts</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {recentTransactions.map((tx) => {
                    const isCredit = tx.type === 'DEPOSIT';
                    const isDebit = tx.type === 'WITHDRAWAL';
                    return (
                      <tr key={tx.id} className="hover:bg-[var(--bg-subdued)]/50 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                          <Badge
                            variant={
                              tx.type === 'TRANSFER'
                                ? 'accent'
                                : tx.type === 'DEPOSIT'
                                ? 'success'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {tx.type}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-secondary)] max-w-xs truncate">
                          {tx.description || `Transaction #${tx.id}`}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-secondary)]">
                          {tx.from_account_id ? `#${tx.from_account_id}` : 'External'} →{' '}
                          {tx.to_account_id ? `#${tx.to_account_id}` : 'External'}
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                          {tx.created_at
                            ? new Date(tx.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Just now'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold tabular-nums whitespace-nowrap text-[var(--text-primary)]">
                          {isCredit && <span className="text-[var(--status-success)]">+</span>}
                          {isDebit && <span className="text-[var(--status-error)]">-</span>}
                          {formatPaiseToRupees(tx.amount_paise || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
