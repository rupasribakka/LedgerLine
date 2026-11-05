import React from 'react';
import { Menu, Shield, Activity, Bell } from 'lucide-react';

export default function Navbar({ onMenuClick, backendHealth, currentRole }) {
  const isHealthy = backendHealth && backendHealth.ok;
  const isChecking = backendHealth && backendHealth.checking;

  return (
    <header className="sticky top-0 z-30 flex h-18 w-full items-center justify-between border-b border-slate-800/80 bg-[#0d121f]/95 px-6 backdrop-blur-md">
      {/* Left: Mobile hamburger & breadcrumbs */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>LedgerLine Core</span>
            <span>/</span>
            <span className="text-slate-200">System Dashboard</span>
          </div>
          <h1 className="text-lg font-semibold text-white tracking-tight">
            Financial Ledger & Transaction Gateway
          </h1>
        </div>
      </div>

      {/* Right: Status, Role Pill, and Profile */}
      <div className="flex items-center space-x-4">
        {/* Backend Connectivity Status Pill */}
        <div className="hidden sm:flex items-center space-x-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs">
          <span className="relative flex h-2 w-2">
            {isChecking ? (
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
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
              ? 'Checking API...'
              : isHealthy
              ? 'Backend Online (Port 5000)'
              : 'Backend Offline'}
          </span>
        </div>

        {/* Security Invariant Indicator */}
        <div className="hidden lg:flex items-center space-x-1.5 rounded-full border border-indigo-900/40 bg-indigo-950/30 px-3 py-1 text-xs text-indigo-300">
          <Shield className="h-3.5 w-3.5 text-indigo-400" />
          <span>Paise-Only Math</span>
        </div>

        {/* Role Avatar */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-tr from-blue-600 to-violet-600 font-semibold text-white text-xs ring-2 ring-slate-800">
            {currentRole ? currentRole[0] : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium text-slate-200">{currentRole}</p>
            <p className="text-[11px] text-slate-400">Authenticated Session</p>
          </div>
        </div>
      </div>
    </header>
  );
}
