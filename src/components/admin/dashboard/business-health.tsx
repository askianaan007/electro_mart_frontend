'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingDown, TrendingUp, Landmark, HandCoins } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { AdminDashboardSummary } from '@/lib/api/types';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

/**
 * Health score is derived entirely from real vs-last-month signals already in
 * the dashboard payload — not a backend metric. Sales, profit and collections
 * moving up are good; expenses moving up is bad (so it's inverted). The four
 * signals are averaged and added to a neutral 50 baseline, then clamped.
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
  if (score >= 75) return { label: 'Healthy Business', tone: 'text-success', ring: 'stroke-success' };
  if (score >= 45) return { label: 'Stable Business', tone: 'text-warning-foreground', ring: 'stroke-warning' };
  return { label: 'Needs Attention', tone: 'text-destructive', ring: 'stroke-destructive' };
}

function TrendRow({ label, pct }: { label: string; pct: number | null }) {
  if (pct === null) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-muted-foreground">N/A</span>
      </div>
    );
  }
  const positive = pct >= 0;
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('flex items-center gap-1 text-sm font-semibold', positive ? 'text-success' : 'text-destructive')}>
        {positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
        {positive ? '+' : ''}
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export function BusinessHealth({ data }: { data: AdminDashboardSummary }) {
  const score = computeHealthScore(data);
  const status = statusForScore(score);
  const [animatedOffset, setAnimatedOffset] = useState(CIRCUMFERENCE);

  useEffect(() => {
    const target = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
    const raf = requestAnimationFrame(() => setAnimatedOffset(target));
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br via-card to-card p-5 shadow-sm sm:p-6 transition-all duration-300 hover:shadow-md">
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/5 blur-3xl" />
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold tracking-tight text-foreground">Business Health Index</p>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', status.tone, 'bg-muted/60')}>
          {status.label}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <div className="relative flex size-32 shrink-0 items-center justify-center">
          <svg viewBox="0 0 120 120" className="size-32 -rotate-90 filter drop-shadow-sm">
            <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="10" className="stroke-muted/40" />
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              className={cn('transition-[stroke-dashoffset] duration-1000 ease-out', status.ring)}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={animatedOffset}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">{score}%</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Index</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Monthly performance momentum</p>

          <div className="mt-3 space-y-1 divide-y divide-border/60">
            <TrendRow label="Sales" pct={data.netSalesChangePct} />
            <TrendRow label="Collections" pct={data.invoiceDuePaymentsChangePct} />
            <TrendRow
              label="Expenses"
              pct={data.totalExpensesChangePct === null ? null : -data.totalExpensesChangePct}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/80 pt-4">
        <Link
          href="/admin/credit-balance"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 rounded-xl bg-purple-500/5 p-2.5 border border-purple-500/10 transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-500/10"
          title="Open full Credit Balance history in a new tab"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
            <HandCoins className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier Debt</p>
            <p className="truncate text-sm font-bold text-foreground group-hover:underline">
              {formatCurrency(data.creditBalance)}
            </p>
          </div>
        </Link>
        <Link
          href="/admin/liquid-cash"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 rounded-xl bg-blue-500/5 p-2.5 border border-blue-500/10 transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/10"
          title="Open full Liquid Cash history in a new tab"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <Landmark className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cash Position</p>
            <p className="truncate text-sm font-bold text-foreground group-hover:underline">
              {formatCurrency(data.liquidCash)}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
