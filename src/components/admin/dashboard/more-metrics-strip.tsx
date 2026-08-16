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
  tone = 'primary',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  change?: number | null;
  tone?: 'primary' | 'success' | 'warning' | 'purple' | 'rose';
}) {
  const tones = {
    primary: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  };

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-border/80 bg-card/60 p-3.5 shadow-2xs transition-all duration-200 hover:border-primary/20 hover:bg-card hover:shadow-xs">
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl shadow-inner', tones[tone])}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-bold text-foreground">{value}</p>
        {typeof change === 'number' && (
          <p className={cn('mt-0.5 text-[11px] font-semibold inline-flex items-center gap-0.5', change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            <span>{change >= 0 ? '↑' : '↓'}</span>
            <span>{change >= 0 ? '+' : ''}{change.toFixed(0)}%</span>
          </p>
        )}
      </div>
    </div>
  );
}

export function MoreMetricsStrip({ data }: { data: AdminDashboardSummary }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br via-card to-card p-5 shadow-sm sm:p-6 transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold tracking-tight text-foreground">Financial & Operational Metrics</p>
        <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">Overview</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
  );
}
