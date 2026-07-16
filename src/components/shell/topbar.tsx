'use client';

import { Bell, Menu, Search, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-lg supports-backdrop-filter:bg-card/70 sm:px-6">
      {onMenuClick && (
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onClick={onMenuClick}>
          <Menu className="size-5" />
        </Button>
      )}

      {showLogo && (
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple text-primary-foreground">
            <Zap className="size-4" />
          </div>
          <span className="font-semibold tracking-tight">Electro Mart</span>
        </div>
      )}

      <div className="relative hidden max-w-xs flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search..."
          className="h-9 rounded-full border-border bg-secondary/60 pl-9 shadow-none focus-visible:bg-card focus-visible:ring-ring/20"
        />
      </div>

      <div className="flex-1" />

      <Button variant="ghost" size="icon" className="relative rounded-full">
        <Bell className="size-5" />
        {!!notificationCount && notificationCount > 0 && (
          <span className="absolute right-2 top-2 flex size-2 rounded-full bg-destructive ring-2 ring-card" />
        )}
      </Button>

      <div className="ml-1">
        <UserMenu />
      </div>
    </header>
  );
}
