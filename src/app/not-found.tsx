import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-border bg-card shadow-xs">
          <FileQuestion className="size-6 text-muted-foreground" />
        </div>
        <p className="mt-5 text-sm font-semibold text-primary">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Go to home</Link>
        </Button>
      </div>
    </div>
  );
}
