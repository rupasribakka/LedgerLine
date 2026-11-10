import React, { useState, useEffect, useRef } from 'react';
import { formatPaiseToRupees } from '../../services/api';

export default function SmoothPaiseCounter({
  paise = 0,
  className = '',
  flashOnUpdate = true,
  showDetail = false,
}) {
  const targetPaise = Number(paise || 0);
  const [displayPaise, setDisplayPaise] = useState(targetPaise);
  const [flashType, setFlashType] = useState(null); // 'credit' | 'debit' | null
  const prevPaiseRef = useRef(targetPaise);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const fromPaise = prevPaiseRef.current;
    const toPaise = targetPaise;

    if (fromPaise === toPaise || prefersReducedMotion) {
      setDisplayPaise(toPaise);
      prevPaiseRef.current = toPaise;
      return;
    }

    if (flashOnUpdate) {
      if (toPaise > fromPaise) {
        setFlashType('credit');
      } else if (toPaise < fromPaise) {
        setFlashType('debit');
      }
      const timer = setTimeout(() => setFlashType(null), 700);
      return () => clearTimeout(timer);
    }

    const duration = 450;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic curve
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(fromPaise + (toPaise - fromPaise) * eased);

      setDisplayPaise(currentVal);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayPaise(toPaise);
        prevPaiseRef.current = toPaise;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetPaise, flashOnUpdate]);

  const formatted = formatPaiseToRupees(displayPaise);

  return (
    <span
      className={`inline-flex items-baseline gap-1 font-mono transition-colors duration-300 ${
        flashType === 'credit'
          ? 'text-[#16BFFF] drop-shadow-[0_0_12px_rgba(22,191,255,0.7)]'
          : flashType === 'debit'
          ? 'text-[#FF5B7A] drop-shadow-[0_0_12px_rgba(255,91,122,0.7)]'
          : ''
      } ${className}`}
    >
      <span>{formatted}</span>
      {showDetail && (
        <span className="text-[10px] text-[#9AAEC5] font-normal font-mono">
          ({displayPaise} paise)
        </span>
      )}
    </span>
  );
}
