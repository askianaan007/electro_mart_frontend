'use client';

import { BarChart3, IndianRupee, Landmark, TrendingDown, TrendingUp, Truck, Undo2, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { AdminDashboardSummary } from '@/lib/api/types';

function MetricTile({
  label,
  value,
  icon: Icon,
  change,
  tone = 'primary',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  change?: number | null;
  tone?: 'primary' | 'success' | 'warning' | 'purple' | 'rose';
}) {
  const tones = {
    primary: {
      chip: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25',
      hover: 'group-hover:border-blue-500/40',
    },
    success: {
      chip: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
      hover: 'group-hover:border-emerald-500/40',
    },
    warning: {
      chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
      hover: 'group-hover:border-amber-500/40',
    },
    purple: {
      chip: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25',
      hover: 'group-hover:border-purple-500/40',
    },
    rose: {
      chip: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25',
      hover: 'group-hover:border-rose-400/40',
    },
  };

  const t = tones[tone];

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-2.5 sm:p-3 backdrop-blur-md shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md select-none',
        t.hover
      )}
    >
      <div
        className={cn(
          'flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg border shadow-2xs transition-transform duration-300 group-hover:scale-105',
          t.chip
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground/90 truncate">
          {label}
        </p>
        <p className="mt-0.5 break-words text-xs sm:text-sm font-bold text-foreground tracking-tight drop-shadow-2xs">
          {value}
        </p>
        {typeof change === 'number' && (
          <div className="mt-0.5 flex items-center gap-1">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.2 text-[9px] font-bold border',
                change >= 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              )}
            >
              {change >= 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
              <span>
                {change >= 0 ? '+' : ''}
                {change.toFixed(0)}%
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MoreMetricsStrip({ data }: { data: AdminDashboardSummary }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 p-4.5 sm:p-5.5 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:shadow-2xl select-none flex flex-col justify-between h-full">
      {/* Background Liquid Glow Orbs */}
      <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 size-40 rounded-full bg-gradient-to-tr from-amber-500/10 to-transparent blur-3xl" />

      {/* Top Specular Shimmer Reflection Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

      <div>
        {/* Header Title */}
        <div className="relative z-10 flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <p className="text-xs sm:text-sm font-semibold tracking-tight text-foreground">
              Financial &amp; Operational Metrics
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-md shadow-2xs">
            Live Summary
          </span>
        </div>

        {/* 6 Metric Tiles Grid */}
        <div className="relative z-10 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <MetricTile
            label="Net Sales"
            value={formatCurrency(data.netSales)}
            icon={IndianRupee}
            change={data.netSalesChangePct}
            tone="success"
          />
          <MetricTile
            label="Net Purchase"
            value={formatCurrency(data.netPurchase)}
            icon={Truck}
            change={data.netPurchaseChangePct}
            tone="primary"
          />
          <MetricTile
            label="Net Cash Flow"
            value={formatCurrency(data.netCashFlow)}
            icon={Landmark}
            tone="purple"
          />
          <MetricTile
            label="Sales Return"
            value={formatCurrency(data.totalSalesReturn)}
            icon={Undo2}
            change={data.totalSalesReturnChangePct}
            tone="rose"
          />
          <MetricTile
            label="Purchase Return"
            value={formatCurrency(data.totalPurchaseReturn)}
            icon={Undo2}
            change={data.totalPurchaseReturnChangePct}
            tone="warning"
          />
          <MetricTile
            label="Invoice Due Payments"
            value={formatCurrency(data.invoiceDuePayments)}
            icon={Wallet}
            change={data.invoiceDuePaymentsChangePct}
            tone="primary"
          />
        </div>
      </div>
    </div>
  );
}
