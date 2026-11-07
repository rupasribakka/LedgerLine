import React from 'react';

export default function Skeleton({ className = '', rounded = 'rounded-xl', ...props }) {
  return (
    <div
      className={`relative overflow-hidden bg-[#07110d] border border-[rgba(60,255,160,0.08)] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[rgba(45,255,154,0.06)] before:to-transparent ${rounded} ${className}`}
      {...props}
    />
  );
}
