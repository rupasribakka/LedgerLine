import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Loader2, RefreshCw, Lock, Database } from 'lucide-react';
import { verifySystemIntegrity } from '../services/api';

export default function VerificationCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleVerify() {
    setLoading(true);
    setError(null);
    try {
      const res = await verifySystemIntegrity();
      if (res.ok) {
        setResult(res.data);
      } else {
        setError(res.error || 'Verification query failed. Ensure you are signed in as an Admin or Auditor.');
      }
    } catch (err) {
      setError(err.message || 'Network error during verification.');
    } finally {
      setLoading(false);
    }
  }

  const globalSum = result?.summary?.global_balance_sum_paise ?? result?.global_sum_paise ?? 0;
  const rowsVerified = result?.summary?.ledger_rows_verified ?? result?.count ?? 0;
  const hashChainStatus = result?.checks?.hash_chain?.status || (result?.verified ? 'PASSED' : 'CHECKING');

  return (
    <div className="rounded-2xl border border-cyan-500/25 bg-[#060b18]/90 p-5 sm:p-6 backdrop-blur-xl shadow-xl shadow-cyan-950/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              Auditor Cryptographic Verification
              <span className="text-[10px] bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20">
                Zero-Sum Engine
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Validates global balance sum === 0 paise and per-account SHA-256 hash chains.
            </p>
          </div>
        </div>

        <button
          onClick={handleVerify}
          disabled={loading}
          className="flex items-center justify-center space-x-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 px-4 py-2 text-xs font-mono font-semibold text-cyan-300 hover:bg-cyan-500/25 hover:text-white transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              <span>Verifying Cryptographic Chains...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
              <span>Execute Verification (GET /api/ledger/verify)</span>
            </>
          )}
        </button>
      </div>

      {/* Results Area */}
      {result ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Global Sum Invariant */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-mono mb-1">
                <span>GLOBAL SUM (PAISE)</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold font-mono text-emerald-300">
                {globalSum} PAISE
              </p>
              <p className="text-[10px] text-emerald-400/80 mt-1 font-mono">
                Invariant: SUM(all accounts) === 0
              </p>
            </div>

            {/* Total Ledger Entries */}
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5">
              <div className="flex items-center justify-between text-xs text-cyan-400 font-mono mb-1">
                <span>VERIFIED ROWS</span>
                <Database className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-xl font-bold font-mono text-cyan-300">
                {rowsVerified} Rows
              </p>
              <p className="text-[10px] text-cyan-400/80 mt-1 font-mono">
                All ledger journal entries validated
              </p>
            </div>

            {/* Hash Chain Validity */}
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3.5">
              <div className="flex items-center justify-between text-xs text-violet-400 font-mono mb-1">
                <span>HASH CHAINS</span>
                <Lock className="h-4 w-4 text-violet-400" />
              </div>
              <p className="text-xl font-bold font-mono text-violet-300">
                {hashChainStatus === 'PASSED' ? '100% VALID' : hashChainStatus}
              </p>
              <p className="text-[10px] text-violet-400/80 mt-1 font-mono">
                SHA-256 Per-Account Integrity
              </p>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="mt-4 flex items-start space-x-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-semibold">Audit Query Failed</p>
            <p className="text-rose-300/90">{error}</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 text-center">
          <p className="text-xs text-slate-400 font-mono">
            Click &quot;Execute Verification (GET /api/ledger/verify)&quot; to perform an on-demand audit check across all ledger entries and verify the zero-sum invariant.
          </p>
        </div>
      )}
    </div>
  );
}
