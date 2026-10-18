'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { useCountUp } from '@/hooks/use-count-up';
import { cn } from '@/lib/utils';

/**
 * `gradient` is kept as the public prop name for compatibility; each value
 * maps to a semantic tone that colours the card's accent bar, tint, icon and
 * watermark so every KPI is recognisable at a glance.
 */
const VARIANTS = {
  orange: {
    tint: 'from-warning/[0.09]',
    accent: 'bg-warning',
    chip: 'bg-warning text-white shadow-warning/30',
    mark: 'text-warning',
    bar: 'bg-warning',
    hover: 'group-hover/kpi:border-warning/40',
  },
  red: {
    tint: 'from-destructive/[0.08]',
    accent: 'bg-destructive',
    chip: 'bg-destructive text-white shadow-destructive/30',
    mark: 'text-destructive',
    bar: 'bg-destructive',
    hover: 'group-hover/kpi:border-destructive/40',
  },
  green: {
    tint: 'from-success/[0.09]',
    accent: 'bg-success',
    chip: 'bg-success text-white shadow-success/30',
    mark: 'text-success',
    bar: 'bg-success',
    hover: 'group-hover/kpi:border-success/40',
  },
  blue: {
    tint: 'from-primary/[0.08]',
    accent: 'bg-primary',
    chip: 'bg-primary text-white shadow-primary/30',
    mark: 'text-primary',
    bar: 'bg-primary',
    hover: 'group-hover/kpi:border-primary/40',
  },
  purple: {
    tint: 'from-purple/[0.09]',
    accent: 'bg-purple',
    chip: 'bg-purple text-white shadow-purple/30',
    mark: 'text-purple',
    bar: 'bg-purple',
    hover: 'group-hover/kpi:border-purple/40',
  },
  teal: {
    tint: 'from-info/[0.09]',
    accent: 'bg-info',
    chip: 'bg-info text-white shadow-info/30',
    mark: 'text-info',
    bar: 'bg-info',
    hover: 'group-hover/kpi:border-info/40',
  },
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
  featured = false,
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
  /** The headline metric: rendered on the brand navy surface. */
  featured?: boolean;
}) {
  const animated = useCountUp(value);
  const v = VARIANTS[gradient];
  const interactive = Boolean(href || onClick);

  const card = (
    <div
      className={cn(
        'relative isolate flex h-full flex-col overflow-hidden rounded-xl border p-4 transition-[transform,box-shadow,border-color] duration-200 ease-out sm:p-5',
        featured
          ? 'border-white/10 bg-brand-navy text-white shadow-lg shadow-brand-navy/25'
          : cn('border-border bg-card bg-gradient-to-br via-card to-card shadow-xs', v.tint, interactive && v.hover),
        interactive &&
          'group-hover/kpi:-translate-y-0.5 group-hover/kpi:shadow-lg group-active/kpi:translate-y-0 group-active/kpi:scale-[0.99]',
      )}
    >
      {featured ? (
        <>
          {/* Soft light blooms on the navy surface */}
          <span aria-hidden className="absolute -right-16 -top-20 -z-10 size-56 rounded-full bg-primary/40 blur-3xl" />
          <span aria-hidden className="absolute -bottom-24 -left-10 -z-10 size-48 rounded-full bg-brand-red/20 blur-3xl" />
        </>
      ) : (
        <span aria-hidden className={cn('absolute inset-x-0 top-0 h-[3px]', v.accent)} />
      )}
      {/* Watermark icon */}
      <Icon
        aria-hidden
        className={cn(
          'pointer-events-none absolute -bottom-5 -right-4 -z-10 size-28 rotate-[-12deg] transition-transform duration-500 ease-out group-hover/kpi:-rotate-6 group-hover/kpi:scale-110',
          featured ? 'text-white/[0.06]' : cn(v.mark, 'opacity-[0.07]'),
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <p className={cn('min-w-0 truncate pt-1 text-[13px] font-medium', featured ? 'text-white/70' : 'text-muted-foreground')}>
          {label}
        </p>
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl shadow-md transition-transform duration-300 ease-out group-hover/kpi:scale-105',
            featured ? 'bg-white/10 text-white ring-1 ring-white/15 shadow-black/20' : v.chip,
          )}
        >
          <Icon className="size-[18px]" />
        </div>
      </div>

      <p
        className={cn(
          'mt-2 break-words text-[1.65rem] font-semibold leading-tight tracking-tight tabular-nums',
          featured ? 'text-white' : 'text-foreground',
        )}
      >
        {prefix}
        {formatValue(animated)}
      </p>
      {subtitle && (
        <p className={cn('mt-1.5 break-words text-xs leading-relaxed', featured ? 'text-white/60' : 'text-muted-foreground')}>
          {subtitle}
        </p>
      )}

      {progress && (
        <div className="mt-auto pt-3">
          <div className={cn('h-1.5 w-full overflow-hidden rounded-full', featured ? 'bg-white/15' : 'bg-muted')}>
            <div
              className={cn('h-full rounded-full transition-[width] duration-1000 ease-out', featured ? 'bg-white' : v.bar)}
              style={{ width: `${Math.min(Math.max(progress.pct, 0), 100)}%` }}
            />
          </div>
          <p className={cn('mt-1.5 text-xs tabular-nums', featured ? 'text-white/60' : 'text-muted-foreground')}>
            {progress.label}
          </p>
        </div>
      )}

      {interactive && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-medium transition-colors',
            progress ? 'pt-2' : 'mt-auto pt-3',
            featured ? 'text-white/70 group-hover/kpi:text-white' : 'text-muted-foreground group-hover/kpi:text-foreground',
          )}
        >
          {href ? 'Open history' : 'View breakdown'}
          {href ? (
            <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover/kpi:-translate-y-px group-hover/kpi:translate-x-px" />
          ) : (
            <ChevronRight className="size-3.5 transition-transform duration-200 group-hover/kpi:translate-x-0.5" />
          )}
        </div>
      )}
    </div>
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
