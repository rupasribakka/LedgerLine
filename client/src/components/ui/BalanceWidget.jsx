import React from 'react';
import Card from './Card';
import Badge from './Badge';
import SmoothPaiseCounter from './SmoothPaiseCounter';
import LedgerTrace from './LedgerTrace';
import Skeleton from './Skeleton';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BalanceWidget({
  title = 'Total Consolidated Balance',
  paise = 0,
  loading = false,
  verified = true,
  accountCount = 1,
  className = '',
  actionLink,
  actionLabel = 'Manage Accounts',
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-[var(--shadow-clay-widget)] relative overflow-hidden transition-all duration-200 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            {title}
          </span>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Active balance across {accountCount} ledger account{accountCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <LedgerTrace variant="indicator" />
          <Badge variant={verified ? 'success' : 'warning'} size="sm" dot>
            {verified ? 'Chain Verified' : 'Syncing'}
          </Badge>
        </div>
      </div>

      <div className="py-6">
        <div className="text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--text-primary)] tabular-nums">
          {loading ? (
            <Skeleton className="h-12 w-56 rounded-xl" />
          ) : (
            <SmoothPaiseCounter paise={paise} />
          )}
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1.5">
          Calculated strictly in integer paise (1 INR = 100 paise) &bull; Zero floating-point drift
        </p>
      </div>

      <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <ShieldCheck className="h-4 w-4 text-[var(--status-success)]" />
          <span>Double-entry invariant: Σ Debits ≡ Σ Credits</span>
        </div>

        {actionLink && (
          <Link
            to={actionLink}
            className="inline-flex items-center gap-1 font-medium text-[var(--accent-primary)] hover:underline"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
