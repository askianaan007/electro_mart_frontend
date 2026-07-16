'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/utils';

export function RevenueChart({ data }: { data: { month: string; revenue: string }[] }) {
  const chartData = data.map((point) => ({
    month: new Date(`${point.month}-02`).toLocaleDateString('en-IN', { month: 'short' }),
    revenue: Number(point.revenue),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" stroke="var(--color-muted-foreground)" />
        <YAxis
          tickLine={false}
          axisLine={false}
          className="text-xs"
          stroke="var(--color-muted-foreground)"
          tickFormatter={(value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : String(value))}
          width={40}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          cursor={{ stroke: 'var(--color-primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
          contentStyle={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            fontSize: 12,
            boxShadow: '0 8px 24px -8px rgb(0 0 0 / 0.15)',
          }}
        />
        <Area
          type="natural"
          dataKey="revenue"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          fill="url(#revenueFill)"
          activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-card)' }}
          animationDuration={900}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
