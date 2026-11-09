import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  BookOpen,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Hash,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Repeat,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchTransactions,
  fetchLedgerEntries,
  formatPaiseToRupees,
} from '../services/api';
import GlowCard from '../components/ui/GlowCard';
import GlowButton from '../components/ui/GlowButton';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import SmoothPaiseCounter from '../components/ui/SmoothPaiseCounter';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'ledger'
  const [transactions, setTransactions] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);

  const role = (user?.role || 'holder').toLowerCase();
  const canViewLedger = role === 'admin' || role === 'auditor';

  const loadData = async () => {
    setLoading(true);
    try {
      const [txRes, ledgRes] = await Promise.all([
        fetchTransactions({ limit: 100 }),
        canViewLedger ? fetchLedgerEntries({ limit: 100 }) : Promise.resolve({ ok: true, data: { entries: [] } }),
      ]);

      if (txRes.ok && txRes.data?.transactions) {
        setTransactions(txRes.data.transactions);
      }
      if (ledgRes.ok && ledgRes.data?.entries) {
        setLedgerEntries(ledgRes.data.entries);
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

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      String(tx.id).toLowerCase().includes(q) ||
      (tx.description && tx.description.toLowerCase().includes(q)) ||
      (tx.idempotency_key && tx.idempotency_key.toLowerCase().includes(q)) ||
      String(tx.from_account_id).includes(q) ||
      String(tx.to_account_id).includes(q);

    const matchesType = typeFilter === 'ALL' || tx.type?.toUpperCase() === typeFilter;
    return matchesSearch && matchesType;
  });

  // Filter ledger entries
  const filteredLedger = ledgerEntries.filter((row) => {
    const q = search.toLowerCase();
    return (
      !q ||
      String(row.id).includes(q) ||
      String(row.txn_id).toLowerCase().includes(q) ||
      String(row.hash).toLowerCase().includes(q) ||
      (row.reason && row.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[rgba(60,255,160,0.12)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="emerald" size="sm">
              DOUBLE-ENTRY AUDIT JOURNAL
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-[#eafff5]">
            Transactions & History
          </h1>
          <p className="text-xs sm:text-sm text-[#7ea594] mt-1">
            Immutable transaction records and cryptographic SHA-256 hash-chained ledger rows.
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
            <span>Refresh</span>
          </GlowButton>

          {role !== 'auditor' && (
            <Link to="/app/move">
              <GlowButton variant="primary" size="sm" className="flex items-center gap-1.5">
                <ArrowLeftRight className="h-4 w-4" />
                <span>New Transfer</span>
              </GlowButton>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#07110d] border border-[rgba(60,255,160,0.14)]">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-[#2dff9a] text-[#020605] shadow-[0_0_15px_rgba(45,255,154,0.35)]'
                : 'text-[#7ea594] hover:text-[#eafff5]'
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Transactions ({transactions.length})</span>
          </button>

          {canViewLedger && (
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-[#2dff9a] text-[#020605] shadow-[0_0_15px_rgba(45,255,154,0.35)]'
                  : 'text-[#7ea594] hover:text-[#eafff5]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Ledger Rows ({ledgerEntries.length})</span>
            </button>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'transactions' && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#07110d] border border-[rgba(60,255,160,0.14)] text-xs font-mono">
              {['ALL', 'TRANSFER', 'DEPOSIT', 'WITHDRAWAL'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    typeFilter === t
                      ? 'bg-[rgba(45,255,154,0.2)] text-[#2dff9a] font-bold'
                      : 'text-[#7ea594] hover:text-[#eafff5]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-[rgba(60,255,160,0.14)] bg-[#07110d] px-3 py-1.5 min-w-[240px]">
            <Search className="h-3.5 w-3.5 text-[#7ea594]" />
            <input
              type="text"
              placeholder="Search by ID, hash, key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs font-mono text-[#eafff5] placeholder-[#7ea594]/60 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tab 1: Transactions Table */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <GlowCard className="p-10 text-center space-y-3">
              <ArrowLeftRight className="h-8 w-8 text-[#7ea594] mx-auto opacity-60" />
              <h3 className="text-base font-bold font-mono text-[#eafff5]">No transactions recorded</h3>
              <p className="text-xs text-[#7ea594]">
                Completed financial operations will appear here automatically.
              </p>
            </GlowCard>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[rgba(60,255,160,0.14)] bg-[#07110d]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-[rgba(60,255,160,0.12)] bg-[#030a07] text-[#7ea594]">
                  <tr>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Accounts (From → To)</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(60,255,160,0.08)]">
                  {filteredTransactions.map((tx) => {
                    const isCredit = tx.type === 'deposit';
                    const isDebit = tx.type === 'withdrawal';
                    return (
                      <tr key={tx.id} className="hover:bg-[#030a07]/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-[#eafff5]">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[140px]">{tx.id}</span>
                            <button
                              onClick={() => handleCopy(tx.id, tx.id)}
                              className="text-[#7ea594] hover:text-[#2dff9a] cursor-pointer"
                              title="Copy transaction ID"
                            >
                              {copiedId === tx.id ? (
                                <Check className="h-3 w-3 text-[#2dff9a]" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          {tx.idempotency_key && (
                            <span className="text-[10px] text-[#7ea594] block truncate max-w-[180px]">
                              key: {tx.idempotency_key}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              tx.type === 'deposit'
                                ? 'emerald'
                                : tx.type === 'withdrawal'
                                ? 'amber'
                                : 'cyan'
                            }
                            size="sm"
                          >
                            {tx.type.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-[#7ea594]">
                          {tx.from_account_id ? `Acc #${tx.from_account_id}` : 'External Clearing'}
                          {' → '}
                          {tx.to_account_id ? `Acc #${tx.to_account_id}` : 'External Clearing'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#eafff5]">
                          <span className={isCredit ? 'text-[#2dff9a]' : isDebit ? 'text-[#ff5d7a]' : 'text-cyan-400'}>
                            {formatPaiseToRupees(tx.amount_paise)}
                          </span>
                          <span className="text-[10px] text-[#7ea594] block font-normal">
                            {tx.amount_paise} paise
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={tx.status === 'completed' ? 'emerald' : tx.status === 'pending' ? 'amber' : 'error'}
                            size="sm"
                          >
                            {tx.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-[#7ea594]">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Raw Ledger Rows (Append-Only Journal) */}
      {activeTab === 'ledger' && canViewLedger && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          ) : filteredLedger.length === 0 ? (
            <GlowCard className="p-10 text-center space-y-3">
              <BookOpen className="h-8 w-8 text-[#7ea594] mx-auto opacity-60" />
              <h3 className="text-base font-bold font-mono text-[#eafff5]">No ledger rows found</h3>
              <p className="text-xs text-[#7ea594]">All posted transactions append immutable ledger rows.</p>
            </GlowCard>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[rgba(60,255,160,0.14)] bg-[#07110d]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-[rgba(60,255,160,0.12)] bg-[#030a07] text-[#7ea594]">
                  <tr>
                    <th className="py-3 px-4">Row #</th>
                    <th className="py-3 px-4">Account ID</th>
                    <th className="py-3 px-4">Kind</th>
                    <th className="py-3 px-4 text-right">Amount (Paise)</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                    <th className="py-3 px-4">SHA-256 Hash Fingerprint</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(60,255,160,0.08)]">
                  {filteredLedger.map((row) => (
                    <tr key={row.id} className="hover:bg-[#030a07]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#eafff5]">#{row.id}</td>
                      <td className="py-3 px-4 text-cyan-400">Account #{row.account_id}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={row.kind === 'credit' ? 'emerald' : 'amber'}
                          size="sm"
                        >
                          {row.kind.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#eafff5]">
                        <span className={row.kind === 'credit' ? 'text-[#2dff9a]' : 'text-amber-400'}>
                          {row.kind === 'credit' ? '+' : '-'}{formatPaiseToRupees(row.amount_paise)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#eafff5]">
                        {formatPaiseToRupees(row.balance_after_paise)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-[#7ea594]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[130px]">{row.hash}</span>
                          <button
                            onClick={() => handleCopy(row.hash, row.id)}
                            className="text-[#7ea594] hover:text-[#2dff9a] cursor-pointer"
                            title="Copy SHA-256 Hash"
                          >
                            {copiedId === row.id ? (
                              <Check className="h-3 w-3 text-[#2dff9a]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <span className="text-[9px] text-[#7ea594]/60 block truncate max-w-[130px]">
                          prev: {row.prev_hash?.slice(0, 16)}...
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#7ea594]">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
