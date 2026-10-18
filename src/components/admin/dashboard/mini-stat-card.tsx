'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  primary: { chip: 'bg-primary/10 text-primary', stripe: 'bg-primary', hover: 'group-hover/stat:border-primary/40' },
  success: { chip: 'bg-success/10 text-success', stripe: 'bg-success', hover: 'group-hover/stat:border-success/40' },
  warning: { chip: 'bg-warning/10 text-warning', stripe: 'bg-warning', hover: 'group-hover/stat:border-warning/40' },
  destructive: {
    chip: 'bg-destructive/10 text-destructive',
    stripe: 'bg-destructive',
    hover: 'group-hover/stat:border-destructive/40',
  },
  purple: { chip: 'bg-purple/10 text-purple', stripe: 'bg-purple', hover: 'group-hover/stat:border-purple/40' },
} as const;

/**
 * Secondary metric tile. Phones: compact stacked tile (two per row).
 * From sm: icon beside the value. A coloured stripe on the left keys the tone.
 */
export function MiniStatCard({
  label,
  value,
  icon: Icon,
  tone,
  change,
  changeLabel,
  href,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  change?: number | null;
  changeLabel?: string;
  href?: string;
  onClick?: () => void;
}) {
  const interactive = Boolean(href || onClick);
  const t = TONES[tone];

  const content = (
    <div
      className={cn(
        'relative flex h-full flex-col gap-2.5 overflow-hidden rounded-xl border border-border bg-card p-3.5 shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out sm:flex-row sm:items-center sm:gap-3.5 sm:p-4',
        interactive &&
          cn(
            'group-hover/stat:-translate-y-0.5 group-hover/stat:shadow-md group-active/stat:translate-y-0 group-active/stat:scale-[0.99]',
            t.hover,
          ),
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-3 left-0 w-[3px] rounded-r-full', t.stripe)} />

      <div className="flex items-center justify-between gap-2 sm:contents">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover/stat:scale-105 sm:size-10',
            t.chip,
          )}
        >
          <Icon className="size-[18px]" />
        </div>
        {interactive && (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-[color,transform] duration-200 group-hover/stat:translate-x-0.5 group-hover/stat:text-foreground sm:order-last" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-muted-foreground sm:text-[13px]">{label}</p>
        <p className="break-words text-base font-semibold leading-tight tracking-tight text-foreground tabular-nums sm:text-lg">
          {value}
        </p>
        {typeof change === 'number' && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums',
                change >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
              )}
            >
              {change >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {change >= 0 ? '+' : ''}
              {change.toFixed(0)}%
            </span>
            {changeLabel && <span className="truncate text-muted-foreground">{changeLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group/stat block h-full rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group/stat block h-full w-full rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
      >
        {content}
      </button>
    );
  }

  return content;
}
