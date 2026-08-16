'use client';

import { useState } from 'react';
import { AreaChart, Calendar, ChevronDown, Sparkles, Table, TrendingDown, TrendingUp } from 'lucide-react';
import { RevenueChart } from '@/components/admin/revenue-chart';
import { cn, formatCurrency } from '@/lib/utils';

type RevenuePoint = { month: string; revenue: string };

function monthLabel(month: string) {
  return new Date(`${month}-02`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function RevenueAnalyticsCard({ data }: { data: RevenuePoint[] }) {
  const [showTable, setShowTable] = useState(false);

  const values = data.map((point) => Number(point.revenue));
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = data.length > 0 ? total / data.length : 0;

  let peakIndex = 0;
  values.forEach((value, index) => {
    if (value > values[peakIndex]) peakIndex = index;
  });
  const peakValue = data.length > 0 ? values[peakIndex] : 0;
  const peakMonth = data.length > 0 ? monthLabel(data[peakIndex].month) : null;

  const last = values[values.length - 1];
  const previous = values[values.length - 2];
  const hasTrend = values.length >= 2;
  const growthPct = hasTrend ? (previous === 0 ? (last > 0 ? 100 : 0) : ((last - previous) / previous) * 100) : null;

  const rangeLabel =
    data.length > 0 ? `${monthLabel(data[0].month)} – ${monthLabel(data[data.length - 1].month)}` : null;

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:shadow-2xl select-none flex flex-col justify-between h-full">
      {/* Background Liquid Glow Orbs */}
      <div className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-teal-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 size-44 rounded-full bg-gradient-to-tr from-purple-500/10 to-transparent blur-3xl" />

      {/* Top Specular Shimmer Reflection Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

      <div>
        {/* Header Section */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <AreaChart className="size-4.5 text-primary" />
              <h3 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
                Revenue Analytics
              </h3>
            </div>
            {rangeLabel && (
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="size-3 text-muted-foreground/70" />
                <span>{rangeLabel}</span>
              </p>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 backdrop-blur-md shadow-2xs">
            <Sparkles className="size-3.5 text-emerald-500" />
            <span>{formatCurrency(total)} Total</span>
          </div>
        </div>

        {/* 3 Metrics Summary Tiles */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {/* Tile 1: Monthly Average */}
          <div className="group rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-3.5 backdrop-blur-md shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground/90">
              Monthly Average
            </p>
            <p className="mt-0.5 text-sm sm:text-base font-extrabold text-foreground tracking-tight drop-shadow-2xs">
              {formatCurrency(average)}
            </p>
          </div>

          {/* Tile 2: Peak Month */}
          <div className="group rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-3.5 backdrop-blur-md shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground/90">
              Peak Revenue Month
            </p>
            <div className="mt-0.5 flex items-baseline gap-1 truncate">
              <span className="text-sm sm:text-base font-extrabold text-foreground tracking-tight drop-shadow-2xs">
                {formatCurrency(peakValue)}
              </span>
              {peakMonth && (
                <span className="text-[11px] font-medium text-muted-foreground truncate">
                  ({peakMonth})
                </span>
              )}
            </div>
          </div>

          {/* Tile 3: Vs Previous Month Growth */}
          <div className="group rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-3.5 backdrop-blur-md shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground/90">
              Vs Previous Month
            </p>
            {growthPct === null ? (
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">Not enough data</p>
            ) : (
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-extrabold border',
                    growthPct >= 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  )}
                >
                  {growthPct >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  <span>
                    {growthPct >= 0 ? '+' : ''}
                    {growthPct.toFixed(1)}%
                  </span>
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {growthPct >= 0 ? 'Growth' : 'Decline'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Revenue Chart Visualizer */}
        <div className="relative z-10">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/90 flex items-center gap-1.5">
            <span>Revenue Breakdown Timeline</span>
          </p>
          <div className="rounded-2xl border border-border/50 bg-background/50 p-2 sm:p-3 backdrop-blur-md">
            <RevenueChart data={data} />
          </div>
        </div>
      </div>

      {/* Interactive Underlying Data Table Accordion */}
      <div className="relative z-10 mt-4 border-t border-border/60 pt-3">
        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors focus-visible:outline-none"
        >
          <Table className="size-3.5" />
          <span>{showTable ? 'Hide underlying data table' : 'View underlying data as a table'}</span>
          <ChevronDown
            className={cn('size-3.5 transition-transform duration-300', showTable && 'rotate-180')}
          />
        </button>

        {showTable && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border/60 bg-background/70 backdrop-blur-md shadow-xs transition-all duration-300">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 border-b border-border/60">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5 font-bold text-muted-foreground">
                    Month
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-bold text-muted-foreground text-right">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3.5 py-3 text-center text-muted-foreground">
                      No revenue recorded yet
                    </td>
                  </tr>
                ) : (
                  data.map((point) => (
                    <tr key={point.month} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3.5 py-2 font-medium text-foreground">
                        {monthLabel(point.month)}
                      </td>
                      <td className="px-3.5 py-2 text-right font-extrabold text-foreground">
                        {formatCurrency(point.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
