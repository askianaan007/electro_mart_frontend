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
    <div className="relative w-full select-none pt-2">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart
          data={chartData}
          margin={{ top: 15, right: 15, left: -5, bottom: 5 }}
          accessibilityLayer
          aria-label="Revenue chart timeline"
        >
          <defs>
            <linearGradient id="revenueGlowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.45} />
              <stop offset="50%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="4 4"
            vertical={false}
            stroke="var(--color-border)"
            opacity={0.35}
          />

          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            className="text-[11px] font-semibold"
            stroke="var(--color-muted-foreground)"
            dy={8}
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            className="text-[11px] font-medium"
            stroke="var(--color-muted-foreground)"
            tickFormatter={formatYAxis}
            width={52}
          />

          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-2xl border border-border/80 bg-card/90 dark:bg-slate-900/90 p-3.5 backdrop-blur-xl shadow-2xl space-y-1 min-w-[150px]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {item.fullMonth}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                      <p className="text-sm font-extrabold text-foreground">
                        {formatCurrency(item.revenue)}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
            cursor={{
              stroke: 'var(--color-primary, #3b82f6)',
              strokeWidth: 1.5,
              strokeDasharray: '4 4',
              opacity: 0.7,
            }}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="var(--color-primary, #3b82f6)"
            strokeWidth={3}
            fill="url(#revenueGlowGradient)"
            activeDot={{
              r: 6,
              strokeWidth: 3,
              stroke: 'var(--color-primary, #3b82f6)',
              fill: 'var(--color-card, #ffffff)',
              className: 'shadow-lg',
            }}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
