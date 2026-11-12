import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  ShieldCheck,
  Zap,
  LogOut,
  Menu,
  X,
  Search,
  BookOpen,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { checkBackendHealth } from '../../services/api';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '../motion/PageTransition';
import CommandPalette from '../ui/CommandPalette';
import Badge from '../ui/Badge';

const NAV_ITEMS = [
  {
    path: '/app',
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    roles: ['admin', 'auditor', 'holder'],
    end: true,
  },
  {
    path: '/app/accounts',
    id: 'accounts',
    label: 'Accounts',
    icon: Wallet,
    roles: ['admin', 'auditor', 'holder'],
    end: false,
  },
  {
    path: '/app/transactions',
    id: 'transactions',
    label: 'Transactions',
    icon: BookOpen,
    roles: ['admin', 'auditor', 'holder'],
    end: false,
  },
  {
    path: '/app/move',
    id: 'move',
    label: 'Move Money',
    icon: ArrowLeftRight,
    roles: ['admin', 'holder'],
    end: false,
  },
  {
    path: '/app/audit',
    id: 'audit',
    label: 'Audit & Integrity',
    icon: ShieldCheck,
    roles: ['admin', 'auditor'],
    end: false,
  },
  {
    path: '/app/attack-lab',
    id: 'attack-lab',
    label: 'Attack Lab',
    icon: Zap,
    roles: ['admin', 'holder'],
    end: false,
  },
  {
    path: '/app/admin',
    id: 'admin',
    label: 'Admin Console',
    icon: ShieldCheck,
    roles: ['admin'],
    end: false,
  },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);

  const role = (user?.role || 'holder').toLowerCase();
  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    try {
      await logout();
      showToast({
        title: 'Signed Out',
        message: 'Your session has ended securely.',
        type: 'info',
      });
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const probe = async () => {
      try {
        const res = await checkBackendHealth();
        if (isMounted) {
          setIsBackendHealthy(res.ok);
        }
      } catch {
        if (isMounted) {
          setIsBackendHealthy(false);
        }
      }
    };
    probe();
    const interval = setInterval(probe, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Determine current page title for breadcrumb
  const currentNav = NAV_ITEMS.find((item) =>
    item.end
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path)
  );
  const pageTitle = currentNav ? currentNav.label : 'Console';

  const roleLabel = {
    admin: 'Administrator',
    auditor: 'Auditor',
    holder: 'Account Holder',
  }[role] || 'Account Holder';

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex font-sans">
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (240px wide) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[240px] flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* LedgerLine Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-[var(--border-subtle)] px-5">
          <Link to="/app" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-semibold text-sm">
              LL
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)] font-serif">
                LedgerLine
              </span>
              <span className="text-[10px] text-[var(--text-muted)] tracking-wide">
                Financial Invariant Engine
              </span>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-subdued)] md:hidden cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User Identity Snippet */}
        <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-subdued)] text-[var(--text-primary)] font-medium text-xs">
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {user?.name || user?.email}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                {roleLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <div className="px-2 pb-1.5 text-[11px] font-medium text-[var(--text-muted)] tracking-wider uppercase">
            Menu
          </div>

          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isMatch = item.end
              ? location.pathname === item.path || location.pathname === `${item.path}/`
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={() => {
                  const highlighted = isMatch;
                  return `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150 ${
                    highlighted
                      ? 'bg-[var(--surface-mint)] text-[var(--text-primary)] font-semibold border border-[var(--border-mint)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subdued)] hover:text-[var(--text-primary)] border border-transparent'
                  }`;
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer: Theme Toggle & Sign Out */}
        <div className="border-t border-[var(--border-subtle)] p-3 space-y-1.5 bg-[var(--bg-surface)]">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-subdued)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            <div className="flex items-center gap-2">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span>{theme === 'light' ? 'Dark Theme' : 'Light Theme'}</span>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] capitalize">{theme}</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer font-medium"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-subdued)] md:hidden cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span className="hover:text-[var(--text-primary)]">LedgerLine</span>
              <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span className="font-semibold text-[var(--text-primary)]">{pageTitle}</span>
            </div>
          </div>

          {/* Right Header Utilities: Command Palette + Backend Indicator */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subdued)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
              title="Open Command Palette (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden sm:inline-block rounded bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] border border-[var(--border-subtle)] font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Subtle Health Dot */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-[var(--text-muted)]"
              title={isBackendHealthy ? 'Ledger Node Connected' : 'Ledger Node Offline'}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isBackendHealthy ? 'bg-[var(--status-success)]' : 'bg-[var(--status-error)]'
                }`}
              />
              <span className="hidden lg:inline text-[11px]">
                {isBackendHealthy ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* Role Chip */}
            <Badge variant="neutral" size="sm">
              {roleLabel}
            </Badge>
          </div>
        </header>

        {/* Content Viewport with max width 1440px */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-[1440px] w-full mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
