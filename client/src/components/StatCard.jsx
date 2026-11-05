import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, accentColor = 'blue', badge }) {
  const accentStyles = {
    blue: {
      border: 'hover:border-blue-500/40',
      iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      glow: 'group-hover:shadow-blue-900/10',
    },
    violet: {
      border: 'hover:border-violet-500/40',
      iconBg: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
      glow: 'group-hover:shadow-violet-900/10',
    },
    indigo: {
      border: 'hover:border-indigo-500/40',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      glow: 'group-hover:shadow-indigo-900/10',
    },
    emerald: {
      border: 'hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      glow: 'group-hover:shadow-emerald-900/10',
    },
  }[accentColor] || {};

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-slate-800 bg-[#0f1524] p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${accentStyles.border} ${accentStyles.glow}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentStyles.iconBg}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline space-x-2">
        <div className="text-xl font-bold tracking-tight text-white">{value}</div>
        {badge && (
          <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700/60">
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-2 text-xs text-slate-400 leading-normal">{subtext}</p>
      )}
    </div>
  );
}
