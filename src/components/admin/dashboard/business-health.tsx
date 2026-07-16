'use client';

import { useEffect, useState } from 'react';
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
    -data.totalExpensesChangePct,
  ];
  const avg = signals.reduce((a, b) => a + b, 0) / signals.length;
  return Math.round(clamp(50 + avg, 0, 100));
}

function statusForScore(score: number) {
  if (score >= 75) return { label: 'Healthy Business', tone: 'text-success', ring: 'stroke-success' };
  if (score >= 45) return { label: 'Stable Business', tone: 'text-warning-foreground', ring: 'stroke-warning' };
  return { label: 'Needs Attention', tone: 'text-destructive', ring: 'stroke-destructive' };
}

function TrendRow({ label, pct }: { label: string; pct: number }) {
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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold text-foreground">Business Health</p>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative flex size-32 shrink-0 items-center justify-center">
          <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
            <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="10" className="stroke-muted" />
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
            <span className="text-3xl font-bold text-foreground">{score}%</span>
            <span className="text-[11px] text-muted-foreground">Score</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className={cn('text-base font-semibold', status.tone)}>{status.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Based on this month&apos;s trends</p>

          <div className="mt-2 divide-y divide-border">
            <TrendRow label="Sales" pct={data.netSalesChangePct} />
            <TrendRow label="Collections" pct={data.invoiceDuePaymentsChangePct} />
            <TrendRow label="Expenses" pct={-data.totalExpensesChangePct} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple/10 text-purple">
            <HandCoins className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] text-muted-foreground">Supplier Debt</p>
            <p className="truncate text-sm font-semibold text-foreground">{formatCurrency(data.creditBalance)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Landmark className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] text-muted-foreground">Cash Position</p>
            <p className="truncate text-sm font-semibold text-foreground">{formatCurrency(data.liquidCash)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
