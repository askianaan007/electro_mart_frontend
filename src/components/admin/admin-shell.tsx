'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarNav } from '@/components/shell/sidebar-nav';
import { Topbar } from '@/components/shell/topbar';
import { adminNavGroups } from '@/components/admin/admin-nav-items';
import { useAdminDashboard } from '@/hooks/use-dashboard';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data } = useAdminDashboard();

  return (
    <div className="flex min-h-svh bg-background/95 text-foreground print:block select-none">
      {/* Desktop Glassy Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/50 bg-card/60 backdrop-blur-2xl print:hidden lg:flex transition-all">
        <div className="flex h-16 items-center gap-3 border-b border-border/50 px-5 bg-card/40 backdrop-blur-md">
          <div className="flex items-center justify-center p-2 rounded-xl border border-white/20 bg-slate-900/60 shadow-md">
            <Image
              src="/logo-icon.png"
              alt="ElectroMart Logo"
              width={32}
              height={32}
              className="size-7 shrink-0 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
              priority
            />
          </div>
          <div className="leading-tight">
            <span className="font-extrabold tracking-tight text-sm text-foreground">Electro Mart</span>
            <span className="block text-[10px] font-bold tracking-wider uppercase text-purple-600 dark:text-purple-400">
              Admin Portal
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <SidebarNav groups={adminNavGroups} />
        </div>
      </aside>

      {/* Mobile Glassy Sheet Drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" title="Admin Navigation" className="w-72 gap-0 p-0 border-r border-border/50 bg-card/85 backdrop-blur-3xl">
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border/50 px-5 bg-card/50 backdrop-blur-md">
            <div className="flex items-center justify-center p-2 rounded-xl border border-white/20 bg-slate-900/60 shadow-md">
              <Image src="/logo-icon.png" alt="ElectroMart" width={32} height={32} className="size-7 shrink-0 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
            </div>
            <div className="leading-tight">
              <span className="font-extrabold tracking-tight text-sm text-foreground">Electro Mart</span>
              <span className="block text-[10px] font-bold tracking-wider uppercase text-purple-600 dark:text-purple-400">
                Admin Portal
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <SidebarNav groups={adminNavGroups} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col print:block print:min-w-full">
        <div className="print:hidden">
          <Topbar
            onMenuClick={() => setMobileNavOpen(true)}
            showLogo
            notificationCount={data?.pendingApprovals}
          />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 print:block print:p-0">{children}</main>
      </div>
    </div>
  );
}

