import { Package, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { initials } from '@/lib/utils';
import type { AdminDashboardSummary } from '@/lib/api/types';

const AVATAR_GRADIENTS = [
  'from-primary to-indigo-600',
  'from-purple to-violet-700',
  'from-success to-emerald-700',
  'from-warning to-amber-600',
  'from-indigo-500 to-purple-600',
];

export function TopProductsCard({ items }: { items: AdminDashboardSummary['topProducts'] }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br via-card to-card p-5 shadow-sm sm:p-6 transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold tracking-tight text-foreground">Top Selling Products</p>
        <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">By Volume</span>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Package} title="No sales yet" description="Top products will appear here" />
      ) : (
        <div className="mt-4 space-y-4">
          {(() => {
            const max = Math.max(...items.map((i) => i.quantitySold), 1);
            return items.map((item, index) => {
              const name = item.product?.name ?? 'Unknown product';
              return (
                <div key={item.product?.id ?? index} className="group flex items-center gap-3.5 rounded-xl p-2 transition-colors hover:bg-muted/40">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold text-white shadow-sm transition-transform duration-200 group-hover:scale-105 ${AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]}`}
                  >
                    {initials(name) || 'PR'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                      {index === 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Sparkles className="size-3" />
                          #1 Top Seller
                        </span>
                      )}
                    </div>
                    {item.product?.productCode && (
                      <p className="truncate text-xs font-mono text-muted-foreground">{item.product.productCode}</p>
                    )}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-[width] duration-700 ease-out"
                        style={{ width: `${(item.quantitySold / max) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-sm font-bold text-foreground">
                    {item.quantitySold}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">sold</span>
                  </span>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

