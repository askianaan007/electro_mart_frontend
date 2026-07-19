'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// How long the splash stays fully visible before fading — shared with the
// page's own entrance animations via the --login-splash-hold CSS variable
// (set on the page root) so the form doesn't start rising in until the
// splash has actually started clearing out of the way.
export const SPLASH_HOLD_MS = 900;
const SPLASH_FADE_MS = 500;

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
        'login-splash fixed inset-0 z-50 flex items-center justify-center bg-[#050810]',
        !visible && 'pointer-events-none opacity-0',
      )}
    >
      <div className="relative flex size-28 items-center justify-center">
        <span className="login-splash-ring absolute inset-0 rounded-full border-2 border-primary/60" />
        <span
          className="login-splash-ring absolute inset-0 rounded-full border-2 border-red-500/50"
          style={{ animationDelay: '0.6s' }}
        />
        <Image
          src="/logo-icon.png"
          alt=""
          width={72}
          height={72}
          className="login-splash-logo relative size-14 drop-shadow-[0_0_20px_rgba(59,130,246,0.45)] sm:size-16"
          priority
        />
      </div>
    </div>
  );
}
