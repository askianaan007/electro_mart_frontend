import { TrendingDown, TrendingUp } from 'lucide-react';
import { RevenueChart } from '@/components/admin/revenue-chart';
import { cn, formatCurrency } from '@/lib/utils';

type RevenuePoint = { month: string; revenue: string };

function monthLabel(month: string) {
  return new Date(`${month}-02`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function RevenueAnalyticsCard({ data }: { data: RevenuePoint[] }) {
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
    data.length > 0 ? `${monthLabel(data[0].month)} to ${monthLabel(data[data.length - 1].month)}` : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Revenue Analytics</h3>
          <p className="text-xs text-muted-foreground">
            Monthly revenue trend{rangeLabel ? `, ${rangeLabel}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-success">
          <TrendingUp className="size-3.5" aria-hidden="true" />
          <span className="text-xs font-semibold">{formatCurrency(total)} total</span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-4 sm:grid-cols-3">
        <div>
          <dt className="text-[11px] font-medium text-muted-foreground">Monthly average</dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">{formatCurrency(average)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-muted-foreground">Peak month</dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">
            {formatCurrency(peakValue)}
            {peakMonth && <span className="ml-1 font-normal text-muted-foreground">({peakMonth})</span>}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-muted-foreground">Vs previous month</dt>
          {growthPct === null ? (
            <dd className="mt-0.5 text-sm font-semibold text-muted-foreground">Not enough data</dd>
          ) : (
            <dd
              className={cn(
                'mt-0.5 flex items-center gap-1 text-sm font-semibold',
                growthPct >= 0 ? 'text-success' : 'text-destructive',
              )}
            >
              {growthPct >= 0 ? (
                <TrendingUp className="size-3.5" aria-hidden="true" />
              ) : (
                <TrendingDown className="size-3.5" aria-hidden="true" />
              )}
              <span>
                {growthPct >= 0 ? 'Up' : 'Down'} {Math.abs(growthPct).toFixed(1)}%
              </span>
            </dd>
          )}
        </div>
      </dl>

      <div className="mt-4">
        <p className="mb-1 text-[11px] font-medium text-muted-foreground">Revenue by month</p>
        <RevenueChart data={data} />
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer list-none rounded text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          View underlying data as a table
        </summary>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Monthly revenue totals, {rangeLabel ?? 'no data available'}</caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">
                  Month
                </th>
                <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-2 text-muted-foreground">
                    No revenue recorded yet
                  </td>
                </tr>
              ) : (
                data.map((point) => (
                  <tr key={point.month} className="border-t border-border">
                    <th scope="row" className="px-3 py-2 font-normal text-foreground">
                      {monthLabel(point.month)}
                    </th>
                    <td className="px-3 py-2 text-foreground">{formatCurrency(point.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
