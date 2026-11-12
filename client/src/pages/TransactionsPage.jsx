import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  RefreshCw,
  Copy,
  Check,
  X,
  ChevronRight,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchTransactions,
  fetchLedgerEntries,
  formatPaiseToRupees,
} from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'ledger'
  const [transactions, setTransactions] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);
  const [selectedTxn, setSelectedTxn] = useState(null);

  const role = (user?.role || 'holder').toLowerCase();
  const canViewLedger = role === 'admin' || role === 'auditor';

  const loadData = async () => {
    setLoading(true);
    try {
      const [txRes, ledgRes] = await Promise.all([
        fetchTransactions({ limit: 100 }),
        canViewLedger
          ? fetchLedgerEntries({ limit: 100 })
          : Promise.resolve({ ok: true, data: { entries: [] } }),
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
    showToast({
      title: 'Copied',
      message: `${text.slice(0, 16)}... copied to clipboard.`,
      type: 'info',
    });
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
      String(row.account_id).includes(q) ||
      (row.kind && row.kind.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Audit Trail & History
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)] mt-1">
            Transactions
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Complete record of financial movements, balanced debits, and credits.
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
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Tabs (Transactions vs Double-Entry Ledger) */}
      {canViewLedger && (
        <div className="flex gap-2 p-1 rounded-xl bg-[var(--bg-subdued)] w-fit border border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Double-Entry Journal Rows ({ledgerEntries.length})
          </button>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-sm relative">
          <Search className="h-4 w-4 text-[var(--text-secondary)] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by ID, account, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl bg-[var(--bg-surface)] pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--border-subtle)] focus:border-[var(--border-focus)] focus:outline-none transition-colors"
          />
        </div>

        {activeTab === 'transactions' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)]">Type:</span>
            {['ALL', 'TRANSFER', 'DEPOSIT', 'WITHDRAWAL'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  typeFilter === t
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-semibold'
                    : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-subdued)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table Section */}
      {loading ? (
        <Card className="p-6">
          <Skeleton className="h-48 w-full" />
        </Card>
      ) : activeTab === 'transactions' ? (
        filteredTransactions.length === 0 ? (
          <Card className="p-12 text-center space-y-2">
            <BookOpen className="h-8 w-8 text-[var(--text-muted)] mx-auto" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              No transactions match your criteria
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Try adjusting your search query or clear the filter.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subdued)] text-[var(--text-secondary)] font-medium">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Accounts Involved</th>
                    <th className="py-3 px-4">Txn ID</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredTransactions.map((tx) => {
                    const isCredit = tx.type === 'DEPOSIT';
                    const isDebit = tx.type === 'WITHDRAWAL';
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-[var(--bg-subdued)]/50 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                          {tx.created_at
                            ? new Date(tx.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
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
                        <td className="py-3.5 px-4 text-[var(--text-primary)] max-w-xs truncate">
                          {tx.description || `Transaction #${tx.id}`}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-secondary)]">
                          {tx.from_account_id ? `#${tx.from_account_id}` : 'External'} →{' '}
                          {tx.to_account_id ? `#${tx.to_account_id}` : 'External'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-secondary)]">
                          <button
                            onClick={() => handleCopy(tx.id, `tx-${tx.id}`)}
                            className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer"
                            title="Copy Txn ID"
                          >
                            <span>{String(tx.id).slice(0, 12)}</span>
                            {copiedId === `tx-${tx.id}` ? (
                              <Check className="h-3 w-3 text-[var(--status-success)]" />
                            ) : (
                              <Copy className="h-3 w-3 text-[var(--text-muted)]" />
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold tabular-nums text-[var(--text-primary)] whitespace-nowrap">
                          {isCredit && <span className="text-[var(--status-success)]">+</span>}
                          {isDebit && <span className="text-[var(--status-error)]">-</span>}
                          {formatPaiseToRupees(tx.amount_paise || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedTxn(tx)}
                            className="text-xs text-[var(--accent-primary)] hover:underline font-medium cursor-pointer inline-flex items-center gap-0.5"
                          >
                            <span>View</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        /* Double-Entry Journal Rows (Admin / Auditor view) */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subdued)] text-[var(--text-secondary)] font-medium">
                  <th className="py-3 px-4">Row #</th>
                  <th className="py-3 px-4">Txn Ref</th>
                  <th className="py-3 px-4">Account ID</th>
                  <th className="py-3 px-4">Kind</th>
                  <th className="py-3 px-4">Balance After</th>
                  <th className="py-3 px-4 text-right">Paise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-[11px]">
                {filteredLedger.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--bg-subdued)]/50">
                    <td className="py-3 px-4 text-[var(--text-secondary)]">#{row.id}</td>
                    <td className="py-3 px-4 text-[var(--text-primary)]">{row.txn_id?.slice(0, 14)}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">Acc #{row.account_id}</td>
                    <td className="py-3 px-4 font-sans font-medium">
                      <Badge
                        variant={
                          row.kind?.includes('CREDIT')
                            ? 'success'
                            : row.kind?.includes('DEBIT')
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {row.kind}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 tabular-nums">
                      {row.balance_after_paise != null ? `${row.balance_after_paise} p` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                      {row.amount_paise} paise
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Transaction Details Drawer / Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  Transaction Details
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Full double-entry settlement record
                </p>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subdued)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Txn Reference:</span>
                <span className="font-mono text-[var(--text-primary)]">{selectedTxn.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Type:</span>
                <Badge variant="accent" size="sm">{selectedTxn.type}</Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Settled Amount:</span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums">
                  {formatPaiseToRupees(selectedTxn.amount_paise || 0)} ({selectedTxn.amount_paise} paise)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">From Account:</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {selectedTxn.from_account_id ? `#${selectedTxn.from_account_id}` : 'External Clearing'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">To Account:</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {selectedTxn.to_account_id ? `#${selectedTxn.to_account_id}` : 'External Clearing'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Description:</span>
                <span className="text-[var(--text-primary)]">{selectedTxn.description || '—'}</span>
              </div>
              {selectedTxn.idempotency_key && (
                <div className="py-1">
                  <span className="text-[var(--text-secondary)] block mb-1">Idempotency Key:</span>
                  <span className="font-mono text-[11px] text-[var(--text-primary)] bg-[var(--bg-subdued)] p-2 rounded block break-all">
                    {selectedTxn.idempotency_key}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedTxn(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
