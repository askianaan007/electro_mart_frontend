'use client';

import Image from 'next/image';
import { Bell, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/shell/theme-toggle';
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
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/50 bg-background/65 backdrop-blur-2xl supports-backdrop-filter:bg-background/55 px-4 sm:px-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.35)] transition-all duration-300">
      {onMenuClick && (
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 lg:hidden rounded-xl hover:bg-muted/80 backdrop-blur-md"
          onClick={onMenuClick}
        >
          <Menu className="size-5" />
        </Button>
      )}

      {showLogo && (
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="flex items-center justify-center p-1.5 rounded-xl border border-white/20 bg-slate-900/60 backdrop-blur-xl shadow-md">
            <Image src="/logo-icon.png" alt="" width={28} height={28} className="size-6 shrink-0 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
          </div>
          <span className="font-extrabold tracking-tight text-sm sm:text-base">Electro Mart</span>
        </div>
      )}

      {/* iOS Translucent Pill Search Bar */}
      <div className="relative hidden max-w-xs flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          type="text"
          placeholder="Search items, orders..."
          className="h-10 rounded-full border border-border/50 bg-secondary/50 pl-10 pr-9 text-xs font-medium backdrop-blur-md transition-all shadow-inner focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-0.5 rounded border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <span>⌘</span>K
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-muted/80 backdrop-blur-md transition-all duration-200"
        >
          <Bell className="size-4.5 text-muted-foreground hover:text-foreground" />
          {!!notificationCount && notificationCount > 0 && (
            <span className="absolute right-2 top-2 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-rose-500 ring-2 ring-background" />
            </span>
          )}
        </Button>

        <div className="ml-1">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

