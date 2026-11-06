import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  BookOpen,
  ShieldAlert,
  FileText,
  Settings,
  ShieldCheck,
  X,
  Radio
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, active: true },
  { id: 'accounts', label: 'Accounts', icon: Wallet },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'ledger', label: 'Ledger', icon: BookOpen },
  { id: 'security', label: 'Security Center', icon: ShieldAlert },
  { id: 'audit', label: 'Audit Logs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose, currentRole, onRoleChange }) {
  const getClearanceLevel = (role) => {
    if (role === 'Admin') return 'L3 — ROOT CLEARANCE';
    if (role === 'Auditor') return 'L2 — READ AUDIT CLEARANCE';
    return 'L1 — STANDARD HOLDER';
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-cyan-500/15 bg-[#060b18]/90 backdrop-blur-xl transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-slate-800/80 px-6">
          <div className="flex items-center space-x-3.5">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 via-blue-600 to-violet-600 text-white shadow-lg shadow-cyan-900/30 ring-1 ring-cyan-400/40">
              <ShieldCheck className="h-6 w-6 text-white" />
              <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping opacity-75" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-bold tracking-tight text-white font-mono">
                  Ledger<span className="text-cyan-400">Line</span>
                </span>
              </div>
              <p className="text-[10px] font-mono tracking-widest text-cyan-400/80 uppercase">
                Secure Financial Operations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role & Access Clearance Preview */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Access Clearance
            </label>
            <span className="text-[9px] font-mono text-cyan-400 tracking-wider">
              {getClearanceLevel(currentRole)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-900/90 p-1 border border-slate-800">
            {['Account Holder', 'Admin', 'Auditor'].map((role) => {
              const isSelected = currentRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => onRoleChange(role)}
                  className={`rounded px-2 py-1.5 text-[11px] font-mono font-medium transition-all ${
                    isSelected
                      ? 'bg-linear-to-r from-cyan-600 to-blue-600 text-white shadow-sm shadow-cyan-900/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {role.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          <div className="px-2 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
            Platform Navigation
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                  item.active
                    ? 'bg-linear-to-r from-cyan-500/15 via-blue-500/10 to-transparent text-cyan-300 border border-cyan-500/30 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:border hover:border-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`h-4.5 w-4.5 transition-colors ${
                      item.active ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer with Live Integrity Status */}
        <div className="border-t border-slate-800/80 p-4 bg-slate-950/60">
          <div className="rounded-xl border border-cyan-500/20 bg-[#060b18] p-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                Core Protocol
              </span>
              <span className="inline-flex items-center space-x-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-mono font-semibold text-cyan-400 border border-cyan-500/30">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                <span>ACTIVE</span>
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 font-mono leading-relaxed">
              Double-Entry Engine • Integer Paise • Row Locks Active
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
