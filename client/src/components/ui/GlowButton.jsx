import React from 'react';
import Button from './Button';

/**
 * Backward compatibility wrapper for GlowButton.
 * Conforms to Design System 2.0: clean, non-neon styling.
 */
export default function GlowButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  icon,
  type = 'button',
  onClick,
  ...props
}) {
  // Map old neon variants to clean semantic variants
  const mappedVariant = {
    primary: 'primary',
    secondary: 'secondary',
    highlight: 'accentSubtle',
    danger: 'danger',
    ghost: 'ghost',
  }[variant] || 'primary';

  return (
    <Button
      variant={mappedVariant}
      size={size}
      className={className}
      loading={loading}
      disabled={disabled}
      icon={icon}
      type={type}
      onClick={onClick}
      {...props}
    >
      {children}
    </Button>
  );
}
