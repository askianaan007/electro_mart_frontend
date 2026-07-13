import { Package } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import type { AdminDashboardSummary } from '@/lib/api/types';

export function TopProductsList({ items }: { items: AdminDashboardSummary['topProducts'] }) {
  if (items.length === 0) {
    return <EmptyState icon={Package} title="No sales yet" description="Top products will appear here" />;
  }

  const max = Math.max(...items.map((i) => i.quantitySold), 1);

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.product?.id ?? index} className="space-y-1">
          <div className="flex items-start justify-between gap-2 text-sm">
            <span className="break-words font-medium">{item.product?.name ?? 'Unknown product'}</span>
            <span className="shrink-0 whitespace-nowrap text-muted-foreground">{item.quantitySold} sold</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(item.quantitySold / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
