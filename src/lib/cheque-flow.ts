import type { ChequeFlowDirection, ChequeFlowEntry, ChequeFlowSideTotals, ChequeFlowStatus } from '@/lib/api/types';

export const STATUS_META: Record<
  ChequeFlowStatus,
  { label: string; variant: 'warning' | 'success' | 'destructive' | 'muted' }
> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  CLEARED: { label: 'Cleared', variant: 'success' },
  BOUNCED: { label: 'Bounced', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'muted' },
};

export const STATUS_ORDER: ChequeFlowStatus[] = ['PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED'];

export const SIDE_META: Record<ChequeFlowDirection, { title: string; short: string; party: string; verb: string }> = {
  RECEIVABLE: { title: 'Customer Cheques', short: 'Customer', party: 'Customer', verb: 'to receive' },
  PAYABLE: { title: 'Supplier Cheques', short: 'Supplier', party: 'Supplier', verb: 'to pay' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2026-10-05" → "05 Oct 2026" without any time-zone shift. */
export function formatDay(day: string | null | undefined): string {
  if (!day) return '—';
  const [y, m, d] = day.split('-');
  return `${d} ${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

/** "2026-10-05" → "05 Oct". */
export function formatShortDay(day: string): string {
  const [, m, d] = day.split('-');
  return `${d} ${MONTHS[Number(m) - 1] ?? m}`;
}

/** "2026-10" → "October 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `${MONTH_NAMES[Number(m) - 1] ?? m} ${y}`;
}

/** "2026-10" → "Oct 26". */
export function shortMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `${MONTHS[Number(m) - 1] ?? m} ${y.slice(2)}`;
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export function isMonth(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Sum money in cents so 0.1 + 0.2 stays 0.30. */
export function sumAmounts(values: number[]): number {
  return values.reduce((cents, v) => cents + Math.round(v * 100), 0) / 100;
}

/** Same rules as the server summary: bounced and cancelled are kept out of total/pending/cleared. */
export function sideTotals(entries: ChequeFlowEntry[]): ChequeFlowSideTotals {
  const by = (status: ChequeFlowStatus) => entries.filter((e) => e.status === status);
  const amount = (status: ChequeFlowStatus) => sumAmounts(by(status).map((e) => e.amount));
  const pending = amount('PENDING');
  const cleared = amount('CLEARED');
  return {
    total: sumAmounts([pending, cleared]),
    pending,
    cleared,
    bounced: amount('BOUNCED'),
    cancelled: amount('CANCELLED'),
    count: by('PENDING').length + by('CLEARED').length,
    pendingCount: by('PENDING').length,
    clearedCount: by('CLEARED').length,
    bouncedCount: by('BOUNCED').length,
    cancelledCount: by('CANCELLED').length,
  };
}

/** Entries grouped by the month of their cheque date, oldest month first. */
export function groupByMonth(entries: ChequeFlowEntry[]): { month: string; entries: ChequeFlowEntry[] }[] {
  const map = new Map<string, ChequeFlowEntry[]>();
  for (const entry of entries) {
    const month = entry.chequeDate.slice(0, 7);
    map.set(month, [...(map.get(month) ?? []), entry]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, list]) => ({ month, entries: list }));
}

export function bySide(entries: ChequeFlowEntry[], direction: ChequeFlowDirection) {
  return entries.filter((e) => e.direction === direction);
}

/** How a pending cheque's timing reads to a person. */
export function dueLabel(entry: Pick<ChequeFlowEntry, 'dueState' | 'daysOverdue' | 'chequeDate'>): string | null {
  if (entry.dueState === 'overdue') {
    return entry.daysOverdue === 1 ? '1 day overdue' : `${entry.daysOverdue} days overdue`;
  }
  if (entry.dueState === 'today') return 'Due today';
  if (entry.dueState === 'soon') return 'Due this week';
  return null;
}
