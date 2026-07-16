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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold text-foreground">Top Selling Products</p>

      {items.length === 0 ? (
        <EmptyState icon={Package} title="No sales yet" description="Top products will appear here" />
      ) : (
        <div className="mt-4 space-y-4">
          {(() => {
            const max = Math.max(...items.map((i) => i.quantitySold), 1);
            return items.map((item, index) => {
              const name = item.product?.name ?? 'Unknown product';
              return (
                <div key={item.product?.id ?? index} className="flex items-center gap-3">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-semibold text-white shadow-sm ${AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]}`}
                  >
                    {initials(name) || 'PR'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-foreground">{name}</p>
                      {index === 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
                          <Sparkles className="size-3" />
                          Top seller
                        </span>
                      )}
                    </div>
                    {item.product?.productCode && (
                      <p className="truncate text-xs text-muted-foreground">{item.product.productCode}</p>
                    )}
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-purple transition-[width] duration-700 ease-out"
                        style={{ width: `${(item.quantitySold / max) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-foreground">
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
