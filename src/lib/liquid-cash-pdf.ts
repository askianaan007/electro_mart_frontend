import { downloadLedgerStatementPdf, AMBER, BLUE, GREEN, RED } from '@/lib/statement-pdf';
import type { LiquidCashEntryType, LiquidCashHistoryEntry, LiquidCashSummary } from '@/lib/api/types';

const TYPE_LABEL: Record<LiquidCashEntryType, string> = {
  INVESTMENT: 'Investment',
  DEALER_PAYMENT: 'Dealer Payment',
  SUPPLIER_PAYMENT: 'Supplier Payment',
  EXPENSE: 'Expense',
};

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
  await downloadLedgerStatementPdf({
    filename,
    title: 'LIQUID CASH STATEMENT',
    filterSummary: meta.filterSummary,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    closingLabel: 'Closing Cash Position',
    closingValue: meta.summary.balance,
    summaryItems: [
      { label: 'Investments In', value: meta.summary.totalInvestments, color: BLUE },
      { label: 'Collections In', value: meta.summary.totalCollected, color: GREEN },
      { label: 'Supplier Out', value: -meta.summary.totalPaidToSuppliers, color: RED },
      { label: 'Expenses Out', value: -meta.summary.totalExpensesPaid, color: RED },
      { label: 'Pending Cheques', value: meta.summary.pendingDealerCheques + meta.summary.pendingSupplierCheques, color: AMBER },
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
