import React from 'react';

export default function Card({
  children,
  variant = 'default', // 'default' | 'clay' | 'flat' | 'recessed'
  surface = 'white', // 'white' | 'mint' | 'lavender' | 'peach' | 'powder' | 'butter' | 'subdued'
  className = '',
  onClick,
  as: Component = 'div',
  hover = false,
  ...props
}) {
  const surfaceStyles = {
    white: 'bg-[var(--bg-surface)] border border-[var(--border-subtle)]',
    mint: 'bg-[var(--surface-mint)] border border-[var(--border-mint)]',
    lavender: 'bg-[var(--surface-lavender)] border border-[var(--border-lavender)]',
    peach: 'bg-[var(--surface-peach)] border border-[var(--border-peach)]',
    powder: 'bg-[var(--surface-powder)] border border-[var(--border-powder)]',
    butter: 'bg-[var(--surface-butter)] border border-[var(--border-butter)]',
    subdued: 'bg-[var(--bg-subdued)] border border-[var(--border-subtle)]',
  }[surface] || 'bg-[var(--bg-surface)] border border-[var(--border-subtle)]';

  const elevationStyles = {
    default: 'shadow-[var(--shadow-raised)]',
    clay: 'shadow-[var(--shadow-clay-card)]',
    flat: '',
    recessed: 'shadow-[var(--shadow-recessed)]',
  }[variant] || 'shadow-[var(--shadow-raised)]';

  const hoverStyles = hover
    ? 'hover:-translate-y-0.5 hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-clay-card)] cursor-pointer'
    : '';

  return (
    <Component
      onClick={onClick}
      className={`rounded-2xl text-[var(--text-primary)] transition-all duration-200 ${surfaceStyles} ${elevationStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
