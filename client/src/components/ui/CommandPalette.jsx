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
  X,
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
    desc: 'Aggregate balances and account overview',
    icon: LayoutDashboard,
    route: '/app',
    roles: ['admin', 'auditor', 'holder'],
  },
  {
    id: 'nav-accounts',
    group: 'Navigation',
    label: 'Accounts Portfolio',
    desc: 'View active accounts and ledger balances',
    icon: Wallet,
    route: '/app/accounts',
    roles: ['admin', 'auditor', 'holder'],
  },
  {
    id: 'nav-move',
    group: 'Navigation',
    label: 'Move Money',
    desc: 'Execute transfers, withdrawals, and deposits',
    icon: ArrowLeftRight,
    route: '/app/move',
    roles: ['admin', 'holder'],
  },
  {
    id: 'nav-audit',
    group: 'Navigation',
    label: 'Audit & Invariant Verifier',
    desc: 'Run SHA-256 integrity verification and review audit trail',
    icon: ShieldCheck,
    route: '/app/audit',
    roles: ['admin', 'auditor'],
  },
  {
    id: 'nav-attack',
    group: 'Navigation',
    label: 'Attack Lab',
    desc: 'Simulate concurrent race conditions and verify invariants',
    icon: Zap,
    route: '/app/attack-lab',
    roles: ['admin', 'holder'],
  },
  {
    id: 'nav-admin',
    group: 'Navigation',
    label: 'Admin Console',
    desc: 'Provision accounts and review system metrics',
    icon: KeyRound,
    route: '/app/admin',
    roles: ['admin'],
  },

  // Instant Persona Switchers (Developer/Testing utility)
  {
    id: 'switch-holder-1',
    group: 'Demo Switcher',
    label: 'Switch to Holder 1',
    desc: 'Account Holder · holder1@ledgerline.local',
    icon: User,
    persona: {
      id: 2,
      email: 'holder1@ledgerline.local',
      role: 'holder',
      name: 'Holder 1',
    },
    roles: ['admin', 'auditor', 'holder'],
  },
  {
    id: 'switch-holder-2',
    group: 'Demo Switcher',
    label: 'Switch to Holder 2',
    desc: 'Account Holder · holder2@ledgerline.local',
    icon: User,
    persona: {
      id: 3,
      email: 'holder2@ledgerline.local',
      role: 'holder',
      name: 'Holder 2',
    },
    roles: ['admin', 'auditor', 'holder'],
  },
  {
    id: 'switch-admin',
    group: 'Demo Switcher',
    label: 'Switch to Administrator',
    desc: 'System Administrator · admin@ledgerline.local',
    icon: KeyRound,
    persona: {
      id: 1,
      email: 'admin@ledgerline.local',
      role: 'admin',
      name: 'Administrator',
    },
    roles: ['admin', 'auditor', 'holder'],
  },
  {
    id: 'switch-auditor',
    group: 'Demo Switcher',
    label: 'Switch to Auditor',
    desc: 'Compliance Auditor · auditor@ledgerline.local',
    icon: ShieldCheck,
    persona: {
      id: 4,
      email: 'auditor@ledgerline.local',
      role: 'auditor',
      name: 'Auditor',
    },
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

  const role = (user?.role || 'holder').toLowerCase();

  const filtered = COMMANDS.filter((cmd) => {
    if (!cmd.roles.includes(role)) return false;
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
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (cmd) => {
    onClose();
    if (cmd.route) {
      navigate(cmd.route);
    } else if (cmd.persona) {
      const currentToken = getStoredToken() || 'dev-token-review';
      setStoredSession(currentToken, cmd.persona);
      showToast({
        title: 'Switched Persona',
        message: `Active persona set to ${cmd.persona.name} (${cmd.persona.role}).`,
        type: 'info',
      });
      window.location.reload();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Palette Modal */}
      <div className="relative w-full max-w-xl rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xl overflow-hidden z-10">
        {/* Input Bar */}
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
          <Search className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block rounded bg-[var(--bg-subdued)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] border border-[var(--border-subtle)] font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
              No matching commands found.
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((cmd, idx) => {
                const Icon = cmd.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => handleSelect(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-subdued)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-md ${
                          isSelected
                            ? 'bg-[var(--accent-primary)] text-[var(--accent-text)]'
                            : 'bg-[var(--bg-subdued)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{cmd.label}</p>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          {cmd.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="neutral" size="sm">
                        {cmd.group}
                      </Badge>
                      {isSelected && (
                        <ArrowRight className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-subtle)] px-4 py-2 bg-[var(--bg-subdued)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>LedgerLine</span>
        </div>
      </div>
    </div>
  );
}
