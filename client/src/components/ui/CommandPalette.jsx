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
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
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
    label: 'Auditor & Invariant Verifier',
    desc: 'Run SHA-256 hash checks and inspect idempotency replays',
    icon: ShieldCheck,
    route: '/app/audit',
    roles: ['admin', 'auditor'],
  },
  {
    id: 'nav-attack',
    group: 'Navigation',
    label: 'Attack Laboratory',
    desc: 'Simulate concurrent race conditions and replay attacks',
    icon: Zap,
    route: '/app/attack-lab',
    roles: ['admin', 'holder'],
  },
  {
    id: 'nav-admin',
    group: 'Navigation',
    label: 'Admin Supervisory Center',
    desc: 'Provision accounts and review runtime health',
    icon: KeyRound,
    route: '/app/admin',
    roles: ['admin'],
  },
  {
    id: 'nav-transactions',
    group: 'Navigation',
    label: 'Transactions Journal',
    desc: 'Review settled and refused money movement records',
    icon: BookOpen,
    route: '/app/transactions',
    roles: ['admin', 'auditor', 'holder'],
  },
];

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const userRole = (user?.role || 'holder').toLowerCase();

  // Filter commands by clearance role & search string
  const filteredCommands = COMMANDS.filter((cmd) => {
    const roleAllowed = cmd.roles.includes(userRole);
    if (!roleAllowed) return false;
    if (!query.trim()) return true;

    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.desc.toLowerCase().includes(q) ||
      cmd.group.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
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
        className="w-full max-w-xl rounded-2xl border border-[#16BFFF]/45 bg-[#0A1426] shadow-[0_0_50px_rgba(22,191,255,0.25)] overflow-hidden flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(22,191,255,0.18)] bg-[#050B18]">
          <Search className="h-4 w-4 text-[#16BFFF] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, navigate routes, or switch demo personas..."
            className="w-full bg-transparent text-sm font-mono text-[#F4F8FF] placeholder-[#9AAEC5]/60 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-[#9AAEC5] hover:text-[#F4F8FF] p-1 rounded-lg cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Command List Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[#9AAEC5]">
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
                      ? 'bg-[rgba(22,191,255,0.15)] border border-[#16BFFF]/50 text-[#F4F8FF] shadow-[0_0_15px_rgba(22,191,255,0.15)]'
                      : 'hover:bg-[#101E33] text-[#9AAEC5] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg border ${
                        isSelected
                          ? 'bg-[#0E2A54] border-[#16BFFF]/60 text-[#16BFFF]'
                          : 'bg-[#050B18] border-[rgba(22,191,255,0.14)] text-[#9AAEC5]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#F4F8FF] truncate">
                          {cmd.label}
                        </span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#050B18] border border-[rgba(22,191,255,0.14)] text-[#9AAEC5]">
                          {cmd.group}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-[#9AAEC5] truncate">
                        {cmd.desc}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                      isSelected ? 'text-[#16BFFF] translate-x-1' : 'opacity-0'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2 border-t border-[rgba(22,191,255,0.14)] bg-[#050B18] flex items-center justify-between text-[10px] font-mono text-[#9AAEC5]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#16BFFF]">
            <ShieldCheck className="h-3 w-3" />
            <span>Role-Gated Fast Navigation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
