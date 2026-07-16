'use client';

import type { LucideIcon } from 'lucide-react';
import { useCountUp } from '@/hooks/use-count-up';
import { cn } from '@/lib/utils';

const GRADIENTS = {
  primary: 'from-primary via-blue-600 to-indigo-700',
  purple: 'from-purple via-violet-600 to-purple-800',
  success: 'from-success via-emerald-600 to-emerald-800',
  indigo: 'from-indigo-500 via-purple-600 to-purple-700',
} as const;

export function HeroKpiCard({
  label,
  value,
  formatValue = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  prefix,
  subtitle,
  icon: Icon,
  gradient,
  progress,
}: {
  label: string;
  value: number;
  formatValue?: (n: number) => string;
  prefix?: string;
  subtitle?: string;
  icon: LucideIcon;
  gradient: keyof typeof GRADIENTS;
  progress?: { pct: number; label: string };
}) {
  const animated = useCountUp(value);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[24px] bg-gradient-to-br p-6 text-white shadow-lg shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10',
        GRADIENTS[gradient],
      )}
    >
      {/* glass highlight */}
      <div className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-white/10 blur-2xl transition-transform duration-500 group-hover:scale-110" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full bg-white/5 blur-2xl" />
      <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-gradient-to-b from-white/10 via-transparent to-transparent" />

      <div className="relative flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-white/70">{label}</p>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
          <Icon className="size-5" />
        </div>
      </div>

      <p className="relative mt-4 break-words text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
        {prefix}
        {formatValue(animated)}
      </p>

      {subtitle && <p className="relative mt-1.5 break-words text-xs text-white/70">{subtitle}</p>}

      {progress && (
        <div className="relative mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-700 ease-out"
              style={{ width: `${Math.min(Math.max(progress.pct, 0), 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-white/70">{progress.label}</p>
        </div>
      )}
    </div>
  );
}
