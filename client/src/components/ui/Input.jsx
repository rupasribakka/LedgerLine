import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helper,
  disabled = false,
  required = false,
  className = '',
  leftIcon: LeftIcon,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="text-xs font-semibold tracking-wide text-[#9AAEC5]">
            {label} {required && <span className="text-[#FF5B7A]">*</span>}
          </label>
          {helper && <span className="text-[11px] text-[#9AAEC5]">{helper}</span>}
        </div>
      )}

      <div className="relative flex items-center">
        {LeftIcon && (
          <div className="pointer-events-none absolute left-3.5 flex items-center text-[#9AAEC5]">
            <LeftIcon className="h-4 w-4" />
          </div>
        )}

        <input
          id={id}
          type={effectiveType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full rounded-xl bg-[#0A1426] px-3.5 py-2.5 text-sm text-[#F4F8FF] placeholder-[#9AAEC5]/50 border transition-all duration-150 focus:outline-none ${
            LeftIcon ? 'pl-10' : ''
          } ${isPassword ? 'pr-11' : ''} ${
            error
              ? 'border-[#FF5B7A] focus:ring-1 focus:ring-[#FF5B7A]'
              : 'border-[rgba(22,191,255,0.18)] focus:border-[#16BFFF] focus:ring-1 focus:ring-[rgba(22,191,255,0.35)] hover:border-[rgba(22,191,255,0.35)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 flex items-center text-[#9AAEC5] hover:text-[#16BFFF] transition-colors focus:outline-none cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-[#FF5B7A] flex items-center gap-1 font-mono">
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
