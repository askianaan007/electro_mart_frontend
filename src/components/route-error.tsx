'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Shared body for the app's error.tsx boundaries. */
export function RouteError({
  error,
  reset,
  homeHref,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10">
          <AlertTriangle className="size-6 text-destructive" />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          An unexpected error stopped this page from loading. Your data is safe — try again, or go back to the
          dashboard.
        </p>
        {error.digest && <p className="mt-3 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>}
        <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
          <Button variant="outline" asChild>
            <Link href={homeHref}>Back to dashboard</Link>
          </Button>
          <Button onClick={reset}>
            <RefreshCw />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
