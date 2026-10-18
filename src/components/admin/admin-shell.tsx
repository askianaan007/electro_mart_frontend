'use client';

import { useMemo, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarNav } from '@/components/shell/sidebar-nav';
import { Topbar } from '@/components/shell/topbar';
import { Brand } from '@/components/shell/brand';
import { adminNavGroups } from '@/components/admin/admin-nav-items';
import { useAdminDashboard } from '@/hooks/use-dashboard';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data } = useAdminDashboard();

  const searchItems = useMemo(
    () => adminNavGroups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))),
    [],
  );

  return (
    <div className="flex min-h-svh bg-background text-foreground print:block">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar print:hidden lg:flex xl:w-64">
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border bg-gradient-to-b from-brand-navy/[0.04] to-transparent px-4 dark:from-white/[0.03]">
          <Brand subtitle="Admin console" href="/admin/dashboard" />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <SidebarNav groups={adminNavGroups} />
        </div>
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" title="Admin navigation" className="w-72 max-w-[85vw] gap-0 bg-sidebar p-0">
          <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border bg-gradient-to-b from-brand-navy/[0.04] to-transparent px-4 dark:from-white/[0.03]">
            <Brand subtitle="Admin console" href="/admin/dashboard" />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <SidebarNav groups={adminNavGroups} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col print:block print:min-w-full">
        <div className="print:hidden">
          <Topbar
            onMenuClick={() => setMobileNavOpen(true)}
            showLogo
            searchItems={searchItems}
            notification={{ count: data?.pendingApprovals, href: '/admin/orders', label: 'Orders awaiting approval' }}
          />
        </div>
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:px-8 lg:py-7 print:block print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
