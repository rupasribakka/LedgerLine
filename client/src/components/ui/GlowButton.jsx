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
      'bg-gradient-to-r from-[#16BFFF] to-[#387BFF] text-[#050B18] font-bold shadow-[0_0_20px_rgba(22,191,255,0.38)] hover:shadow-[0_0_30px_rgba(22,191,255,0.65)] hover:brightness-110 active:scale-[0.98]',
    secondary:
      'bg-[#0A1426] text-[#F4F8FF] border border-[rgba(22,191,255,0.22)] hover:border-[#16BFFF] hover:bg-[#101E33] hover:text-[#16BFFF] active:scale-[0.98]',
    highlight:
      'bg-gradient-to-r from-[#387BFF] to-[#8B7CFF] text-[#F4F8FF] font-semibold shadow-[0_0_20px_rgba(139,124,255,0.35)] hover:shadow-[0_0_30px_rgba(139,124,255,0.6)] active:scale-[0.98]',
    danger:
      'bg-[rgba(255,91,122,0.12)] text-[#FF5B7A] border border-[rgba(255,91,122,0.3)] hover:bg-[rgba(255,91,122,0.22)] hover:border-[#FF5B7A] active:scale-[0.98]',
    ghost:
      'bg-transparent text-[#9AAEC5] hover:text-[#F4F8FF] hover:bg-[rgba(22,191,255,0.08)]',
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
        <span className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
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
