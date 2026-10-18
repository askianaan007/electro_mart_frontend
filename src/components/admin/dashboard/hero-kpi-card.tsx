'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useCountUp } from '@/hooks/use-count-up';
import { cn } from '@/lib/utils';

/**
 * `gradient` is kept as the public prop name for compatibility; each value
 * now maps to a semantic tone instead of a decorative gradient.
 */
const VARIANTS = {
  orange: { chip: 'bg-warning/10 text-warning', bar: 'bg-warning' },
  red: { chip: 'bg-destructive/10 text-destructive', bar: 'bg-destructive' },
  green: { chip: 'bg-success/10 text-success', bar: 'bg-success' },
  blue: { chip: 'bg-primary/10 text-primary', bar: 'bg-primary' },
  purple: { chip: 'bg-purple/10 text-purple', bar: 'bg-purple' },
  teal: { chip: 'bg-info/10 text-info', bar: 'bg-info' },
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
  href,
  onClick,
}: {
  label: string;
  value: number;
  formatValue?: (n: number) => string;
  prefix?: string;
  subtitle?: string;
  icon: LucideIcon;
  gradient: keyof typeof VARIANTS;
  /** Decorative label from the previous card design; no longer rendered. */
  mask?: string;
  progress?: { pct: number; label: string };
  /** When set, the whole card becomes a link that opens in a new tab. */
  href?: string;
  /** When set (and href is not), the whole card becomes a button — e.g. to open a breakdown dialog. */
  onClick?: () => void;
}) {
  const animated = useCountUp(value);
  const v = VARIANTS[gradient];
  const interactive = Boolean(href || onClick);

  const card = (
    <Card
      className={cn(
        'flex h-full flex-col p-4 sm:p-5',
        interactive && 'transition-colors group-hover/kpi:border-primary/40 group-hover/kpi:bg-muted/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>
          {interactive && (
            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover/kpi:text-primary" />
          )}
        </div>
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', v.chip)}>
          <Icon className="size-[18px]" />
        </div>
      </div>
      <p className="mt-1 break-words text-2xl font-semibold leading-tight tracking-tight text-foreground tabular-nums">
        {prefix}
        {formatValue(animated)}
      </p>
      {subtitle && <p className="mt-1.5 break-words text-xs text-muted-foreground">{subtitle}</p>}

      {progress && (
        <div className="mt-auto pt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-[width] duration-700 ease-out', v.bar)}
              style={{ width: `${Math.min(Math.max(progress.pct, 0), 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">{progress.label}</p>
        </div>
      )}
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={`Open full ${label} history in a new tab`}
        className="group/kpi block h-full rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
      >
        {card}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group/kpi block h-full w-full rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
      >
        {card}
      </button>
    );
  }

  return card;
}
