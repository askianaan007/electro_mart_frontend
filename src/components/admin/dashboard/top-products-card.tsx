'use client';

import { Package, Trophy } from 'lucide-react';
import { PanelTitle } from '@/components/admin/dashboard/panel-icon';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';
import type { AdminDashboardSummary } from '@/lib/api/types';

export function TopProductsCard({ items }: { items: AdminDashboardSummary['topProducts'] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>
          <PanelTitle icon={Trophy} tone="warning">
            Top Selling Products
          </PanelTitle>
        </CardTitle>
        <Badge variant="muted">By Volume</Badge>
      </CardHeader>

      <CardContent className="flex-1">
        {items.length === 0 ? (
          <EmptyState icon={Package} title="No sales recorded" description="Product rankings will display here" />
        ) : (
          <ol className="space-y-1.5">
            {(() => {
              const max = Math.max(...items.map((i) => i.quantitySold), 1);
              return items.map((item, index) => {
                const name = item.product?.name ?? 'Unknown product';
                const rank = index + 1;
                return (
                  <li
                    key={item.product?.id ?? index}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
                  >
                    <div
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums',
                        rank === 1
                          ? 'bg-warning text-white shadow-sm shadow-warning/30'
                          : rank === 2
                            ? 'bg-primary/15 text-primary'
                            : rank === 3
                              ? 'bg-purple/15 text-purple'
                              : 'bg-muted text-muted-foreground',
                      )}
                    >
                      #{rank}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{name}</p>
                        <span className="shrink-0 whitespace-nowrap text-sm font-medium text-foreground tabular-nums">
                          {item.quantitySold}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">sold</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full origin-left rounded-full transition-[width] duration-700 ease-out motion-safe:animate-[ui-bar-grow_900ms_cubic-bezier(0.16,1,0.3,1)_both]"
                          style={{
                            width: `${(item.quantitySold / max) * 100}%`,
                            backgroundColor: `var(--chart-${(index % 5) + 1})`,
                            animationDelay: `${150 + index * 80}ms`,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                );
              });
            })()}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
