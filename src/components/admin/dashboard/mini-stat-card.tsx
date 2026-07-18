import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  primary: { chip: 'bg-primary/10 text-primary', bar: 'bg-primary' },
  success: { chip: 'bg-success/10 text-success', bar: 'bg-success' },
  warning: { chip: 'bg-warning/15 text-warning-foreground', bar: 'bg-warning' },
  destructive: { chip: 'bg-destructive/10 text-destructive', bar: 'bg-destructive' },
  purple: { chip: 'bg-purple/10 text-purple', bar: 'bg-purple' },
} as const;

export function MiniStatCard({
  label,
  value,
  icon: Icon,
  tone,
  change,
  changeLabel,
  href,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  change?: number | null;
  changeLabel?: string;
  href?: string;
}) {
  const t = TONES[tone];

  const content = (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <span className={cn('absolute inset-y-0 left-0 w-1 rounded-r-full', t.bar)} />
      <div className="flex items-start gap-3 pl-1.5">
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', t.chip)}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 break-words text-xl font-bold leading-tight text-foreground">{value}</p>
          {typeof change === 'number' && (
            <p className={cn('mt-0.5 text-xs font-medium', change >= 0 ? 'text-success' : 'text-destructive')}>
              {change >= 0 ? '+' : ''}
              {change.toFixed(0)}%{changeLabel ? ` ${changeLabel}` : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
