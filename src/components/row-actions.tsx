'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import { Check, ChevronDown, Loader2, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface RowAction {
  label: string;
  icon?: LucideIcon;
  /** Either onSelect or href. */
  onSelect?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
  /** Hide the action entirely (keeps call sites declarative). */
  hidden?: boolean;
}

/**
 * The secondary actions of a table row, tucked behind a "⋯" button so rows
 * stay scannable. Pass groups to get separators between them; destructive
 * actions conventionally go in the last group.
 */
export function RowActionsMenu({
  groups,
  label = 'Row actions',
  disabled,
  align = 'end',
  className,
}: {
  groups: RowAction[][];
  label?: string;
  disabled?: boolean;
  align?: 'start' | 'end';
  className?: string;
}) {
  const visible = groups.map((g) => g.filter((a) => !a.hidden)).filter((g) => g.length > 0);
  if (visible.length === 0) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-8 text-muted-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground', className)}
          aria-label={label}
          title={label}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        {visible.map((group, gi) => (
          <Fragment key={gi}>
            {gi > 0 && <DropdownMenuSeparator />}
            {group.map((action) => {
              const Icon = action.icon;
              const content = (
                <>
                  {Icon && <Icon />}
                  {action.label}
                </>
              );
              return action.href ? (
                <DropdownMenuItem
                  key={action.label}
                  asChild
                  disabled={action.disabled}
                  variant={action.destructive ? 'destructive' : 'default'}
                >
                  <Link href={action.href}>{content}</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  key={action.label}
                  disabled={action.disabled}
                  variant={action.destructive ? 'destructive' : 'default'}
                  onSelect={() => action.onSelect?.()}
                >
                  {content}
                </DropdownMenuItem>
              );
            })}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface StatusOption {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  /** Marks the current status (shown checked, not selectable). */
  current?: boolean;
}

/**
 * A status badge that is also the control for changing that status: click
 * it to get the allowed transitions. With no options it renders as a plain
 * badge, so callers can pass only the transitions that are valid right now.
 */
export function StatusMenuBadge({
  badge,
  options,
  busy = false,
  label = 'Change status',
}: {
  badge: React.ReactNode;
  options: StatusOption[];
  busy?: boolean;
  label?: string;
}) {
  const selectable = options.filter((o) => !o.current);
  if (selectable.length === 0) return <>{badge}</>;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        disabled={busy}
        className="group inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-60"
        aria-label={label}
        title={label}
      >
        {badge}
        {busy ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{label}</DropdownMenuLabel>
        {options.map((o) => (
          <DropdownMenuItem
            key={o.label}
            disabled={o.current}
            variant={o.destructive ? 'destructive' : 'default'}
            onSelect={o.onSelect}
          >
            <span className="flex-1">{o.label}</span>
            {o.current && <Check className="!text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
