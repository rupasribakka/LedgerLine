import React from 'react';
import { ArrowLeftRight, Clock, ShieldAlert, FileSpreadsheet } from 'lucide-react';

export default function LedgerTableShell() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0f1524] overflow-hidden">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h3 className="text-base font-semibold text-white">Double-Entry Ledger Journal</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable, append-only log of posted transaction debits and credits.
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1 rounded-md bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 border border-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>Real-time Sync</span>
          </span>
          <span className="inline-flex items-center space-x-1 rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 border border-blue-500/20">
            <span>Paise Precision</span>
          </span>
        </div>
      </div>

      {/* Table Structure */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0B0F19] text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-6 py-3 font-semibold">Entry ID / Tx Ref</th>
              <th className="px-6 py-3 font-semibold">Timestamp (UTC)</th>
              <th className="px-6 py-3 font-semibold">Debit Account</th>
              <th className="px-6 py-3 font-semibold">Credit Account</th>
              <th className="px-6 py-3 font-semibold text-right">Amount (₹)</th>
              <th className="px-6 py-3 font-semibold text-right">Amount (Paise)</th>
              <th className="px-6 py-3 font-semibold text-center">Status</th>
              <th className="px-6 py-3 font-semibold">Idempotency Key</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {/* Empty State Banner (No fake data or mock balances) */}
            <tr>
              <td colSpan={8} className="py-14 text-center">
                <div className="mx-auto flex max-w-md flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/60 text-slate-400 border border-slate-700/60 mb-3">
                    <FileSpreadsheet className="h-6 w-6 text-slate-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200">
                    No Financial Entries Posted Yet
                  </h4>
                  <p className="mt-1.5 text-xs text-slate-400 leading-relaxed font-sans">
                    Phase 1 is strictly for architecture setup. In Phase 2, the double-entry ledger engine will write append-only balanced debit/credit records with PostgreSQL row locks and ACID guarantees.
                  </p>
                  <div className="mt-4 flex items-center space-x-2 text-[11px] text-slate-400 font-sans">
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                    <span>No fake balances or simulated transactions active.</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
