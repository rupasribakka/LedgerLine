import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import RingOrb from '../components/ui/RingOrb';
import GlowCard from '../components/ui/GlowCard';
import GlowButton from '../components/ui/GlowButton';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('exactly-once');
  const [activeSection, setActiveSection] = useState('invariants');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [beamAngle, setBeamAngle] = useState(0);

  const navLinks = [
    { id: 'invariants', label: 'Invariants' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'security', label: 'Security' },
  ];

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
      window.history.pushState(null, '', `#${id}`);
    }
  };

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
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
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    const isTouch =
      window.matchMedia('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (isTouch || prefersReducedMotion) return;

    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const normX = (e.clientX - innerWidth / 2) / (innerWidth / 2);
      const normY = (e.clientY - innerHeight / 2) / (innerHeight / 2);

      // Card tilt: perspective, max 8 degrees
      const rotX = Math.max(-8, Math.min(8, -normY * 8));
      const rotY = Math.max(-8, Math.min(8, normX * 8));

      // Beam angle follow
      const beamRot = Math.max(-6, Math.min(6, normX * 5));

      setTilt({ x: rotX, y: rotY });
      setBeamAngle(beamRot);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#020605] text-[#eafff5] font-sans selection:bg-[#2dff9a]/30 selection:text-[#2dff9a] overflow-x-hidden">
      {/* 1. Floating Glass Pill Nav */}
      <div className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto flex items-center justify-between gap-3 sm:gap-6 rounded-full border border-[rgba(60,255,160,0.22)] bg-[#07110d]/80 px-4 sm:px-6 py-2.5 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.7)] max-w-4xl w-full">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[rgba(45,255,154,0.18)] border border-[#2dff9a]/50 text-[#2dff9a] shadow-[0_0_12px_rgba(45,255,154,0.3)] transition-transform group-hover:scale-105">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono tracking-tight text-[#eafff5]">
                Balance<span className="text-[#2dff9a]">Vault</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-wider text-[#7ea594] border-l border-[rgba(60,255,160,0.25)] pl-2">
                LedgerLine
              </span>
            </div>
          </Link>

          {/* Links */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-mono">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => scrollToSection(e, link.id)}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    isActive
                      ? 'text-[#2dff9a] bg-[rgba(45,255,154,0.14)] border border-[#2dff9a]/40 shadow-[0_0_12px_rgba(45,255,154,0.25)] font-bold'
                      : 'text-[#9abfb0] hover:text-[#eafff5] hover:bg-[#07110d]'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </div>

          {/* Auth Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login">
              <button className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold text-[#7ea594] hover:text-[#eafff5] transition-colors cursor-pointer">
                Sign in
              </button>
            </Link>

            <Link to="/signup">
              <button className="px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-mono font-bold bg-[#2dff9a] text-[#020605] hover:bg-[#3affab] shadow-[0_0_15px_rgba(45,255,154,0.35)] transition-all cursor-pointer">
                Create account
              </button>
            </Link>
          </div>
        </nav>
      </div>

      {/* 2. Hero Section: Light Beam, Horizon Line, Split Headline & Centered Glass Card */}
      <section className="relative min-h-[92vh] flex flex-col justify-center items-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Top Light Source Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[radial-gradient(ellipse_at_top,rgba(45,255,154,0.35)_0%,rgba(45,255,154,0.08)_50%,transparent_80%)] blur-2xl pointer-events-none" />

        {/* Light Beam Coming Down From the Top */}
        <div
          className="beam-container absolute top-0 left-1/2 w-[540px] sm:w-[720px] h-[550px] pointer-events-none z-0 transition-transform duration-100 ease-out will-change-transform"
          style={{
            background:
              'conic-gradient(from 180deg at 50% 0%, transparent 68deg, rgba(45, 255, 154, 0.22) 88deg, rgba(45, 255, 154, 0.35) 90deg, rgba(45, 255, 154, 0.22) 92deg, transparent 112deg)',
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            filter: 'blur(1px)',
            opacity: 0.85,
            transform: `translateX(-50%) rotate(${beamAngle}deg)`,
            transformOrigin: 'top center',
          }}
        />

        {/* Glowing Horizon Line */}
        <div className="absolute top-[480px] sm:top-[500px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#2dff9a] to-transparent shadow-[0_0_25px_#2dff9a] opacity-80 pointer-events-none z-10" />
        <div className="absolute top-[480px] sm:top-[500px] left-1/2 -translate-x-1/2 w-[500px] h-[30px] bg-[radial-gradient(ellipse,rgba(45,255,154,0.3)_0%,transparent_70%)] blur-lg pointer-events-none z-10" />

        {/* Hero Content Container */}
        <div className="relative z-20 max-w-7xl w-full mx-auto">
          {/* Top Invariant Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(60,255,160,0.25)] bg-[#07110d]/90 px-4 py-1.5 text-xs font-mono text-[#2dff9a] shadow-[0_0_20px_rgba(45,255,154,0.2)]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>BalanceVault // Powered by LedgerLine Invariant Core</span>
            </div>
          </div>

          {/* Split Headline on Both Sides of the Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Headline Column with Mask Reveal */}
            <div className="lg:col-span-3 text-center lg:text-right space-y-3">
              <div className="overflow-hidden">
                <h1 className="headline-reveal text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-mono text-[#eafff5] leading-[1.08]">
                  Money moves once.
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#7ea594] font-mono leading-relaxed">
                Atomic state machine with integer paise precision and row locks.
              </p>
            </div>

            {/* Centred Glass Card Rising Out of the Beam with Tilt */}
            <div className="lg:col-span-6 flex justify-center">
              <div
                className="hero-ledger-card relative w-full max-w-md rounded-3xl border border-[#2dff9a]/40 bg-[#06140c]/85 p-6 sm:p-7 backdrop-blur-2xl shadow-[0_0_60px_rgba(45,255,154,0.22)] transition-transform duration-150 ease-out will-change-transform"
                style={{
                  transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                }}
              >
                {/* Glow ring around card */}
                <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-[#2dff9a]/30 via-transparent to-[#2dff9a]/10 -z-10 blur-sm" />

                {/* Card Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-[rgba(60,255,160,0.14)]">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-[rgba(45,255,154,0.2)] border border-[#2dff9a]/50 text-[10px] font-mono font-bold text-[#2dff9a] shadow-[0_0_10px_rgba(45,255,154,0.25)]">
                      Example
                    </span>
                    <span className="text-xs font-mono font-bold text-[#eafff5]">
                      JOURNAL BLOCK #1048
                    </span>
                  </div>

                  <Badge variant="emerald" size="sm" dot>
                    COMMITTED
                  </Badge>
                </div>

                {/* Ledger Transfer Representation */}
                <div className="py-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#7ea594]">Source Account</span>
                    <span className="text-[#eafff5] font-semibold">Account #0002 (Holder 1)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#7ea594]">Destination Account</span>
                    <span className="text-[#eafff5] font-semibold">Account #0003 (Holder 2)</span>
                  </div>

                  {/* Balanced Double-Entry Table */}
                  <div className="rounded-xl border border-[rgba(60,255,160,0.15)] bg-[#020704] p-3 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-[#ff5d7a]">
                      <span className="flex items-center gap-1.5">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        DEBIT Acc #2:
                      </span>
                      <span>-₹500.00 (-50,000 paise)</span>
                    </div>
                    <div className="flex items-center justify-between text-[#2dff9a]">
                      <span className="flex items-center gap-1.5">
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                        CREDIT Acc #3:
                      </span>
                      <span>+₹500.00 (+50,000 paise)</span>
                    </div>
                    <div className="pt-2 border-t border-[rgba(60,255,160,0.1)] flex items-center justify-between text-[11px] text-[#7ea594]">
                      <span>Discrepancy Invariant (Δ):</span>
                      <span className="text-[#2dff9a] font-bold">0 PAISE</span>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Linkage Hash */}
                <div className="pt-3 border-t border-[rgba(60,255,160,0.12)] space-y-1.5 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-[#7ea594]">
                    <span>PREV_HASH:</span>
                    <span className="select-all">4e9b27a1...8a01f92e</span>
                  </div>
                  <div className="flex items-center justify-between text-[#2dff9a]">
                    <span>BLOCK_HASH:</span>
                    <span className="select-all font-semibold">f71c48e3...e392b410</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Headline Column with Mask Reveal */}
            <div className="lg:col-span-3 text-center lg:text-left space-y-3">
              <div className="overflow-hidden">
                <h1 className="headline-reveal text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#2dff9a] via-[#52ffab] to-[#eafff5] leading-[1.08]">
                  The ledger remembers.
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#7ea594] font-mono leading-relaxed">
                Cryptographic SHA-256 hash chains with trigger-enforced immutability.
              </p>
            </div>
          </div>

          {/* Glowing Pill Button & Four Invariant Pills */}
          <div className="mt-12 flex flex-col items-center space-y-6">
            {/* Glowing Pill Button: Open the console */}
            <Link to={isAuthenticated ? '/app' : '/login'}>
              <button
                data-magnetic="true"
                className="group relative inline-flex items-center gap-3 rounded-full border border-[#2dff9a] bg-gradient-to-r from-[#0d3822] via-[#104b2e] to-[#0d3822] px-8 py-3.5 text-sm sm:text-base font-mono font-bold text-[#eafff5] shadow-[0_0_35px_rgba(45,255,154,0.4)] hover:shadow-[0_0_50px_rgba(45,255,154,0.65)] hover:scale-105 transition-all duration-300 cursor-pointer"
              >
                <span>Open the console</span>
                <ArrowRight className="h-4 w-4 text-[#2dff9a] transition-transform group-hover:translate-x-1" />
              </button>
            </Link>

            {/* Below it four pills */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
              {[
                'Exactly once',
                'No overdraft',
                'Append-only',
                'Role checks',
              ].map((pill) => (
                <div
                  key={pill}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(60,255,160,0.22)] bg-[#07110d]/90 px-4 py-1.5 text-xs font-mono font-semibold text-[#eafff5] shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2dff9a] shadow-[0_0_6px_#2dff9a]" />
                  <span>{pill}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section: Real System Invariants (No invented numbers) */}
      <section id="invariants" className="py-20 border-t border-[rgba(60,255,160,0.12)] bg-[#030906] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="emerald" size="sm" className="mb-2">
              REAL BACKEND INVARIANTS
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-[#eafff5]">
              Enforced by Database Constraints
            </h2>
            <p className="text-sm text-[#7ea594] mt-2">
              Every balance modification is governed by real PostgreSQL rules. No invented statistics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <GlowCard className="p-6 space-y-3 border-[rgba(60,255,160,0.15)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(45,255,154,0.15)] border border-[#2dff9a]/40 text-[#2dff9a]">
                  <Repeat className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold font-mono text-[#eafff5]">
                  Exactly Once
                </h3>
              </div>
              <p className="text-xs text-[#7ea594] leading-relaxed">
                UUID v4 <code className="text-[#2dff9a]">Idempotency-Key</code> header with canonical request payload hashing. Duplicate requests return cached responses with zero duplicate debits.
              </p>
            </GlowCard>

            <GlowCard className="p-6 space-y-3 border-[rgba(60,255,160,0.15)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(45,255,154,0.15)] border border-[#2dff9a]/40 text-[#2dff9a]">
                  <Scale className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold font-mono text-[#eafff5]">
                  No Overdraft
                </h3>
              </div>
              <p className="text-xs text-[#7ea594] leading-relaxed">
                PostgreSQL schema constraint <code className="text-[#2dff9a]">chk_no_overdraft</code> mandates <code className="text-[#2dff9a]">balance_paise &gt;= 0</code>, blocking overdrafts at the database engine level.
              </p>
            </GlowCard>

            <GlowCard className="p-6 space-y-3 border-[rgba(60,255,160,0.15)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(45,255,154,0.15)] border border-[#2dff9a]/40 text-[#2dff9a]">
                  <Database className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold font-mono text-[#eafff5]">
                  Append-Only
                </h3>
              </div>
              <p className="text-xs text-[#7ea594] leading-relaxed">
                Immutable triggers raise SQL exceptions on any attempt to <code className="text-[#ff5d7a]">UPDATE</code>, <code className="text-[#ff5d7a]">DELETE</code>, or <code className="text-[#ff5d7a]">TRUNCATE</code> ledger or audit records.
              </p>
            </GlowCard>

            <GlowCard className="p-6 space-y-3 border-[rgba(60,255,160,0.15)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(45,255,154,0.15)] border border-[#2dff9a]/40 text-[#2dff9a]">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold font-mono text-[#eafff5]">
                  Role Checks
                </h3>
              </div>
              <p className="text-xs text-[#7ea594] leading-relaxed">
                Per-request real-time role validation prevents stale JWT role escalation. Restricts POST /accounts to Admin and deposit handling exclusively to Admin.
              </p>
            </GlowCard>
          </div>
        </div>
      </section>

      {/* 4. Section: Concurrency & Mathematical Architecture */}
      <section id="architecture" className="py-20 border-t border-[rgba(60,255,160,0.12)] bg-[#020605]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <Badge variant="cyan" size="sm">
                CONCURRENCY ARCHITECTURE
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-[#eafff5]">
                Pessimistic Row Locking in Ascending Numerical Order
              </h2>
              <p className="text-sm text-[#7ea594] leading-relaxed">
                When moving funds between two accounts, circular reciprocal transfers (User A transferring to B while User B transfers to A concurrently) can deadlock conventional database transactions.
              </p>
              <p className="text-sm text-[#7ea594] leading-relaxed">
                BalanceVault eliminates reciprocal transfer deadlocks by enforcing deterministic lock acquisition ordering:
              </p>

              <div className="rounded-xl border border-[rgba(60,255,160,0.15)] bg-[#07110d] p-4 font-mono text-xs text-[#2dff9a] space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-[#7ea594] border-b border-[rgba(60,255,160,0.1)] pb-1.5">
                  <Terminal className="h-3.5 w-3.5 text-[#2dff9a]" />
                  <span>DETERMINISTIC CONCURRENCY QUERY</span>
                </div>
                <pre className="overflow-x-auto text-[11px] text-[#eafff5] leading-relaxed">
                  <code>{`SELECT id, balance_paise\nFROM accounts\nWHERE id IN ($1, $2)\nORDER BY id ASC FOR UPDATE;`}</code>
                </pre>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <RingOrb size={340} label="DEADLOCK-FREE CORE" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section: Life of a Financial Request Pipeline */}
      <section id="pipeline" className="py-20 border-t border-[rgba(60,255,160,0.12)] bg-[#030906]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="emerald" size="sm" className="mb-2">
              ATOMIC PIPELINE
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-[#eafff5]">
              Life of a Transaction
            </h2>
            <p className="text-sm text-[#7ea594] mt-2">
              From client request header to cryptographic ledger settlement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: '01',
                title: 'Claim Key',
                desc: 'UUID v4 Idempotency-Key inserted into idempotency_keys. Replays return cached response.',
              },
              {
                step: '02',
                title: 'Order Locks',
                desc: 'ORDER BY id ASC FOR UPDATE serializes concurrent debit/credit operations.',
              },
              {
                step: '03',
                title: 'Check Invariants',
                desc: 'Balance validated in integer paise. chk_no_overdraft prevents negative balances.',
              },
              {
                step: '04',
                title: 'Append Ledger',
                desc: 'Balanced debit and credit entries written with SHA-256 predecessor hash fingerprinting.',
              },
              {
                step: '05',
                title: 'Atomic Commit',
                desc: 'ACID transaction committed. Global balance sum strictly equals 0 paise.',
              },
            ].map((s) => (
              <GlowCard key={s.step} className="p-5 space-y-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[rgba(45,255,154,0.15)] border border-[#2dff9a]/40 text-[#2dff9a]">
                  {s.step}
                </span>
                <h4 className="text-sm font-bold font-mono text-[#eafff5] pt-1">{s.title}</h4>
                <p className="text-[11px] text-[#7ea594] leading-relaxed">{s.desc}</p>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Footer Call to Action */}
      <footer id="security" className="py-16 border-t border-[rgba(60,255,160,0.12)] bg-[#020605] text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <h3 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#eafff5]">
            Inspect the Cryptographic Ledger Live
          </h3>
          <p className="text-xs sm:text-sm text-[#7ea594] max-w-lg mx-auto">
            Test seeded holder, admin, and auditor accounts in real time. Validate zero-sum invariants and explore the Attack Lab.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to={isAuthenticated ? '/app' : '/login'}>
              <GlowButton variant="primary" size="lg" className="flex items-center gap-2">
                <span>{isAuthenticated ? 'Enter Console' : 'Sign in as Reviewer'}</span>
                <ArrowRight className="h-4 w-4" />
              </GlowButton>
            </Link>

            <Link to="/signup">
              <GlowButton variant="secondary" size="lg">
                Create Account
              </GlowButton>
            </Link>
          </div>

          <p className="text-[11px] font-mono text-[#7ea594]/60 pt-8 border-t border-[rgba(60,255,160,0.08)]">
            BalanceVault Core Financial Architecture • PostgreSQL 16 ACID • Zero Mathematical Drift
          </p>
        </div>
      </footer>
    </div>
  );
}
