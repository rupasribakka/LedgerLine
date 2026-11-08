import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  Search,
  ArrowRight,
  RefreshCw,
  Plus,
  Shield,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAccounts, formatPaiseToRupees } from '../services/api';
import GlowCard from '../components/ui/GlowCard';
import GlowButton from '../components/ui/GlowButton';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';

export default function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const role = (user?.role || 'holder').toLowerCase();

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetchAccounts();
      if (res.ok && res.data?.accounts) {
        setAccounts(res.data.accounts);
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
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.status && a.status.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[rgba(60,255,160,0.12)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="emerald" size="sm">
              DOUBLE-ENTRY LEDGER ACCOUNTS
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-[#eafff5]">
            Accounts & Balances
          </h1>
          <p className="text-xs sm:text-sm text-[#7ea594] mt-1">
            Real-time balance records enforced with PostgreSQL <code className="text-[#2dff9a]">chk_no_overdraft</code> constraint.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <GlowButton
            variant="secondary"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              loadAccounts();
            }}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </GlowButton>

          {role === 'admin' && (
            <Link to="/app/admin">
              <GlowButton variant="primary" size="sm" className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Create Account</span>
              </GlowButton>
            </Link>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-[rgba(60,255,160,0.14)] bg-[#07110d] px-4 py-2.5 max-w-md">
        <Search className="h-4 w-4 text-[#7ea594]" />
        <input
          type="text"
          placeholder="Filter by account name, ID, or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs sm:text-sm font-mono text-[#eafff5] placeholder-[#7ea594]/60 focus:outline-none"
        />
      </div>

      {/* Accounts List / Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ) : filtered.length === 0 ? (
        <GlowCard className="p-10 text-center space-y-3">
          <Wallet className="h-10 w-10 text-[#7ea594] mx-auto opacity-60" />
          <h3 className="text-base font-bold font-mono text-[#eafff5]">No matching accounts found</h3>
          <p className="text-xs text-[#7ea594]">Try adjusting your search criteria or sync with the server.</p>
        </GlowCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((acc) => (
            <GlowCard
              key={acc.id}
              className="p-6 flex flex-col justify-between hover:border-[#2dff9a]/40 transition-colors group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-[#7ea594] tracking-wider">
                      ACCOUNT #{String(acc.id).padStart(4, '0')}
                    </span>
                    <h3 className="text-base font-bold font-mono text-[#eafff5] group-hover:text-[#2dff9a] transition-colors truncate">
                      {acc.name || `Account ${acc.id}`}
                    </h3>
                  </div>

                  <Badge
                    variant={acc.status === 'ACTIVE' ? 'emerald' : acc.status === 'FROZEN' ? 'amber' : 'muted'}
                    size="sm"
                  >
                    {acc.status || 'ACTIVE'}
                  </Badge>
                </div>

                <div className="rounded-xl border border-[rgba(60,255,160,0.1)] bg-[#020605] p-3.5 space-y-1">
                  <span className="text-[10px] font-mono text-[#7ea594] uppercase tracking-wider">
                    Settled Integer Balance
                  </span>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-bold font-mono text-[#2dff9a]">
                      {formatPaiseToRupees(acc.balance_paise)}
                    </p>
                    <span className="text-[10px] font-mono text-[#7ea594]">
                      {acc.balance_paise} paise
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-[#7ea594]">
                  <span>Type:</span>
                  <span className="text-[#eafff5]">
                    {acc.is_external ? 'System Pool (External)' : 'Customer Ledger Account'}
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[rgba(60,255,160,0.1)] flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#7ea594]">
                  SHA-256 Chained
                </span>

                <Link
                  to={`/app/accounts/${acc.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[#2dff9a] hover:underline"
                >
                  <span>View Statement</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </GlowCard>
          ))}
        </div>
      )}
    </div>
  );
}
