'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import type { Role } from '@/lib/api/types';

function FullscreenLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function AuthGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!accessToken || !user) {
      router.replace('/login');
      return;
    }

    if (user.role !== role) {
      router.replace(user.role === 'ADMIN' ? '/admin/dashboard' : '/dealer/dashboard');
    }
  }, [hasHydrated, accessToken, user, role, router]);

  if (!hasHydrated || !accessToken || !user || user.role !== role) {
    return <FullscreenLoader />;
  }

  return <>{children}</>;
}
