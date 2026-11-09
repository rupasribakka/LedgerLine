import React from 'react';
import { Scale, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import SmoothPaiseCounter from './SmoothPaiseCounter';

export default function EquilibriumScale({
  sumPaise = 0,
  clearingFloatPaise = 15000000,
  customerReservesPaise = 15000000,
  isVerified = true,
  className = '',
}) {
  // If sumPaise is strictly 0, beam is perfectly horizontal (0deg tilt)
  const isPerfectEquilibrium = sumPaise === 0;
  // Compute minor deflection angle if imbalanced (capped at max 8 deg)
  const tiltDegrees = isPerfectEquilibrium ? 0 : Math.max(Math.min(sumPaise / 100000, 8), -8);

  return (
    <div
      className={`rounded-2xl border border-[rgba(60,255,160,0.22)] bg-gradient-to-b from-[#03150d] to-[#010905] p-6 sm:p-7 relative overflow-hidden shadow-[0_0_30px_rgba(45,255,154,0.08)] ${className}`}
    >
      {/* Background Grid & Atmospheric Horizon */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(45,255,154,0.09)] via-transparent to-transparent pointer-events-none" />

      {/* Header Label */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[rgba(60,255,160,0.12)] pb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#031f13] border border-[#2dff9a]/40 text-[#2dff9a]">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-[#eafff5] uppercase tracking-wider flex items-center gap-2">
              <span>Mathematical Equilibrium Scale</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(45,255,154,0.1)] text-[#2dff9a] border border-[#2dff9a]/30">
                ∑ BALANCES ≡ 0 PAISE
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-[#7ea594] border border-slate-700">
                Illustration
              </span>
            </h3>
            <p className="text-[11px] text-[#7ea594] font-mono">
              Conserved closed-system zero-sum double-entry ledger state
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isVerified ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#032215] text-[#2dff9a] border border-[#2dff9a]/40 shadow-[0_0_15px_rgba(45,255,154,0.2)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>EQUILIBRIUM CONSERVED</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#22070e] text-[#ff5d7a] border border-[#ff5d7a]/40">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>DEFICIT DETECTED</span>
            </span>
          )}
        </div>
      </div>

      {/* Interactive Visual Scale Canvas / SVG Representation */}
      <div className="py-8 relative flex flex-col items-center justify-center">
        {/* Visual Element Label */}
        <div className="text-[10px] font-mono text-[#7ea594] mb-3 uppercase tracking-wider">
          Visual Scale Dynamics — [Illustration]
        </div>

        {/* Horizontal Laser Level Guide Line */}
        <div className="absolute top-1/2 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#2dff9a]/30 to-transparent pointer-events-none" />

        {/* Center Fulcrum Pillar */}
        <div className="relative flex flex-col items-center">
          {/* Fulcrum Jewel Indicator */}
          <div className="h-6 w-6 rounded-full bg-[#020605] border-2 border-[#2dff9a] shadow-[0_0_20px_#2dff9a] flex items-center justify-center z-20">
            <div className="h-2 w-2 rounded-full bg-[#2dff9a] animate-pulse" />
          </div>

          {/* Balance Beam (tilts smoothly with transform rotate) */}
          <div
            className="w-72 sm:w-96 h-1.5 rounded-full bg-gradient-to-r from-[#2dff9a] via-[#eafff5] to-[#2dff9a] shadow-[0_0_15px_rgba(45,255,154,0.5)] origin-center transition-transform duration-700 ease-out absolute -top-0.5"
            style={{
              transform: `rotate(${tiltDegrees}deg)`,
            }}
          >
            {/* Left Pan Suspension Cord */}
            <div className="absolute left-1 top-1.5 w-0.5 h-12 bg-[#2dff9a]/60 origin-top flex flex-col items-center">
              <div className="mt-12 -ml-16 w-32 p-2.5 rounded-xl bg-[#041a10] border border-[#2dff9a]/40 shadow-[0_0_20px_rgba(45,255,154,0.15)] text-center space-y-1">
                <span className="text-[9px] font-mono uppercase text-[#7ea594] block font-semibold">
                  Clearing Float (Illustration)
                </span>
                <span className="text-xs font-mono font-bold text-[#eafff5] block">
                  <SmoothPaiseCounter paise={clearingFloatPaise} />
                </span>
                <span className="text-[8px] font-mono text-[#2dff9a] block">
                  Illustration Inflow
                </span>
              </div>
            </div>

            {/* Right Pan Suspension Cord */}
            <div className="absolute right-1 top-1.5 w-0.5 h-12 bg-[#2dff9a]/60 origin-top flex flex-col items-center">
              <div className="mt-12 -mr-16 w-32 p-2.5 rounded-xl bg-[#041a10] border border-[#2dff9a]/40 shadow-[0_0_20px_rgba(45,255,154,0.15)] text-center space-y-1">
                <span className="text-[9px] font-mono uppercase text-[#7ea594] block font-semibold">
                  Customer Reserves (Illustration)
                </span>
                <span className="text-xs font-mono font-bold text-[#eafff5] block">
                  <SmoothPaiseCounter paise={customerReservesPaise} />
                </span>
                <span className="text-[8px] font-mono text-[#2dff9a] block">
                  Illustration Outflow
                </span>
              </div>
            </div>
          </div>

          {/* Stand Triangle Base */}
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[40px] border-b-[rgba(60,255,160,0.25)] mt-3" />
          <div className="w-20 h-2 bg-[rgba(60,255,160,0.4)] rounded-full mt-0.5" />
        </div>
      </div>

      {/* Footer Mathematical Conservation Equation */}
      <div className="mt-6 pt-4 border-t border-[rgba(60,255,160,0.12)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-[#7ea594]">
          <ShieldCheck className="h-4 w-4 text-[#2dff9a]" />
          <span>Closed-Loop Identity: <strong className="text-[#eafff5]">Credits − Debits ≡ 0 paise</strong></span>
        </div>
        <div className="flex items-center gap-2 text-[#2dff9a] font-bold">
          <span>Net System Invariant Drift:</span>
          <span className="px-2 py-0.5 rounded bg-[#020605] border border-[#2dff9a]/30">
            {sumPaise} PAISE
          </span>
        </div>
      </div>
    </div>
  );
}
