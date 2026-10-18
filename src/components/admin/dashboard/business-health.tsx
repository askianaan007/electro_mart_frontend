'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Landmark, HandCoins, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      badge: 'success' as const,
      stroke: 'stroke-success',
    };
  }
  if (score >= 45) {
    return {
      label: 'Stable Business',
      badge: 'warning' as const,
      stroke: 'stroke-warning',
    };
  }
  return {
    label: 'Needs Attention',
    badge: 'destructive' as const,
    stroke: 'stroke-destructive',
  };
}

function TrendRow({ label, pct }: { label: string; pct: number | null }) {
  if (pct === null) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium text-muted-foreground">N/A</span>
      </div>
    );
  }
  const positive = pct >= 0;
  const clampedPct = Math.min(Math.abs(pct), 100);

  return (
    <div className="space-y-1.5 py-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
            positive ? 'text-success' : 'text-destructive',
          )}
        >
          {positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          {positive ? '+' : ''}
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000 ease-out',
            positive ? 'bg-success' : 'bg-destructive',
          )}
          style={{ width: `${Math.max(clampedPct, 8)}%` }}
        />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  href: string;
  title: string;
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="group flex items-center gap-3 rounded-lg border border-border p-3 outline-none transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/30"
    >
      <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', iconClassName)}>
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary" />
        </div>
        <p className="truncate text-sm font-semibold text-foreground tabular-nums">{value}</p>
      </div>
    </Link>
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
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Business Health Index</CardTitle>
        <Badge variant={status.badge}>{status.label}</Badge>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          {/* Radial gauge */}
          <div className="relative flex size-32 shrink-0 items-center justify-center">
            <svg viewBox="0 0 120 120" className="size-32 -rotate-90" aria-hidden>
              <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="9" className="stroke-muted" />
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                strokeWidth="9"
                strokeLinecap="round"
                className={cn('transition-[stroke-dashoffset] duration-1000 ease-out', status.stroke)}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={animatedOffset}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {animatedScore}%
              </span>
              <span className="text-[11px] text-muted-foreground">Health Score</span>
            </div>
          </div>

          {/* Monthly momentum */}
          <div className="w-full min-w-0 flex-1">
            <p className="mb-1 text-xs font-medium text-foreground">Monthly Momentum</p>
            <div className="space-y-1">
              <TrendRow label="Sales Volume" pct={data.netSalesChangePct} />
              <TrendRow label="Cash Collections" pct={data.invoiceDuePaymentsChangePct} />
              <TrendRow
                label="Operating Expenses"
                pct={data.totalExpensesChangePct === null ? null : -data.totalExpensesChangePct}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <QuickLink
            href="/admin/credit-balance"
            title="Open full Credit Balance history in a new tab"
            label="Supplier Debt"
            value={formatCurrency(data.creditBalance)}
            icon={HandCoins}
            iconClassName="bg-destructive/10 text-destructive"
          />
          <QuickLink
            href="/admin/liquid-cash"
            title="Open full Liquid Cash history in a new tab"
            label="Cash Position"
            value={formatCurrency(data.liquidCash)}
            icon={Landmark}
            iconClassName="bg-primary/10 text-primary"
          />
        </div>
      </CardContent>
    </Card>
  );
}
