import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Link2,
  ShieldCheck,
  ShieldAlert,
  Repeat,
  Calendar,
  Clock,
  Database,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Hash,
  AlertTriangle,
} from 'lucide-react';
import { fetchAccountStatement, formatPaiseToRupees } from '../services/api';
import GlowCard from '../components/ui/GlowCard';
import GlowButton from '../components/ui/GlowButton';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';

export default function AccountStatementPage() {
  const { id } = useParams();
  const [statementData, setStatementData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatement = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAccountStatement(id);
      if (res.ok && res.data) {
        setStatementData(res.data);
      } else {
        setError(res.error || 'Failed to load account statement.');
      }
    } catch (err) {
      setError(err.message || 'Network error loading statement.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatement();
  }, [id]);

  const account = statementData?.account;
  const entries = statementData?.statement || [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[rgba(60,255,160,0.12)] pb-6">
        <div className="space-y-1">
          <Link
            to="/app/accounts"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#7ea594] hover:text-[#2dff9a] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Accounts</span>
          </Link>
          <div className="flex items-center gap-3 pt-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-[#eafff5]">
              {account?.name || `Account #${id}`}
            </h1>
            <Badge variant="emerald" size="sm">
              SHA-256 LEDGER CHAIN
            </Badge>
          </div>
          <p className="text-xs text-[#7ea594] font-mono">
            Cryptographic ledger chain statement for Account ID #{id}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <GlowButton
            variant="secondary"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              loadStatement();
            }}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Chain</span>
          </GlowButton>
        </div>
      </div>

      {/* Account Invariant Card */}
      {loading ? (
        <Skeleton className="h-28 rounded-2xl" />
      ) : account ? (
        <GlowCard className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-[#2dff9a]/30">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7ea594]">
              Settled Balance
            </span>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-[#2dff9a]">
              {formatPaiseToRupees(account.balance_paise)}
            </p>
            <span className="text-[10px] font-mono text-[#7ea594]">
              {account.balance_paise} paise
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7ea594]">
              Account Owner
            </span>
            <p className="text-base font-bold font-mono text-[#eafff5] truncate">
              {account.owner_name || account.owner_email || 'System'}
            </p>
            <span className="text-[10px] font-mono text-[#7ea594]">
              {account.owner_email || 'core@ledgerline.local'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7ea594]">
              Chain Entries
            </span>
            <p className="text-2xl font-bold font-mono text-[#eafff5]">
              {entries.length}
            </p>
            <span className="text-[10px] font-mono text-[#2dff9a]">
              Strictly Append-Only
            </span>
          </div>
        </GlowCard>
      ) : null}

      {error && (
        <GlowCard className="p-6 border-[rgba(255,93,122,0.4)] bg-[#17090d] text-center space-y-2">
          <ShieldAlert className="h-8 w-8 text-[#ff5d7a] mx-auto" />
          <h3 className="text-base font-bold font-mono text-[#ff5d7a]">{error}</h3>
          <p className="text-xs text-[#7ea594]">Please verify your account access permissions.</p>
        </GlowCard>
      )}

      {/* Vertical Chain of Ledger Blocks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-base font-bold font-mono text-[#eafff5] flex items-center gap-2">
            <Link2 className="h-4 w-4 text-[#2dff9a]" />
            <span>Vertical Ledger Chain</span>
          </h2>
          <span className="text-xs font-mono text-[#7ea594]">
            {entries.length} Block{entries.length === 1 ? '' : 's'} Linked
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : entries.length === 0 ? (
          <GlowCard className="p-12 text-center space-y-3">
            <Database className="h-10 w-10 text-[#7ea594] mx-auto opacity-50" />
            <h3 className="text-base font-bold font-mono text-[#eafff5]">Zero journal entries</h3>
            <p className="text-xs text-[#7ea594] max-w-sm mx-auto">
              This account has no posted ledger records yet. Initiate a deposit, withdrawal, or transfer to write the opening block.
            </p>
          </GlowCard>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6">
            {/* Vertical Chain Guideline */}
            <div className="absolute left-3 sm:left-4 top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#2dff9a] via-[rgba(60,255,160,0.3)] to-transparent pointer-events-none" />

            {entries.map((block, idx) => {
              const isCredit =
                block.kind === 'CREDIT' ||
                block.kind === 'TRANSFER_CREDIT' ||
                block.kind === 'DEPOSIT';
              const isDebit =
                block.kind === 'DEBIT' ||
                block.kind === 'TRANSFER_DEBIT' ||
                block.kind === 'WITHDRAWAL';
              const isRefused =
                block.kind === 'REFUSED' ||
                block.kind === 'REJECTED' ||
                block.status === 'REFUSED' ||
                block.reason?.toLowerCase().includes('refused') ||
                block.reason?.toLowerCase().includes('failed');
              const isDuplicate = block.is_replayed || (block.replay_count && block.replay_count > 0);

              return (
                <div key={block.id || idx} className="relative group">
                  {/* Chain Node Connector Icon */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-6 h-6 w-6 rounded-full border flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${
                      isRefused
                        ? 'bg-[#1e070c] border-[#ff5d7a] text-[#ff5d7a] shadow-[0_0_12px_rgba(255,93,122,0.4)]'
                        : isDuplicate
                        ? 'bg-[#1c1404] border-amber-400 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                        : 'bg-[#03150d] border-[#2dff9a] text-[#2dff9a] shadow-[0_0_12px_rgba(45,255,154,0.35)]'
                    }`}
                  >
                    <Link2 className="h-3 w-3" />
                  </div>

                  {/* Ledger Block Card */}
                  <GlowCard
                    className={`p-5 sm:p-6 transition-all ${
                      isRefused
                        ? 'border-[#ff5d7a]/80 bg-[#140508] shadow-[0_0_30px_rgba(255,93,122,0.22)]'
                        : isDuplicate
                        ? 'border-amber-400/60 bg-[#0e0c03] shadow-[0_0_25px_rgba(251,191,36,0.15)]'
                        : 'border-[rgba(60,255,160,0.18)] hover:border-[#2dff9a]/50'
                    }`}
                  >
                    {/* Top Row: Sequence #, Badges & Date */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[rgba(60,255,160,0.1)]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#eafff5]">
                          BLOCK #{String(block.id || idx + 1).padStart(5, '0')}
                        </span>

                        <Badge
                          variant={isRefused ? 'error' : isCredit ? 'emerald' : 'cyan'}
                          size="sm"
                        >
                          {block.kind}
                        </Badge>

                        {isRefused && (
                          <Badge variant="error" size="sm" dot>
                            REFUSED
                          </Badge>
                        )}

                        {isDuplicate && (
                          <Badge variant="amber" size="sm" dot>
                            DUPLICATE REPLAY DETECTED ({block.replay_count}x)
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono text-[#7ea594]">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(block.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Middle Row: Amount & Settled Balance */}
                    <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-[#7ea594] uppercase tracking-wider">
                          Transaction Amount
                        </span>
                        <div className="flex items-center gap-2">
                          {isCredit ? (
                            <ArrowDownLeft className="h-5 w-5 text-[#2dff9a]" />
                          ) : isDebit ? (
                            <ArrowUpRight className="h-5 w-5 text-[#ff5d7a]" />
                          ) : null}
                          <span
                            className={`text-2xl font-bold font-mono ${
                              isRefused
                                ? 'text-[#ff5d7a] line-through'
                                : isCredit
                                ? 'text-[#2dff9a]'
                                : 'text-[#ff5d7a]'
                            }`}
                          >
                            {isCredit ? '+' : isDebit ? '-' : ''}
                            {formatPaiseToRupees(block.amount_paise)}
                          </span>
                          <span className="text-xs font-mono text-[#7ea594]">
                            ({block.amount_paise} paise)
                          </span>
                        </div>
                      </div>

                      <div className="sm:text-right space-y-1">
                        <span className="text-[10px] font-mono text-[#7ea594] uppercase tracking-wider">
                          Settled Balance After
                        </span>
                        <p className="text-xl font-bold font-mono text-[#eafff5]">
                          {formatPaiseToRupees(block.balance_after_paise)}
                        </p>
                      </div>
                    </div>

                    {/* Reason / Context */}
                    {block.reason && (
                      <div
                        className={`text-xs font-mono px-3 py-2 rounded-xl border mb-3 ${
                          isRefused
                            ? 'bg-[#22070e] border-[#ff5d7a]/40 text-[#ff5d7a]'
                            : 'bg-[#020605] border-[rgba(60,255,160,0.1)] text-[#7ea594]'
                        }`}
                      >
                        <span className="font-bold">Reason / Memo: </span>
                        <span>{block.reason}</span>
                      </div>
                    )}

                    {/* Bottom Row: Cryptographic Hashes (prev_hash -> hash) */}
                    <div className="pt-3 border-t border-[rgba(60,255,160,0.1)] space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="flex items-center gap-2 rounded-lg bg-[#020605] p-2 border border-[rgba(60,255,160,0.1)]">
                          <span className="text-[#7ea594] shrink-0 font-bold">PREV_HASH:</span>
                          <span className="text-[#7ea594] truncate font-mono select-all" title={block.prev_hash}>
                            {block.prev_hash || '0000000000000000000000000000000000000000000000000000000000000000 (GENESIS)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 rounded-lg bg-[#020605] p-2 border border-[rgba(60,255,160,0.1)]">
                          <span className="text-[#2dff9a] shrink-0 font-bold">BLOCK_HASH:</span>
                          <span className="text-[#2dff9a] truncate font-mono select-all font-semibold" title={block.hash}>
                            {block.hash || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {block.idempotency_key && (
                        <div className="text-[10px] font-mono text-[#7ea594] truncate">
                          <span>Idempotency-Key: </span>
                          <span className="text-[#eafff5] select-all">{block.idempotency_key}</span>
                        </div>
                      )}
                    </div>
                  </GlowCard>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
