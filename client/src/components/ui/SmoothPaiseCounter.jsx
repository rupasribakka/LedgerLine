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
      const timer = setTimeout(() => setFlashType(null), 500);
      return () => clearTimeout(timer);
    }

    const duration = 300;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
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
      className={`inline-flex items-baseline gap-1 tabular-nums transition-colors duration-200 ${
        flashType === 'credit'
          ? 'text-[var(--status-success)]'
          : flashType === 'debit'
          ? 'text-[var(--status-error)]'
          : ''
      } ${className}`}
    >
      <span>{formatted}</span>
      {showDetail && (
        <span className="text-[11px] text-[var(--text-secondary)] font-normal">
          ({displayPaise} paise)
        </span>
      )}
    </span>
  );
}
