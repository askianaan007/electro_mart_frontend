'use client';

import { Flame, Package, Trophy } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';
import type { AdminDashboardSummary } from '@/lib/api/types';

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 font-black text-xs shadow-xs">
        <Trophy className="size-4 text-amber-500 animate-pulse" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-400/15 text-slate-300 border border-slate-400/30 font-extrabold text-xs">
        #2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-orange-600/15 text-orange-400 border border-orange-600/30 font-extrabold text-xs">
        #3
      </div>
    );
  }
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground border border-border/50 font-bold text-xs">
      #{rank}
    </div>
  );
}

export function TopProductsCard({ items }: { items: AdminDashboardSummary['topProducts'] }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/75 dark:bg-slate-900/60 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:shadow-2xl select-none flex flex-col justify-between h-full">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 size-36 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Top Specular Shimmer Reflection Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

      <div>
        {/* Header Title & Badge */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="size-4.5 text-amber-500" />
            <p className="text-sm font-bold tracking-tight text-foreground sm:text-base">
              Top Products Leaderboard
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground backdrop-blur-md shadow-2xs">
            Live Ranking
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
                    className={cn(
                      'group relative flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/70 p-3 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
                      rank === 1 && 'border-amber-500/30 bg-amber-500/[0.03]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Numeric Rank Badge */}
                      <RankBadge rank={rank} />

                      {/* Product Name & SKU */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {name}
                        </p>
                        {item.product?.productCode && (
                          <p className="truncate text-[10px] font-mono text-muted-foreground/80 mt-0.5">
                            SKU: {item.product.productCode}
                          </p>
                        )}
                      </div>

                      {/* Sold Count Badge */}
                      <div className="shrink-0 text-right">
                        <span className="text-xs sm:text-sm font-extrabold text-foreground">
                          {item.quantitySold}
                        </span>
                        <span className="ml-1 text-[11px] font-medium text-muted-foreground">units</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className={cn(
                          'h-full rounded-full transition-[width] duration-1000 ease-out',
                          rank === 1
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                        )}
                        style={{ width: `${(item.quantitySold / max) * 100}%` }}
                      />
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
