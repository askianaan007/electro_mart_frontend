'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  primary: {
    chip: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border-blue-500/20',
    laser: 'from-blue-500 via-sky-400 to-indigo-500',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    hoverBorder: 'group-hover:border-blue-500/40',
  },
  success: {
    chip: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-500/20',
    laser: 'from-emerald-500 via-teal-400 to-emerald-600',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    hoverBorder: 'group-hover:border-emerald-500/40',
  },
  warning: {
    chip: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border-amber-500/20',
    laser: 'from-amber-500 via-orange-400 to-yellow-500',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    hoverBorder: 'group-hover:border-amber-500/40',
  },
  destructive: {
    chip: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 border-rose-500/20',
    laser: 'from-rose-500 via-red-400 to-rose-600',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    hoverBorder: 'group-hover:border-rose-500/40',
  },
  purple: {
    chip: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 border-purple-500/20',
    laser: 'from-purple-500 via-fuchsia-400 to-indigo-500',
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    hoverBorder: 'group-hover:border-purple-500/40',
  },
} as const;

export function MiniStatCard({
  label,
  value,
  icon: Icon,
  tone,
  change,
  changeLabel,
  href,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  change?: number | null;
  changeLabel?: string;
  href?: string;
}) {
  const t = TONES[tone];

  const content = (
    <div
      className={cn(
        'group relative isolate flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg select-none',
        t.hoverBorder
      )}
    >
      {/* Top Specular Glass Curve Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 rounded-t-2xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/5" />

      {/* Distinctive Laser Accent Line at Bottom */}
      <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-[2.5px] bg-gradient-to-r opacity-50 group-hover:opacity-100 transition-opacity duration-300', t.laser)} />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="break-words text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] text-muted-foreground/90 truncate">
            {label}
          </p>

          <p className="break-words text-xl sm:text-2xl font-extrabold leading-tight tracking-tight text-foreground drop-shadow-xs">
            {value}
          </p>

          {typeof change === 'number' && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-extrabold',
                  change >= 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                )}
              >
                {change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                <span>
                  {change >= 0 ? '+' : ''}
                  {change.toFixed(0)}%
                </span>
              </span>
              {changeLabel && (
                <span className="text-[11px] font-medium text-muted-foreground/80 truncate">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Distinctive Tinted Icon Badge */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div
            className={cn(
              'flex size-10 items-center justify-center rounded-xl border shadow-xs transition-transform duration-300 group-hover:scale-110',
              t.chip
            )}
          >
            <Icon className="size-5" />
          </div>
          {href && (
            <ArrowUpRight className="size-3.5 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        {content}
      </Link>
    );
  }

  return content;
}
