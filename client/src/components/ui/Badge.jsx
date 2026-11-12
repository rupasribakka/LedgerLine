import React from 'react';

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) {
  const variantStyles = {
    // Semantic mappings
    success: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success)]/20',
    warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning)]/20',
    error: 'bg-[var(--status-error-bg)] text-[var(--status-error)] border-[var(--status-error)]/20',
    info: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info)]/20',
    neutral: 'bg-[var(--bg-subdued)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
    accent: 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border-[var(--accent-primary)]/20',

    // Backward compatibility mappings
    cyan: 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border-[var(--accent-primary)]/20',
    emerald: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success)]/20',
    blue: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info)]/20',
    purple: 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border-[var(--accent-primary)]/20',
    amber: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning)]/20',
    rose: 'bg-[var(--status-error-bg)] text-[var(--status-error)] border-[var(--status-error)]/20',
    muted: 'bg-[var(--bg-subdued)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  }[variant] || 'bg-[var(--bg-subdued)] text-[var(--text-secondary)] border-[var(--border-subtle)]';

  const dotColors = {
    success: 'bg-[var(--status-success)]',
    warning: 'bg-[var(--status-warning)]',
    error: 'bg-[var(--status-error)]',
    info: 'bg-[var(--status-info)]',
    neutral: 'bg-[var(--text-secondary)]',
    accent: 'bg-[var(--accent-primary)]',
    cyan: 'bg-[var(--accent-primary)]',
    emerald: 'bg-[var(--status-success)]',
    blue: 'bg-[var(--status-info)]',
    purple: 'bg-[var(--accent-primary)]',
    amber: 'bg-[var(--status-warning)]',
    rose: 'bg-[var(--status-error)]',
    muted: 'bg-[var(--text-secondary)]',
  }[variant] || 'bg-[var(--text-secondary)]';

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
  }[size] || 'text-xs px-2.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium select-none ${sizeStyles} ${variantStyles} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors}`} />}
      {children}
    </span>
  );
}
