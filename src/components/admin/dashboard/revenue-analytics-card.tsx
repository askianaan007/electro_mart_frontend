import { TrendingUp } from 'lucide-react';
import { RevenueChart } from '@/components/admin/revenue-chart';
import { formatCurrency } from '@/lib/utils';

export function RevenueAnalyticsCard({ data }: { data: { month: string; revenue: string }[] }) {
  const total = data.reduce((sum, point) => sum + Number(point.revenue), 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Revenue Analytics</p>
          <p className="text-xs text-muted-foreground">Monthly revenue trend</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-success">
          <TrendingUp className="size-3.5" />
          <span className="text-xs font-semibold">{formatCurrency(total)} total</span>
        </div>
      </div>
      <div className="mt-4">
        <RevenueChart data={data} />
      </div>
    </div>
  );
}
