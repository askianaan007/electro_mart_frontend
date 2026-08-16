'use client';

import { PackageCheck, Package, TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';
import type { AdminDashboardSummary } from '@/lib/api/types';

export function TopProductsCard({ items }: { items: AdminDashboardSummary['topProducts'] }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:shadow-2xl select-none flex flex-col justify-between h-full">
      {/* Top Specular Shimmer Reflection Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

      {/* Ambient Glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-blue-500/10 blur-3xl" />

      <div>
        {/* Header Title & Badge */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PackageCheck className="size-4.5 text-primary" />
            <p className="text-sm font-bold tracking-tight text-foreground sm:text-base">
              Top Selling Products
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground backdrop-blur-md shadow-2xs">
            <TrendingUp className="size-3 text-emerald-500" />
            By Volume
          </span>
        </div>

        {/* Content Body */}
        {items.length === 0 ? (
          <EmptyState icon={Package} title="No sales recorded" description="Product rankings will display here" />
        ) : (
          <div className="relative z-10 space-y-2.5">
            {(() => {
              const max = Math.max(...items.map((i) => i.quantitySold), 1);
              return items.map((item, index) => {
                const name = item.product?.name ?? 'Unknown product';
                const rank = index + 1;
                return (
                  <div
                    key={item.product?.id ?? index}
                    className="group relative flex items-center gap-3 rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-3 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    {/* Rank Pill Badge */}
                    <div
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black border shadow-2xs',
                        rank === 1
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-muted/60 text-muted-foreground border-border/50'
                      )}
                    >
                      #{rank}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {name}
                        </p>
                        <span className="shrink-0 whitespace-nowrap text-xs font-extrabold text-foreground">
                          {item.quantitySold}
                          <span className="ml-1 text-[11px] font-medium text-muted-foreground">sold</span>
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-[0_0_8px_rgba(59,130,246,0.4)] transition-[width] duration-1000 ease-out"
                          style={{ width: `${(item.quantitySold / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
