import React from 'react';
import { Scale, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import SmoothPaiseCounter from './SmoothPaiseCounter';
import Skeleton from './Skeleton';

export default function EquilibriumScale({
  sumPaise = 0,
  clearingFloatPaise = null,
  customerReservesPaise = null,
  isVerified = true,
  isLoading = false,
  className = '',
}) {
  const isLoaded = !isLoading && clearingFloatPaise != null && customerReservesPaise != null;
  const isPerfectEquilibrium = sumPaise === 0;
  const tiltDegrees = (!isLoaded || isPerfectEquilibrium) ? 0 : Math.max(Math.min(sumPaise / 100000, 8), -8);

  return (
    <div
      className={`rounded-2xl border border-[rgba(22,191,255,0.22)] bg-gradient-to-b from-[#0A1426] to-[#050B18] p-6 sm:p-7 relative overflow-hidden shadow-[0_0_30px_rgba(22,191,255,0.1)] ${className}`}
    >
      {/* Background Radial Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(22,191,255,0.12)] via-transparent to-transparent pointer-events-none" />

      {/* Header Label */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[rgba(22,191,255,0.14)] pb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#0A1426] border border-[#16BFFF]/50 text-[#16BFFF]">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-[#F4F8FF] uppercase tracking-wider flex items-center gap-2">
              <span>Mathematical Equilibrium Scale</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(22,191,255,0.12)] text-[#16BFFF] border border-[#16BFFF]/35">
                ∑ BALANCES ≡ 0 PAISE
              </span>
            </h3>
            <p className="text-[11px] text-[#9AAEC5] font-mono">
              Conserved closed-system zero-sum double-entry ledger state
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isVerified ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#0A1426] text-[#16BFFF] border border-[#16BFFF]/45 shadow-[0_0_15px_rgba(22,191,255,0.25)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>EQUILIBRIUM CONSERVED</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[rgba(255,91,122,0.12)] text-[#FF5B7A] border border-[#FF5B7A]/40">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>DEFICIT DETECTED</span>
            </span>
          )}
        </div>
      </div>

      {/* Interactive Visual Scale Illustration */}
      <div className="py-8 relative flex flex-col items-center justify-center">
        {/* Horizontal Laser Level Guide Line */}
        <div className="absolute top-1/2 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#16BFFF]/30 to-transparent pointer-events-none" />

        {/* Center Fulcrum Pillar */}
        <div className="relative flex flex-col items-center">
          {/* Fulcrum Jewel Indicator */}
          <div className="h-6 w-6 rounded-full bg-[#050B18] border-2 border-[#16BFFF] shadow-[0_0_20px_#16BFFF] flex items-center justify-center z-20">
            <div className="h-2 w-2 rounded-full bg-[#16BFFF] animate-pulse" />
          </div>

          {/* Balance Beam */}
          <div
            className="w-72 sm:w-96 h-1.5 rounded-full bg-gradient-to-r from-[#16BFFF] via-[#F4F8FF] to-[#16BFFF] shadow-[0_0_15px_rgba(22,191,255,0.5)] origin-center transition-transform duration-700 ease-out absolute -top-0.5"
            style={{
              transform: `rotate(${tiltDegrees}deg)`,
            }}
          >
            {/* Left Pan Suspension Cord */}
            <div className="absolute left-1 top-1.5 w-0.5 h-12 bg-[#16BFFF]/60 origin-top flex flex-col items-center">
              <div className="mt-12 -ml-16 w-32 p-2.5 rounded-xl bg-[#0A1426] border border-[#16BFFF]/45 shadow-[0_0_20px_rgba(22,191,255,0.2)] text-center space-y-1">
                <span className="text-[9px] font-mono uppercase text-[#9AAEC5] block font-semibold">
                  Clearing Float
                </span>
                <span className="text-xs font-mono font-bold text-[#F4F8FF] block min-h-[1.25rem]">
                  {!isLoaded ? (
                    <Skeleton className="h-4 w-20 mx-auto bg-[#101E33] rounded my-0.5" />
                  ) : (
                    <SmoothPaiseCounter paise={clearingFloatPaise} />
                  )}
                </span>
                <span className="text-[8px] font-mono text-[#16BFFF] block">
                  Inflow Source
                </span>
              </div>
            </div>

            {/* Right Pan Suspension Cord */}
            <div className="absolute right-1 top-1.5 w-0.5 h-12 bg-[#16BFFF]/60 origin-top flex flex-col items-center">
              <div className="mt-12 -mr-16 w-32 p-2.5 rounded-xl bg-[#0A1426] border border-[#16BFFF]/45 shadow-[0_0_20px_rgba(22,191,255,0.2)] text-center space-y-1">
                <span className="text-[9px] font-mono uppercase text-[#9AAEC5] block font-semibold">
                  Customer Reserves
                </span>
                <span className="text-xs font-mono font-bold text-[#F4F8FF] block min-h-[1.25rem]">
                  {!isLoaded ? (
                    <Skeleton className="h-4 w-20 mx-auto bg-[#101E33] rounded my-0.5" />
                  ) : (
                    <SmoothPaiseCounter paise={customerReservesPaise} />
                  )}
                </span>
                <span className="text-[8px] font-mono text-[#16BFFF] block">
                  Settled Outflow
                </span>
              </div>
            </div>
          </div>

          {/* Stand Triangle Base */}
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[40px] border-b-[rgba(22,191,255,0.25)] mt-3" />
          <div className="w-20 h-2 bg-[rgba(22,191,255,0.4)] rounded-full mt-0.5" />
        </div>
      </div>

      {/* Footer Mathematical Conservation Equation */}
      <div className="mt-6 pt-4 border-t border-[rgba(22,191,255,0.14)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-[#9AAEC5]">
          <ShieldCheck className="h-4 w-4 text-[#16BFFF]" />
          <span>Closed-Loop Identity: <strong className="text-[#F4F8FF]">Credits − Debits ≡ 0 paise</strong></span>
        </div>
        <div className="flex items-center gap-2 text-[#16BFFF] font-bold">
          <span>Net System Invariant Drift:</span>
          <span className="px-2 py-0.5 rounded bg-[#050B18] border border-[#16BFFF]/35">
            {!isLoaded || sumPaise == null ? '0 PAISE' : `${sumPaise} PAISE`}
          </span>
        </div>
      </div>
    </div>
  );
}
