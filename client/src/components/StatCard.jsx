import React from 'react';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  accentColor = 'cyan',
  badge,
  trend,
}) {
  const accentStyles = {
    cyan: {
      border: 'hover:border-cyan-400/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25',
      glow: 'group-hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]',
      badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    },
    blue: {
      border: 'hover:border-blue-400/40',
      iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
      glow: 'group-hover:shadow-[0_0_25px_rgba(59,130,246,0.15)]',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    },
    violet: {
      border: 'hover:border-violet-400/40',
      iconBg: 'bg-violet-500/10 text-violet-400 border border-violet-500/25',
      glow: 'group-hover:shadow-[0_0_25px_rgba(139,92,246,0.15)]',
      badge: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    },
    emerald: {
      border: 'hover:border-emerald-400/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
      glow: 'group-hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
  }[accentColor] || {};

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl cyber-glass-card p-5.5 transition-all duration-300 hover:-translate-y-1 ${accentStyles.border} ${accentStyles.glow}`}
    >
      {/* Corner bracket accent */}
      <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-slate-700/60 group-hover:border-cyan-400/60 transition-colors" />

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentStyles.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-3.5 flex items-baseline space-x-2.5">
        <div className="text-2xl font-bold tracking-tight text-white font-mono">{value}</div>
        {badge && (
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold border ${accentStyles.badge}`}>
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-2 text-xs text-slate-400 leading-relaxed font-sans">{subtext}</p>
      )}
    </div>
  );
}
