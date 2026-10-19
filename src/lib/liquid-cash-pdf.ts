import { downloadLedgerStatementPdf, BLUE, GREEN, RED, SLATE_500 } from '@/lib/statement-pdf';
import { formatCurrency } from '@/lib/utils';
import type { LiquidCashEntryType, LiquidCashEvent, LiquidCashHistoryEntry, LiquidCashSummary } from '@/lib/api/types';

export const LIQUID_CASH_TYPE_LABEL: Record<LiquidCashEntryType, string> = {
  INVESTMENT: 'Investment',
  DEALER_PAYMENT: 'Dealer Payment',
  SUPPLIER_PAYMENT: 'Supplier Payment',
  EXPENSE: 'Expense',
  REFUND: 'Refund',
  ADJUSTMENT: 'Adjustment',
};

export type LiquidCashEventTone = 'info' | 'success' | 'warning' | 'destructive' | 'purple' | 'default' | 'secondary';

const EVENT_META: Record<string, { label: string; tone: LiquidCashEventTone }> = {
  EDITED: { label: 'Correction · Edited', tone: 'info' },
  DELETED: { label: 'Correction · Deleted', tone: 'destructive' },
  UNDONE: { label: 'Correction · Undone', tone: 'info' },
  RESTORED: { label: 'Correction · Restored', tone: 'info' },
  CANCELLED: { label: 'Correction · Cancelled', tone: 'destructive' },
  CHEQUE_PENDING: { label: 'Cheque back to pending', tone: 'warning' },
  CHEQUE_CLEARED: { label: 'Cheque cleared', tone: 'success' },
  CHEQUE_RETURNED: { label: 'Cheque returned', tone: 'destructive' },
  OPENING_BALANCE: { label: 'Opening balance', tone: 'default' },
  OPENING_BALANCE_REVERSAL: { label: 'Reversal · Opening balance', tone: 'purple' },
  ADJUSTMENT: { label: 'Adjustment', tone: 'secondary' },
  ADJUSTMENT_REVERSAL: { label: 'Reversal · Adjustment', tone: 'purple' },
  SETTLEMENT_REVERSAL: { label: 'Reversal · Commission payout', tone: 'purple' },
};

/**
 * Label for a history row's event, or null for the original RECORDED entry.
 * Unknown events (a newer backend) fall back to a humanised version of the raw string.
 */
export function liquidCashEventMeta(event: LiquidCashEvent | null | undefined): { label: string; tone: LiquidCashEventTone } | null {
  if (!event || event === 'RECORDED') return null;
  const known = EVENT_META[event];
  if (known) return known;
  const words = String(event).toLowerCase().replace(/_/g, ' ');
  return { label: words.charAt(0).toUpperCase() + words.slice(1), tone: 'secondary' };
}

/** "Supplier Payment · Correction · Edited (Scheduled)" — one plain-text type label for exports. */
export function liquidCashRowTypeLabel(row: LiquidCashHistoryEntry): string {
  const parts = [LIQUID_CASH_TYPE_LABEL[row.type] ?? String(row.type)];
  const eventMeta = liquidCashEventMeta(row.event);
  // Adjustment rows already say what they are via the event — avoid "Adjustment · Adjustment".
  if (eventMeta && eventMeta.label !== parts[0]) parts.push(eventMeta.label);
  return `${parts.join(' · ')}${row.isFuture ? ' (Scheduled)' : ''}`;
}

export interface LiquidCashStatementMeta {
  filterSummary: string;
  dateFrom?: string;
  dateTo?: string;
  summary: LiquidCashSummary;
}

export async function downloadLiquidCashStatementPdf(
  filename: string,
  rows: LiquidCashHistoryEntry[],
  meta: LiquidCashStatementMeta,
) {
  const s = meta.summary;
  // Everything that isn't capital, collections, supplier payments or expenses, netted so the
  // five boxes still add up to the closing position.
  const otherNet = s.openingBalance + s.totalRefundsReceived - s.totalRefundsPaid + s.totalAdjustments;

  await downloadLedgerStatementPdf({
    filename,
    title: 'LIQUID CASH STATEMENT',
    filterSummary: meta.filterSummary,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    closingLabel: 'Closing Cash Position',
    closingValue: s.balance,
    summaryItems: [
      { label: 'Net Capital', value: s.totalInvestments, color: BLUE },
      { label: 'Collections In', value: s.totalCollected, color: GREEN },
      { label: 'Supplier Out', value: -s.totalPaidToSuppliers, color: RED },
      { label: 'Expenses Out', value: -s.totalExpensesPaid, color: RED },
      { label: 'Opening, Refunds & Adj.', value: otherNet, color: SLATE_500 },
    ],
    rows: rows.map((row) => ({
      date: row.date,
      typeLabel: liquidCashRowTypeLabel(row),
      status: row.status,
      // An uncleared/returned cheque has no balance impact — keep its face value visible.
      description:
        row.event === 'RECORDED' && Number(row.faceAmount) !== Number(row.amount)
          ? `${row.description} (face value ${formatCurrency(row.faceAmount)})`
          : row.description,
      mode: row.mode,
      // The ledger's amount column is the balance impact, so it reconciles with before/after.
      faceAmount: row.amount,
      balanceBefore: row.balanceBefore,
      balanceAfter: row.balanceAfter,
    })),
  });
}
