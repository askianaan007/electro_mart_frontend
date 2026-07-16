'use client';

import { Zap } from 'lucide-react';
import { SidebarNav } from '@/components/shell/sidebar-nav';
import { Topbar } from '@/components/shell/topbar';
import { BottomNav } from '@/components/dealer/bottom-nav';
import { dealerNavItems } from '@/components/dealer/dealer-nav-items';
import { useDealerDashboard } from '@/hooks/use-dashboard';

export function DealerShell({ children }: { children: React.ReactNode }) {
  const { data } = useDealerDashboard();

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple text-primary-foreground shadow-sm shadow-primary/30">
            <Zap className="size-4.5" />
          </div>
          <span className="font-semibold tracking-tight">Electro Mart</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav groups={[{ items: dealerNavItems }]} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar showLogo notificationCount={data?.pendingOrders} />
        <main className="flex-1 p-4 pb-20 sm:p-6 lg:pb-6">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
