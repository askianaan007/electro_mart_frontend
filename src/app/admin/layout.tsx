import { AuthGuard } from '@/components/auth-guard';
import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="ADMIN">
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}
