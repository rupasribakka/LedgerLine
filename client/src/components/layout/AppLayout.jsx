import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Zap,
  LogOut,
  Menu,
  X,
  Search,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { checkBackendHealth } from '../../services/api';
import { AnimatePresence } from 'framer-motion';
import Badge from '../ui/Badge';
import PageTransition from '../motion/PageTransition';
import CommandPalette from '../ui/CommandPalette';
import BlockchainBackground from '../ui/BlockchainBackground';

const NAV_CONFIG = [
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
    label: 'Money Movement',
    icon: ArrowLeftRight,
    roles: ['admin', 'holder'],
    end: false,
  },
  {
    path: '/app/audit',
    id: 'audit',
    label: 'Auditor & Duplicates',
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
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState({
    ok: true,
    checking: false,
    responseTime: null,
  });

  const role = (user?.role || 'holder').toLowerCase();

  const visibleNav = NAV_CONFIG.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    try {
      await logout();
      showToast({
        title: 'Signed Out',
        message: 'Your cryptographic session has been terminated.',
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
          setBackendHealth({
            ok: res.ok,
            checking: false,
            responseTime: res.responseTime,
          });
        }
      } catch {
        if (isMounted) {
          setBackendHealth({
            ok: false,
            checking: false,
            responseTime: null,
          });
        }
      }
    };

    probe();
    const interval = setInterval(probe, 25000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getRoleVariant = (r) => {
    if (r === 'admin') return 'purple';
    if (r === 'auditor') return 'blue';
    return 'cyan';
  };

  const getRoleClearance = (r) => {
    if (r === 'admin') return 'L3 // ROOT CLEARANCE';
    if (r === 'auditor') return 'L2 // AUDIT VERIFIER';
    return 'L1 // STANDARD HOLDER';
  };

  return (
    <div className="min-h-screen bg-[#050B18] text-[#F4F8FF] flex flex-col md:flex-row font-sans selection:bg-[#16BFFF]/30 selection:text-[#16BFFF]">
      {/* Quick Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Role-Based Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[280px] max-w-[calc(100vw-3rem)] flex-col border-r border-[rgba(22,191,255,0.16)] bg-[#0A1426]/95 backdrop-blur-2xl transition-transform duration-300 md:static md:translate-x-0 md:w-72 md:max-w-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-[rgba(22,191,255,0.16)] px-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(22,191,255,0.15)] border border-[#16BFFF]/50 text-[#16BFFF] shadow-[0_0_15px_rgba(22,191,255,0.3)] transition-transform group-hover:scale-105">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold font-mono tracking-tight text-[#F4F8FF]">
                BALANCE<span className="text-[#16BFFF]">VAULT</span>
              </span>
              <p className="text-[10px] font-mono uppercase text-[#9AAEC5] tracking-widest">
                LedgerLine Core
              </p>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-[#9AAEC5] hover:bg-[#101E33] hover:text-[#F4F8FF] md:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Identity Chip in Sidebar */}
        <div className="px-5 py-4 border-b border-[rgba(22,191,255,0.12)] bg-[#101E33]/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9AAEC5]">
              Clearance Level
            </span>
            <Badge variant={getRoleVariant(role)} size="sm">
              {role.toUpperCase()}
            </Badge>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-[#050B18] p-2.5 border border-[rgba(22,191,255,0.16)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(22,191,255,0.15)] border border-[#16BFFF]/40 text-[#16BFFF] font-mono font-bold text-xs">
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono font-bold text-[#F4F8FF] truncate">
                {user?.name || user?.email}
              </p>
              <p className="text-[10px] font-mono text-[#9AAEC5] tracking-tight">
                {getRoleClearance(role)}
              </p>
            </div>
          </div>
        </div>

        {/* Role-Based Navigation Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5">
          <div className="px-2 pb-2 text-[10px] font-mono font-semibold uppercase tracking-widest text-[#9AAEC5]">
            Navigation
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
                className={({ isActive }) => {
                  const highlighted = isActive || isMatch;
                  return `w-full group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold transition-all ${
                    highlighted
                      ? 'bg-[rgba(22,191,255,0.15)] text-[#16BFFF] border border-[#16BFFF]/40 shadow-[0_0_15px_rgba(22,191,255,0.2)]'
                      : 'text-[#9AAEC5] hover:bg-[#101E33] hover:text-[#F4F8FF] hover:border hover:border-[rgba(22,191,255,0.18)]'
                  }`;
                }}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-[rgba(22,191,255,0.14)] p-4 bg-[#050B18]/85 space-y-3">
          <div className="rounded-xl border border-[rgba(22,191,255,0.16)] bg-[#0A1426] p-3 text-[11px] font-mono text-[#9AAEC5]">
            <div className="flex items-center justify-between text-[10px] text-[#16BFFF] font-bold mb-1">
              <span>LEDGERLINE INVARIANT</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#16BFFF] animate-pulse" />
                ACTIVE
              </span>
            </div>
            <p className="leading-snug">Σ Balances ≡ 0 Paise</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-[rgba(255,91,122,0.28)] bg-[rgba(255,91,122,0.1)] py-2 text-xs font-mono font-semibold text-[#FF5B7A] hover:bg-[rgba(255,91,122,0.18)] transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area with Cryptographic Blockchain Background */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <BlockchainBackground opacity={0.65} interactive={true} />

        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[rgba(22,191,255,0.16)] bg-[#050B18]/90 px-4 sm:px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-[rgba(22,191,255,0.2)] bg-[#0A1426] p-2 text-[#9AAEC5] hover:text-[#16BFFF] md:hidden cursor-pointer"
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#9AAEC5]">
                <span className="text-[#16BFFF] font-semibold">BalanceVault</span>
                <span>/</span>
                <span className="text-[#9AAEC5]">LedgerLine</span>
                <span>/</span>
                <span>Console</span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-[#F4F8FF] tracking-tight font-mono">
                Cryptographic Ledger Engine
              </h1>
            </div>
          </div>

          {/* Right: Search / Command Palette Shortcut + Live Connection + Header User Chip */}
          <div className="flex items-center gap-3">
            {/* Quick Command Palette Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-[rgba(22,191,255,0.2)] bg-[#0A1426] px-3 py-1.5 text-xs font-mono text-[#9AAEC5] hover:text-[#16BFFF] hover:border-[#16BFFF]/50 transition-colors cursor-pointer shadow-sm"
              title="Open Command Palette (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-[#16BFFF]" />
              <span className="hidden sm:inline">Commands</span>
              <kbd className="hidden sm:inline-block rounded bg-[#050B18] px-1.5 py-0.5 text-[10px] text-[#16BFFF] border border-[rgba(22,191,255,0.25)] font-mono">
                Ctrl K
              </kbd>
            </button>

            {/* Health Indicator */}
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-[rgba(22,191,255,0.18)] bg-[#0A1426] px-3 py-1 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                {backendHealth.checking ? (
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                ) : backendHealth.ok ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16BFFF] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16BFFF]" />
                  </>
                ) : (
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF5B7A]" />
                )}
              </span>
              <span className="text-[#9AAEC5] text-xs">
                {backendHealth.ok ? 'ONLINE' : 'OFFLINE'}
              </span>
              {backendHealth.ok && backendHealth.responseTime != null && (
                <span className="text-xs text-[#16BFFF] pl-1.5 border-l border-[rgba(22,191,255,0.2)] font-mono">
                  {backendHealth.responseTime}ms
                </span>
              )}
            </div>

            {/* Header User Chip Showing Role */}
            <div className="flex items-center gap-2 rounded-full border border-[rgba(22,191,255,0.22)] bg-[#0A1426] pl-1.5 pr-3 py-1 shadow-[0_0_15px_rgba(22,191,255,0.1)]">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(22,191,255,0.18)] border border-[#16BFFF]/45 text-[#16BFFF] font-mono font-bold text-xs">
                {(user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#F4F8FF] hidden md:inline truncate max-w-[120px]">
                  {user?.name || user?.email}
                </span>
                <Badge variant={getRoleVariant(role)} size="sm">
                  {role.toUpperCase()}
                </Badge>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign out"
              className="rounded-xl border border-[rgba(22,191,255,0.18)] bg-[#0A1426] p-2 text-[#9AAEC5] hover:text-[#FF5B7A] hover:border-[rgba(255,91,122,0.35)] transition-colors cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto relative z-10">
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
