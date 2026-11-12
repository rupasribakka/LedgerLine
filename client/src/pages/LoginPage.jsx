import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, ChevronDown, ChevronUp, User } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DEMO_PERSONAS = [
  {
    role: 'Holder 1',
    email: 'holder1@ledgerline.local',
    password: 'Holder1Password123!',
    tag: 'Primary Customer',
    variant: 'accent',
  },
  {
    role: 'Holder 2',
    email: 'holder2@ledgerline.local',
    password: 'Holder2Password123!',
    tag: 'Counterparty',
    variant: 'neutral',
  },
  {
    role: 'Admin',
    email: 'admin@ledgerline.local',
    password: 'AdminPassword123!',
    tag: 'Administrator',
    variant: 'warning',
  },
  {
    role: 'Auditor',
    email: 'auditor@ledgerline.local',
    password: 'AuditorPassword123!',
    tag: 'Compliance',
    variant: 'info',
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [showDemoAccess, setShowDemoAccess] = useState(false);

  const { login, authError, setAuthError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/app';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setAuthError(null);

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      showToast({
        title: 'Authentication Successful',
        message: `Welcome back to LedgerLine, ${result.user?.name || result.user?.email}!`,
        type: 'success',
      });
      navigate(redirectPath, { replace: true });
    } else {
      setLocalError(result.error);
    }
  };

  const fillPreset = (persona) => {
    setEmail(persona.email);
    setPassword(persona.password);
    setLocalError(null);
    setAuthError(null);
    showToast({
      title: 'Credentials Loaded',
      message: `Selected ${persona.role} evaluation account.`,
      type: 'info',
    });
  };

  const errorMessage = localError || authError;

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-semibold text-sm">
            LL
          </div>
          <span className="text-xl font-semibold tracking-tight text-[var(--text-primary)] font-serif">
            LedgerLine
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Access your high-integrity double-entry ledger accounts
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 space-y-4">
        <Card className="p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-5 rounded-xl border border-[var(--status-error)]/30 bg-[var(--status-error-bg)] p-3.5 flex items-start gap-3 text-xs text-[var(--status-error)]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              id="loginEmail"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={Mail}
            />

            <Input
              label="Password"
              id="loginPassword"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              leftIcon={Lock}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              loading={loading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-[var(--accent-primary)] hover:underline">
              Create an account
            </Link>
          </div>
        </Card>

        {/* Separated Evaluation / Demo Access */}
        <Card className="p-4 border-[var(--border-subtle)] bg-[var(--bg-subdued)]">
          <button
            type="button"
            onClick={() => setShowDemoAccess((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Evaluation & Demo Personas</span>
            </div>
            {showDemoAccess ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showDemoAccess && (
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2">
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                1-click credentials for reviewer evaluation across all Role-Based Access levels:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {DEMO_PERSONAS.map((persona) => (
                  <button
                    key={persona.email}
                    type="button"
                    onClick={() => fillPreset(persona)}
                    className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)] text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {persona.role}
                      </span>
                      <Badge variant={persona.variant} size="sm">
                        {persona.tag}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] font-mono truncate mt-1">
                      {persona.email}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
