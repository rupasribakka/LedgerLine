import React from 'react';
import { Menu, ShieldCheck, Activity, Terminal, Shield } from 'lucide-react';

export default function Navbar({ onMenuClick, backendHealth, currentRole }) {
  const isHealthy = backendHealth && backendHealth.ok;
  const isChecking = backendHealth && backendHealth.checking;

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-cyan-500/15 bg-[#060b18]/85 px-6 backdrop-blur-xl">
      {/* Left: Mobile hamburger & command center breadcrumb */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 md:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-slate-400">
            <span className="text-cyan-400 font-semibold">LedgerLine</span>
            <span>/</span>
            <span>Security Operations Command</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight font-mono">
            Secure Financial Operations
          </h1>
        </div>
      </div>

      {/* Right: Connectivity Status, Security Invariant, User Profile */}
      <div className="flex items-center space-x-3.5">
        {/* Backend Live Connectivity Indicator */}
        <div className="flex items-center space-x-2 rounded-full border border-cyan-500/20 bg-slate-950/80 px-3.5 py-1.5 text-xs font-mono backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <span className="relative flex h-2 w-2">
            {isChecking ? (
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            ) : isHealthy ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
            )}
          </span>
          <span className="text-slate-300 font-medium">
            {isChecking
              ? 'PINGING...'
              : isHealthy
              ? 'BACKEND ONLINE'
              : 'BACKEND OFFLINE'}
          </span>
          {isHealthy && backendHealth?.responseTime !== undefined && (
            <span className="text-[10px] text-cyan-400 pl-1 border-l border-slate-800">
              {backendHealth.responseTime}ms
            </span>
          )}
        </div>

        {/* Security Invariant Indicator */}
        <div className="hidden lg:flex items-center space-x-1.5 rounded-full border border-violet-500/25 bg-violet-950/30 px-3 py-1.5 text-xs font-mono text-violet-300">
          <Shield className="h-3.5 w-3.5 text-violet-400" />
          <span>PAISE PRECISION ENFORCED</span>
        </div>

        {/* User Profile Area */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-800/80">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-cyan-600 via-blue-600 to-violet-600 font-mono font-bold text-white text-xs ring-1 ring-cyan-400/50 shadow-md shadow-cyan-900/20">
            {currentRole ? currentRole[0] : 'U'}
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#060b18]" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-200 font-mono">{currentRole}</p>
            <p className="text-[10px] text-cyan-400/80 font-mono uppercase tracking-wider">Session Authenticated</p>
          </div>
        </div>
      </div>
    </header>
  );
}
