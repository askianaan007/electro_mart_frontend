import { AuthGuard } from '@/components/auth-guard';
import { DealerShell } from '@/components/dealer/dealer-shell';

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="DEALER">
      <DealerShell>{children}</DealerShell>
    </AuthGuard>
  );
}
