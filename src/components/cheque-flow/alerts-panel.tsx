'use client';

import { useState } from 'react';
import { AlertOctagon, CalendarClock, ChevronDown, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SIDE_META, dueLabel, formatDay } from '@/lib/cheque-flow';
import { cn, formatCurrency } from '@/lib/utils';
import type { ChequeFlowAlertGroup, ChequeFlowAlerts, ChequeFlowEntry } from '@/lib/api/types';

const PREVIEW = 4;

function Group({
  title,
  group,
  tone,
  icon: Icon,
  onOpen,
  note,
}: {
  title: string;
  group: ChequeFlowAlertGroup;
  tone: 'red' | 'amber' | 'soft';
  icon: typeof Clock;
  onOpen: (entry: ChequeFlowEntry) => void;
  note?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (group.entries.length === 0) return null;
  const shown = expanded ? group.entries : group.entries.slice(0, PREVIEW);
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border p-3.5',
        tone === 'red' && 'border-destructive/40 bg-destructive/[0.05]',
        tone === 'amber' && 'border-warning/40 bg-warning/[0.08]',
        tone === 'soft' && 'border-warning/25 bg-warning/[0.04]',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={cn(
            'flex items-center gap-1.5 text-sm font-semibold',
            tone === 'red' ? 'text-destructive' : 'text-warning-foreground dark:text-warning',
          )}
        >
          <Icon className="size-4" />
          {title}
          <Badge variant={tone === 'red' ? 'destructive' : 'warning'}>{group.entries.length}</Badge>
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">
          <span className="text-success">In {formatCurrency(group.receivable)}</span> ·{' '}
          <span className="text-warning-foreground dark:text-warning">Out {formatCurrency(group.payable)}</span>
        </p>
      </div>
      {note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}
      <ul className="mt-2 divide-y divide-border/60">
        {shown.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onOpen(e)}
              className="flex w-full items-center justify-between gap-3 rounded-md py-1.5 text-left text-sm hover:bg-background/60"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{e.partyName}</span>
                <span className="block text-xs text-muted-foreground">
                  {e.source === 'MANUAL' ? SIDE_META[e.direction].short : (e.kindLabel ?? e.sourceLabel)} ·{' '}
                  {formatDay(e.chequeDate)} · {e.chequeNumber ?? 'no number'} · {dueLabel(e)}
                </span>
              </span>
              <span
                className={cn(
                  'shrink-0 font-semibold tabular-nums',
                  e.direction === 'RECEIVABLE' ? 'text-success' : 'text-warning-foreground dark:text-warning',
                )}
              >
                {formatCurrency(e.amount)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {group.entries.length > PREVIEW && (
        <Button variant="ghost" size="sm" className="mt-1 h-7 px-2" onClick={() => setExpanded((v) => !v)}>
          <ChevronDown className={cn('transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : `Show all ${group.entries.length}`}
        </Button>
      )}
    </div>
  );
}

/**
 * Pending cheques that need attention, from every month — so an overdue
 * cheque stays visible whichever month is selected. Nothing here is ever
 * marked cleared automatically.
 */
export function AlertsPanel({
  alerts,
  month,
  onOpen,
}: {
  alerts: ChequeFlowAlerts | undefined;
  month: string | null;
  onOpen: (entry: ChequeFlowEntry) => void;
}) {
  if (!alerts) return null;
  const { overdue, dueToday, dueSoon } = alerts;
  if (!overdue.entries.length && !dueToday.entries.length && !dueSoon.entries.length) return null;
  const earlier = month ? overdue.entries.filter((e) => e.chequeDate.slice(0, 7) !== month).length : 0;
  return (
    <section aria-label="Cheque alerts" className="grid gap-3 lg:grid-cols-3">
      <Group
        title="Overdue — still pending"
        group={overdue}
        tone="red"
        icon={AlertOctagon}
        onOpen={onOpen}
        note={
          earlier
            ? `${earlier} from other months — shown here whatever month you pick. Mark each cleared, bounced or cancelled once you know.`
            : 'Past their cheque date but not marked cleared. Update each once you know.'
        }
      />
      <Group title="Due today" group={dueToday} tone="amber" icon={Clock} onOpen={onOpen} />
      <Group title="Due in the next 7 days" group={dueSoon} tone="soft" icon={CalendarClock} onOpen={onOpen} />
    </section>
  );
}
