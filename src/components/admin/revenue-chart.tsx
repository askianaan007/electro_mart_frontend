'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/utils';

export function RevenueChart({ data }: { data: { month: string; revenue: string }[] }) {
  const chartData = data.map((point) => ({
    month: new Date(`${point.month}-02`).toLocaleDateString('en-IN', { month: 'short' }),
    fullMonth: new Date(`${point.month}-02`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    revenue: Number(point.revenue),
  }));

  const formatYAxis = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
    return `₹${value}`;
  };

  return (
    <div className="relative w-full select-none">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -5, bottom: 0 }}
          accessibilityLayer
          aria-label="Revenue chart timeline"
        >
          <defs>
            <linearGradient id="revenueAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />

          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            dy={6}
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickFormatter={formatYAxis}
            width={52}
          />

          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="min-w-[150px] space-y-1 rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md">
                    <p className="text-xs text-muted-foreground">{item.fullMonth}</p>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--chart-1)' }} />
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(item.revenue)}</p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
            cursor={{
              stroke: 'var(--border)',
              strokeWidth: 1,
            }}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#revenueAreaFill)"
            activeDot={{
              r: 4,
              strokeWidth: 2,
              stroke: 'var(--chart-1)',
              fill: 'var(--card)',
            }}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
