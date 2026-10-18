import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api/error';
import { cn } from '@/lib/utils';

/**
 * A failed query resolves to `isLoading: false, data: undefined` — the same
 * shape as "genuinely empty" or (for a detail page) the same shape as
 * "still loading" if that's the only condition checked. Render this before
 * falling through to a loading/empty check so a fetch failure never gets
 * silently mistaken for either.
 */
export function QueryErrorState({
  error,
  onRetry,
  title = "Couldn't load this data",
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-3 px-4 py-14 text-center', className)}>
      <div className="flex size-11 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <div className="max-w-md space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RefreshCw />
          Try again
        </Button>
      )}
    </div>
  );
}
