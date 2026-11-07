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
          <label htmlFor={id} className="text-xs font-semibold tracking-wide text-[#7ea594]">
            {label} {required && <span className="text-[#ff5d7a]">*</span>}
          </label>
          {helper && <span className="text-[11px] text-[#7ea594]">{helper}</span>}
        </div>
      )}

      <div className="relative flex items-center">
        {LeftIcon && (
          <div className="pointer-events-none absolute left-3.5 flex items-center text-[#7ea594]">
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
          className={`w-full rounded-xl bg-[#07110d] px-3.5 py-2.5 text-sm text-[#eafff5] placeholder-[#7ea594]/50 border transition-all duration-150 focus:outline-none ${
            LeftIcon ? 'pl-10' : ''
          } ${isPassword ? 'pr-11' : ''} ${
            error
              ? 'border-[#ff5d7a] focus:ring-1 focus:ring-[#ff5d7a]'
              : 'border-[rgba(60,255,160,0.14)] focus:border-[#2dff9a] focus:ring-1 focus:ring-[rgba(45,255,154,0.3)] hover:border-[rgba(60,255,160,0.25)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 text-[#7ea594] hover:text-[#eafff5] transition-colors cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-[#ff5d7a] font-medium mt-1">{error}</p>}
    </div>
  );
}
