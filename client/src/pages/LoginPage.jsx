import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import RingOrb from '../components/ui/RingOrb';
import GlowCard from '../components/ui/GlowCard';
import GlowButton from '../components/ui/GlowButton';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const SEED_ACCOUNTS = [
  {
    role: 'Holder 1',
    email: 'holder1@ledgerline.local',
    password: 'Holder1Password123!',
    tag: 'Primary Holder',
    variant: 'emerald',
  },
  {
    role: 'Holder 2',
    email: 'holder2@ledgerline.local',
    password: 'Holder2Password123!',
    tag: 'Counterparty',
    variant: 'cyan',
  },
  {
    role: 'Admin',
    email: 'admin@ledgerline.local',
    password: 'AdminPassword123!',
    tag: 'L3 Root',
    variant: 'amber',
  },
  {
    role: 'Auditor',
    email: 'auditor@ledgerline.local',
    password: 'AuditorPassword123!',
    tag: 'L2 Verify',
    variant: 'muted',
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const { login, authError, setAuthError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/app';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setAuthError(null);

    if (!email || !password) {
      setLocalError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      showToast({
        title: 'Signed in successfully',
        message: `Welcome back, ${result.user.name || result.user.email}!`,
        type: 'success',
      });
      navigate(redirectPath, { replace: true });
    }
  };

  const fillPreset = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setLocalError(null);
    setAuthError(null);
  };

  const errorMessage = localError || authError;

  return (
    <div className="min-h-screen bg-[#020605] text-[#eafff5] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-[rgba(60,255,160,0.14)] bg-[#07110d] overflow-hidden shadow-2xl shadow-black/80">
        {/* Left: Glowing Ring Orb Visual Side */}
        <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[#030d08] via-[#07110d] to-[#020605] border-r border-[rgba(60,255,160,0.1)] overflow-hidden">
          {/* Background ambient gradient */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-[rgba(45,255,154,0.1)] rounded-full blur-3xl pointer-events-none" />

          {/* Brand header */}
          <Link to="/" className="relative z-10 flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(45,255,154,0.15)] border border-[#2dff9a]/40 text-[#2dff9a] shadow-[0_0_15px_rgba(45,255,154,0.3)] transition-transform group-hover:scale-105">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold font-mono tracking-tight text-[#eafff5]">
                Ledger<span className="text-[#2dff9a]">Line</span>
              </span>
              <p className="text-[10px] font-mono uppercase text-[#7ea594] tracking-widest">
                Zero-Sum Integrity
              </p>
            </div>
          </Link>

          {/* Central Ring Orb */}
          <div className="relative z-10 my-auto py-8 flex items-center justify-center">
            <RingOrb size={320} label="CORE CONSERVATION" />
          </div>

          {/* Footer note */}
          <div className="relative z-10 pt-4 border-t border-[rgba(60,255,160,0.1)] text-xs text-[#7ea594]">
            <p className="font-mono text-[11px] text-[#2dff9a] mb-1">STRICT INVARIANTS ARMED</p>
            <p className="text-[11px] leading-relaxed">
              Every balance update is guarded by ordered row locks, append-only triggers, and integer paise precision.
            </p>
          </div>
        </div>

        {/* Right: Login Form Side */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2 lg:hidden">
                <ShieldCheck className="h-6 w-6 text-[#2dff9a]" />
                <span className="text-base font-bold font-mono text-[#eafff5]">LedgerLine</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#eafff5]">
                Sign in to your ledger
              </h1>
              <p className="text-sm text-[#7ea594] mt-1.5">
                Access your balance, execute atomic transfers, or inspect cryptographic audit proofs.
              </p>
            </div>

            {/* Error Message banner */}
            {errorMessage && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-[rgba(255,93,122,0.35)] bg-[rgba(255,93,122,0.1)] p-3.5 text-xs text-[#ff5d7a]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium">{errorMessage}</p>
              </div>
            )}

            {/* Seed reviewer role chips */}
            <div className="mb-7">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-[#7ea594] flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 text-[#2dff9a]" />
                  Demo Reviewer Accounts
                </span>
                <span className="text-[11px] text-[#2dff9a] font-mono">1-Click Fill</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SEED_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillPreset(acc)}
                    className="flex flex-col items-start p-2.5 rounded-xl border border-[rgba(60,255,160,0.12)] bg-[#020605]/60 hover:bg-[#0d1e18] hover:border-[#2dff9a]/40 text-left transition-all duration-150 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-[#eafff5] group-hover:text-[#2dff9a] font-mono">
                        {acc.role}
                      </span>
                      <Badge variant={acc.variant} size="sm">
                        {acc.tag}
                      </Badge>
                    </div>
                    <span className="text-[10px] font-mono text-[#7ea594] truncate w-full">
                      {acc.email}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                id="email"
                type="email"
                placeholder="e.g. holder1@ledgerline.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={Mail}
                required
                disabled={loading}
              />

              <Input
                label="Password"
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={Lock}
                required
                disabled={loading}
              />

              <div className="pt-2">
                <GlowButton
                  type="submit"
                  size="md"
                  loading={loading}
                  className="w-full justify-center"
                >
                  <span>Sign in</span>
                  <ArrowRight className="h-4 w-4" />
                </GlowButton>
              </div>
            </form>

            {/* Footer Navigation */}
            <div className="mt-8 text-center text-xs text-[#7ea594]">
              <span>Need an account? </span>
              <Link
                to="/signup"
                className="text-[#2dff9a] font-semibold hover:underline cursor-pointer"
              >
                Create one now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
