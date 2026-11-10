import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import RingOrb from '../components/ui/RingOrb';
import GlowButton from '../components/ui/GlowButton';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import CyberBackground from '../components/CyberBackground';
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
        title: 'Account Created Successfully!',
        message: 'Your cryptographic double-entry ledger account is ready. Please sign in.',
        type: 'success',
      });
      navigate('/login');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B18] text-[#F4F8FF] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Cybersecurity Radar & Zero-Trust Sentinel Mesh Background */}
      <CyberBackground opacity={0.85} showRadar={true} showGrid={true} />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-[rgba(22,191,255,0.22)] bg-[#101E33]/90 backdrop-blur-2xl overflow-hidden shadow-2xl shadow-[#050B18]/90 relative z-10">
        {/* Left: Glowing Ring Orb Visual Side */}
        <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[#071324] via-[#0A1A33] to-[#050B18] border-r border-[rgba(22,191,255,0.15)] overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-[rgba(22,191,255,0.12)] rounded-full blur-3xl pointer-events-none" />

          {/* Brand header */}
          <Link to="/" className="relative z-10 flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(22,191,255,0.15)] border border-[#16BFFF]/50 text-[#16BFFF] shadow-[0_0_15px_rgba(22,191,255,0.35)] transition-transform group-hover:scale-105">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold font-mono tracking-tight text-[#F4F8FF]">
                BALANCE<span className="text-[#16BFFF]">VAULT</span>
              </span>
              <p className="text-[10px] font-mono uppercase text-[#9AAEC5] tracking-widest">
                LedgerLine Onboarding
              </p>
            </div>
          </Link>

          {/* Central Ring Orb */}
          <div className="relative z-10 my-auto py-8 flex items-center justify-center">
            <RingOrb size={320} label="ACCOUNT REGISTRY" />
          </div>

          {/* Footer note */}
          <div className="relative z-10 pt-4 border-t border-[rgba(22,191,255,0.15)] text-xs text-[#9AAEC5]">
            <p className="font-mono text-[11px] text-[#16BFFF] mb-1 font-bold">STRICT HOLDER ROLE ONLY</p>
            <p className="text-[11px] leading-relaxed">
              Public registration provisions standard customer accounts. Administrative roles are provisioned through cryptographic seeds only.
            </p>
          </div>
        </div>

        {/* Right: Registration Form Side */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            {/* Back to Home Link */}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#9AAEC5] hover:text-[#16BFFF] transition-colors mb-6 group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              <span>Back to home</span>
            </Link>

            {/* Header */}
            <div className="mb-8">
              <Link to="/" className="flex items-center gap-2 mb-3 lg:hidden group">
                <ShieldCheck className="h-6 w-6 text-[#16BFFF]" />
                <span className="text-base font-bold font-mono text-[#F4F8FF] group-hover:text-[#16BFFF] transition-colors">
                  BALANCEVAULT
                </span>
              </Link>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F4F8FF] font-mono">
                  Open an Account
                </h1>
                <Badge variant="cyan" size="sm">
                  Holder Tier
                </Badge>
              </div>
              <p className="text-sm text-[#9AAEC5] mt-1.5">
                Join BalanceVault with a cryptographic double-entry ledger account.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-[rgba(255,91,122,0.35)] bg-[rgba(255,91,122,0.12)] p-3.5 text-xs text-[#FF5B7A]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium">{error}</p>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                id="name"
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
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={Lock}
                required
                disabled={loading}
                helper="Min. 8 characters"
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
            <div className="mt-8 text-center text-xs text-[#9AAEC5] space-y-2.5 font-mono">
              <div>
                <span>Already registered? </span>
                <Link
                  to="/login"
                  className="text-[#16BFFF] font-semibold hover:underline cursor-pointer"
                >
                  Sign in to your account
                </Link>
              </div>
              <div>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 text-[#9AAEC5] hover:text-[#16BFFF] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Back to home</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
