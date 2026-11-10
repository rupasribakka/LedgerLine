import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  Database,
  Link2,
  CheckCircle2,
  Shield,
  Layers,
  Repeat,
  Scale,
  Sparkles,
  Terminal,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  KeyRound,
  FileCheck2,
  AlertOctagon,
  Eye,
  Server,
  Zap,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  GitBranch,
} from 'lucide-react';
import RingOrb from '../components/ui/RingOrb';
import GlowCard from '../components/ui/GlowCard';
import GlowButton from '../components/ui/GlowButton';
import Badge from '../components/ui/Badge';
import BlockchainBackground from '../components/ui/BlockchainBackground';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('hero');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navLinks = [
    { id: 'hero', label: 'Home' },
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'security', label: 'Security' },
    { id: 'about', label: 'About' },
  ];

  const scrollToSection = (e, id) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
      window.history.pushState(null, '', `#${id}`);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);

      const scrollPosition = window.scrollY + 200;
      for (let i = navLinks.length - 1; i >= 0; i--) {
        const id = navLinks[i].id;
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDashboardRedirect = () => {
    if (isAuthenticated) {
      navigate('/app');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#050B18] text-[#F4F8FF] font-sans selection:bg-[#16BFFF]/30 selection:text-[#16BFFF] overflow-x-hidden relative">
      {/* ========================================================================= */}
      {/* 1. TOP STICKY NAVIGATION BAR                                              */}
      {/* ========================================================================= */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#050B18]/90 backdrop-blur-xl border-b border-[rgba(22,191,255,0.18)] py-3 shadow-[0_10px_30px_rgba(5,11,24,0.8)]'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Brand & Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(22,191,255,0.15)] border border-[#16BFFF]/50 text-[#16BFFF] shadow-[0_0_15px_rgba(22,191,255,0.35)] transition-transform group-hover:scale-105">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold font-mono tracking-tight text-[#F4F8FF]">
                BALANCE<span className="text-[#16BFFF]">VAULT</span>
              </span>
              <Badge variant="cyan" size="sm" dot className="hidden sm:inline-flex">
                Secure Ledger
              </Badge>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 rounded-full border border-[rgba(22,191,255,0.16)] bg-[#0A1426]/70 px-4 py-1.5 backdrop-blur-md shadow-inner">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => scrollToSection(e, link.id)}
                  className={`px-3.5 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                    isActive
                      ? 'text-[#16BFFF] bg-[rgba(22,191,255,0.15)] border border-[#16BFFF]/40 shadow-[0_0_12px_rgba(22,191,255,0.25)] font-bold'
                      : 'text-[#9AAEC5] hover:text-[#F4F8FF] hover:bg-[#101E33]'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link to="/login">
              <button className="px-4 py-2 rounded-full text-xs font-mono font-semibold text-[#9AAEC5] hover:text-[#F4F8FF] hover:bg-[#0A1426] transition-colors cursor-pointer border border-transparent hover:border-[rgba(22,191,255,0.2)]">
                Sign In
              </button>
            </Link>

            <Link to="/signup">
              <GlowButton variant="primary" size="sm">
                <span>Get Started</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </GlowButton>
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-[rgba(22,191,255,0.2)] bg-[#0A1426] text-[#9AAEC5] hover:text-[#16BFFF]"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0A1426]/95 border-b border-[rgba(22,191,255,0.2)] backdrop-blur-2xl px-6 py-5 space-y-3 mt-2 shadow-2xl">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => scrollToSection(e, link.id)}
                className="block text-sm font-mono text-[#9AAEC5] hover:text-[#16BFFF] py-1.5"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-[rgba(22,191,255,0.15)] flex flex-col gap-2.5">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full text-center py-2 text-xs font-mono text-[#9AAEC5] border border-[rgba(22,191,255,0.2)] rounded-full hover:text-[#F4F8FF]">
                  Sign In
                </button>
              </Link>
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full text-center py-2 text-xs font-mono font-bold bg-gradient-to-r from-[#16BFFF] to-[#387BFF] text-[#050B18] rounded-full shadow-[0_0_15px_rgba(22,191,255,0.4)]">
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section
        id="hero"
        className="relative min-h-[92vh] flex flex-col justify-center pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
      >
        {/* Animated 3D Isometric Blockchain Background */}
        <BlockchainBackground opacity={0.7} interactive={true} />

        <div className="relative z-10 max-w-7xl w-full mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading, Subhead & Actions */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Category Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(22,191,255,0.3)] bg-[#0A1426]/90 px-4 py-1.5 text-xs font-mono text-[#16BFFF] shadow-[0_0_20px_rgba(22,191,255,0.2)]">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="tracking-wider uppercase font-semibold">
                  Next-Gen Financial Security
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-mono text-[#F4F8FF] leading-[1.12]">
                Your Money Moves.{' '}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#16BFFF] via-[#387BFF] to-[#8B7CFF]">
                  Your Ledger Proves It.
                </span>
              </h1>

              {/* Supporting Description */}
              <p className="text-base sm:text-lg text-[#9AAEC5] max-w-2xl leading-relaxed">
                Experience secure financial transactions with intelligent validation, tamper-evident
                records and transparent accounting built on a trustworthy ledger.
              </p>

              {/* Call to Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link to="/signup">
                  <GlowButton variant="primary" size="lg" className="shadow-lg">
                    <span>Get Started</span>
                    <ArrowRight className="h-4 w-4" />
                  </GlowButton>
                </Link>

                <a href="#security" onClick={(e) => scrollToSection(e, 'security')}>
                  <GlowButton variant="secondary" size="lg">
                    <Shield className="h-4 w-4 text-[#16BFFF]" />
                    <span>Explore Security</span>
                  </GlowButton>
                </a>
              </div>

              {/* Three Feature Indicators */}
              <div className="pt-8 border-t border-[rgba(22,191,255,0.15)] grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-[rgba(22,191,255,0.12)] border border-[#16BFFF]/30 flex items-center justify-center text-[#16BFFF] shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#F4F8FF] font-mono">Secure Records</p>
                    <p className="text-[11px] text-[#9AAEC5]">Append-only log</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-[rgba(56,123,255,0.12)] border border-[#387BFF]/30 flex items-center justify-center text-[#387BFF] shrink-0">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#F4F8FF] font-mono">Protected Access</p>
                    <p className="text-[11px] text-[#9AAEC5]">Role clearances</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-[rgba(139,124,255,0.12)] border border-[#8B7CFF]/30 flex items-center justify-center text-[#8B7CFF] shrink-0">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#F4F8FF] font-mono">Verified Transfers</p>
                    <p className="text-[11px] text-[#9AAEC5]">Hash-chain proofs</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Futuristic Security Illustration / Live State Machine Demo */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md rounded-3xl border border-[#16BFFF]/35 bg-[#0A1426]/90 p-6 sm:p-7 backdrop-blur-2xl shadow-[0_0_50px_rgba(22,191,255,0.18)]">
                {/* Header demonstration pill */}
                <div className="flex items-center justify-between pb-4 border-b border-[rgba(22,191,255,0.15)] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-[#16BFFF] animate-ping" />
                    <span className="text-[11px] font-mono uppercase text-[#16BFFF] font-bold">
                      DEMONSTRATION // JOURNAL #1048
                    </span>
                  </div>
                  <Badge variant="cyan" size="sm">
                    COMMITTED
                  </Badge>
                </div>

                {/* Simulated Ledger Journal */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between text-[#9AAEC5]">
                    <span>Source Account:</span>
                    <span className="text-[#F4F8FF] font-semibold">Account #0002 (Holder 1)</span>
                  </div>
                  <div className="flex justify-between text-[#9AAEC5]">
                    <span>Destination Account:</span>
                    <span className="text-[#F4F8FF] font-semibold">Account #0003 (Holder 2)</span>
                  </div>

                  {/* Debit / Credit Box */}
                  <div className="rounded-xl border border-[rgba(22,191,255,0.18)] bg-[#050B18] p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[#FF5B7A]">
                      <span className="flex items-center gap-1.5">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span>DEBIT Acc #2:</span>
                      </span>
                      <span className="font-bold">-₹500.00 (-50,000 paise)</span>
                    </div>

                    <div className="flex items-center justify-between text-[#16BFFF]">
                      <span className="flex items-center gap-1.5">
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                        <span>CREDIT Acc #3:</span>
                      </span>
                      <span className="font-bold">+₹500.00 (+50,000 paise)</span>
                    </div>

                    <div className="pt-2 border-t border-[rgba(22,191,255,0.12)] flex items-center justify-between text-[11px]">
                      <span className="text-[#9AAEC5]">Invariant Discrepancy (Δ):</span>
                      <span className="text-[#16BFFF] font-bold">0 PAISE (PERFECT)</span>
                    </div>
                  </div>

                  {/* Hash continuity */}
                  <div className="pt-1 text-[11px] text-[#9AAEC5] space-y-1">
                    <div className="flex justify-between">
                      <span>PREV HASH:</span>
                      <span className="text-[#8B7CFF]">4e9b27a1...8a01f92e</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BLOCK HASH:</span>
                      <span className="text-[#16BFFF]">f71c48e3...e392b410</span>
                    </div>
                  </div>
                </div>

                {/* Subtitle disclaimer */}
                <p className="mt-4 pt-3 border-t border-[rgba(22,191,255,0.12)] text-[10px] text-[#9AAEC5] text-center font-mono">
                  Illustrative layout concept, not live application account data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FEATURES SECTION                                                       */}
      {/* ========================================================================= */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <Badge variant="cyan" size="sm" className="mb-2">
            CORE CAPABILITIES
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-mono text-[#F4F8FF] tracking-tight">
            Everything Your Money Movement Needs.
          </h2>
          <p className="text-sm sm:text-base text-[#9AAEC5] leading-relaxed">
            Constructed with rigorous mathematical precision, cryptographic hash chains, and database
            invariants.
          </p>
        </div>

        {/* 6 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <GlowCard className="p-7 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-[rgba(22,191,255,0.12)] border border-[#16BFFF]/35 flex items-center justify-center text-[#16BFFF] shadow-[0_0_15px_rgba(22,191,255,0.25)]">
              <Scale className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-mono text-[#F4F8FF]">Double-Entry Accounting</h3>
            <p className="text-xs sm:text-sm text-[#9AAEC5] leading-relaxed">
              Every transaction is recorded with balanced debit and credit entries. Money cannot be
              created or destroyed in transit.
            </p>
            <div className="pt-2 text-[11px] font-mono text-[#16BFFF] flex items-center gap-1.5">
              <span>Σ Debits + Credits ≡ 0</span>
            </div>
          </GlowCard>

          {/* Card 2 */}
          <GlowCard className="p-7 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-[rgba(56,123,255,0.12)] border border-[#387BFF]/35 flex items-center justify-center text-[#387BFF] shadow-[0_0_15px_rgba(56,123,255,0.25)]">
              <Repeat className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-mono text-[#F4F8FF]">Duplicate Payment Protection</h3>
            <p className="text-xs sm:text-sm text-[#9AAEC5] leading-relaxed">
              Prevent repeated transactions when requests are retried. Robust UUID v4 idempotency keys
              guarantee exactly-once execution.
            </p>
            <div className="pt-2 text-[11px] font-mono text-[#387BFF] flex items-center gap-1.5">
              <span>Idempotency-Key Header</span>
            </div>
          </GlowCard>

          {/* Card 3 */}
          <GlowCard className="p-7 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-[rgba(139,124,255,0.12)] border border-[#8B7CFF]/35 flex items-center justify-center text-[#8B7CFF] shadow-[0_0_15px_rgba(139,124,255,0.25)]">
              <Link2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-mono text-[#F4F8FF]">Tamper-Evident Ledger</h3>
            <p className="text-xs sm:text-sm text-[#9AAEC5] leading-relaxed">
              Cryptographic hash chains help detect changes to recorded transactions. Every entry binds
              to its predecessor via SHA-256.
            </p>
            <div className="pt-2 text-[11px] font-mono text-[#8B7CFF] flex items-center gap-1.5">
              <span>Continuous Hash Proof</span>
            </div>
          </GlowCard>

          {/* Card 4 */}
          <GlowCard className="p-7 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-[rgba(22,191,255,0.12)] border border-[#16BFFF]/35 flex items-center justify-center text-[#16BFFF] shadow-[0_0_15px_rgba(22,191,255,0.25)]">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-mono text-[#F4F8FF]">
              Concurrent Transaction Protection
            </h3>
            <p className="text-xs sm:text-sm text-[#9AAEC5] leading-relaxed">
              Protect account balances during simultaneous withdrawals using deterministic ascending
              row locks to eliminate deadlocks.
            </p>
            <div className="pt-2 text-[11px] font-mono text-[#16BFFF] flex items-center gap-1.5">
              <span>ORDER BY id ASC FOR UPDATE</span>
            </div>
          </GlowCard>

          {/* Card 5 */}
          <GlowCard className="p-7 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-[rgba(56,123,255,0.12)] border border-[#387BFF]/35 flex items-center justify-center text-[#387BFF] shadow-[0_0_15px_rgba(56,123,255,0.25)]">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-mono text-[#F4F8FF]">Role-Based Access</h3>
            <p className="text-xs sm:text-sm text-[#9AAEC5] leading-relaxed">
              Give each user access only to permitted operations. Holders transact, auditors verify,
              and administrators oversee.
            </p>
            <div className="pt-2 text-[11px] font-mono text-[#387BFF] flex items-center gap-1.5">
              <span>Tiered Authorization Gates</span>
            </div>
          </GlowCard>

          {/* Card 6 */}
          <GlowCard className="p-7 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-[rgba(139,124,255,0.12)] border border-[#8B7CFF]/35 flex items-center justify-center text-[#8B7CFF] shadow-[0_0_15px_rgba(139,124,255,0.25)]">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-mono text-[#F4F8FF]">Audit Transparency</h3>
            <p className="text-xs sm:text-sm text-[#9AAEC5] leading-relaxed">
              Maintain traceable transaction and security records. SQL triggers strictly reject any
              UPDATE or DELETE on audit logs.
            </p>
            <div className="pt-2 text-[11px] font-mono text-[#8B7CFF] flex items-center gap-1.5">
              <span>Append-Only Triggers</span>
            </div>
          </GlowCard>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. HOW IT WORKS SECTION                                                   */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <Badge variant="blue" size="sm" className="mb-2">
            TRANSACTION LIFECYCLE
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-mono text-[#F4F8FF] tracking-tight">
            Simple Transactions. Strong Protection.
          </h2>
          <p className="text-sm sm:text-base text-[#9AAEC5] leading-relaxed">
            Every movement follows a strict six-stage cryptographic state machine pipeline.
          </p>
        </div>

        {/* 6 Connected Steps Workflow */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-16">
          {[
            {
              num: '01',
              title: 'Authentication',
              desc: 'Bearer JWT token validated with real-time clearance check.',
              icon: KeyRound,
            },
            {
              num: '02',
              title: 'Transaction Request',
              desc: 'Client sends payload with unique UUID v4 Idempotency-Key.',
              icon: Zap,
            },
            {
              num: '03',
              title: 'Validation & Locks',
              desc: 'Ascending row locks acquired; non-negative balances verified.',
              icon: Lock,
            },
            {
              num: '04',
              title: 'Double-Entry Posting',
              desc: 'Balanced debit and credit entries written in integer paise.',
              icon: Scale,
            },
            {
              num: '05',
              title: 'Hash Continuity',
              desc: 'SHA-256 fingerprint generated binding to previous block.',
              icon: Link2,
            },
            {
              num: '06',
              title: 'Confirmation',
              desc: 'ACID commit finalized, replay cache stored, proof returned.',
              icon: CheckCircle2,
            },
          ].map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative rounded-2xl border border-[rgba(22,191,255,0.18)] bg-[#0A1426]/80 p-5 flex flex-col justify-between hover:border-[#16BFFF]/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-[#16BFFF] bg-[rgba(22,191,255,0.12)] px-2.5 py-0.5 rounded-full border border-[#16BFFF]/30">
                      {step.num}
                    </span>
                    <Icon className="h-4 w-4 text-[#9AAEC5]" />
                  </div>
                  <h4 className="text-sm font-bold font-mono text-[#F4F8FF] mb-2">{step.title}</h4>
                  <p className="text-xs text-[#9AAEC5] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Transfer Validation Diagram */}
        <div className="rounded-3xl border border-[rgba(22,191,255,0.22)] bg-[#0A1426]/90 p-8 sm:p-10 backdrop-blur-xl">
          <div className="text-center mb-8">
            <h3 className="text-lg font-bold font-mono text-[#F4F8FF]">
              Zero-Sum Balance Conservation Workflow
            </h3>
            <p className="text-xs text-[#9AAEC5] mt-1">
              Sender Account → Transfer Validation → Receiver Account
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Sender */}
            <div className="rounded-2xl border border-[rgba(255,91,122,0.3)] bg-[#050B18] p-5 text-center space-y-2">
              <span className="text-[11px] font-mono uppercase text-[#FF5B7A] font-bold">
                Sender Account
              </span>
              <p className="text-sm font-bold font-mono text-[#F4F8FF]">Account #0002</p>
              <div className="text-xs font-mono text-[#FF5B7A] bg-[rgba(255,91,122,0.1)] py-1.5 px-3 rounded-lg">
                DEBIT -₹500.00
              </div>
              <p className="text-[10px] text-[#9AAEC5]">Balance check: balance_paise ≥ 0</p>
            </div>

            {/* Middle Validation */}
            <div className="rounded-2xl border border-[#16BFFF]/40 bg-[#101E33] p-5 text-center space-y-2.5 shadow-[0_0_25px_rgba(22,191,255,0.15)]">
              <span className="text-[11px] font-mono uppercase text-[#16BFFF] font-bold">
                Atomic Ledger Engine
              </span>
              <p className="text-xs font-mono text-[#F4F8FF]">ORDER BY id ASC FOR UPDATE</p>
              <div className="text-xs font-mono text-[#16BFFF] bg-[rgba(22,191,255,0.12)] py-1.5 px-3 rounded-lg font-bold">
                Σ DEBITS + CREDITS ≡ 0 PAISE
              </div>
              <p className="text-[10px] text-[#9AAEC5]">ACID Transaction Isolation</p>
            </div>

            {/* Receiver */}
            <div className="rounded-2xl border border-[rgba(22,191,255,0.3)] bg-[#050B18] p-5 text-center space-y-2">
              <span className="text-[11px] font-mono uppercase text-[#16BFFF] font-bold">
                Receiver Account
              </span>
              <p className="text-sm font-bold font-mono text-[#F4F8FF]">Account #0003</p>
              <div className="text-xs font-mono text-[#16BFFF] bg-[rgba(22,191,255,0.1)] py-1.5 px-3 rounded-lg">
                CREDIT +₹500.00
              </div>
              <p className="text-[10px] text-[#9AAEC5]">Immediately available in destination</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SECURITY SECTION                                                       */}
      {/* ========================================================================= */}
      <section id="security" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <Badge variant="purple" size="sm" className="mb-2">
            ZERO-TRUST SECURITY
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-mono text-[#F4F8FF] tracking-tight">
            Security Is Built Into Every Transaction.
          </h2>
          <p className="text-sm sm:text-base text-[#9AAEC5] leading-relaxed">
            Real backend enforcement verified by database triggers, rate limiting, and cryptographic
            proofs.
          </p>
        </div>

        {/* 8 Security Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {[
            {
              title: 'JWT Authentication',
              desc: 'HMAC-SHA256 signed tokens with client-side header delivery and session clearing on 401.',
              icon: KeyRound,
            },
            {
              title: 'Role-Based Permissions',
              desc: 'Enforces strict separation between Holder, Auditor, and Admin clearances on every request.',
              icon: Shield,
            },
            {
              title: 'Password Protection',
              desc: 'Cryptographic bcrypt salting with 10 rounds. Passwords are never stored in plaintext.',
              icon: Lock,
            },
            {
              title: 'Idempotency Protection',
              desc: 'UUID v4 header matching and canonical hashing prevents accidental double-charging.',
              icon: Repeat,
            },
            {
              title: 'Ledger Hash Verification',
              desc: 'Continuous SHA-256 block hash verification ensures no entry has been retroactively altered.',
              icon: Link2,
            },
            {
              title: 'Database Transaction Safety',
              desc: 'Pessimistic row locking in ascending order serializes concurrent transfers with zero deadlocks.',
              icon: Database,
            },
            {
              title: 'Immutable Records',
              desc: 'PostgreSQL triggers raise SQL exceptions blocking any UPDATE, DELETE, or TRUNCATE on ledger entries.',
              icon: AlertOctagon,
            },
            {
              title: 'Audit Logging',
              desc: 'Comprehensive append-only security logs capture authentication failures and administrative actions.',
              icon: FileCheck2,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-[rgba(22,191,255,0.18)] bg-[#0A1426]/85 p-5 space-y-3 hover:border-[#16BFFF]/40 transition-colors"
              >
                <div className="h-9 w-9 rounded-xl bg-[rgba(22,191,255,0.12)] border border-[#16BFFF]/30 flex items-center justify-center text-[#16BFFF]">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <h4 className="text-sm font-bold font-mono text-[#F4F8FF]">{item.title}</h4>
                <p className="text-xs text-[#9AAEC5] leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Cryptographic Architecture Note */}
        <div className="rounded-2xl border border-[rgba(22,191,255,0.2)] bg-[#050B18] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-mono font-bold text-[#16BFFF]">VERIFIED ARCHITECTURAL MODEL</p>
            <p className="text-xs text-[#9AAEC5] leading-relaxed max-w-2xl">
              BalanceVault operates on a secure centralized double-entry ledger architecture featuring
              cryptographic integrity mechanisms. It preserves financial precision without introducing
              unnecessary blockchain decentralization or smart contract latency.
            </p>
          </div>
          <Link to="/signup" className="shrink-0">
            <GlowButton variant="secondary" size="sm">
              <span>View Audit Specs</span>
            </GlowButton>
          </Link>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. DASHBOARD PREVIEW SECTION                                              */}
      {/* ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <Badge variant="cyan" size="sm" className="mb-2">
            OPERATIONAL CONSOLE
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-mono text-[#F4F8FF] tracking-tight">
            One Platform. Different Roles.
          </h2>
          <p className="text-sm sm:text-base text-[#9AAEC5] leading-relaxed">
            Tailored, high-clarity operational views for account holders, compliance auditors, and system
            administrators.
          </p>
        </div>

        {/* Two Preview Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Preview 1: Account Holder */}
          <div className="rounded-3xl border border-[rgba(22,191,255,0.22)] bg-[#0A1426]/90 p-7 space-y-5 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-[rgba(22,191,255,0.15)] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#16BFFF] font-bold">
                  CLEARANCE: ACCOUNT HOLDER
                </span>
                <h3 className="text-base font-bold font-mono text-[#F4F8FF]">Customer Banking Console</h3>
              </div>
              <Badge variant="cyan" size="sm">
                PREVIEW
              </Badge>
            </div>

            {/* Simulated Balance Box */}
            <div className="rounded-2xl border border-[rgba(22,191,255,0.18)] bg-[#050B18] p-5 space-y-2">
              <span className="text-xs text-[#9AAEC5] font-mono">Available Primary Balance</span>
              <p className="text-3xl font-extrabold font-mono text-[#F4F8FF]">₹4,500.00</p>
              <div className="flex gap-2 pt-2">
                <span className="text-[11px] font-mono bg-[rgba(22,191,255,0.12)] text-[#16BFFF] px-2.5 py-0.5 rounded-full border border-[#16BFFF]/25">
                  Deposit
                </span>
                <span className="text-[11px] font-mono bg-[rgba(56,123,255,0.12)] text-[#387BFF] px-2.5 py-0.5 rounded-full border border-[#387BFF]/25">
                  Withdraw
                </span>
                <span className="text-[11px] font-mono bg-[rgba(139,124,255,0.12)] text-[#8B7CFF] px-2.5 py-0.5 rounded-full border border-[#8B7CFF]/25">
                  Transfer Money
                </span>
              </div>
            </div>

            {/* Feature List */}
            <ul className="text-xs text-[#9AAEC5] space-y-2 font-mono">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#16BFFF]" />
                <span>Instant atomic fund transfers to other accounts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#16BFFF]" />
                <span>Real-time running statement with debit/credit breakdown</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#16BFFF]" />
                <span>Zero overdraft enforcement guaranteed at database layer</span>
              </li>
            </ul>
          </div>

          {/* Preview 2: Admin & Auditor */}
          <div className="rounded-3xl border border-[rgba(56,123,255,0.22)] bg-[#0A1426]/90 p-7 space-y-5 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-[rgba(22,191,255,0.15)] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#387BFF] font-bold">
                  CLEARANCE: ADMIN / AUDITOR
                </span>
                <h3 className="text-base font-bold font-mono text-[#F4F8FF]">
                  Compliance & Root Oversight
                </h3>
              </div>
              <Badge variant="blue" size="sm">
                PREVIEW
              </Badge>
            </div>

            {/* Simulated Integrity Box */}
            <div className="rounded-2xl border border-[rgba(56,123,255,0.18)] bg-[#050B18] p-5 space-y-2">
              <span className="text-xs text-[#9AAEC5] font-mono">Ledger Cryptographic Integrity</span>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-extrabold font-mono text-[#16BFFF]">100% VERIFIED</p>
                <span className="text-xs font-mono text-[#9AAEC5]">0 BROKEN BLOCKS</span>
              </div>
              <div className="flex gap-2 pt-2">
                <span className="text-[11px] font-mono bg-[rgba(22,191,255,0.12)] text-[#16BFFF] px-2.5 py-0.5 rounded-full border border-[#16BFFF]/25">
                  Verify Hash Chain
                </span>
                <span className="text-[11px] font-mono bg-[rgba(56,123,255,0.12)] text-[#387BFF] px-2.5 py-0.5 rounded-full border border-[#387BFF]/25">
                  Duplicate Tracker
                </span>
                <span className="text-[11px] font-mono bg-[rgba(139,124,255,0.12)] text-[#8B7CFF] px-2.5 py-0.5 rounded-full border border-[#8B7CFF]/25">
                  Attack Lab
                </span>
              </div>
            </div>

            {/* Feature List */}
            <ul className="text-xs text-[#9AAEC5] space-y-2 font-mono">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#387BFF]" />
                <span>Inspect all global accounts and freeze/activate statuses</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#387BFF]" />
                <span>Read-only cryptographic proofs without financial modification</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#387BFF]" />
                <span>Live detection of replayed idempotency keys & attack attempts</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Central Access Button */}
        <div className="text-center">
          <button
            onClick={handleDashboardRedirect}
            className="px-8 py-3.5 rounded-full font-mono text-sm font-bold bg-gradient-to-r from-[#16BFFF] via-[#387BFF] to-[#8B7CFF] text-[#050B18] shadow-[0_0_25px_rgba(22,191,255,0.4)] hover:shadow-[0_0_35px_rgba(22,191,255,0.7)] transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            Access Your Dashboard
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. ABOUT SECTION                                                          */}
      {/* ========================================================================= */}
      <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <Badge variant="cyan" size="sm">
              ENGINE OBJECTIVES
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-mono text-[#F4F8FF] tracking-tight">
              Building Trust in Every Financial Record.
            </h2>
            <p className="text-sm sm:text-base text-[#9AAEC5] leading-relaxed">
              Traditional financial backends frequently suffer from concurrency race conditions, accidental
              double debits, silent rounding errors, and opaque database mutations.
            </p>
            <p className="text-sm sm:text-base text-[#9AAEC5] leading-relaxed">
              BalanceVault was engineered specifically to solve these vulnerabilities with zero compromise,
              enforcing double-entry balance conservation ($\sum \equiv 0$), append-only triggers, and
              tamper-evident SHA-256 chain links.
            </p>
          </div>

          {/* Vulnerability vs Solution Checklist */}
          <div className="lg:col-span-6 space-y-3 font-mono text-xs">
            {[
              {
                problem: 'Duplicate financial requests on network retry',
                solution: 'Enforced UUID v4 Idempotency-Key caching with 24-hr TTL',
              },
              {
                problem: 'Unbalanced ledger entries & money creation',
                solution: 'Double-entry balance constraint (sum of credits equals debits)',
              },
              {
                problem: 'Concurrent withdrawal double-spend risks',
                solution: 'ORDER BY id ASC FOR UPDATE row serialization',
              },
              {
                problem: 'Unauthorized administrative role tampering',
                solution: 'Real-time database clearance check per authenticated request',
              },
              {
                problem: 'Undetected retroactive ledger record tampering',
                solution: 'SHA-256 hash chaining with append-only SQL triggers',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[rgba(22,191,255,0.18)] bg-[#0A1426] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="text-[#9AAEC5] flex items-center gap-2">
                  <span className="text-[#FF5B7A]">✕</span>
                  <span>{item.problem}</span>
                </div>
                <div className="text-[#16BFFF] flex items-center gap-2 font-bold sm:text-right shrink-0">
                  <span>✓</span>
                  <span>{item.solution}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FINAL CALL TO ACTION                                                   */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto relative z-10 text-center">
        <div className="rounded-3xl border border-[#16BFFF]/35 bg-gradient-to-b from-[#0A1426] to-[#050B18] p-10 sm:p-14 shadow-[0_0_50px_rgba(22,191,255,0.18)] space-y-6">
          <Badge variant="cyan" size="sm">
            GET STARTED TODAY
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-mono text-[#F4F8FF] tracking-tight">
            Make Every Transaction Count.
          </h2>
          <p className="text-sm sm:text-base text-[#9AAEC5] max-w-xl mx-auto leading-relaxed">
            Start using a financial platform where every movement is recorded and every ledger matters.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/signup">
              <GlowButton variant="primary" size="lg">
                <span>Create Account</span>
                <ArrowRight className="h-4 w-4" />
              </GlowButton>
            </Link>

            <Link to="/login">
              <GlowButton variant="secondary" size="lg">
                <span>Sign In</span>
              </GlowButton>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="border-t border-[rgba(22,191,255,0.16)] bg-[#050B18] py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[rgba(22,191,255,0.15)] border border-[#16BFFF]/50 text-[#16BFFF]">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-base font-bold font-mono tracking-tight text-[#F4F8FF]">
                BALANCE<span className="text-[#16BFFF]">VAULT</span>
              </span>
              <p className="text-[11px] text-[#9AAEC5]">
                Secure financial transactions & transparent double-entry accounting.
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-[#9AAEC5]">
            <a href="#hero" onClick={(e) => scrollToSection(e, 'hero')} className="hover:text-[#16BFFF]">
              Home
            </a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-[#16BFFF]">
              Features
            </a>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="hover:text-[#16BFFF]">
              How It Works
            </a>
            <a href="#security" onClick={(e) => scrollToSection(e, 'security')} className="hover:text-[#16BFFF]">
              Security
            </a>
            <a href="#about" onClick={(e) => scrollToSection(e, 'about')} className="hover:text-[#16BFFF]">
              About
            </a>
            <Link to="/login" className="hover:text-[#16BFFF]">
              Sign In
            </Link>
            <a
              href="https://github.com/rupasribakka/LedgerLine"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[#16BFFF] hover:underline"
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[rgba(22,191,255,0.1)] text-center text-[11px] text-[#9AAEC5] font-mono">
          &copy; {new Date().getFullYear()} BalanceVault. LedgerLine Financial Integrity Core.
        </div>
      </footer>
    </div>
  );
}
