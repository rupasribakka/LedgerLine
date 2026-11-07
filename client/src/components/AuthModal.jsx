import React, { useState } from 'react';
import { ShieldCheck, UserCheck, KeyRound, AlertCircle, Loader2, Sparkles, X } from 'lucide-react';
import { loginUser } from '../services/api';

const DEMO_PRESETS = [
  {
    roleLabel: 'Account Holder 1',
    username: 'holder1',
    password: 'holder123',
    badge: '₹100 SEED',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    description: 'Primary transacting account (Acc #2)',
  },
  {
    roleLabel: 'Account Holder 2',
    username: 'holder2',
    password: 'holder234',
    badge: '₹50 SEED',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    description: 'Counterparty transacting account (Acc #3)',
  },
  {
    roleLabel: 'System Administrator',
    username: 'admin',
    password: 'admin123',
    badge: 'L3 ROOT',
    badgeColor: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    description: 'System config & full account overview',
  },
  {
    roleLabel: 'Compliance Auditor',
    username: 'auditor',
    password: 'auditor123',
    badge: 'L2 AUDIT',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    description: 'Zero-sum integrity verification & audit logs',
  },
];

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  async function handleLogin(u = username, p = password) {
    setError(null);
    setLoading(true);
    try {
      const result = await loginUser(u, p);
      if (result.ok) {
        onLoginSuccess(result.data.user);
        onClose();
      } else {
        setError(result.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setError(err.message || 'Network error occurred.');
    } finally {
      setLoading(false);
    }
  }

  function handlePresetClick(preset) {
    setUsername(preset.username);
    setPassword(preset.password);
    handleLogin(preset.username, preset.password);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-[#0a1022] p-6 shadow-2xl shadow-cyan-950/50 sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-mono flex items-center gap-2">
              Authentication Portal
              <span className="text-xs font-mono font-normal text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                JWT Guard
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Sign in with your LedgerLine credentials or choose a pre-seeded demo profile.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 flex items-start space-x-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Denied</p>
              <p className="text-rose-300/90">{error}</p>
            </div>
          </div>
        )}

        {/* Quick Demo Selector */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              One-Click Demo Profiles (Grading)
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">Instant Sign-In</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DEMO_PRESETS.map((preset) => (
              <button
                key={preset.username}
                type="button"
                disabled={loading}
                onClick={() => handlePresetClick(preset)}
                className="flex flex-col items-start p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-cyan-500/40 text-left transition-all duration-150 disabled:opacity-50 group"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 font-mono">
                    {preset.roleLabel}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${preset.badgeColor}`}>
                    {preset.badge}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 group-hover:text-slate-300">
                  {preset.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-slate-800"></div>
          <span className="absolute bg-[#0a1022] px-3 text-[11px] font-mono uppercase text-slate-500">
            Or Manual Credentials
          </span>
        </div>

        {/* Manual Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. holder1"
              required
              disabled={loading}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-900/40 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating with DB...</span>
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                <span>Sign In Securely</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
