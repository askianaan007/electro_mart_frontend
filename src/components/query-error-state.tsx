import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api/error';

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
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-4 py-16 text-center ${className ?? ''}`}>
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Couldn&apos;t load this data</p>
        <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
