import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  ShieldCheck,
  Zap,
  KeyRound,
  User,
  ArrowRight,
  Sparkles,
  Command,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { setStoredSession, getStoredToken } from '../../services/api';
import Badge from './Badge';

const COMMANDS = [
  // Navigation
  {
    id: 'nav-overview',
    group: 'Navigation',
    label: 'Overview & Balance Sheet',
    desc: 'View aggregate balances and core invariants',
    icon: LayoutDashboard,
    route: '/app',
    roles: ['admin', 'auditor', 'holder'],
  },
  {
    id: 'nav-accounts',
    group: 'Navigation',
    label: 'Accounts Portfolio',
    desc: 'Explore active accounts and balance ledger records',
    icon: Wallet,
    route: '/app/accounts',
    roles: ['admin', 'auditor', 'holder'],
  },
  {
    id: 'nav-statement-2',
    group: 'Navigation',
    label: 'Account #2 Cryptographic Statement',
    desc: 'Inspect SHA-256 block chain and genesis entry',
    icon: ShieldCheck,
    route: '/app/accounts/2',
    roles: ['admin', 'auditor', 'holder'],
  },
  {
    id: 'nav-move',
    group: 'Navigation',
    label: 'Money Movement Terminal',
    desc: 'Execute transfers, withdrawals, and deposits',
    icon: ArrowLeftRight,
    route: '/app/move',
    roles: ['admin', 'holder'],
  },
  {
    id: 'nav-audit',
    group: 'Navigation',
    label: 'Auditor & Invariant Console',
    desc: 'Verify zero-sum mathematical scale and duplicate logs',
    icon: ShieldCheck,
    route: '/app/audit',
    roles: ['admin', 'auditor'],
  },
  {
    id: 'nav-attack',
    group: 'Navigation',
    label: 'Attack Lab & Concurrency Prover',
    desc: 'Run multi-thread double spend races and replay storms',
    icon: Zap,
    route: '/app/attack-lab',
    roles: ['admin', 'holder'],
  },
  {
    id: 'nav-admin',
    group: 'Navigation',
    label: 'Admin Administration Console',
    desc: 'Register users and issue new account ledgers',
    icon: KeyRound,
    route: '/app/admin',
    roles: ['admin'],
  },

  // Actions
  {
    id: 'act-verify',
    group: 'Quick Actions',
    label: 'Verify System Cryptographic Invariants',
    desc: 'Audit global zero-sum equilibrium across all tables',
    icon: ShieldCheck,
    action: 'verify-system',
    route: '/app/audit',
    roles: ['admin', 'auditor'],
  },
  {
    id: 'act-race',
    group: 'Quick Actions',
    label: 'Simulate 80% Concurrency Double Spend',
    desc: 'Test row-level pessimistic locking in the Attack Lab',
    icon: Play,
    action: 'simulate-race',
    route: '/app/attack-lab',
    roles: ['admin', 'holder'],
  },

  // Personas
  {
    id: 'persona-admin',
    group: 'Demo Personas',
    label: 'Switch to Root Admin (L3)',
    desc: 'admin@ledgerline.local — Full access including deposits & user management',
    icon: User,
    persona: { id: 1, role: 'admin', email: 'admin@ledgerline.local', name: 'Root Administrator' },
    roles: ['admin', 'auditor', 'holder'],
  },
  {
    id: 'persona-holder',
    group: 'Demo Personas',
    label: 'Switch to Account Holder 1 (L1)',
    desc: 'holder1@ledgerline.local — Transfers, withdrawals & attack experiments',
    icon: User,
    persona: { id: 2, role: 'holder', email: 'holder1@ledgerline.local', name: 'Holder One' },
    roles: ['admin', 'auditor', 'holder'],
  },
  {
    id: 'persona-holder2',
    group: 'Demo Personas',
    label: 'Switch to Account Holder 2 (L1)',
    desc: 'holder2@ledgerline.local — Counterparty receiver & transfers',
    icon: User,
    persona: { id: 3, role: 'holder', email: 'holder2@ledgerline.local', name: 'Holder Two' },
    roles: ['admin', 'auditor', 'holder'],
  },
  {
    id: 'persona-auditor',
    group: 'Demo Personas',
    label: 'Switch to Auditor (L2)',
    desc: 'auditor@ledgerline.local — Read-only verification & replay inspection',
    icon: User,
    persona: { id: 3, role: 'auditor', email: 'auditor@ledgerline.local', name: 'Compliance Auditor' },
    roles: ['admin', 'auditor', 'holder'],
  },
];

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const currentRole = (user?.role || 'holder').toLowerCase();

  // Filter commands by search term and role
  const filteredCommands = COMMANDS.filter((cmd) => {
    if (!cmd.roles.includes(currentRole)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.desc.toLowerCase().includes(q) ||
      cmd.group.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle keyboard events inside command palette
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(filteredCommands.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(filteredCommands.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) executeCommand(selected);
    }
  };

  const executeCommand = (cmd) => {
    onClose();

    if (cmd.persona) {
      const token = getStoredToken() || 'demo-mock-jwt-token';
      setStoredSession(token, cmd.persona);
      showToast({
        title: 'Persona Switched',
        message: `Active session elevated to ${cmd.persona.name} (${cmd.persona.role.toUpperCase()}).`,
        type: 'success',
      });
      navigate('/app');
      return;
    }

    if (cmd.route) {
      navigate(cmd.route);
      showToast({
        title: 'Navigated',
        message: `Opened ${cmd.label}.`,
        type: 'info',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-[#2dff9a]/40 bg-[#030d08] shadow-[0_0_50px_rgba(45,255,154,0.25)] overflow-hidden flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(60,255,160,0.15)] bg-[#020605]">
          <Search className="h-4 w-4 text-[#2dff9a] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, navigate routes, or switch demo personas..."
            className="w-full bg-transparent text-sm font-mono text-[#eafff5] placeholder-[#7ea594]/60 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-[#7ea594] hover:text-[#eafff5] p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Command List Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[#7ea594]">
              No matching commands found for "{query}".
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[rgba(45,255,154,0.15)] border border-[#2dff9a]/40 text-[#eafff5] shadow-[0_0_15px_rgba(45,255,154,0.1)]'
                      : 'hover:bg-[#06150e] text-[#7ea594] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg border ${
                        isSelected
                          ? 'bg-[#031e13] border-[#2dff9a]/50 text-[#2dff9a]'
                          : 'bg-[#020605] border-[rgba(60,255,160,0.1)] text-[#7ea594]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#eafff5] truncate">
                          {cmd.label}
                        </span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#020605] border border-[rgba(60,255,160,0.12)] text-[#7ea594]">
                          {cmd.group}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-[#7ea594] truncate">
                        {cmd.desc}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                      isSelected ? 'text-[#2dff9a] translate-x-1' : 'opacity-0'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2 border-t border-[rgba(60,255,160,0.12)] bg-[#020605] flex items-center justify-between text-[10px] font-mono text-[#7ea594]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#2dff9a]">
            <Sparkles className="h-3 w-3" />
            <span>Instant Demo Switcher Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
