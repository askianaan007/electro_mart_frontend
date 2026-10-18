import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, ChevronRight, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TONES = {
  default: 'bg-primary/10 text-primary',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  purple: 'bg-purple/10 text-purple',
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
  change,
  changeLabel,
  href,
  className,
  valueClassName,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  hint?: string;
  /** Percentage change vs. the prior period, e.g. 22 renders as "+22%" */
  change?: number;
  /** Suffix shown after the change badge, e.g. "vs Last Month" */
  changeLabel?: string;
  /** When provided, renders a small "View all" link */
  href?: string;
  className?: string;
  /** Extra classes for the value, e.g. text-destructive for a negative figure. */
  valueClassName?: string;
}) {
  const up = typeof change === 'number' && change >= 0;
  return (
    <Card className={cn('p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
          <Icon className="size-[18px]" />
        </div>
      </div>
      <p className={cn('mt-1 break-words text-2xl font-semibold leading-tight tracking-tight tabular-nums', valueClassName)}>
        {value}
      </p>
      {(typeof change === 'number' || hint || href) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {typeof change === 'number' && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums',
                up ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
              )}
            >
              {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {up ? '+' : ''}
              {change.toFixed(0)}%
            </span>
          )}
          {changeLabel && typeof change === 'number' && <span className="text-muted-foreground">{changeLabel}</span>}
          {hint && <span className="text-muted-foreground">{hint}</span>}
          {href && (
            <Link href={href} className="ml-auto inline-flex items-center font-medium text-primary hover:underline">
              View all
              <ChevronRight className="size-3.5" />
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
