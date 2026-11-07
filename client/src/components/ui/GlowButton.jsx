import React from 'react';
import { Loader2 } from 'lucide-react';

export default function GlowButton({
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
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  }[size] || 'px-5 py-2.5 text-sm';

  const variantClasses = {
    primary:
      'bg-[#2dff9a] text-[#020605] font-bold shadow-[0_0_20px_rgba(45,255,154,0.35)] hover:shadow-[0_0_30px_rgba(45,255,154,0.6)] hover:bg-[#3affab]',
    secondary:
      'bg-[#07110d] text-[#eafff5] border border-[rgba(60,255,160,0.2)] hover:border-[#2dff9a] hover:bg-[#0d1e18] hover:text-[#2dff9a]',
    danger:
      'bg-[rgba(255,93,122,0.12)] text-[#ff5d7a] border border-[rgba(255,93,122,0.3)] hover:bg-[rgba(255,93,122,0.22)] hover:border-[#ff5d7a]',
    ghost:
      'bg-transparent text-[#7ea594] hover:text-[#eafff5] hover:bg-[rgba(60,255,160,0.06)]',
  }[variant] || '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`group relative inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {/* Subtle hover shimmer */}
      <span className="pointer-events-none absolute inset-0 rounded-full overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </span>

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
      ) : null}

      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
