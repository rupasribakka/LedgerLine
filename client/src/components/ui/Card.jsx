import React from 'react';

export default function Card({
  children,
  variant = 'default', // 'default' | 'clay' | 'flat' | 'recessed'
  className = '',
  onClick,
  as: Component = 'div',
  hover = false,
  ...props
}) {
  const variantStyles = {
    default:
      'border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-raised)]',
    clay:
      'border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-clay-card)]',
    flat:
      'border border-[var(--border-subtle)] bg-[var(--bg-surface)]',
    recessed:
      'border border-[var(--border-subtle)] bg-[var(--bg-subdued)] shadow-[var(--shadow-recessed)]',
  }[variant] || 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-raised)]';

  const hoverStyles = hover
    ? 'hover:-translate-y-0.5 hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-clay-card)] cursor-pointer'
    : '';

  return (
    <Component
      onClick={onClick}
      className={`rounded-2xl text-[var(--text-primary)] transition-all duration-200 ${variantStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
