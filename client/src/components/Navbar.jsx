import React from 'react';
import { Menu, LogIn, LogOut, Shield, ShieldCheck, User } from 'lucide-react';

export default function Navbar({
  onMenuClick,
  backendHealth,
  currentUser,
  onOpenAuth,
  onLogout,
}) {
  const isHealthy = backendHealth && backendHealth.ok;
  const isChecking = backendHealth && backendHealth.checking;

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-cyan-500/15 bg-[#060b18]/85 px-4 sm:px-6 backdrop-blur-xl">
      {/* Left: Mobile hamburger & command center breadcrumb */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          onClick={onMenuClick}
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 md:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-slate-400">
            <span className="text-cyan-400 font-semibold">LedgerLine</span>
            <span>/</span>
            <span>Financial Operations Command</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight font-mono">
            Double-Entry Core Console
          </h1>
        </div>
      </div>

      {/* Right: Connectivity Status & User Profile */}
      <div className="flex items-center space-x-2.5 sm:space-x-3.5">
        {/* Backend Live Connectivity Indicator */}
        <div className="flex items-center space-x-2 rounded-full border border-cyan-500/20 bg-slate-950/80 px-3 py-1 text-xs font-mono backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.5)]">
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
          <span className="text-slate-300 font-medium text-[11px]">
            {isChecking
              ? 'PINGING...'
              : isHealthy
              ? 'LIVE SERVER'
              : 'OFFLINE'}
          </span>
          {isHealthy && backendHealth?.responseTime !== undefined && (
            <span className="text-[10px] text-cyan-400 pl-1 border-l border-slate-800">
              {backendHealth.responseTime}ms
            </span>
          )}
        </div>

        {/* Security Invariant Indicator (Desktop) */}
        <div className="hidden lg:flex items-center space-x-1.5 rounded-full border border-violet-500/25 bg-violet-950/30 px-3 py-1 text-xs font-mono text-violet-300">
          <Shield className="h-3.5 w-3.5 text-violet-400" />
          <span>PAISE PRECISION</span>
        </div>

        {/* User Profile or Login Trigger */}
        {currentUser ? (
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-800/80">
            <div className="flex items-center space-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-tr from-cyan-600 to-blue-600 font-mono font-bold text-white text-xs ring-1 ring-cyan-400/50 shadow-md">
                {currentUser.username ? currentUser.username[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-200 font-mono leading-none">
                  {currentUser.name || currentUser.username}
                </p>
                <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider mt-0.5">
                  {currentUser.role}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenAuth}
              title="Switch user account"
              className="rounded-lg p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
            >
              <User className="h-4 w-4" />
            </button>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center space-x-1.5 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-3.5 py-1.5 text-xs font-semibold font-mono text-white shadow-md shadow-cyan-900/30 hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In / Demo</span>
          </button>
        )}
      </div>
    </header>
  );
}
