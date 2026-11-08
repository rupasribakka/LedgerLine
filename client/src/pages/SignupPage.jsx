import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import RingOrb from '../components/ui/RingOrb';
import GlowButton from '../components/ui/GlowButton';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { signup } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-type your password.');
      return;
    }

    setLoading(true);
    const result = await signup({ name: name.trim(), email: email.trim(), password });
    setLoading(false);

    if (result.success) {
      showToast({
        title: 'Account created!',
        message: 'Your account has been created. Please sign in with your credentials.',
        type: 'success',
      });
      navigate('/login');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#020605] text-[#eafff5] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-[rgba(60,255,160,0.14)] bg-[#07110d] overflow-hidden shadow-2xl shadow-black/80">
        {/* Left: Glowing Ring Orb Visual Side */}
        <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[#030d08] via-[#07110d] to-[#020605] border-r border-[rgba(60,255,160,0.1)] overflow-hidden">
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
                Account Holder Onboarding
              </p>
            </div>
          </Link>

          {/* Central Ring Orb */}
          <div className="relative z-10 my-auto py-8 flex items-center justify-center">
            <RingOrb size={320} label="ACCOUNT REGISTRY" />
          </div>

          {/* Footer note */}
          <div className="relative z-10 pt-4 border-t border-[rgba(60,255,160,0.1)] text-xs text-[#7ea594]">
            <p className="font-mono text-[11px] text-[#2dff9a] mb-1">STRICT HOLDER ROLE ONLY</p>
            <p className="text-[11px] leading-relaxed">
              Public registration provisions standard customer accounts. Administrative roles are provisioned through cryptographic seeds only.
            </p>
          </div>
        </div>

        {/* Right: Registration Form Side */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2 lg:hidden">
                <ShieldCheck className="h-6 w-6 text-[#2dff9a]" />
                <span className="text-base font-bold font-mono text-[#eafff5]">LedgerLine</span>
              </div>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#eafff5]">
                  Open an Account
                </h1>
                <Badge variant="emerald" size="sm">
                  Holder Tier
                </Badge>
              </div>
              <p className="text-sm text-[#7ea594] mt-1.5">
                Join LedgerLine with a cryptographic double-entry ledger account.
              </p>
            </div>

            {/* Error Message banner */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-[rgba(255,93,122,0.35)] bg-[rgba(255,93,122,0.1)] p-3.5 text-xs text-[#ff5d7a]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium">{error}</p>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                id="name"
                type="text"
                placeholder="e.g. Alice Cooper"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={User}
                required
                disabled={loading}
              />

              <Input
                label="Email Address"
                id="email"
                type="email"
                placeholder="alice@example.com"
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
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helper="Min. 8 characters"
                leftIcon={Lock}
                required
                disabled={loading}
              />

              <Input
                label="Confirm Password"
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </GlowButton>
              </div>
            </form>

            {/* Footer Navigation */}
            <div className="mt-8 text-center text-xs text-[#7ea594]">
              <span>Already registered? </span>
              <Link
                to="/login"
                className="text-[#2dff9a] font-semibold hover:underline cursor-pointer"
              >
                Sign in to your account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
