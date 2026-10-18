'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

export default function RootPage() {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.replace('/login');
    } else {
      router.replace(user.role === 'ADMIN' ? '/admin/dashboard' : '/dealer/dashboard');
    }
  }, [hasHydrated, user, router]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background" aria-busy="true">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" />
        Loading…
      </div>
    </div>
  );
}
