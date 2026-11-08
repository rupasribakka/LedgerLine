import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  ShieldAlert,
  Zap,
  KeyRound,
  LogOut,
  Menu,
  X,
  Radio,
  Sparkles,
  User,
  Activity,
  CheckCircle2,
  Search,
  Command,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { checkBackendHealth } from '../../services/api';
import Badge from '../ui/Badge';
import GlowButton from '../ui/GlowButton';
import PageTransition from '../motion/PageTransition';
import CommandPalette from '../ui/CommandPalette';

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
    icon: KeyRound,
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
  const [backendHealth, setBackendHealth] = useState({ ok: true, checking: false, responseTime: 12 });

  const role = (user?.role || 'holder').toLowerCase();

  // Filter navigation items by user role
  const visibleNav = NAV_CONFIG.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    try {
      await logout();
      showToast({
        title: 'Signed out',
        message: 'You have been disconnected from the session.',
        type: 'info',
      });
      navigate('/', { replace: true });
    } catch {
      navigate('/', { replace: true });
    }
  };

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Periodic health check
  useEffect(() => {
    let isMounted = true;
    const probe = async () => {
      setBackendHealth((prev) => ({ ...prev, checking: true }));
      const res = await checkBackendHealth();
      if (isMounted) {
        setBackendHealth({
          ok: res.ok,
          checking: false,
          responseTime: res.responseTime ?? 10,
        });
      }
    };
    probe();
    const interval = setInterval(probe, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getRoleVariant = (r) => {
    if (r === 'admin') return 'amber';
    if (r === 'auditor') return 'cyan';
    return 'emerald';
  };

  const getRoleClearance = (r) => {
    if (r === 'admin') return 'L3 // ROOT CLEARANCE';
    if (r === 'auditor') return 'L2 // AUDIT VERIFIER';
    return 'L1 // STANDARD HOLDER';
  };

  return (
    <div className="min-h-screen bg-[#020605] text-[#eafff5] flex flex-col md:flex-row font-sans selection:bg-[#2dff9a]/30 selection:text-[#2dff9a]">
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
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-[rgba(60,255,160,0.12)] bg-[#030a07]/95 backdrop-blur-2xl transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-[rgba(60,255,160,0.12)] px-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(45,255,154,0.15)] border border-[#2dff9a]/40 text-[#2dff9a] shadow-[0_0_15px_rgba(45,255,154,0.25)] transition-transform group-hover:scale-105">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold font-mono tracking-tight text-[#eafff5]">
                Ledger<span className="text-[#2dff9a]">Line</span>
              </span>
              <p className="text-[10px] font-mono uppercase text-[#7ea594] tracking-widest">
                Financial Core
              </p>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-[#7ea594] hover:bg-[#07110d] hover:text-[#eafff5] md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Identity Chip in Sidebar */}
        <div className="px-5 py-4 border-b border-[rgba(60,255,160,0.1)] bg-[#07110d]/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7ea594]">
              Clearance Level
            </span>
            <Badge variant={getRoleVariant(role)} size="sm">
              {role.toUpperCase()}
            </Badge>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-[#020605] p-2.5 border border-[rgba(60,255,160,0.12)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(45,255,154,0.15)] border border-[#2dff9a]/30 text-[#2dff9a] font-mono font-bold text-xs">
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono font-bold text-[#eafff5] truncate">
                {user?.name || user?.email}
              </p>
              <p className="text-[10px] font-mono text-[#7ea594] tracking-tight">
                {getRoleClearance(role)}
              </p>
            </div>
          </div>
        </div>

        {/* Role-Based Navigation Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5">
          <div className="px-2 pb-2 text-[10px] font-mono font-semibold uppercase tracking-widest text-[#7ea594]">
            Navigation
          </div>

          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `w-full group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold transition-all ${
                    isActive
                      ? 'bg-[rgba(45,255,154,0.15)] text-[#2dff9a] border border-[#2dff9a]/40 shadow-[0_0_15px_rgba(45,255,154,0.15)]'
                      : 'text-[#7ea594] hover:bg-[#07110d] hover:text-[#eafff5] hover:border hover:border-[rgba(60,255,160,0.15)]'
                  }`
                }
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
        <div className="border-t border-[rgba(60,255,160,0.12)] p-4 bg-[#020605]/80 space-y-3">
          <div className="rounded-xl border border-[rgba(60,255,160,0.12)] bg-[#07110d] p-3 text-[11px] font-mono text-[#7ea594]">
            <div className="flex items-center justify-between text-[10px] text-[#2dff9a] font-bold mb-1">
              <span>INVARIANT GUARD</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2dff9a] animate-pulse" />
                ACTIVE
              </span>
            </div>
            <p className="leading-snug">Σ Balances ≡ 0 Paise</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-[rgba(255,93,122,0.25)] bg-[rgba(255,93,122,0.08)] py-2 text-xs font-mono font-semibold text-[#ff5d7a] hover:bg-[rgba(255,93,122,0.15)] transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[rgba(60,255,160,0.12)] bg-[#020605]/85 px-4 sm:px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-[rgba(60,255,160,0.18)] bg-[#07110d] p-2 text-[#7ea594] hover:text-[#2dff9a] md:hidden"
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#7ea594]">
                <span className="text-[#2dff9a] font-semibold">LedgerLine</span>
                <span>/</span>
                <span>Console</span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-[#eafff5] tracking-tight font-mono">
                Double-Entry Ledger Engine
              </h1>
            </div>
          </div>

          {/* Right: Search / Command Palette Shortcut + Live Connection + Header User Chip */}
          <div className="flex items-center gap-3">
            {/* Quick Command Palette Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-[rgba(60,255,160,0.18)] bg-[#07110d] px-3 py-1.5 text-xs font-mono text-[#7ea594] hover:text-[#2dff9a] hover:border-[#2dff9a]/40 transition-colors cursor-pointer shadow-sm"
              title="Open Command Palette (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-[#2dff9a]" />
              <span className="hidden sm:inline">Commands</span>
              <kbd className="hidden sm:inline-block rounded bg-[#020605] px-1.5 py-0.5 text-[10px] text-[#2dff9a] border border-[rgba(60,255,160,0.2)] font-mono">
                Ctrl K
              </kbd>
            </button>

            {/* Health Indicator */}
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-[rgba(60,255,160,0.15)] bg-[#07110d] px-3 py-1 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                {backendHealth.checking ? (
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                ) : backendHealth.ok ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2dff9a] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2dff9a]" />
                  </>
                ) : (
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff5d7a]" />
                )}
              </span>
              <span className="text-[#7ea594] text-[11px]">
                {backendHealth.ok ? 'ONLINE' : 'OFFLINE'}
              </span>
              {backendHealth.responseTime && (
                <span className="text-[10px] text-[#2dff9a] pl-1 border-l border-[rgba(60,255,160,0.12)]">
                  {backendHealth.responseTime}ms
                </span>
              )}
            </div>

            {/* Header User Chip Showing Role */}
            <div className="flex items-center gap-2 rounded-full border border-[rgba(60,255,160,0.2)] bg-[#07110d] pl-1.5 pr-3 py-1 shadow-[0_0_15px_rgba(45,255,154,0.08)]">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(45,255,154,0.18)] border border-[#2dff9a]/40 text-[#2dff9a] font-mono font-bold text-xs">
                {(user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#eafff5] hidden md:inline truncate max-w-[120px]">
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
              className="rounded-xl border border-[rgba(60,255,160,0.15)] bg-[#07110d] p-2 text-[#7ea594] hover:text-[#ff5d7a] hover:border-[rgba(255,93,122,0.3)] transition-colors cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
