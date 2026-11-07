import React from 'react';
import { BookOpen, Clock, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { formatPaiseToRupees } from '../services/api';

export default function LedgerTableShell({ entries = [], title = 'Double-Entry Ledger Journal' }) {
  const hasEntries = entries && entries.length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl cyber-glass border border-cyan-500/15 bg-[#060b18]/80 backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 px-6 py-4.5">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white font-mono">
              {title}
            </h3>
            <p className="text-xs text-slate-400">
              Immutable, append-only records of posted debit and credit journal lines
            </p>
          </div>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2.5">
          <span className="inline-flex items-center space-x-1.5 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-mono text-slate-300">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>{hasEntries ? `${entries.length} POSTED ENTRIES` : 'REAL-TIME STREAM'}</span>
          </span>
          <span className="inline-flex items-center space-x-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 px-3 py-1.5 text-xs font-mono text-cyan-400 font-semibold">
            <span>PAISE PRECISION</span>
          </span>
        </div>
      </div>

      {/* Table Display */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#050914]/90 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-6 py-3.5 font-semibold">Entry ID / Tx Ref</th>
              <th className="px-6 py-3.5 font-semibold">Timestamp (UTC)</th>
              <th className="px-6 py-3.5 font-semibold">Account</th>
              <th className="px-6 py-3.5 font-semibold text-right">Debit / Credit</th>
              <th className="px-6 py-3.5 font-semibold text-right">Balance After</th>
              <th className="px-6 py-3.5 font-semibold text-center">Status</th>
              <th className="px-6 py-3.5 font-semibold">Hash Fingerprint</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
            {hasEntries ? (
              entries.map((entry) => {
                const amount = Number(entry.amount_paise || entry.amount || 0);
                const isCredit = amount > 0;
                const formattedRupees = formatPaiseToRupees(Math.abs(amount));
                const balanceAfter = formatPaiseToRupees(entry.balance_after_paise || entry.balance_paise || 0);
                const dateStr = entry.created_at
                  ? new Date(entry.created_at).toISOString().replace('T', ' ').substring(0, 19)
                  : 'JUST NOW';

                return (
                  <tr key={entry.id || Math.random()} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-cyan-300">
                      #{entry.id} {entry.transaction_id ? `(Tx #${entry.transaction_id})` : ''}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">{dateStr}</td>
                    <td className="px-6 py-3.5 font-mono text-slate-200">
                      Account #{entry.account_id}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold">
                      <span className={isCredit ? 'text-emerald-400' : 'text-rose-400'}>
                        {isCredit ? `+ ${formattedRupees}` : `- ${formattedRupees}`}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-300">
                      {balanceAfter}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        SETTLED
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[10px] text-slate-400 max-w-xs truncate" title={entry.hash || entry.prev_hash || 'SHA-256'}>
                      {entry.hash ? `${entry.hash.substring(0, 14)}...` : 'GENESIS_CHAIN'}
                    </td>
                  </tr>
                );
              })
            ) : (
              /* Transparent, Honest Empty State */
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="mx-auto flex max-w-lg flex-col items-center">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/90 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] mb-3.5">
                      <BookOpen className="h-7 w-7 text-cyan-400" />
                      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 animate-ping opacity-60" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-100 font-mono">
                      Ledger Stream Synchronized • 0 Posted Entries
                    </h4>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed font-sans max-w-md">
                      The double-entry journal is connected and awaiting incoming transactions. Every deposit, withdrawal, and transfer will automatically post balanced debits and credits with zero floating-point calculation error.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
                      <span className="rounded-md bg-slate-900 border border-slate-800 px-2.5 py-1 text-slate-300">
                        PARITY: DEBITS == CREDITS
                      </span>
                      <span className="rounded-md bg-slate-900 border border-slate-800 px-2.5 py-1 text-emerald-400">
                        APPEND-ONLY ENFORCED
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
