import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'default' | 'warning' | 'destructive' | 'success';
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-lg',
            tone === 'default' && 'bg-primary/10 text-primary',
            tone === 'warning' && 'bg-warning/20 text-warning-foreground',
            tone === 'destructive' && 'bg-destructive/10 text-destructive',
            tone === 'success' && 'bg-success/15 text-success',
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-semibold">{value}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
