import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  ShieldCheck,
  Repeat,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Scale,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchAccounts,
  executeDeposit,
  executeWithdrawal,
  executeTransfer,
  parseRupeesToPaise,
  formatPaiseToRupees,
  generateIdempotencyKey,
} from '../services/api';
import GlowCard from '../components/ui/GlowCard';
import GlowButton from '../components/ui/GlowButton';
import Skeleton from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';

export default function MovePage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('transfer');
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Form states
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey());
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);

  const role = (user?.role || 'holder').toLowerCase();
  const isAdmin = role === 'admin';

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetchAccounts();
      if (res.ok && res.data?.accounts) {
        setAccounts(res.data.accounts);
        const nonExt = res.data.accounts.filter(
          (a) => !a.is_external && a.account_no !== 'ACC-EXTERNAL'
        );
        if (nonExt.length > 0) {
          setSourceAccountId(String(nonExt[0].id));
          if (nonExt.length > 1) {
            setTargetAccountId(String(nonExt[1].id));
          } else {
            setTargetAccountId(String(nonExt[0].id));
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [user]);

  const handleRegenerateKey = () => {
    setIdempotencyKey(generateIdempotencyKey());
  };

  const handleAction = async (e) => {
    e.preventDefault();
    setResultMessage(null);

    const paise = parseRupeesToPaise(amountInput);
    if (paise === null || paise <= 0) {
      showToast({
        title: 'Invalid amount',
        message: 'Please enter a valid amount in Rupees (e.g. 100 or 50.25).',
        type: 'error',
      });
      return;
    }

    setSubmitting(true);
    let res;

    try {
      if (activeTab === 'transfer') {
        if (!sourceAccountId || !targetAccountId) {
          showToast({
            title: 'Account required',
            message: 'Please select both source and destination accounts.',
            type: 'error',
          });
          setSubmitting(false);
          return;
        }

        if (sourceAccountId === targetAccountId) {
          showToast({
            title: 'Distinct accounts required',
            message: 'Source and destination accounts must be different.',
            type: 'error',
          });
          setSubmitting(false);
          return;
        }

        res = await executeTransfer({
          from_account_id: parseInt(sourceAccountId, 10),
          to_account_id: parseInt(targetAccountId, 10),
          amount_paise: paise,
          description: `Transfer from #${sourceAccountId} to #${targetAccountId}`,
          idempotency_key: idempotencyKey,
        });
      } else if (activeTab === 'withdraw') {
        res = await executeWithdrawal({
          account_id: parseInt(sourceAccountId, 10),
          amount_paise: paise,
          idempotency_key: idempotencyKey,
        });
      } else if (activeTab === 'deposit') {
        res = await executeDeposit({
          account_id: parseInt(sourceAccountId, 10),
          amount_paise: paise,
          idempotency_key: idempotencyKey,
        });
      }

      if (res.ok) {
        showToast({
          title: res.isReplay ? 'Idempotent Replay (Cached)' : 'Transaction Committed',
          message: `${formatPaiseToRupees(paise)} successfully processed.`,
          type: res.isReplay ? 'info' : 'success',
        });
        setResultMessage({
          success: true,
          isReplay: res.isReplay,
          amountPaise: paise,
        });
        setAmountInput('');
        loadAccounts();
      } else {
        showToast({
          title: 'Transaction Failed',
          message: res.error || 'The ledger refused to commit this transaction.',
          type: 'error',
        });
        setResultMessage({
          success: false,
          error: res.error || 'Transaction refused by ledger constraints.',
        });
      }
    } catch (err) {
      setResultMessage({
        success: false,
        error: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSourceAccount = accounts.find((a) => String(a.id) === String(sourceAccountId));
  const selectedTargetAccount = accounts.find((a) => String(a.id) === String(targetAccountId));

  const transferAccounts = accounts.filter(
    (a) => !a.is_external && a.account_no !== 'ACC-EXTERNAL'
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-[rgba(22,191,255,0.16)] pb-6">
        <Badge variant="cyan" size="sm" className="mb-2">
          ACID SETTLEMENT ENGINE
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-[#F4F8FF]">
          Money Movement
        </h1>
        <p className="text-xs sm:text-sm text-[#9AAEC5] mt-1">
          Atomic transfers, withdrawals, and administrator liquidity deposits.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[#0A1426] border border-[rgba(22,191,255,0.18)] w-fit">
        <button
          onClick={() => setActiveTab('transfer')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
            activeTab === 'transfer'
              ? 'bg-gradient-to-r from-[#16BFFF] to-[#387BFF] text-[#050B18] shadow-[0_0_15px_rgba(22,191,255,0.4)]'
              : 'text-[#9AAEC5] hover:text-[#F4F8FF]'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          <span>Transfer</span>
        </button>

        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
            activeTab === 'withdraw'
              ? 'bg-gradient-to-r from-[#16BFFF] to-[#387BFF] text-[#050B18] shadow-[0_0_15px_rgba(22,191,255,0.4)]'
              : 'text-[#9AAEC5] hover:text-[#F4F8FF]'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>Withdraw</span>
        </button>

        {/* Deposit: Admin only */}
        {isAdmin ? (
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
              activeTab === 'deposit'
                ? 'bg-gradient-to-r from-[#16BFFF] to-[#387BFF] text-[#050B18] shadow-[0_0_15px_rgba(22,191,255,0.4)]'
                : 'text-[#9AAEC5] hover:text-[#F4F8FF]'
            }`}
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>Deposit (Admin)</span>
          </button>
        ) : (
          <div
            title="Deposit operations require Administrator clearance (POST /deposits)"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono text-[#9AAEC5]/50 cursor-not-allowed border border-dashed border-[#101E33]"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Deposit (Admin Only)</span>
          </div>
        )}
      </div>

      {/* Main Action Form Card */}
      <GlowCard className="p-6 sm:p-8 space-y-6">
        <form onSubmit={handleAction} className="space-y-6">
          {/* Source Account Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-[#F4F8FF]">
              {activeTab === 'transfer'
                ? 'Source Account (Debit)'
                : activeTab === 'withdraw'
                ? 'Account to Withdraw From'
                : 'Account to Deposit Into'}
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full rounded-2xl border border-[rgba(22,191,255,0.18)] bg-[#0A1426] px-4 py-3 text-xs sm:text-sm font-mono text-[#F4F8FF] focus:border-[#16BFFF] focus:outline-none"
            >
              {(activeTab === 'transfer' ? transferAccounts : accounts).map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-[#0A1426] text-[#F4F8FF]">
                  #{acc.id} — {acc.name} ({formatPaiseToRupees(acc.balance_paise)})
                </option>
              ))}
            </select>

            {selectedSourceAccount && activeTab !== 'deposit' && (
              <p className="text-xs font-mono text-[#9AAEC5]">
                Available balance:{' '}
                <span className="text-[#16BFFF] font-bold">
                  {formatPaiseToRupees(selectedSourceAccount.balance_paise)}
                </span>{' '}
                ({selectedSourceAccount.balance_paise} paise)
              </p>
            )}
          </div>

          {/* Destination Account Selector (Transfer only) */}
          {activeTab === 'transfer' && (
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-[#F4F8FF]">
                Destination Account (Credit)
              </label>
              <select
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
                className="w-full rounded-2xl border border-[rgba(22,191,255,0.18)] bg-[#0A1426] px-4 py-3 text-xs sm:text-sm font-mono text-[#F4F8FF] focus:border-[#16BFFF] focus:outline-none"
              >
                {transferAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-[#0A1426] text-[#F4F8FF]">
                    #{acc.id} — {acc.name} ({formatPaiseToRupees(acc.balance_paise)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Monetary Amount Input (Strict Paise Conversion) */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-[#F4F8FF] flex items-center justify-between">
              <span>Amount (₹ Rupees)</span>
              <span className="text-xs text-[#9AAEC5] font-normal">
                Stored strictly as integer paise
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-base text-[#9AAEC5]">
                ₹
              </span>
              <input
                type="text"
                placeholder="100.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full rounded-2xl border border-[rgba(22,191,255,0.18)] bg-[#0A1426] pl-9 pr-4 py-3 text-sm sm:text-base font-mono text-[#F4F8FF] placeholder-[#9AAEC5]/60 focus:border-[#16BFFF] focus:outline-none"
              />
            </div>
            {amountInput && parseRupeesToPaise(amountInput) !== null && (
              <p className="text-xs font-mono text-[#16BFFF]">
                Exact Integer Value: {parseRupeesToPaise(amountInput)} paise
              </p>
            )}
          </div>

          {/* Idempotency Key Configuration */}
          <div className="rounded-2xl border border-[rgba(22,191,255,0.16)] bg-[#050B18] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#F4F8FF] flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5 text-[#16BFFF]" />
                <span>Client Idempotency Key (UUID v4)</span>
              </span>
              <button
                type="button"
                onClick={handleRegenerateKey}
                className="text-xs font-mono text-[#16BFFF] hover:underline cursor-pointer"
              >
                Regenerate
              </button>
            </div>
            <input
              type="text"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              className="w-full bg-transparent text-xs font-mono text-[#9AAEC5] focus:outline-none focus:text-[#F4F8FF]"
            />
            <p className="text-xs text-[#9AAEC5] leading-relaxed">
              Prevents double processing. Submitting with the same key replays the cached result without duplicate ledger debit; submitting with an altered payload returns HTTP 422.
            </p>
          </div>

          {/* Balance Preview Panel */}
          {loadingAccounts ? (
            <Skeleton className="h-40 rounded-2xl" />
          ) : selectedSourceAccount && (
            <div className="rounded-2xl border border-[rgba(22,191,255,0.22)] bg-[#0A1426] p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(22,191,255,0.14)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-[#16BFFF]" />
                  <span className="text-xs font-mono font-bold text-[#F4F8FF] uppercase tracking-wider">
                    Balance Preview
                  </span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[rgba(22,191,255,0.12)] text-[#16BFFF] border border-[#16BFFF]/30 font-mono font-semibold">
                  Server-enforced balance
                </span>
              </div>

              {/* Balances & Arithmetic Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                {/* Source Account Impact */}
                <div className="p-3 rounded-xl bg-[#050B18] border border-[rgba(22,191,255,0.14)] space-y-1.5">
                  <div className="flex items-center justify-between text-[#9AAEC5]">
                    <span>
                      {activeTab === 'deposit' ? 'Target Account' : 'Source Account'} #{selectedSourceAccount.id}
                    </span>
                    <span className="font-bold text-[#F4F8FF]">{selectedSourceAccount.account_no}</span>
                  </div>
                  <div className="flex justify-between text-[#9AAEC5]">
                    <span>Current Balance:</span>
                    <span className="text-[#F4F8FF]">
                      {formatPaiseToRupees(selectedSourceAccount.balance_paise)} ({selectedSourceAccount.balance_paise} paise)
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[rgba(22,191,255,0.1)] pt-1">
                    <span className="text-[#9AAEC5]">
                      {activeTab === 'deposit' ? 'After Credit (+):' : 'After Debit (-):'}
                    </span>
                    <span className="font-bold text-[#16BFFF]">
                      {activeTab === 'deposit'
                        ? `${formatPaiseToRupees(Number(selectedSourceAccount.balance_paise) + (parseRupeesToPaise(amountInput) || 0))} (${Number(selectedSourceAccount.balance_paise) + (parseRupeesToPaise(amountInput) || 0)} paise)`
                        : `${formatPaiseToRupees(Math.max(Number(selectedSourceAccount.balance_paise) - (parseRupeesToPaise(amountInput) || 0), 0))} (${Number(selectedSourceAccount.balance_paise) - (parseRupeesToPaise(amountInput) || 0)} paise)`}
                    </span>
                  </div>
                </div>

                {/* Counterparty / Target Account Impact */}
                <div className="p-3 rounded-xl bg-[#050B18] border border-[rgba(22,191,255,0.14)] space-y-1.5">
                  <div className="flex items-center justify-between text-[#9AAEC5]">
                    <span>
                      {activeTab === 'transfer'
                        ? `Target Account #${selectedTargetAccount?.id || '—'}`
                        : 'Clearing Reserve'}
                    </span>
                    <span className="font-bold text-[#F4F8FF]">
                      {activeTab === 'transfer'
                        ? selectedTargetAccount?.account_no || 'None Selected'
                        : 'ACC-EXTERNAL'}
                    </span>
                  </div>
                  {activeTab === 'transfer' && selectedTargetAccount ? (
                    <>
                      <div className="flex justify-between text-[#9AAEC5]">
                        <span>Current Balance:</span>
                        <span className="text-[#F4F8FF]">
                          {formatPaiseToRupees(selectedTargetAccount.balance_paise)} ({selectedTargetAccount.balance_paise} paise)
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-[rgba(22,191,255,0.1)] pt-1">
                        <span className="text-[#9AAEC5]">After Credit (+):</span>
                        <span className="font-bold text-[#16BFFF]">
                          {formatPaiseToRupees(Number(selectedTargetAccount.balance_paise) + (parseRupeesToPaise(amountInput) || 0))} ({Number(selectedTargetAccount.balance_paise) + (parseRupeesToPaise(amountInput) || 0)} paise)
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-[#9AAEC5]">
                        <span>Counterparty:</span>
                        <span className="text-[#F4F8FF]">External Clearing Invariant</span>
                      </div>
                      <div className="flex justify-between border-t border-[rgba(22,191,255,0.1)] pt-1">
                        <span className="text-[#9AAEC5]">
                          {activeTab === 'deposit' ? 'Debited Reserve:' : 'Credited Reserve:'}
                        </span>
                        <span className="font-bold text-[#16BFFF]">
                          {parseRupeesToPaise(amountInput) ? `${parseRupeesToPaise(amountInput)} paise` : '0 paise'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Debit Equals Credit Double-Entry Invariant Proof */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#050B18] border border-[rgba(22,191,255,0.1)] text-xs font-mono">
                <span className="text-[#9AAEC5] flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#16BFFF]" />
                  <span>Double-Entry Balance Invariant:</span>
                </span>
                <span className="text-[#16BFFF] font-bold">
                  Debit ≡ Credit ({parseRupeesToPaise(amountInput) || 0} paise)
                </span>
              </div>
            </div>
          )}

          {/* Action Trigger Button */}
          <GlowButton
            variant="primary"
            size="lg"
            type="submit"
            disabled={submitting || loadingAccounts}
            className="w-full"
          >
            <span>
              {submitting
                ? 'Executing Atomic Invariants...'
                : activeTab === 'transfer'
                ? 'Execute Double-Entry Transfer'
                : activeTab === 'withdraw'
                ? 'Execute Withdrawal'
                : 'Deposit Liquidity'}
            </span>
          </GlowButton>
        </form>

        {/* Transaction Result Report */}
        {resultMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs font-mono space-y-2 ${
              resultMessage.success
                ? 'bg-[#0A1F3D] border-[#16BFFF]/50 text-[#16BFFF]'
                : 'bg-[rgba(255,91,122,0.12)] border-[rgba(255,91,122,0.4)] text-[#FF5B7A]'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {resultMessage.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>
                {resultMessage.success
                  ? resultMessage.isReplay
                    ? 'Idempotent Replay Verified (Zero Extra Funds Moved)'
                    : 'Transaction Committed Successfully'
                  : 'Transaction Refused by Invariant Guard'}
              </span>
            </div>
            <p className="text-[#9AAEC5]">
              {resultMessage.success
                ? `Operation finalized in whole integer paise (${resultMessage.amountPaise} paise). Check statement to inspect hash chain.`
                : resultMessage.error}
            </p>
          </div>
        )}
      </GlowCard>
    </div>
  );
}
