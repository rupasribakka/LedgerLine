import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertCircle, Loader2, Repeat, X } from 'lucide-react';
import {
  executeDeposit,
  executeWithdrawal,
  generateIdempotencyKey,
  formatPaiseToRupees,
  parseRupeesToPaise,
} from '../services/api';

export default function DepositWithdrawModal({
  isOpen,
  onClose,
  initialMode = 'deposit',
  accounts = [],
  onSuccess,
}) {
  const [mode, setMode] = useState(initialMode); // 'deposit' | 'withdraw'
  const [accountId, setAccountId] = useState('');
  const [rupeesAmount, setRupeesAmount] = useState('25.00');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [sendReplayRequest, setSendReplayRequest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (accounts.length > 0 && !accountId) {
        setAccountId(accounts[0].id);
      }
      setIdempotencyKey(generateIdempotencyKey());
      setError(null);
      setSuccessResult(null);
    }
  }, [isOpen, initialMode, accounts]);

  if (!isOpen) return null;

  const paiseAmount = parseRupeesToPaise(rupeesAmount);
  const isInvalidAmount = paiseAmount === null || paiseAmount <= 0;
  const selectedAccount = accounts.find((a) => String(a.id) === String(accountId));
  const availablePaise = selectedAccount ? Number(selectedAccount.balance_paise) : 0;
  const isOverdraft = mode === 'withdraw' && paiseAmount !== null && paiseAmount > availablePaise;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccessResult(null);

    if (!accountId) {
      setError('Please select an account.');
      return;
    }
    if (isInvalidAmount) {
      setError('Invalid amount. Please enter a positive value with at most 2 decimal places (e.g. 25.00).');
      return;
    }

    setLoading(true);
    try {
      const fn = mode === 'deposit' ? executeDeposit : executeWithdrawal;
      const res1 = await fn({
        accountId,
        amountPaise: paiseAmount,
        idempotencyKey,
      });

      if (!res1.ok) {
        setError(res1.error || `${mode === 'deposit' ? 'Deposit' : 'Withdrawal'} failed.`);
        setLoading(false);
        return;
      }

      let res2 = null;
      if (sendReplayRequest) {
        res2 = await fn({
          accountId,
          amountPaise: paiseAmount,
          idempotencyKey,
        });
      }

      setSuccessResult({
        initial: res1,
        replay: res2,
        mode,
        amountPaise,
        keyUsed: idempotencyKey,
      });
      setIdempotencyKey(generateIdempotencyKey());
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Network error occurred.');
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
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
              mode === 'deposit'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            {mode === 'deposit' ? (
              <ArrowDownLeft className="h-6 w-6" />
            ) : (
              <ArrowUpRight className="h-6 w-6" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-mono">
              {mode === 'deposit' ? 'External Deposit' : 'External Withdrawal'}
            </h2>
            <p className="text-xs text-slate-400">
              {mode === 'deposit'
                ? 'Credit account from ACC-EXTERNAL balancing entry.'
                : 'Debit account to ACC-EXTERNAL with overdraft protection.'}
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-6 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('deposit');
              setError(null);
              setSuccessResult(null);
            }}
            className={`py-2 text-xs font-mono font-semibold rounded-lg transition-all ${
              mode === 'deposit'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Deposit (Credit)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('withdraw');
              setError(null);
              setSuccessResult(null);
            }}
            className={`py-2 text-xs font-mono font-semibold rounded-lg transition-all ${
              mode === 'withdraw'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Withdrawal (Debit)
          </button>
        </div>

        {/* Success Banner */}
        {successResult && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                {successResult.mode === 'deposit' ? 'Deposit Credited!' : 'Withdrawal Processed!'}
              </span>
            </div>
            <p className="text-emerald-300/90 font-mono">
              Tx ID: #{successResult.initial.data?.transaction?.id || successResult.initial.data?.id || 'OK'} | 
              Amount: {formatPaiseToRupees(successResult.amountPaise)} ({successResult.amountPaise} paise)
            </p>
            {successResult.replay && (
              <p className="text-[11px] text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 font-mono">
                Real Replay Verified: Header [Idempotent-Replay: {String(successResult.replay.isReplay)}] Status: {successResult.replay.status}
              </p>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-5 flex items-start space-x-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold">Operation Rejected</p>
              <p className="text-rose-300/90">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Account */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Target Account
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  Account #{acc.id} ({acc.account_no || `User ${acc.owner_id}`}) — Balance: {formatPaiseToRupees(acc.balance_paise)}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-slate-400">Amount (₹)</label>
              <span className={`text-xs font-mono ${isInvalidAmount || isOverdraft ? 'text-rose-400 font-bold' : 'text-cyan-400'}`}>
                {isInvalidAmount
                  ? 'Invalid Amount (Max 2 Decimals)'
                  : `= ${paiseAmount.toLocaleString()} Paise ${isOverdraft ? '(Insufficient Balance!)' : ''}`}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono">₹</span>
              <input
                type="text"
                value={rupeesAmount}
                onChange={(e) => setRupeesAmount(e.target.value)}
                placeholder="25.00"
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-8 pr-3.5 py-2.5 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Idempotency Key & Real Replay Toggle */}
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
                Regenerate
              </button>
            </div>
            <p className="font-mono text-[11px] text-slate-300 truncate bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
              {idempotencyKey}
            </p>
            <label className="flex items-start space-x-2 text-[11px] text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={sendReplayRequest}
                onChange={(e) => setSendReplayRequest(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
              />
              <span>Test Real Replay: Send duplicate request immediately with exact same key</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || isOverdraft || isInvalidAmount}
            className={`w-full flex items-center justify-center space-x-2 rounded-xl py-2.5 px-4 text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50 ${
              mode === 'deposit'
                ? 'bg-linear-to-r from-emerald-500 to-teal-600 shadow-emerald-950/40 hover:from-emerald-400 hover:to-teal-500'
                : 'bg-linear-to-r from-amber-500 to-orange-600 shadow-amber-950/40 hover:from-amber-400 hover:to-orange-500'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing Transaction...</span>
              </>
            ) : mode === 'deposit' ? (
              <>
                <ArrowDownLeft className="h-4 w-4" />
                <span>
                  Execute Deposit {paiseAmount !== null ? `(${formatPaiseToRupees(paiseAmount)})` : ''}
                </span>
              </>
            ) : (
              <>
                <ArrowUpRight className="h-4 w-4" />
                <span>
                  Execute Withdrawal {paiseAmount !== null ? `(${formatPaiseToRupees(paiseAmount)})` : ''}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
