'use client';

import { Bell, Menu, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/shell/user-menu';

export function Topbar({
  onMenuClick,
  notificationCount,
  showLogo = false,
}: {
  onMenuClick?: () => void;
  notificationCount?: number;
  showLogo?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur supports-backdrop-filter:bg-card/80 sm:px-6">
      {onMenuClick && (
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onClick={onMenuClick}>
          <Menu className="size-5" />
        </Button>
      )}

      {showLogo && (
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="size-4" />
          </div>
          <span className="font-semibold">Electro Mart</span>
        </div>
      )}

      <div className="flex-1" />

      <Button variant="ghost" size="icon" className="relative">
        <Bell className="size-5" />
        {!!notificationCount && notificationCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-destructive" />
        )}
      </Button>

      <UserMenu />
    </header>
  );
}
