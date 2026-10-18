'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// How long the splash stays fully visible before fading. Kept as an export for
// any caller that wants to sync an entrance animation with it.
export const SPLASH_HOLD_MS = 1100;
const SPLASH_FADE_MS = 300;

/**
 * Optional brief brand splash. The login page no longer renders it (sign-in
 * should be instant), but it is kept as a calm, token-based component.
 */
export function LoginSplash() {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setVisible(false), SPLASH_HOLD_MS);
    const unmountTimer = setTimeout(() => setMounted(false), SPLASH_HOLD_MS + SPLASH_FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background transition-opacity duration-300 ease-out',
        !visible && 'pointer-events-none opacity-0',
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-xl border border-border bg-card shadow-xs">
        <Image src="/logo-icon.png" alt="" width={40} height={40} className="size-9" priority />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        Loading…
      </div>
    </div>
  );
}
