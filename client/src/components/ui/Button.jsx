import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  icon: Icon,
  type = 'button',
  onClick,
  ...props
}) {
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-sm gap-2 rounded-xl',
    lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
  }[size] || 'h-10 px-4 text-sm gap-2 rounded-xl';

  const variantClasses = {
    primary:
      'bg-[var(--accent-primary)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] font-medium shadow-[var(--shadow-clay-btn)] hover:-translate-y-0.5 active:scale-[0.98]',
    secondary:
      'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-subdued)] hover:border-[var(--border-hover)] font-medium shadow-[var(--shadow-clay-btn-sec)] hover:-translate-y-0.5 active:scale-[0.98]',
    outline:
      'bg-transparent text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-subdued)] hover:border-[var(--border-hover)] font-medium active:scale-[0.98]',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subdued)] font-medium active:scale-[0.98]',
    danger:
      'bg-[var(--status-error-bg)] text-[var(--status-error)] border border-[var(--status-error)]/30 hover:bg-[var(--status-error)]/15 font-medium active:scale-[0.98]',
    accentSubtle:
      'bg-[var(--accent-subtle)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 font-medium active:scale-[0.98]',
  }[variant] || 'bg-[var(--accent-primary)] text-[var(--accent-text)]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all duration-180 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0 transition-transform duration-180 group-hover:scale-105" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
