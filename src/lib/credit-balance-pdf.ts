import { downloadLedgerStatementPdf, AMBER, BLUE, GREEN } from '@/lib/statement-pdf';
import type { CreditBalanceEntryType, CreditBalanceHistoryEntry, CreditBalanceSummary } from '@/lib/api/types';

const TYPE_LABEL: Record<CreditBalanceEntryType, string> = {
  PURCHASE: 'Purchase',
  TRANSPORT_CHARGE: 'Transport Charge',
  PURCHASE_RETURN: 'Purchase Return',
  REPLACEMENT: 'Replacement',
  SETTLEMENT: 'Settlement',
  REFUND: 'Refund Received',
};

export interface CreditBalanceStatementMeta {
  filterSummary: string;
  dateFrom?: string;
  dateTo?: string;
  summary: CreditBalanceSummary;
}

export async function downloadCreditBalanceStatementPdf(
  filename: string,
  rows: CreditBalanceHistoryEntry[],
  meta: CreditBalanceStatementMeta,
) {
  await downloadLedgerStatementPdf({
    filename,
    title: 'CREDIT BALANCE STATEMENT',
    filterSummary: meta.filterSummary,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    closingLabel: 'Closing Credit Balance',
    closingValue: meta.summary.balance,
    // Replacements / refunds received add back to the payable; shown only when non-zero.
    summaryItems: [
      { label: 'Purchases', value: meta.summary.totalPurchases, color: BLUE },
      { label: 'Transport Charges', value: -meta.summary.totalTransportCharges, color: GREEN },
      { label: 'Purchase Returns', value: -meta.summary.totalReturns, color: GREEN },
      ...(meta.summary.totalReplacements
        ? [{ label: 'Replacements', value: meta.summary.totalReplacements, color: BLUE }]
        : []),
      { label: 'Settlements Paid', value: -meta.summary.totalSettled, color: GREEN },
      ...(meta.summary.totalRefundsReceived
        ? [{ label: 'Refunds Received', value: meta.summary.totalRefundsReceived, color: BLUE }]
        : []),
      { label: 'Pending Cheque Settlements', value: meta.summary.pendingChequeSettlements, color: AMBER },
    ],
    rows: rows.map((row) => ({
      date: row.date,
      typeLabel: TYPE_LABEL[row.type],
      status: row.status,
      description: row.description,
      mode: row.mode,
      faceAmount: row.faceAmount,
      balanceBefore: row.balanceBefore,
      balanceAfter: row.balanceAfter,
    })),
  });
}
