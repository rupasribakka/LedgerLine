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
          <label htmlFor={id} className="text-xs font-medium text-[var(--text-secondary)]">
            {label} {required && <span className="text-[var(--status-error)]">*</span>}
          </label>
          {helper && <span className="text-xs text-[var(--text-muted)]">{helper}</span>}
        </div>
      )}

      <div className="relative flex items-center">
        {LeftIcon && (
          <div className="pointer-events-none absolute left-3 flex items-center text-[var(--text-secondary)]">
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
          className={`h-10 w-full rounded-xl bg-[var(--bg-surface)] shadow-[var(--shadow-recessed)] px-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] border transition-all duration-180 focus:outline-none ${
            LeftIcon ? 'pl-9' : ''
          } ${isPassword ? 'pr-10' : ''} ${
            error
              ? 'border-[var(--status-error)] focus:ring-1 focus:ring-[var(--status-error)]'
              : 'border-[var(--border-subtle)] focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)] hover:border-[var(--border-hover)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-[var(--status-error)] flex items-center gap-1">
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
