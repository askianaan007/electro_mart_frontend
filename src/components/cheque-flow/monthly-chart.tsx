'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { monthLabel, shortMonthLabel } from '@/lib/cheque-flow';
import { cn, formatCurrency } from '@/lib/utils';
import type { ChequeFlowMonthly } from '@/lib/api/types';

const compact = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1_000_000 ? `${(a / 1_000_000).toFixed(1)}M` : a >= 1000 ? `${Math.round(a / 1000)}k` : `${a}`;
  return v < 0 ? `-${s}` : s;
};

/** Receipts vs payments per month (pending + cleared), with the net as a line. */
export function MonthlyChart({
  data,
  selectedMonth,
  onSelectMonth,
}: {
  data: ChequeFlowMonthly | undefined;
  selectedMonth: string | null;
  onSelectMonth: (month: string) => void;
}) {
  if (!data) return <Skeleton className="h-[320px] rounded-xl" />;
  const rows = data.months.map((m) => ({ ...m, label: shortMonthLabel(m.month) }));
  const empty = rows.every((r) => !r.receipts && !r.payments);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Receipts vs payments by month</h3>
          <p className="text-xs text-muted-foreground">
            Pending + cleared cheques. Bounced and cancelled are left out. Tap a month to open it.
            {data.filtered && <span className="font-medium text-warning-foreground dark:text-warning"> Filtered.</span>}
          </p>
        </div>
      </div>
      {empty ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No cheques in these months yet.</p>
      ) : (
        <div className="h-[280px] w-full select-none">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={rows}
              margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
              onClick={(state) => {
                const label = (state as { activeLabel?: string } | null)?.activeLabel;
                const row = rows.find((r) => r.label === label);
                if (row) onSelectMonth(row.month);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                tick={({ x, y, payload }) => {
                  const row = rows.find((r) => r.label === payload.value);
                  const active = row?.month === selectedMonth;
                  return (
                    <text
                      x={x}
                      y={Number(y) + 12}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={active ? 700 : 400}
                      fill={active ? 'var(--foreground)' : 'var(--muted-foreground)'}
                    >
                      {payload.value}
                    </text>
                  );
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                tickFormatter={compact}
                width={48}
              />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Tooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const m = payload[0].payload as (typeof rows)[number];
                  return (
                    <div className="min-w-[190px] space-y-1 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                      <p className="font-medium">{monthLabel(m.month)}</p>
                      <Line2
                        label="Receipts"
                        value={m.receipts}
                        sub={`pending ${formatCurrency(m.receiptsPending)}`}
                        className="text-success"
                      />
                      <Line2
                        label="Payments"
                        value={m.payments}
                        sub={`pending ${formatCurrency(m.paymentsPending)}`}
                        className="text-warning-foreground dark:text-warning"
                      />
                      <Line2 label="Net" value={m.net} className={m.net < 0 ? 'text-destructive' : 'text-success'} />
                    </div>
                  );
                }}
              />
              <Legend verticalAlign="top" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="receipts"
                name="Receipts"
                fill="var(--success)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                cursor="pointer"
              />
              <Bar
                dataKey="payments"
                name="Payments"
                fill="var(--warning)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                cursor="pointer"
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net"
                stroke="var(--destructive)"
                strokeWidth={2}
                dot={{ r: 2.5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function Line2({ label, value, sub, className }: { label: string; value: number; sub?: string; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className={cn('font-semibold tabular-nums', className)}>{formatCurrency(value)}</span>
        {sub && <span className="block text-[10px] text-muted-foreground">{sub}</span>}
      </span>
    </div>
  );
}
