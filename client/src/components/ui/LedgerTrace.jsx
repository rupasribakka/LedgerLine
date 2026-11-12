import React from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * LEDGER TRACE Motif
 * Represents the continuous, unbroken relationship between accounts,
 * financial movements, and verified double-entry records.
 */
export default function LedgerTrace({
  variant = 'timeline', // 'timeline' | 'indicator' | 'steps'
  steps = [],
  activeStep = 0,
  className = '',
}) {
  if (variant === 'indicator') {
    return (
      <div className={`inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-secondary)] select-none ${className}`}>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)] shadow-xs" />
          <span className="h-px w-3 bg-[var(--border-hover)]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)] shadow-xs" />
          <span className="h-px w-3 bg-[var(--border-hover)]" />
          <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)] ring-2 ring-[var(--accent-subtle)]" />
        </span>
        <span className="text-[var(--text-secondary)] tracking-tight">Ledger Trace Active</span>
      </div>
    );
  }

  if (variant === 'steps') {
    return (
      <div className={`w-full py-2 ${className}`}>
        <div className="relative flex items-center justify-between">
          {/* Continuous connecting trace line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--border-subtle)] z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--accent-primary)] z-0 transition-all duration-300"
            style={{
              width: `${(activeStep / Math.max(steps.length - 1, 1)) * 100}%`,
            }}
          />

          {steps.map((step, idx) => {
            const isCompleted = idx < activeStep;
            const isCurrent = idx === activeStep;

            return (
              <div key={idx} className="relative z-10 flex flex-col items-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-all duration-200 ${
                    isCompleted
                      ? 'bg-[var(--accent-primary)] text-[var(--accent-text)] shadow-[var(--shadow-clay-btn)]'
                      : isCurrent
                      ? 'bg-[var(--bg-surface)] text-[var(--accent-primary)] border-2 border-[var(--accent-primary)] shadow-[var(--shadow-raised)]'
                      : 'bg-[var(--bg-subdued)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                {step.label && (
                  <span
                    className={`mt-1.5 text-[11px] font-medium whitespace-nowrap ${
                      isCurrent
                        ? 'text-[var(--text-primary)] font-semibold'
                        : isCompleted
                        ? 'text-[var(--text-secondary)]'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {step.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Default: Timeline flow (Source Account -> Invariant Conservation -> Destination Account)
  return (
    <div
      className={`rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subdued)] p-3.5 shadow-[var(--shadow-recessed)] ${className}`}
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
          <span className="font-semibold text-[var(--text-primary)]">
            Ledger Trace Continuity
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--text-secondary)]">
          Zero-Sum Invariant Conserved
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <div className="flex-1 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-raised)]">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Source Debit</p>
          <p className="font-medium text-[var(--text-primary)] truncate mt-0.5">
            {steps[0]?.label || 'Account A'}
          </p>
        </div>

        <div className="flex items-center text-[var(--text-muted)] px-1">
          <span className="h-px w-3 bg-[var(--border-hover)]" />
          <ArrowRight className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          <span className="h-px w-3 bg-[var(--border-hover)]" />
        </div>

        <div className="flex-1 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-raised)] text-center">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Clearing Core</p>
          <p className="font-mono text-[11px] font-semibold text-[var(--status-success)] mt-0.5">
            Σ = 0 p
          </p>
        </div>

        <div className="flex items-center text-[var(--text-muted)] px-1">
          <span className="h-px w-3 bg-[var(--border-hover)]" />
          <ArrowRight className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          <span className="h-px w-3 bg-[var(--border-hover)]" />
        </div>

        <div className="flex-1 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-raised)] text-right">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Target Credit</p>
          <p className="font-medium text-[var(--text-primary)] truncate mt-0.5">
            {steps[1]?.label || 'Account B'}
          </p>
        </div>
      </div>
    </div>
  );
}
