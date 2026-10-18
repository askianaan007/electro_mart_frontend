import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  purple: 'bg-purple/10 text-purple',
  info: 'bg-info/10 text-info',
} as const;

/** Small tinted icon shown before a dashboard panel's title. */
export function PanelTitle({
  icon: Icon,
  tone = 'primary',
  children,
}: {
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">{children}</span>
    </span>
  );
}
