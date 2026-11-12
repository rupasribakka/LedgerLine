import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  BookOpen,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-subtle)] selection:text-[var(--accent-primary)]">
      {/* Top Editorial Navbar */}
      <header
        className={`sticky top-0 z-50 transition-all duration-200 border-b ${
          scrolled
            ? 'bg-[var(--bg-surface)]/95 backdrop-blur-md border-[var(--border-subtle)] shadow-xs'
            : 'bg-transparent border-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-semibold text-sm">
              LL
            </div>
            <span className="text-base font-semibold tracking-tight text-[var(--text-primary)] font-serif">
              LedgerLine
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[var(--text-secondary)]">
            <a href="#principles" className="hover:text-[var(--text-primary)] transition-colors">
              Principles
            </a>
            <a href="#invariants" className="hover:text-[var(--text-primary)] transition-colors">
              Invariants
            </a>
            <a href="#workflow" className="hover:text-[var(--text-primary)] transition-colors">
              Architecture
            </a>
            <a href="#comparison" className="hover:text-[var(--text-primary)] transition-colors">
              Standards
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subdued)] transition-colors cursor-pointer"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            {isAuthenticated ? (
              <Link to="/app">
                <Button variant="primary" size="sm" icon={ArrowRight}>
                  <span>Open Console</span>
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm">
                    Open Account
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-[var(--text-secondary)]"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-[var(--text-secondary)]"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-4 space-y-3">
            <a
              href="#principles"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-medium text-[var(--text-secondary)]"
            >
              Principles
            </a>
            <a
              href="#invariants"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-medium text-[var(--text-secondary)]"
            >
              Invariants
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-medium text-[var(--text-secondary)]"
            >
              Architecture
            </a>
            <div className="pt-3 border-t border-[var(--border-subtle)] flex gap-2">
              <Link to="/login" className="flex-1">
                <Button variant="secondary" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup" className="flex-1">
                <Button variant="primary" size="sm" className="w-full">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-16 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2">
          <Badge variant="accent" size="sm">
            High-Integrity Financial Core
          </Badge>
        </div>

        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-[var(--text-primary)] max-w-3xl mx-auto leading-[1.12]">
          Clarity in every transaction.
        </h1>

        <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
          LedgerLine is a minimal, double-entry financial accounting platform engineered to eliminate duplicate spending, race conditions, and negative balances through strict mathematical invariants.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/login">
            <Button variant="primary" size="lg" icon={ArrowRight}>
              <span>Enter Workspace</span>
            </Button>
          </Link>
          <a href="#principles">
            <Button variant="outline" size="lg">
              <span>Read Architecture</span>
            </Button>
          </a>
        </div>
      </section>

      {/* Live Journal Representation Preview */}
      <section className="px-4 sm:px-6 max-w-5xl mx-auto pb-20">
        <Card variant="clay" surface="mint" className="overflow-hidden">
          <div className="p-4 border-b border-[var(--border-mint)]/70 bg-[var(--surface-mint)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[var(--status-success)] animate-pulse" />
              <span className="text-xs font-semibold text-[var(--accent-forest)]">
                Live Double-Entry Journal Block Preview
              </span>
            </div>
            <span className="text-[11px] font-mono text-[var(--accent-forest)] font-semibold">
              Conservation: &Sigma; Debits &equiv; &Sigma; Credits (Net: 0 Paise)
            </span>
          </div>

          <div className="p-6 overflow-x-auto bg-[var(--bg-surface)]/70">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--border-mint)]/70 text-[var(--text-secondary)]">
                  <th className="pb-2">Block #</th>
                  <th className="pb-2">Account</th>
                  <th className="pb-2">Kind</th>
                  <th className="pb-2">SHA-256 Link</th>
                  <th className="pb-2 text-right">Debit (p)</th>
                  <th className="pb-2 text-right">Credit (p)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-mint)]/40">
                <tr>
                  <td className="py-3 text-[var(--text-secondary)]">#1049</td>
                  <td className="py-3 font-sans font-medium text-[var(--text-primary)]">
                    Primary Liquidity (#2)
                  </td>
                  <td className="py-3">
                    <Badge variant="mint" size="sm">CREDIT</Badge>
                  </td>
                  <td className="py-3 text-[var(--text-secondary)] text-[11px]">
                    e49b...110 &larr; c83f...456
                  </td>
                  <td className="py-3 text-right text-[var(--text-secondary)]">—</td>
                  <td className="py-3 text-right font-bold text-[var(--status-success)]">
                    250,000
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-[var(--text-secondary)]">#1049</td>
                  <td className="py-3 font-sans font-medium text-[var(--text-primary)]">
                    External Clearing Pool
                  </td>
                  <td className="py-3">
                    <Badge variant="peach" size="sm">DEBIT</Badge>
                  </td>
                  <td className="py-3 text-[var(--text-secondary)] text-[11px]">
                    c83f...456 &larr; 0000...000
                  </td>
                  <td className="py-3 text-right font-bold text-[var(--text-primary)]">
                    250,000
                  </td>
                  <td className="py-3 text-right text-[var(--text-secondary)]">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Foundational Principles */}
      <section id="principles" className="py-16 sm:py-24 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="space-y-2 text-center max-w-2xl mx-auto">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Engineering Disciplines
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
              Designed for financial integrity
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Standard databases trust application code to maintain balances. LedgerLine enforces mathematical invariants directly in the storage engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="clay" surface="mint" hover={true} className="p-6 space-y-3">
              <div className="p-2 w-fit rounded-lg bg-[var(--bg-surface)] text-[var(--accent-forest)] shadow-xs">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Double-Entry Invariant
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Every transaction records equal and offsetting movements. The sum of all accounts across the platform mathematically equals zero. Money cannot be created or lost in transit.
              </p>
            </Card>

            <Card variant="clay" surface="lavender" hover={true} className="p-6 space-y-3">
              <div className="p-2 w-fit rounded-lg bg-[var(--bg-surface)] text-[var(--accent-violet)] shadow-xs">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Deterministic Row Locking
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Multi-account transfers acquire row-level locks in strictly ascending numerical order (<code>ORDER BY id ASC</code>). This completely eliminates deadlocks under high-concurrency transfers.
              </p>
            </Card>

            <Card variant="clay" surface="peach" hover={true} className="p-6 space-y-3">
              <div className="p-2 w-fit rounded-lg bg-[var(--bg-surface)] text-[var(--accent-terracotta)] shadow-xs">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Trigger-Backed Immutability
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Every journal entry is chained to its predecessor via SHA-256 block hashes. PostgreSQL triggers physically reject any <code>UPDATE</code>, <code>DELETE</code>, or <code>TRUNCATE</code> operations.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Transaction Architecture Workflow */}
      <section id="workflow" className="py-16 sm:py-24 border-t border-[var(--border-subtle)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="space-y-2 text-center max-w-2xl mx-auto">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Settlement Lifecycle
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
              Deterministic transaction pipeline
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              How every Rupee moves safely through validation, serialization, and double-entry recording.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="clay" hover={true} className="p-5 space-y-2">
              <span className="text-xs font-mono font-bold text-[var(--accent-primary)]">01</span>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Idempotency Guard</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                UUID v4 key is checked against the database. Replays immediately return cached settlements without executing duplicate debits.
              </p>
            </Card>

            <Card variant="clay" hover={true} className="p-5 space-y-2">
              <span className="text-xs font-mono font-bold text-[var(--accent-primary)]">02</span>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Deterministic Lock</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Row-level locks are obtained using <code>SELECT ... FOR UPDATE</code> in ascending numerical ID sequence, preventing circular deadlocks.
              </p>
            </Card>

            <Card variant="clay" hover={true} className="p-5 space-y-2">
              <span className="text-xs font-mono font-bold text-[var(--accent-primary)]">03</span>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Storage Validation</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                PostgreSQL checks the <code>chk_no_overdraft</code> constraint. If available balance is insufficient, the transaction rolls back cleanly.
              </p>
            </Card>

            <Card variant="clay" hover={true} className="p-5 space-y-2">
              <span className="text-xs font-mono font-bold text-[var(--accent-primary)]">04</span>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Cryptographic Chaining</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Paired debit and credit records are created, linked with a SHA-256 hash to the previous entry, and committed permanently.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className="py-16 sm:py-24 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Traditional Databases vs. LedgerLine
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Why balance mutations should never rely on single-row integer increments.
            </p>
          </div>

          <Card variant="clay" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subdued)] text-[var(--text-secondary)] font-medium">
                    <th className="py-3 px-4">Capability</th>
                    <th className="py-3 px-4">Traditional App</th>
                    <th className="py-3 px-4">LedgerLine Engine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">Money Calculation</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">Floating point floats (rounding drift)</td>
                    <td className="py-3 px-4 font-medium text-[var(--status-success)]">Integer paise (64-bit BigInt)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">Account Mutation</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">Direct SQL <code>UPDATE balance = balance - X</code></td>
                    <td className="py-3 px-4 font-medium text-[var(--status-success)]">Atomic paired double-entry journal rows</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">Negative Balance Defense</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">Application-level <code>if (bal &gt; 0)</code> check</td>
                    <td className="py-3 px-4 font-medium text-[var(--status-success)]">Database-enforced <code>chk_no_overdraft</code></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">History Immutability</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">Rows can be deleted or modified</td>
                    <td className="py-3 px-4 font-medium text-[var(--status-success)]">Trigger-rejected UPDATE, DELETE, TRUNCATE</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] py-12 px-4 sm:px-6 bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-bold text-xs">
              LL
            </div>
            <span className="font-semibold text-[var(--text-primary)]">LedgerLine</span>
            <span>&bull;</span>
            <span>Clarity in every transaction.</span>
          </div>

          <div className="flex items-center gap-5">
            <Link to="/login" className="hover:text-[var(--text-primary)] transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="hover:text-[var(--text-primary)] transition-colors">
              Register
            </Link>
            <a
              href="https://github.com/rupasribakka/LedgerLine"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
