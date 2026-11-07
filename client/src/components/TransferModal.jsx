import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, CheckCircle2, AlertCircle, Loader2, Repeat, X, ShieldAlert } from 'lucide-react';
import { executeTransfer, generateIdempotencyKey, formatPaiseToRupees, parseRupeesToPaise } from '../services/api';

export default function TransferModal({ isOpen, onClose, accounts = [], onTransferSuccess }) {
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [rupeesAmount, setRupeesAmount] = useState('10.00');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [keepSameKey, setKeepSameKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  // Initialize source account and idempotency key when modal opens
  useEffect(() => {
    if (isOpen) {
      if (accounts.length > 0 && !sourceAccountId) {
        setSourceAccountId(accounts[0].id);
      }
      if (!keepSameKey || !idempotencyKey) {
        setIdempotencyKey(generateIdempotencyKey());
      }
      setError(null);
      setSuccessResult(null);
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const paiseAmount = parseRupeesToPaise(rupeesAmount);
  const selectedSource = accounts.find((a) => String(a.id) === String(sourceAccountId));
  const availablePaise = selectedSource ? Number(selectedSource.balance_paise) : 0;
  const isOverdraft = paiseAmount > availablePaise;

  async function handleTransfer(e) {
    e.preventDefault();
    setError(null);
    setSuccessResult(null);

    if (!sourceAccountId) {
      setError('Please select a source account.');
      return;
    }
    if (!destinationAccountId) {
      setError('Please enter a destination account ID.');
      return;
    }
    if (String(sourceAccountId) === String(destinationAccountId)) {
      setError('Source and destination accounts must be different.');
      return;
    }
    if (paiseAmount <= 0) {
      setError('Transfer amount must be greater than zero.');
      return;
    }

    setLoading(true);
    try {
      const res = await executeTransfer({
        fromAccountId: sourceAccountId,
        toAccountId: destinationAccountId,
        amountPaise: paiseAmount,
        idempotencyKey,
      });

      if (res.ok) {
        setSuccessResult({
          data: res.data,
          isReplay: res.isReplay,
          keyUsed: idempotencyKey,
        });
        if (!keepSameKey) {
          setIdempotencyKey(generateIdempotencyKey());
        }
        if (onTransferSuccess) onTransferSuccess();
      } else {
        setError(res.error || 'Transfer failed.');
      }
    } catch (err) {
      setError(err.message || 'Network transfer error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-[#0a1022] p-6 shadow-2xl shadow-cyan-950/50 sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-mono flex items-center gap-2">
              Atomic Ledger Transfer
              <span className="text-[11px] font-mono font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Pessimistic Lock
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Zero-sum atomic balance transfer protected by ordered row locks and idempotency keys.
            </p>
          </div>
        </div>

        {/* Success Banner */}
        {successResult && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                {successResult.isReplay ? 'Idempotent Replay Verified!' : 'Transfer Settled Successfully!'}
              </span>
            </div>
            <p className="text-emerald-300/90 font-mono">
              Tx ID: #{successResult.data?.transaction?.id || successResult.data?.id || 'OK'} | 
              Amount: {formatPaiseToRupees(paiseAmount)} ({paiseAmount} paise)
            </p>
            {successResult.isReplay && (
              <p className="text-[11px] text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                Header [X-Cache: REPLAY] detected. Money moved exactly once on initial settlement.
              </p>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-5 flex items-start space-x-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold">Transfer Rejected</p>
              <p className="text-rose-300/90">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleTransfer} className="space-y-4">
          {/* Source Account */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">From Account</label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  Account #{acc.id} ({acc.account_number || `User ${acc.user_id}`}) — Balance: {formatPaiseToRupees(acc.balance_paise)}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Account */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              To Destination Account ID
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={destinationAccountId}
              onChange={(e) => setDestinationAccountId(e.target.value)}
              placeholder="e.g. 3 (Holder 2's account)"
              required
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-mono"
            />
          </div>

          {/* Amount in Rupees & Paise */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-slate-400">Transfer Amount (₹)</label>
              <span className={`text-xs font-mono ${isOverdraft ? 'text-rose-400 font-bold' : 'text-cyan-400'}`}>
                = {paiseAmount.toLocaleString()} Paise {isOverdraft ? '(Exceeds Balance!)' : ''}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono">₹</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={rupeesAmount}
                onChange={(e) => setRupeesAmount(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-8 pr-3.5 py-2.5 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Idempotency Key & Test Replay Checkbox */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Repeat className="h-3 w-3 text-cyan-400" />
                Idempotency-Key
              </span>
              <button
                type="button"
                onClick={() => setIdempotencyKey(generateIdempotencyKey())}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline"
              >
                Regenerate UUID
              </button>
            </div>
            <p className="font-mono text-[11px] text-slate-300 truncate bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
              {idempotencyKey}
            </p>
            <label className="flex items-center space-x-2 text-[11px] text-slate-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={keepSameKey}
                onChange={(e) => setKeepSameKey(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
              />
              <span>Keep key on submit (Test replay cache &amp; duplicate detection)</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || isOverdraft}
            className="w-full flex items-center justify-center space-x-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-900/40 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Acquiring Lock &amp; Committing...</span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="h-4 w-4" />
                <span>Execute Transfer ({formatPaiseToRupees(paiseAmount)})</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
