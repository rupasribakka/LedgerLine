import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowLeftRight,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Clock,
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
import BalanceWidget from '../components/ui/BalanceWidget';
import LedgerTrace from '../components/ui/LedgerTrace';

export default function OverviewPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [integrityStatus, setIntegrityStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const role = (user?.role || 'holder').toLowerCase();
  const isHolder = role === 'holder';

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

      {/* Main Balance Section: Refined Claymorphic Balance Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BalanceWidget
            title="Consolidated Portfolio Balance"
            paise={totalPaise}
            loading={loading}
            verified={integrityStatus?.verified !== false}
            accountCount={accounts.length}
            actionLink="/app/accounts"
            actionLabel="Inspect All Accounts"
          />
        </div>

        {/* Quick Actions & Short Navigation with Subtle Elevation */}
        <Card variant="clay" className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Quick Operations
              </h3>
              <Badge variant="neutral" size="sm">
                Tactile Console
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Direct settlement & verification tools
            </p>

            <div className="mt-4 space-y-2.5">
              <Link
                to="/app/move"
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subdued)] hover:-translate-y-0.5 transition-all duration-180 shadow-xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent-primary)] shadow-xs">
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
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subdued)] hover:-translate-y-0.5 transition-all duration-180 shadow-xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--bg-subdued)] text-[var(--text-primary)] shadow-xs">
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
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subdued)] hover:-translate-y-0.5 transition-all duration-180 shadow-xs group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--status-info-bg)] text-[var(--status-info)] shadow-xs">
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
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
              <span>Row Locks Active</span>
            </span>
            <span className="font-mono">SELECT FOR UPDATE</span>
          </div>
        </Card>
      </div>

      {/* Accounts Overview Section with Subtle Clay Surface on Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Accounts Portfolio
              </h2>
              <Badge variant="lavender" size="sm">
                Lavender Summaries
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Active ledger accounts registered in this session
            </p>
          </div>
          <Link
            to="/app/accounts"
            className="text-xs font-semibold text-[var(--accent-forest)] hover:underline flex items-center gap-1"
          >
            <span>View all accounts</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
        ) : accounts.length === 0 ? (
          <Card variant="clay" surface="lavender" className="p-8 text-center space-y-2">
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
                variant="clay"
                surface="lavender"
                hover={true}
                className="p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] text-[var(--accent-violet)] font-mono font-medium">
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

                  <div className="mt-4 p-3 rounded-xl bg-[var(--bg-surface)]/70 border border-[var(--border-lavender)]/50 shadow-[var(--shadow-recessed)]">
                    <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">
                      Available Balance
                    </p>
                    <p className="text-xl font-semibold text-[var(--text-primary)] tabular-nums mt-0.5">
                      <SmoothPaiseCounter paise={acc.balance_paise} />
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-4 border-t border-[var(--border-lavender)]/70 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    {acc.is_external ? 'System Pool' : 'Personal Account'}
                  </span>
                  <Link
                    to={`/app/accounts/${acc.id}`}
                    className="font-semibold text-[var(--accent-forest)] hover:underline inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
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

      {/* Recent Transactions List with Clean Layout */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Recent Transactions
              </h2>
              <Badge variant="peach" size="sm">
                Peach Stream
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Most recent atomic entries recorded in the double-entry journal
            </p>
          </div>
          <Link
            to="/app/transactions"
            className="text-xs font-semibold text-[var(--accent-forest)] hover:underline flex items-center gap-1"
          >
            <span>View full history</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <Card variant="clay" className="p-4">
            <Skeleton className="h-40 rounded-xl" />
          </Card>
        ) : recentTransactions.length === 0 ? (
          <Card variant="clay" className="p-8 text-center space-y-2">
            <Clock className="h-8 w-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-sm font-medium text-[var(--text-primary)]">No recent transactions</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Transactions performed on this account will appear here immediately.
            </p>
          </Card>
        ) : (
          <Card variant="clay" className="overflow-hidden">
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
                      <tr key={tx.id} className="hover:bg-[var(--bg-subdued)]/40 transition-colors">
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
