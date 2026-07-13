'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarNav } from '@/components/shell/sidebar-nav';
import { Topbar } from '@/components/shell/topbar';
import { adminNavGroups } from '@/components/admin/admin-nav-items';
import { useAdminDashboard } from '@/hooks/use-dashboard';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data } = useAdminDashboard();

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4.5" />
          </div>
          <span className="font-semibold">Electro Mart</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav groups={adminNavGroups} />
        </div>
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" title="Navigation" className="w-72 p-0">
          <div className="flex h-14 items-center gap-2 border-b border-border px-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-4.5" />
            </div>
            <span className="font-semibold">Electro Mart</span>
          </div>
          <SidebarNav groups={adminNavGroups} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onMenuClick={() => setMobileNavOpen(true)}
          showLogo
          notificationCount={data?.pendingApprovals}
        />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
