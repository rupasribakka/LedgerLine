import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
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
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LedgerTrace from '../components/ui/LedgerTrace';

export default function MovePage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('transfer'); // 'transfer' | 'withdraw' | 'deposit'
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Form states
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey());
  const [showIdempotencyDetails, setShowIdempotencyDetails] = useState(false);

  // Workflow states
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [lastResult, setLastResult] = useState(null);

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
          setSourceAccountId((prev) => (prev ? prev : String(nonExt[0].id)));
          if (nonExt.length > 1) {
            setTargetAccountId((prev) => (prev ? prev : String(nonExt[1].id)));
          } else {
            setTargetAccountId((prev) => (prev ? prev : String(nonExt[0].id)));
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
    showToast({
      title: 'Idempotency Key Refreshed',
      message: 'Generated a new UUID v4 transaction key.',
      type: 'info',
    });
  };

  // Find selected accounts
  const sourceAccount = accounts.find((a) => String(a.id) === String(sourceAccountId));
  const targetAccount = accounts.find((a) => String(a.id) === String(targetAccountId));

  // Eligible customer accounts (exclude external clearing pool for transfers/withdrawals)
  const customerAccounts = accounts.filter(
    (a) => !a.is_external && a.account_no !== 'ACC-EXTERNAL'
  );

  // Parse entered amount to paise
  const enteredPaise = parseRupeesToPaise(amountInput);
  const isValidAmount = enteredPaise !== null && enteredPaise > 0;

  // Calculate Balance Previews using strict integer paise
  const sourceCurrentPaise = sourceAccount ? Number(sourceAccount.balance_paise || 0) : 0;
  const targetCurrentPaise = targetAccount ? Number(targetAccount.balance_paise || 0) : 0;

  const sourceProjectedPaise =
    activeTab === 'transfer' || activeTab === 'withdraw'
      ? sourceCurrentPaise - (isValidAmount ? enteredPaise : 0)
      : sourceCurrentPaise + (isValidAmount ? enteredPaise : 0);

  const targetProjectedPaise =
    activeTab === 'transfer'
      ? targetCurrentPaise + (isValidAmount ? enteredPaise : 0)
      : targetCurrentPaise;

  const hasSufficientBalance =
    activeTab === 'deposit' || (sourceAccount && sourceProjectedPaise >= 0);

  // Validation before opening confirmation
  const handleInitiate = (e) => {
    e.preventDefault();
    setLastResult(null);

    if (!isValidAmount) {
      showToast({
        title: 'Invalid Amount',
        message: 'Please enter a valid monetary amount in INR (e.g. 500 or 125.50).',
        type: 'error',
      });
      return;
    }

    if (!sourceAccountId) {
      showToast({
        title: 'Account Required',
        message: 'Please select a source account.',
        type: 'error',
      });
      return;
    }

    if (activeTab === 'transfer') {
      if (!targetAccountId) {
        showToast({
          title: 'Destination Required',
          message: 'Please select a destination account.',
          type: 'error',
        });
        return;
      }
      if (sourceAccountId === targetAccountId) {
        showToast({
          title: 'Distinct Accounts Required',
          message: 'Source and destination accounts must be different.',
          type: 'error',
        });
        return;
      }
    }

    if (!hasSufficientBalance) {
      showToast({
        title: 'Insufficient Balance',
        message: `Account #${sourceAccountId} does not have sufficient funds for this operation.`,
        type: 'error',
      });
      return;
    }

    // Open Confirmation Dialog
    setConfirmModalOpen(true);
  };

  // Execution after confirmation
  const handleConfirmExecute = async () => {
    setConfirmModalOpen(false);
    setSubmitting(true);
    let res;

    try {
      if (activeTab === 'transfer') {
        res = await executeTransfer({
          from_account_id: parseInt(sourceAccountId, 10),
          to_account_id: parseInt(targetAccountId, 10),
          amount_paise: enteredPaise,
          description: descriptionInput || `Transfer #${sourceAccountId} to #${targetAccountId}`,
          idempotency_key: idempotencyKey,
        });
      } else if (activeTab === 'withdraw') {
        res = await executeWithdrawal({
          account_id: parseInt(sourceAccountId, 10),
          amount_paise: enteredPaise,
          idempotency_key: idempotencyKey,
        });
      } else if (activeTab === 'deposit') {
        res = await executeDeposit({
          account_id: parseInt(sourceAccountId, 10),
          amount_paise: enteredPaise,
          idempotency_key: idempotencyKey,
        });
      }

      if (res.ok) {
        showToast({
          title: res.isReplay ? 'Transaction Replayed (Cached)' : 'Transaction Settled',
          message: `${formatPaiseToRupees(enteredPaise)} processed successfully.`,
          type: res.isReplay ? 'info' : 'success',
        });
        setLastResult({
          success: true,
          isReplay: res.isReplay,
          txnId: res.data?.txn_id,
          amountPaise: enteredPaise,
          timestamp: new Date().toISOString(),
        });
        setAmountInput('');
        setDescriptionInput('');
        setIdempotencyKey(generateIdempotencyKey()); // fresh key for subsequent transaction
        loadAccounts();
      } else {
        showToast({
          title: 'Settlement Refused',
          message: res.error || 'The ledger refused to commit this transaction.',
          type: 'error',
        });
        setLastResult({
          success: false,
          error: res.error || 'The transaction failed database invariants.',
        });
      }
    } catch (err) {
      setLastResult({
        success: false,
        error: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-6">
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          Transaction Terminal
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)] mt-1">
          Move Money
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Atomic double-entry ledger transfers, withdrawals, and capital settlements.
        </p>
      </div>

      {/* 1. Select Movement Type (Clay Tabs) */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[var(--bg-subdued)] w-fit border border-[var(--border-subtle)] shadow-[var(--shadow-recessed)]">
        <button
          type="button"
          onClick={() => {
            setActiveTab('transfer');
            setLastResult(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-180 cursor-pointer ${
            activeTab === 'transfer'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-clay-btn-sec)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          <span>Transfer</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('withdraw');
            setLastResult(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-180 cursor-pointer ${
            activeTab === 'withdraw'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-clay-btn-sec)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>Withdraw</span>
        </button>

        {isAdmin ? (
          <button
            type="button"
            onClick={() => {
              setActiveTab('deposit');
              setLastResult(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-180 cursor-pointer ${
              activeTab === 'deposit'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-clay-btn-sec)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>Deposit (Admin)</span>
          </button>
        ) : (
          <div
            title="Deposits require Administrator role"
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--text-muted)] cursor-not-allowed"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Deposit (Admin Only)</span>
          </div>
        )}
      </div>

      {/* Main Movement Form Card with Selective Clay Surface */}
      <Card variant="clay" className="p-6 sm:p-8 space-y-6">
        <form onSubmit={handleInitiate} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* 2. Select Source Account */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                {activeTab === 'deposit' ? 'Destination Account' : 'Source Account'}
              </label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                disabled={loadingAccounts}
                className="h-10 w-full rounded-xl bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-[var(--shadow-recessed)] focus:border-[var(--border-focus)] focus:outline-none"
              >
                {customerAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name || `Account #${acc.id}`} ({formatPaiseToRupees(acc.balance_paise)})
                  </option>
                ))}
              </select>
              {sourceAccount && (
                <p className="text-xs text-[var(--text-secondary)]">
                  Available: <span className="font-semibold text-[var(--text-primary)]">{formatPaiseToRupees(sourceAccount.balance_paise)}</span>
                </p>
              )}
            </div>

            {/* 3. Select Destination Account (Transfer only) */}
            {activeTab === 'transfer' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Destination Account
                </label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  disabled={loadingAccounts}
                  className="h-10 w-full rounded-xl bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-[var(--shadow-recessed)] focus:border-[var(--border-focus)] focus:outline-none"
                >
                  {customerAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name || `Account #${acc.id}`} ({formatPaiseToRupees(acc.balance_paise)})
                    </option>
                  ))}
                </select>
                {targetAccount && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Current: <span className="font-semibold text-[var(--text-primary)]">{formatPaiseToRupees(targetAccount.balance_paise)}</span>
                  </p>
                )}
              </div>
            )}

            {/* 4. Enter Amount */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Amount (INR)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-[var(--text-secondary)]">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  required
                  className="h-11 w-full rounded-xl bg-[var(--bg-surface)] pl-8 pr-4 text-base font-semibold tabular-nums text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-[var(--shadow-recessed)] focus:border-[var(--border-focus)] focus:outline-none placeholder-[var(--text-muted)]"
                />
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Converts to <span className="font-mono text-[var(--text-primary)]">{isValidAmount ? `${enteredPaise} paise` : '0 paise'}</span> (No floating-point precision loss).
              </p>
            </div>

            {/* Optional Memo/Description */}
            {activeTab === 'transfer' && (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Reference Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly vendor invoice, internal transfer"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  className="h-10 w-full rounded-xl bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-[var(--shadow-recessed)] focus:border-[var(--border-focus)] focus:outline-none placeholder-[var(--text-muted)]"
                />
              </div>
            )}
          </div>

          {/* LEDGER TRACE: Visual Continuity Pipeline */}
          {activeTab === 'transfer' && sourceAccount && targetAccount && (
            <LedgerTrace
              variant="timeline"
              steps={[
                { label: sourceAccount.name || `Account #${sourceAccount.id}` },
                { label: targetAccount.name || `Account #${targetAccount.id}` },
              ]}
            />
          )}

          {/* 5 & 6. Calculated Balance Preview on Mint Recessed Surface */}
          {isValidAmount && sourceAccount && (
            <div className="p-4 rounded-xl border border-[var(--border-mint)] bg-[var(--surface-mint)] shadow-[var(--shadow-recessed)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-forest)]">
                  Calculated Balance Preview
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Pre-settlement projection
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[var(--text-secondary)]">
                    {sourceAccount.name || `Source #${sourceAccount.id}`} Projected:
                  </p>
                  <p
                    className={`text-base font-semibold tabular-nums mt-0.5 ${
                      sourceProjectedPaise < 0
                        ? 'text-[var(--status-error)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {formatPaiseToRupees(sourceProjectedPaise)}
                  </p>
                  {sourceProjectedPaise < 0 && (
                    <p className="text-[11px] text-[var(--status-error)] mt-0.5">
                      Violates no-overdraft constraint.
                    </p>
                  )}
                </div>

                {activeTab === 'transfer' && targetAccount && (
                  <div>
                    <p className="text-[var(--text-secondary)]">
                      {targetAccount.name || `Destination #${targetAccount.id}`} Projected:
                    </p>
                    <p className="text-base font-semibold tabular-nums mt-0.5 text-[var(--text-primary)]">
                      {formatPaiseToRupees(targetProjectedPaise)}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-[var(--text-secondary)] italic">
                Note: This is a projected calculation based on current state. Authoritative balances are committed atomically via database locks.
              </p>
            </div>
          )}

          {/* Technical Details (Idempotency Key - Butter pending surface) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowIdempotencyDetails((prev) => !prev)}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <span>Transaction Safeguards & Idempotency Key</span>
              {showIdempotencyDetails ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {showIdempotencyDetails && (
              <div className="mt-2.5 p-3 rounded-xl border border-[var(--border-butter)] bg-[var(--surface-butter)] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--status-warning)]">
                    UUID v4 Idempotency Key:
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    className="text-[11px] font-semibold text-[var(--status-warning)] hover:underline cursor-pointer"
                  >
                    Regenerate
                  </button>
                </div>
                <p className="font-mono text-[11px] text-[var(--text-primary)] bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-butter)] shadow-[var(--shadow-recessed)] break-all">
                  {idempotencyKey}
                </p>
                <p className="text-[11px] text-[var(--text-primary)]">
                  Guarantees that re-submitting this request (e.g. on network timeout) returns the cached settlement without duplicate money movement.
                </p>
              </div>
            )}
          </div>

          {/* Form Action Button */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--border-subtle)]">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting || !isValidAmount || !hasSufficientBalance}
              loading={submitting}
            >
              <span>Review & Execute</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* 7. Confirmation Modal Dialog with Claymorphic Depth */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-clay-widget)] space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Confirm Transaction
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Please verify transaction parameters before committing to the ledger.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-subdued)] shadow-[var(--shadow-recessed)] space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Type:</span>
                <span className="font-semibold text-[var(--text-primary)] uppercase">
                  {activeTab}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Amount:</span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums">
                  {formatPaiseToRupees(enteredPaise)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Source:</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {sourceAccount?.name || `#${sourceAccountId}`}
                </span>
              </div>
              {activeTab === 'transfer' && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Destination:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {targetAccount?.name || `#${targetAccountId}`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmExecute}
                loading={submitting}
              >
                Confirm & Commit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Final Transaction Result Receipt */}
      {lastResult && (
        <Card
          variant="clay"
          className={`p-5 border ${
            lastResult.success
              ? 'border-[var(--status-success)]/30 bg-[var(--status-success-bg)]/20'
              : 'border-[var(--status-error)]/30 bg-[var(--status-error-bg)]/20'
          }`}
        >
          <div className="flex items-start gap-3">
            {lastResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-[var(--status-success)] mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-[var(--status-error)] mt-0.5 shrink-0" />
            )}
            <div className="space-y-1 flex-1 text-xs">
              <h4 className="font-semibold text-[var(--text-primary)]">
                {lastResult.success
                  ? lastResult.isReplay
                    ? 'Idempotent Replay Verified'
                    : 'Transaction Successfully Committed'
                  : 'Transaction Refused by Ledger'}
              </h4>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {lastResult.success
                  ? `${formatPaiseToRupees(lastResult.amountPaise)} was atomically settled in the double-entry journal.`
                  : lastResult.error}
              </p>
              {lastResult.txnId && (
                <p className="font-mono text-[11px] text-[var(--text-muted)] pt-1">
                  Reference: {lastResult.txnId}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
