import React from 'react';

export default function Badge({
  children,
  variant = 'emerald',
  size = 'md',
  dot = false,
  className = '',
}) {
  const variantStyles = {
    emerald: 'bg-[rgba(45,255,154,0.12)] text-[#2dff9a] border-[rgba(45,255,154,0.25)]',
    amber: 'bg-[rgba(251,191,36,0.12)] text-[#fbbf24] border-[rgba(251,191,36,0.25)]',
    rose: 'bg-[rgba(255,93,122,0.12)] text-[#ff5d7a] border-[rgba(255,93,122,0.28)]',
    cyan: 'bg-[rgba(34,211,238,0.12)] text-[#22d3ee] border-[rgba(34,211,238,0.25)]',
    muted: 'bg-[rgba(126,165,148,0.12)] text-[#7ea594] border-[rgba(126,165,148,0.2)]',
  }[variant] || 'bg-[rgba(45,255,154,0.12)] text-[#2dff9a] border-[rgba(45,255,154,0.25)]';

  const dotColors = {
    emerald: 'bg-[#2dff9a]',
    amber: 'bg-[#fbbf24]',
    rose: 'bg-[#ff5d7a]',
    cyan: 'bg-[#22d3ee]',
    muted: 'bg-[#7ea594]',
  }[variant] || 'bg-[#2dff9a]';

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
  }[size] || 'text-xs px-2.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-medium tracking-wide ${sizeStyles} ${variantStyles} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors} animate-pulse`} />}
      {children}
    </span>
  );
}
