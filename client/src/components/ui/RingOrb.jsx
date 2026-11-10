import React from 'react';
import { ShieldCheck, Lock, Activity, Sparkles } from 'lucide-react';

export default function RingOrb({ size = 380, className = '', label = 'ZERO-SUM LEDGER CORE' }) {
  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer ambient glow */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(22,191,255,0.2)_0%,transparent_70%)] blur-2xl pointer-events-none" />

      {/* Ring 1 - Outermost dashed orbit */}
      <div
        className="absolute inset-0 rounded-full border border-dashed border-[rgba(22,191,255,0.22)] animate-ring-counter"
        style={{ borderDasharray: '6 8' }}
      />

      {/* Orbit nodes */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#0A1426] border border-[rgba(22,191,255,0.4)] rounded-full px-2.5 py-0.5 text-[9px] font-mono text-[#16BFFF] shadow-[0_0_12px_rgba(22,191,255,0.4)]">
        <Sparkles className="h-2.5 w-2.5" />
        <span>SHA-256</span>
      </div>

      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#0A1426] border border-[rgba(56,123,255,0.4)] rounded-full px-2.5 py-0.5 text-[9px] font-mono text-[#387BFF] shadow-[0_0_12px_rgba(56,123,255,0.4)]">
        <Lock className="h-2.5 w-2.5" />
        <span>ROW LOCK</span>
      </div>

      {/* Ring 2 - Mid ring with pulse */}
      <div className="absolute inset-8 rounded-full border border-[rgba(22,191,255,0.25)] animate-ring-pulse" />

      {/* Ring 3 - Inner counter-rotating ring */}
      <div className="absolute inset-16 rounded-full border-2 border-dashed border-[#16BFFF]/45 animate-ring-counter" />

      {/* Ring 4 - Deep inner boundary */}
      <div className="absolute inset-24 rounded-full border border-[rgba(56,123,255,0.35)] shadow-[inset_0_0_20px_rgba(22,191,255,0.18)]" />

      {/* Center glowing core sphere */}
      <div className="relative flex flex-col items-center justify-center w-36 h-36 rounded-full bg-gradient-to-br from-[#0E2A54] via-[#0A1F3D] to-[#050B18] border border-[#16BFFF]/70 shadow-[0_0_40px_rgba(22,191,255,0.45)] p-4 text-center">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#16BFFF]/25 to-transparent blur-sm" />
        <ShieldCheck className="h-8 w-8 text-[#16BFFF] mb-1 drop-shadow-[0_0_10px_rgba(22,191,255,0.9)]" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F4F8FF]">
          BalanceVault
        </span>
        <span className="text-[9px] font-mono text-[#16BFFF] tracking-widest mt-0.5">
          Σ = 0 PAISE
        </span>
      </div>
    </div>
  );
}
