import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  BookOpen,
  ArrowLeftRight,
  ShieldAlert,
  Settings,
  ShieldCheck,
  X
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { id: 'accounts', label: 'Accounts', icon: Wallet, badge: 'Phase 2' },
  { id: 'ledger', label: 'Double-Entry Ledger', icon: BookOpen, badge: 'Phase 2' },
  { id: 'transfers', label: 'Transfers & Ops', icon: ArrowLeftRight, badge: 'Phase 2' },
  { id: 'audit', label: 'Audit Trail', icon: ShieldAlert, badge: 'Phase 2' },
  { id: 'settings', label: 'Settings', icon: Settings, badge: 'Phase 2' },
];

export default function Sidebar({ isOpen, onClose, currentRole, onRoleChange }) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-[#0d121f] transition-transform duration-200 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo and Brand */}
        <div className="flex h-18 items-center justify-between border-b border-slate-800/80 px-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-900/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">
                Ledger<span className="text-blue-400">Line</span>
              </span>
              <p className="text-xs text-slate-400">Financial Integrity Engine</p>
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

        {/* Role Switcher (Preview for 3 required roles) */}
        <div className="px-5 py-4 border-b border-slate-800/80">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Simulated Role View
          </label>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-900/90 p-1 border border-slate-800">
            {['Account Holder', 'Admin', 'Auditor'].map((role) => {
              const isSelected = currentRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => onRoleChange(role)}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {role.split(' ')[0]}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Role: <span className="text-slate-300 font-medium">{currentRole}</span>
          </p>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Core Modules
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                  item.active
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`h-4.5 w-4.5 ${
                      item.active ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700/60">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Phase & Architecture Footer */}
        <div className="border-t border-slate-800/80 p-4 bg-slate-900/40">
          <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Phase 1
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                Active Setup
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Base architecture, dark theme shell, Express backend & Tailwind configured.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
