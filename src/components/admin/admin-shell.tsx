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
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card print:hidden lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple text-primary-foreground shadow-sm shadow-primary/30">
            <Zap className="size-4.5" />
          </div>
          <span className="font-semibold tracking-tight">Electro Mart</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav groups={adminNavGroups} />
        </div>
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" title="Navigation" className="w-72 gap-0 p-0">
          <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple text-primary-foreground shadow-sm shadow-primary/30">
              <Zap className="size-4.5" />
            </div>
            <span className="font-semibold tracking-tight">Electro Mart</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav groups={adminNavGroups} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col print:min-w-full">
        <div className="print:hidden">
          <Topbar
            onMenuClick={() => setMobileNavOpen(true)}
            showLogo
            notificationCount={data?.pendingApprovals}
          />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
