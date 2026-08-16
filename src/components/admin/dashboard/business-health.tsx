'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingDown, TrendingUp, Landmark, HandCoins, Activity, ArrowUpRight } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCountUp } from '@/hooks/use-count-up';
import type { AdminDashboardSummary } from '@/lib/api/types';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

/**
 * Health score is derived entirely from real vs-last-month signals already in
 * the dashboard payload. Sales, profit and collections moving up are good;
 * expenses moving up is bad (so it's inverted).
 */
function computeHealthScore(data: AdminDashboardSummary) {
  const signals = [
    data.netSalesChangePct,
    data.profitChangePct,
    data.invoiceDuePaymentsChangePct,
    data.totalExpensesChangePct === null ? null : -data.totalExpensesChangePct,
  ].filter((v): v is number => v !== null);
  if (signals.length === 0) return 50;
  const avg = signals.reduce((a, b) => a + b, 0) / signals.length;
  return Math.round(clamp(50 + avg, 0, 100));
}

function statusForScore(score: number) {
  if (score >= 75) {
    return {
      label: 'Healthy Business',
      tone: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
      ping: 'bg-emerald-400',
      dot: 'bg-emerald-500',
      gradientStart: '#10b981',
      gradientEnd: '#06b6d4',
    };
  }
  if (score >= 45) {
    return {
      label: 'Stable Business',
      tone: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
      ping: 'bg-amber-400',
      dot: 'bg-amber-500',
      gradientStart: '#f59e0b',
      gradientEnd: '#ea580c',
    };
  }
  return {
    label: 'Needs Attention',
    tone: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
    ping: 'bg-rose-400',
    dot: 'bg-rose-500',
    gradientStart: '#f43f5e',
    gradientEnd: '#b91c1c',
  };
}

function TrendRow({ label, pct }: { label: string; pct: number | null }) {
  if (pct === null) {
    return (
      <div className="flex items-center justify-between p-2 rounded-xl transition-colors hover:bg-muted/40">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-bold text-muted-foreground">N/A</span>
      </div>
    );
  }
  const positive = pct >= 0;
  const clampedPct = Math.min(Math.abs(pct), 100);

  return (
    <div className="group flex flex-col gap-1.5 p-2 rounded-xl transition-all hover:bg-accent/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs font-extrabold',
            positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          )}
        >
          {positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          <span>
            {positive ? '+' : ''}
            {pct.toFixed(0)}%
          </span>
        </span>
      </div>
      {/* Animated Fill Bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000 ease-out',
            positive
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
              : 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
          )}
          style={{ width: `${Math.max(clampedPct, 8)}%` }}
        />
      </div>
    </div>
  );
}

export function BusinessHealth({ data }: { data: AdminDashboardSummary }) {
  const score = computeHealthScore(data);
  const animatedScore = useCountUp(score);
  const status = statusForScore(score);
  const [animatedOffset, setAnimatedOffset] = useState(CIRCUMFERENCE);

  useEffect(() => {
    const target = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
    const timer = setTimeout(() => setAnimatedOffset(target), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:shadow-2xl select-none flex flex-col justify-between h-full">
      {/* Background Liquid Glow Orbs */}
      <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 size-40 rounded-full bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 blur-3xl" />

      {/* Top Specular Shimmer Reflection Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

      <div>
        {/* Header Title & Status Pill */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="size-4.5 text-primary animate-pulse" />
            <p className="text-sm font-bold tracking-tight text-foreground sm:text-base">
              Business Health Index
            </p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-2xs',
              status.tone
            )}
          >
            <span className="relative flex size-2">
              <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', status.ping)} />
              <span className={cn('relative inline-flex size-2 rounded-full', status.dot)} />
            </span>
            {status.label}
          </span>
        </div>

        {/* Gauge & Trends Row */}
        <div className="relative z-10 mt-5 flex flex-col sm:flex-row items-center gap-6">
          {/* Animated Radial SVG Gauge */}
          <div className="relative flex size-36 shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl animate-pulse" />
            <svg viewBox="0 0 120 120" className="size-36 -rotate-90 filter drop-shadow-md">
              <defs>
                <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={status.gradientStart} />
                  <stop offset="100%" stopColor={status.gradientEnd} />
                </linearGradient>
              </defs>
              {/* Background Track Circle */}
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                strokeWidth="9"
                className="stroke-muted/30"
              />
              {/* Progress Animated Circle */}
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                strokeWidth="9"
                strokeLinecap="round"
                stroke="url(#healthGradient)"
                className="transition-[stroke-dashoffset] duration-1000 ease-out"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={animatedOffset}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black tracking-tight text-foreground drop-shadow-xs">
                {animatedScore}%
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Health Score
              </span>
            </div>
          </div>

          {/* Metric Trends Breakdown */}
          <div className="min-w-0 flex-1 w-full space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
              Monthly Momentum
            </p>
            <div className="space-y-1.5 pt-1">
              <TrendRow label="Sales Volume" pct={data.netSalesChangePct} />
              <TrendRow label="Cash Collections" pct={data.invoiceDuePaymentsChangePct} />
              <TrendRow
                label="Operating Expenses"
                pct={data.totalExpensesChangePct === null ? null : -data.totalExpensesChangePct}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Quick Stats Cards */}
      <div className="relative z-10 mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border/60 pt-4">
        <Link
          href="/admin/credit-balance"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 p-3 border border-rose-500/15 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-500/35 hover:bg-rose-500/15 shadow-2xs"
          title="Open full Credit Balance history in a new tab"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shadow-xs transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
            <HandCoins className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="truncate text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Supplier Debt
              </p>
              <ArrowUpRight className="size-3 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-rose-500" />
            </div>
            <p className="truncate text-sm font-extrabold text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400">
              {formatCurrency(data.creditBalance)}
            </p>
          </div>
        </Link>

        <Link
          href="/admin/liquid-cash"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 p-3 border border-blue-500/15 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-500/35 hover:bg-blue-500/15 shadow-2xs"
          title="Open full Liquid Cash history in a new tab"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-xs transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
            <Landmark className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="truncate text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Cash Position
              </p>
              <ArrowUpRight className="size-3 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-500" />
            </div>
            <p className="truncate text-sm font-extrabold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {formatCurrency(data.liquidCash)}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
