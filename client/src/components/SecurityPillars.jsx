import React from 'react';
import {
  Coins,
  Scale,
  Lock,
  KeyRound,
  ShieldCheck,
  Ban,
  FileClock,
  BotOff
} from 'lucide-react';

const PILLARS = [
  {
    icon: Coins,
    title: 'Integer Paise Math',
    desc: 'All values stored as integers in paise (₹1 = 100 paise). Eliminates IEEE 754 floating-point inaccuracies.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: Scale,
    title: 'Double-Entry Invariant',
    desc: 'Every financial transfer produces equal balanced debit and credit entries. Total debits = total credits always.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    icon: Lock,
    title: 'Pessimistic Row Locking',
    desc: 'Database row-level locks (SELECT FOR UPDATE) prevent concurrent double-spending race conditions.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: KeyRound,
    title: 'Idempotency Protection',
    desc: 'Unique client-supplied idempotency keys cached and checked to prevent duplicate payments on retries.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    icon: Ban,
    title: 'Zero Negative Balances',
    desc: 'Withdrawal and transfer operations check available balance atomically before ledger mutation.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
  },
  {
    icon: FileClock,
    title: 'Append-Only Ledger',
    desc: 'Posted ledger entries cannot be modified or deleted. Corrections require offsetting reversal entries.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    icon: ShieldCheck,
    title: 'Role Authorization',
    desc: 'Server-side enforcement across Administrator, Account Holder, and Auditor (read-only) roles.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
  },
  {
    icon: BotOff,
    title: 'Zero AI Autonomy',
    desc: 'Strict policy rule: AI assistants never independently initiate, sign, or approve monetary transfers.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
];

export default function SecurityPillars() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0f1524] p-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-white">Financial Security & Architecture Pillars</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Core mathematical and architectural invariants governing all LedgerLine transactions.
          </p>
        </div>
        <span className="rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
          Enforced Rules
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div
              key={idx}
              className="rounded-lg border border-slate-800/90 bg-[#0B0F19] p-4 transition-colors hover:border-slate-700"
            >
              <div className="flex items-center space-x-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${pillar.bg}`}>
                  <Icon className={`h-4 w-4 ${pillar.color}`} />
                </div>
                <h4 className="text-xs font-bold text-slate-200">{pillar.title}</h4>
              </div>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {pillar.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
