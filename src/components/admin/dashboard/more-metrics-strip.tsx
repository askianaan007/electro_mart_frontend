'use client';

import { ArrowDownRight, ArrowUpRight, IndianRupee, Landmark, Truck, Undo2, Wallet } from 'lucide-react';
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
  tone = 'primary',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  change?: number | null;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', TONES[tone])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
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
          <CardTitle>Financial &amp; Operational Metrics</CardTitle>
          <CardDescription className="text-xs">Change shown vs last month where available</CardDescription>
        </div>
        <Badge variant="muted">Live Summary</Badge>
      </CardHeader>

      <CardContent>
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
      </CardContent>
    </Card>
  );
}
