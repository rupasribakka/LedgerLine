import React from 'react';

export default function Card({
  children,
  className = '',
  onClick,
  as: Component = 'div',
  hover = false,
  ...props
}) {
  return (
    <Component
      onClick={onClick}
      className={`rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] transition-all duration-150 ${
        hover
          ? 'hover:border-[var(--border-hover)] hover:shadow-xs cursor-pointer'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

