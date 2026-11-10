import React from 'react';

export default function Badge({
  children,
  variant = 'cyan',
  size = 'md',
  dot = false,
  className = '',
}) {
  const variantStyles = {
    cyan: 'bg-[rgba(22,191,255,0.12)] text-[#16BFFF] border-[rgba(22,191,255,0.28)]',
    blue: 'bg-[rgba(56,123,255,0.12)] text-[#387BFF] border-[rgba(56,123,255,0.28)]',
    purple: 'bg-[rgba(139,124,255,0.12)] text-[#8B7CFF] border-[rgba(139,124,255,0.28)]',
    emerald: 'bg-[rgba(45,255,154,0.12)] text-[#2dff9a] border-[rgba(45,255,154,0.25)]',
    amber: 'bg-[rgba(251,191,36,0.12)] text-[#fbbf24] border-[rgba(251,191,36,0.25)]',
    rose: 'bg-[rgba(255,91,122,0.12)] text-[#FF5B7A] border-[rgba(255,91,122,0.28)]',
    error: 'bg-[rgba(255,91,122,0.12)] text-[#FF5B7A] border-[rgba(255,91,122,0.28)]',
    muted: 'bg-[rgba(154,174,197,0.12)] text-[#9AAEC5] border-[rgba(154,174,197,0.2)]',
  }[variant] || 'bg-[rgba(22,191,255,0.12)] text-[#16BFFF] border-[rgba(22,191,255,0.28)]';

  const dotColors = {
    cyan: 'bg-[#16BFFF]',
    blue: 'bg-[#387BFF]',
    purple: 'bg-[#8B7CFF]',
    emerald: 'bg-[#2dff9a]',
    amber: 'bg-[#fbbf24]',
    rose: 'bg-[#FF5B7A]',
    error: 'bg-[#FF5B7A]',
    muted: 'bg-[#9AAEC5]',
  }[variant] || 'bg-[#16BFFF]';

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
