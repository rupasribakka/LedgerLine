import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
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
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    const result = await signup({ name: name.trim(), email: email.trim(), password });
    setLoading(false);

    if (result.success) {
      showToast({
        title: 'Account Created',
        message: 'Your ledger account has been provisioned. Please sign in.',
        type: 'success',
      });
      navigate('/login');
    } else {
      setError(result.error);
    }
  };

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
          Open a LedgerLine Account
        </h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Join a platform engineered for mathematical accuracy and transparency
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 rounded-xl border border-[var(--status-error)]/30 bg-[var(--status-error-bg)] p-3.5 flex items-start gap-3 text-xs text-[var(--status-error)]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              id="signupName"
              type="text"
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              leftIcon={User}
            />

            <Input
              label="Email Address"
              id="signupEmail"
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
              id="signupPassword"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              leftIcon={Lock}
            />

            <Input
              label="Confirm Password"
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              leftIcon={Lock}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                loading={loading}
              >
                Create Account
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-[var(--accent-primary)] hover:underline">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
