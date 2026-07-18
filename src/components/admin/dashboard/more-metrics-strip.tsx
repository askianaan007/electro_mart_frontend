import { IndianRupee, Landmark, Truck, Undo2, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { AdminDashboardSummary } from '@/lib/api/types';

function MetricTile({
  label,
  value,
  icon: Icon,
  change,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  change?: number | null;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="break-words text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold text-foreground">{value}</p>
        {typeof change === 'number' && (
          <p className={cn('text-[11px] font-medium', change >= 0 ? 'text-success' : 'text-destructive')}>
            {change >= 0 ? '+' : ''}
            {change.toFixed(0)}%
          </p>
        )}
      </div>
    </div>
  );
}

export function MoreMetricsStrip({ data }: { data: AdminDashboardSummary }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-foreground">More Metrics</p>
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        <MetricTile
          label="Net Sales"
          value={formatCurrency(data.netSales)}
          icon={IndianRupee}
          change={data.netSalesChangePct}
        />
        <MetricTile
          label="Net Purchase"
          value={formatCurrency(data.netPurchase)}
          icon={Truck}
          change={data.netPurchaseChangePct}
        />
        <MetricTile
          label="Net Cash Flow"
          value={formatCurrency(data.netCashFlow)}
          icon={Landmark}
        />
        <MetricTile
          label="Sales Return"
          value={formatCurrency(data.totalSalesReturn)}
          icon={Undo2}
          change={data.totalSalesReturnChangePct}
        />
        <MetricTile
          label="Purchase Return"
          value={formatCurrency(data.totalPurchaseReturn)}
          icon={Undo2}
          change={data.totalPurchaseReturnChangePct}
        />
        <MetricTile
          label="Invoice Due Payments"
          value={formatCurrency(data.invoiceDuePayments)}
          icon={Wallet}
          change={data.invoiceDuePaymentsChangePct}
        />
      </div>
    </div>
  );
}
