'use client';

import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SIDE_META, STATUS_META, dueLabel, formatDay, sideTotals } from '@/lib/cheque-flow';
import { cn, formatCurrency } from '@/lib/utils';
import type { ChequeFlowDirection, ChequeFlowEntry, ChequeFlowStatus } from '@/lib/api/types';

export interface ChequeRowActions {
  onEdit: (entry: ChequeFlowEntry) => void;
  onDelete: (entry: ChequeFlowEntry) => void;
  /** CLEARED opens the date prompt; the others apply at once. */
  onStatus: (entry: ChequeFlowEntry, status: ChequeFlowStatus) => void;
  /** Id of a row whose change is saving. */
  busyId?: string | null;
}

const ROW_TINT: Record<NonNullable<ChequeFlowEntry['dueState']>, string> = {
  overdue: 'bg-destructive/[0.07] hover:bg-destructive/10',
  today: 'bg-warning/[0.12] hover:bg-warning/15',
  soon: 'bg-warning/[0.05] hover:bg-warning/10',
};

function DueBadge({ entry }: { entry: ChequeFlowEntry }) {
  const label = dueLabel(entry);
  if (!label) return null;
  return (
    <span
      className={cn(
        'text-[11px] font-medium',
        entry.dueState === 'overdue' ? 'text-destructive' : 'text-warning-foreground dark:text-warning',
      )}
    >
      {label}
    </span>
  );
}

const STATUS_ACTION: Record<ChequeFlowStatus, { label: string; icon: typeof Clock }> = {
  CLEARED: { label: 'Mark cleared…', icon: CheckCircle2 },
  PENDING: { label: 'Back to pending', icon: Clock },
  BOUNCED: { label: 'Mark bounced', icon: XCircle },
  CANCELLED: { label: 'Mark cancelled', icon: Ban },
};
const ACTION_ORDER: ChequeFlowStatus[] = ['CLEARED', 'PENDING', 'BOUNCED', 'CANCELLED'];

