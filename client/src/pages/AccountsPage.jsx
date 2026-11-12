import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  Search,
  ArrowRight,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAccounts, formatPaiseToRupees } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import SmoothPaiseCounter from '../components/ui/SmoothPaiseCounter';

export default function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const role = (user?.role || 'holder').toLowerCase();
  const isHolder = role === 'holder';

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetchAccounts();
      if (res.ok && res.data?.accounts) {
        // Exclude system external pool for ordinary customer view
        const visible = isHolder
          ? res.data.accounts.filter((a) => !a.is_external && a.account_no !== 'ACC-EXTERNAL')
          : res.data.accounts;
        setAccounts(visible);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [user]);

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase();
    return (
      String(a.id).includes(q) ||
      (a.account_no && a.account_no.toLowerCase().includes(q)) ||
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.status && a.status.toLowerCase().includes(q))
    );
  });

  const totalPaise = filtered.reduce((acc, a) => acc + Number(a.balance_paise || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Ledger Portfolio
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)] mt-1">
            Accounts
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real-time balance records enforced by the PostgreSQL no-overdraft invariant.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              loadAccounts();
            }}
            disabled={refreshing}
            icon={RefreshCw}
            className={refreshing ? '[&_svg]:animate-spin' : ''}
          >
            <span>Refresh</span>
          </Button>

          {role === 'admin' && (
            <Link to="/app/admin">
              <Button variant="primary" size="sm" icon={Plus}>
                <span>Create Account</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Overview Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-[var(--text-secondary)]">Total Accounts</p>
          <p className="text-xl font-semibold text-[var(--text-primary)] mt-1">
            {loading ? '—' : accounts.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-secondary)]">Active Balance</p>
          <p className="text-xl font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
            {loading ? <Skeleton className="h-6 w-24" /> : formatPaiseToRupees(totalPaise)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-secondary)]">Overdraft Protection</p>
          <p className="text-xl font-semibold text-[var(--status-success)] mt-1 flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span>Enforced by DB Engine</span>
          </p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm relative">
          <Search className="h-4 w-4 text-[var(--text-secondary)] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by account name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl bg-[var(--bg-surface)] pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--border-subtle)] focus:border-[var(--border-focus)] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Accounts List / Responsive Table */}
      {loading ? (
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center space-y-2">
          <Wallet className="h-8 w-8 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            No matching accounts found
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Try adjusting your search criteria or refresh the ledger list.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subdued)] text-[var(--text-secondary)] text-xs font-medium">
                  <th className="py-3 px-5">Account</th>
                  <th className="py-3 px-5">Identifier</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5 text-right">Balance</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((acc) => (
                  <tr
                    key={acc.id}
                    className="hover:bg-[var(--bg-subdued)]/50 transition-colors group"
                  >
                    <td className="py-4 px-5 font-medium text-[var(--text-primary)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-subdued)] text-[var(--text-primary)]">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-[var(--text-primary)]">
                            {acc.name || `Account #${acc.id}`}
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            ID: #{acc.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs text-[var(--text-secondary)]">
                      {acc.account_no || `ACC-${String(acc.id).padStart(4, '0')}`}
                    </td>
                    <td className="py-4 px-5">
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
                    </td>
                    <td className="py-4 px-5 text-xs text-[var(--text-secondary)]">
                      {acc.is_external ? 'System Pool' : 'Personal Account'}
                    </td>
                    <td className="py-4 px-5 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatPaiseToRupees(acc.balance_paise)}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <Link
                        to={`/app/accounts/${acc.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline"
                      >
                        <span>Statement</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
