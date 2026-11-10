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
        background: `radial-gradient(550px circle at var(--x, -1000px) var(--y, -1000px), rgba(22, 191, 255, 0.09), transparent 70%), #101E33`,
      }}
      className={`relative overflow-hidden rounded-2xl border border-[rgba(22,191,255,0.16)] transition-all duration-200 hover:border-[rgba(22,191,255,0.42)] shadow-xl shadow-[#050B18]/80 backdrop-blur-xl ${
        topGlow ? 'before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[#16BFFF] before:to-transparent before:opacity-85' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