function RowMenu({ entry, actions }: { entry: ChequeFlowEntry; actions: ChequeRowActions }) {
  const busy = actions.busyId === entry.id;
  const linked = entry.source !== 'MANUAL';
  // Linked cheques follow their own page's rules (the server says which moves are allowed now).
  const statuses = ACTION_ORDER.filter((s) => entry.allowedStatuses.includes(s));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Cheque actions"
          loading={busy}
          disabled={busy}
        >
          {!busy && <MoreVertical />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {statuses.map((status) => {
          const { label, icon: Icon } = STATUS_ACTION[status];
          return (
            <DropdownMenuItem key={status} onSelect={() => actions.onStatus(entry, status)}>
              <Icon /> {linked && status === 'CLEARED' ? 'Mark cleared' : label}
            </DropdownMenuItem>
          );
        })}
        {linked && statuses.length === 0 && (
          <DropdownMenuItem disabled className="text-xs">
            No status change allowed now
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {linked ? (
          entry.link && (
            <DropdownMenuItem asChild>
              <Link href={entry.link}>
                <ExternalLink /> Open in {entry.sourceLabel}
              </Link>
            </DropdownMenuItem>
          )
        ) : (
          <>
            <DropdownMenuItem onSelect={() => actions.onEdit(entry)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete(entry)}>
              <Trash2 /> {entry.duplicateOf ? 'Remove manual copy…' : 'Delete…'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Where a cheque came from, and whether it is a manual copy of a linked one. */
function SourceTag({ entry }: { entry: ChequeFlowEntry }) {
  if (entry.duplicateOf) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <Copy className="size-3" /> Also in {entry.duplicateOf.label} — not counted
      </span>
    );
  }
  if (entry.source === 'MANUAL') return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
      <Link2 className="size-3" /> {entry.kindLabel ?? `From ${entry.sourceLabel}`}
    </span>
  );
}

function StatusCell({ entry }: { entry: ChequeFlowEntry }) {
  const meta = STATUS_META[entry.status];
  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge variant={meta.variant}>{meta.label}</Badge>
      {entry.status === 'CLEARED' && (
        <span className="text-[11px] text-muted-foreground">
          {entry.clearedDate ? formatDay(entry.clearedDate) : 'date not recorded'}
        </span>
      )}
      <DueBadge entry={entry} />
    </div>
  );
}

/** One side (customer or supplier) of a month: a table on wide screens, cards on phones. */
export function ChequeSideTable({
  direction,
  entries,
  actions,
  onAdd,
  filtered,
  title,
}: {
  direction: ChequeFlowDirection;
  entries: ChequeFlowEntry[];
  actions: ChequeRowActions;
  onAdd: () => void;
  filtered: boolean;
  /** Overrides the default heading (e.g. the month in the All-months view). */
  title?: string;
}) {
  const meta = SIDE_META[direction];
  const isIn = direction === 'RECEIVABLE';
  const totals = sideTotals(entries);
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
  const tone = isIn ? 'text-success' : 'text-warning-foreground dark:text-warning';

  return (
    <section
      aria-label={meta.title}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-xs',
        isIn ? 'border-success/30' : 'border-warning/30',
      )}
    >
      <header
        className={cn(
          'flex items-center justify-between gap-2 border-b px-4 py-3',
          isIn ? 'border-success/20 bg-success/[0.07]' : 'border-warning/20 bg-warning/[0.08]',
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-lg',
              isIn ? 'bg-success/15' : 'bg-warning/15',
            )}
          >
            <Icon className={cn('size-4', tone)} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{title ?? meta.title}</h3>
            <p className="text-xs text-muted-foreground">
              {entries.length} cheque{entries.length === 1 ? '' : 's'} · {meta.verb}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd} className="shrink-0">
          <Plus /> Add
        </Button>
      </header>

      {entries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {filtered ? 'No cheques match the filters.' : `No ${meta.short.toLowerCase()} cheques this month.`}
          </p>
          {!filtered && (
            <Button size="sm" variant="ghost" onClick={onAdd}>
              <Plus /> Add a {meta.short.toLowerCase()} cheque
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Wide screens */}
          <div className="hidden flex-1 md:block">
            <Table className="[&_td]:px-3 [&_th]:px-3 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Cheque</TableHead>
                  <TableHead>{meta.party}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow
                    key={e.id}
                    className={cn(e.dueState && ROW_TINT[e.dueState], e.duplicateOf && 'opacity-60')}
                  >
                    <TableCell className="whitespace-nowrap align-top">
                      <p className="text-[13px] tabular-nums">{formatDay(e.chequeDate)}</p>
                      <p className="font-mono text-xs">{e.chequeNumber ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{e.bankName || '—'}</p>
                    </TableCell>
                    <TableCell className="min-w-[120px] whitespace-normal break-words align-top">
                      <p className="text-[13px] font-medium">{e.partyName}</p>
                      <SourceTag entry={e} />
                      {e.invoiceRef && <p className="text-xs text-muted-foreground">{e.invoiceRef}</p>}
                      {e.remarks && <p className="text-xs italic text-muted-foreground">{e.remarks}</p>}
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusCell entry={e} />
                    </TableCell>
                    <TableCell
                      className={cn(
                        'whitespace-nowrap text-right align-top font-semibold tabular-nums',
                        (e.status === 'BOUNCED' || e.status === 'CANCELLED' || e.duplicateOf) &&
                          'text-muted-foreground line-through',
                      )}
                    >
                      {formatCurrency(e.amount)}
                    </TableCell>
                    <TableCell className="align-top">
                      <RowMenu entry={e} actions={actions} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TotalsRows totals={totals} tone={tone} colSpan={3} />
              </TableFooter>
            </Table>
          </div>

          {/* Phones */}
          <ul className="divide-y divide-border md:hidden">
            {entries.map((e) => (
              <li
                key={e.id}
                className={cn(
                  'flex gap-3 px-4 py-3',
                  e.dueState && ROW_TINT[e.dueState],
                  e.duplicateOf && 'opacity-60',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-sm font-medium">{e.partyName}</p>
                    <p
                      className={cn(
                        'shrink-0 text-sm font-semibold tabular-nums',
                        (e.status === 'BOUNCED' || e.status === 'CANCELLED' || e.duplicateOf) &&
                          'text-muted-foreground line-through',
                      )}
                    >
                      {formatCurrency(e.amount)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDay(e.chequeDate)} · <span className="font-mono">{e.chequeNumber ?? 'no number'}</span> ·{' '}
                    {e.bankName || 'bank not recorded'}
                  </p>
                  <SourceTag entry={e} />
                  {(e.invoiceRef || e.remarks) && (
                    <p className="mt-0.5 break-words text-xs text-muted-foreground">
                      {[e.invoiceRef, e.remarks].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_META[e.status].variant}>{STATUS_META[e.status].label}</Badge>
                    {e.status === 'CLEARED' && (
                      <span className="text-[11px] text-muted-foreground">
                        {e.clearedDate ? `on ${formatDay(e.clearedDate)}` : 'date not recorded'}
                      </span>
                    )}
                    <DueBadge entry={e} />
                  </div>
                </div>
                <RowMenu entry={e} actions={actions} />
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t bg-muted/40 px-4 py-3 text-sm md:hidden">
            <TotalLine label="Pending" value={totals.pending} />
            <TotalLine label="Cleared" value={totals.cleared} />
            <TotalLine label="Total" value={totals.total} strong className={tone} />
            {(totals.bounced > 0 || totals.cancelled > 0) && (
              <p className="pt-1 text-xs text-muted-foreground">
                Not in totals: bounced {formatCurrency(totals.bounced)} · cancelled {formatCurrency(totals.cancelled)}
              </p>
            )}
          </dl>
        </>
      )}
      {filtered && entries.length > 0 && (
        <p className="border-t bg-warning/[0.06] px-4 py-1.5 text-[11px] font-medium text-warning-foreground dark:text-warning">
          Filtered — totals cover the matching cheques only
        </p>
      )}
    </section>
  );
}

function TotalLine({
  label,
  value,
  strong,
  className,
}: {
  label: string;
  value: number;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex justify-between gap-2', strong && 'font-semibold', className)}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatCurrency(value)}</dd>
    </div>
  );
}

function TotalsRows({
  totals,
  tone,
  colSpan,
}: {
  totals: ReturnType<typeof sideTotals>;
  tone: string;
  colSpan: number;
}) {
  return (
    <>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={colSpan} className="py-1.5 text-right text-xs text-muted-foreground">
          Pending ({totals.pendingCount})
        </TableCell>
        <TableCell className="py-1.5 text-right tabular-nums">{formatCurrency(totals.pending)}</TableCell>
        <TableCell />
      </TableRow>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={colSpan} className="py-1.5 text-right text-xs text-muted-foreground">
          Cleared ({totals.clearedCount})
        </TableCell>
        <TableCell className="py-1.5 text-right tabular-nums">{formatCurrency(totals.cleared)}</TableCell>
        <TableCell />
      </TableRow>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={colSpan} className="py-1.5 text-right text-xs font-semibold">
          Month total
        </TableCell>
        <TableCell className={cn('py-1.5 text-right font-bold tabular-nums', tone)}>
          {formatCurrency(totals.total)}
        </TableCell>
        <TableCell />
      </TableRow>
      {(totals.bounced > 0 || totals.cancelled > 0) && (
        <TableRow className="hover:bg-transparent">
          <TableCell
            colSpan={colSpan + 2}
            className="whitespace-normal py-1.5 text-right text-[11px] text-muted-foreground"
          >
            Not in totals — bounced {formatCurrency(totals.bounced)} · cancelled {formatCurrency(totals.cancelled)}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
