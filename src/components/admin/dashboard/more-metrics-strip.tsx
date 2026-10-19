'use client';

import { ArrowDownRight, ArrowUpRight, BarChart3, IndianRupee, Landmark, Truck, Undo2, Wallet } from 'lucide-react';
import { PanelTitle } from '@/components/admin/dashboard/panel-icon';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { AdminDashboardSummary } from '@/lib/api/types';

const TONES = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  purple: 'bg-purple/10 text-purple',
  rose: 'bg-destructive/10 text-destructive',
} as const;

function MetricTile({
  label,
  value,
  icon: Icon,
  change,
  hint,
  tone = 'primary',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  change?: number | null;
  /** A short secondary line under the value. */
  hint?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-border bg-gradient-to-br from-muted/60 to-card p-3 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:flex-row sm:gap-3">
      <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
        {hint && <p className="mt-0.5 break-words text-[11px] text-muted-foreground tabular-nums">{hint}</p>}
        {typeof change === 'number' && (
          <span
            className={cn(
              'mt-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
              change >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
            )}
          >
            {change >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {change >= 0 ? '+' : ''}
            {change.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function MoreMetricsStrip({ data }: { data: AdminDashboardSummary }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>
            <PanelTitle icon={BarChart3} tone="primary">
              Financial &amp; Operational Metrics
            </PanelTitle>
          </CardTitle>
          <CardDescription className="pl-[42px] text-xs">Change shown vs last month where available</CardDescription>
        </div>
        <Badge variant="muted">Live Summary</Badge>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
            label="Net cash flow (this month)"
            value={formatCurrency(data.netCashFlow)}
            icon={Landmark}
            // netCashFlow is the whole month's change in Liquid Cash, capital
            // included; operatingCashFlow strips investments, withdrawals and
            // adjustments back out.
            hint={
              typeof data.operatingCashFlow === 'number'
                ? `Operating (excl. capital): ${formatCurrency(data.operatingCashFlow)}`
                : 'Change in Liquid Cash this month'
            }
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
      </CardContent>
    </Card>
  );
}
