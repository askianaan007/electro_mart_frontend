'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { initials } from '@/lib/utils';

export function UserMenu() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  if (!user) return null;

  const displayName = user.name ?? user.businessName ?? user.username ?? 'Account';
  const secondary = user.email ?? user.username;

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast.success('Logged out');
        router.replace('/login');
      },
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-0.5 outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/30 sm:pr-2">
        <Avatar className="size-8">
          <AvatarFallback>{initials(displayName)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-[13px] font-medium md:inline">{displayName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <p className="truncate text-sm font-medium">{displayName}</p>
            {secondary && <p className="truncate text-xs text-muted-foreground">{secondary}</p>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/forgot-password">
            <KeyRound />
            Change password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={logout.isPending} onClick={handleLogout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
