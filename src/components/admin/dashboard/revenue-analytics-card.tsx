'use client';

import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronDown, LineChart, Table as TableIcon } from 'lucide-react';
import { PanelTitle } from '@/components/admin/dashboard/panel-icon';
import { RevenueChart } from '@/components/admin/revenue-chart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn, formatCurrency } from '@/lib/utils';

type RevenuePoint = { month: string; revenue: string };

function monthLabel(month: string) {
  return new Date(`${month}-02`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function SummaryTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-gradient-to-br from-muted/60 to-card px-3 py-2.5 transition-colors hover:border-primary/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

export function RevenueAnalyticsCard({ data }: { data: RevenuePoint[] }) {
  const [showTable, setShowTable] = useState(false);

  const values = data.map((point) => Number(point.revenue));
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = data.length > 0 ? total / data.length : 0;

  let peakIndex = 0;
  values.forEach((value, index) => {
    if (value > values[peakIndex]) peakIndex = index;
  });
  const peakValue = data.length > 0 ? values[peakIndex] : 0;
  const peakMonth = data.length > 0 ? monthLabel(data[peakIndex].month) : null;

  const last = values[values.length - 1];
  const previous = values[values.length - 2];
  const hasTrend = values.length >= 2;
  const growthPct = hasTrend ? (previous === 0 ? (last > 0 ? 100 : 0) : ((last - previous) / previous) * 100) : null;

  const rangeLabel =
    data.length > 0 ? `${monthLabel(data[0].month)} – ${monthLabel(data[data.length - 1].month)}` : null;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>
            <PanelTitle icon={LineChart} tone="primary">
              Revenue Analytics
            </PanelTitle>
          </CardTitle>
          {rangeLabel && <CardDescription className="pl-[42px] text-xs">{rangeLabel}</CardDescription>}
        </div>
        <Badge variant="outline" className="tabular-nums">
          {formatCurrency(total)} Total
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryTile label="Monthly Average">
            <p className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(average)}</p>
          </SummaryTile>

          <SummaryTile label="Peak Revenue Month">
            <div className="flex items-baseline gap-1 truncate">
              <span className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(peakValue)}</span>
              {peakMonth && <span className="truncate text-xs text-muted-foreground">({peakMonth})</span>}
            </div>
          </SummaryTile>

          <SummaryTile label="Vs Previous Month">
            {growthPct === null ? (
              <p className="text-sm text-muted-foreground">Not enough data</p>
            ) : (
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums',
                    growthPct >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
                  )}
                >
                  {growthPct >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {growthPct >= 0 ? '+' : ''}
                  {growthPct.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">{growthPct >= 0 ? 'Growth' : 'Decline'}</span>
              </div>
            )}
          </SummaryTile>
        </div>

        <RevenueChart data={data} />

        <div className="border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTable((prev) => !prev)}
            aria-expanded={showTable}
            className="-ml-2 text-primary hover:text-primary"
          >
            <TableIcon className="size-3.5" />
            {showTable ? 'Hide underlying data table' : 'View underlying data as a table'}
            <ChevronDown className={cn('size-3.5 transition-transform duration-200', showTable && 'rotate-180')} />
          </Button>

          {showTable && (
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                        No revenue recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((point) => (
                      <TableRow key={point.month}>
                        <TableCell>{monthLabel(point.month)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(point.revenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
