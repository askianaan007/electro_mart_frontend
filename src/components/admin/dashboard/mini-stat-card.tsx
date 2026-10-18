'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TONES = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  purple: 'bg-purple/10 text-purple',
} as const;

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

  const content = (
    <Card
      className={cn(
        'flex h-full items-center gap-3.5 p-4',
        interactive && 'transition-colors group-hover/stat:border-primary/40 group-hover/stat:bg-muted/30',
      )}
    >
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
        <Icon className="size-[18px]" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>
        <p className="break-words text-lg font-semibold leading-tight tracking-tight text-foreground tabular-nums">
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

      {interactive && (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover/stat:text-primary" />
      )}
    </Card>
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
