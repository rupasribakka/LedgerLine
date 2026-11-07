import React, { useRef } from 'react';

export default function GlowCard({
  children,
  className = '',
  topGlow = true,
  onClick,
  as: Component = 'div',
  ...props
}) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--x', `${x}px`);
    cardRef.current.style.setProperty('--y', `${y}px`);
  };

  return (
    <Component
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      style={{
        background: `radial-gradient(500px circle at var(--x, -1000px) var(--y, -1000px), rgba(45, 255, 154, 0.07), transparent 75%), #07110d`,
      }}
      className={`relative overflow-hidden rounded-2xl border border-[rgba(60,255,160,0.14)] transition-all duration-200 hover:border-[rgba(60,255,160,0.32)] shadow-xl ${
        topGlow ? 'before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[#2dff9a] before:to-transparent before:opacity-75' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
