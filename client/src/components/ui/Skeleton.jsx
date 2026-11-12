import React from 'react';

export default function Skeleton({ className = '', rounded = 'rounded-xl', ...props }) {
  return (
    <div
      className={`animate-pulse bg-[var(--bg-subdued)] border border-[var(--border-subtle)] ${rounded} ${className}`}
      {...props}
    />
  );
}
