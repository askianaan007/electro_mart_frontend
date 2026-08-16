import { formatCurrency } from '@/lib/utils';
import {
  GOLD,
  SLATE_900,
  SLATE_500,
  SLATE_300,
  GREEN,
  RED,
  AMBER,
  BLUE,
  loadImageDataUrl,
} from '@/lib/statement-pdf';
import type { BalanceSheetResponse, ReconciliationStatus } from '@/lib/api/types';

const PAGE_MARGIN = 14;
// public/invoice-header_landscape.png is 2000x160px — kept in sync with the letterhead asset.
const HEADER_IMAGE_RATIO = 2000 / 160;
const PURPLE: [number, number, number] = [147, 51, 234];
const WHITE: [number, number, number] = [255, 255, 255];

const STATUS_META: Record<ReconciliationStatus, { label: string; color: [number, number, number] }> = {
  BALANCED: { label: 'BALANCED', color: GREEN },
  BALANCED_WITH_KNOWN_TIMING_DIFFERENCE: { label: 'BALANCED — KNOWN TIMING DIFFERENCE', color: AMBER },
  UNBALANCED: { label: 'UNBALANCED — NEEDS INVESTIGATION', color: RED },
};

type Kind = 'section' | 'subsection' | 'item' | 'subtotal' | 'total' | 'note';

interface Row {
  label: string;
  sub?: string;
  amount: string | null;
  raw?: string;
  kind: Kind;
}

function n(value: string) {
  return Number(value);
}

function signed(value: string) {
  const v = n(value);
  return `${v > 0 ? '+' : ''}${formatCurrency(value)}`;
}

function buildRows(data: BalanceSheetResponse): Row[] {
  const rows: Row[] = [];
  const push = (r: Row) => rows.push(r);

  push({ label: 'ASSETS', amount: null, kind: 'section' });
  push({ label: 'Current Assets', amount: null, kind: 'subsection' });
  push({ label: 'Cash & Bank', amount: data.assets.current.cashAndBank, kind: 'item' });
  push({ label: 'Accounts Receivable', amount: data.assets.current.accountsReceivable, kind: 'item' });
  push({
    label: 'Cheques in Hand',
    sub: 'Pending dealer cheques — recorded, not yet cleared',
    amount: data.assets.current.chequesInHand,
    kind: 'item',
  });
  push({ label: 'Inventory', sub: 'Valued at current cost', amount: data.assets.current.inventory, kind: 'item' });
  push({ label: 'Supplier Advances', amount: data.assets.current.supplierAdvances, kind: 'item' });
  push({ label: 'Prepaid Expenses', amount: data.assets.current.prepaidExpenses, kind: 'item' });
  push({ label: 'Other Current Assets', amount: data.assets.current.otherCurrentAssets, kind: 'item' });
  push({ label: 'Total Current Assets', amount: data.assets.current.totalCurrentAssets, kind: 'subtotal' });
  push({ label: 'Non-Current Assets', amount: null, kind: 'subsection' });
  push({ label: 'Fixed Assets', amount: data.assets.nonCurrent.fixedAssets, kind: 'item' });
  push({ label: 'Accumulated Depreciation', amount: data.assets.nonCurrent.accumulatedDepreciation, kind: 'item' });
  push({ label: 'Total Non-Current Assets', amount: data.assets.nonCurrent.totalNonCurrentAssets, kind: 'subtotal' });
  push({ label: 'TOTAL ASSETS', amount: data.assets.totalAssets, kind: 'total' });

  push({ label: 'LIABILITIES', amount: null, kind: 'section' });
  push({ label: 'Current Liabilities', amount: null, kind: 'subsection' });
  push({ label: 'Accounts Payable', amount: data.liabilities.current.accountsPayable, kind: 'item' });
  push({
    label: 'Supplier Cheques Issued',
    sub: 'Pending supplier cheques — written, not yet cleared',
    amount: data.liabilities.current.supplierChequesIssued,
    kind: 'item',
  });
  push({ label: 'Tax Payable', amount: data.liabilities.current.taxPayable, kind: 'item' });
  push({ label: 'Accrued Expenses', amount: data.liabilities.current.accruedExpenses, kind: 'item' });
  push({ label: 'Customer Advances', amount: data.liabilities.current.customerAdvances, kind: 'item' });
  push({ label: 'Total Current Liabilities', amount: data.liabilities.current.totalCurrentLiabilities, kind: 'subtotal' });
  push({ label: 'Non-Current Liabilities', amount: null, kind: 'subsection' });
  push({ label: 'Business Loans', amount: data.liabilities.nonCurrent.loans, kind: 'item' });
  push({
    label: 'Total Non-Current Liabilities',
    amount: data.liabilities.nonCurrent.totalNonCurrentLiabilities,
    kind: 'subtotal',
  });
  push({ label: 'TOTAL LIABILITIES', amount: data.liabilities.totalLiabilities, kind: 'total' });

  push({ label: 'EQUITY', amount: null, kind: 'section' });
  push({ label: 'Capital Contributions', sub: 'Positive investments', amount: data.equity.capitalContributions, kind: 'item' });
  push({ label: 'Owner Withdrawals', sub: 'Negative investments', amount: data.equity.ownerWithdrawals, kind: 'item' });
  push({
    label: 'Accumulated Earnings',
    sub: 'All-time gross profit − expenses',
    amount: data.equity.accumulatedEarnings,
    kind: 'item',
  });
  push({ label: 'TOTAL EQUITY', amount: data.equity.totalEquity, kind: 'total' });

  push({ label: 'MEMORANDUM (excluded from totals above)', amount: null, kind: 'section' });
  push({
    label: 'Commission Payable',
    sub: `${data.memorandum.commissionPayable.pendingOrApprovedLineCount} pending/approved commission line(s) — not recognized as an expense until settlement is paid`,
    amount: data.memorandum.commissionPayable.value,
    kind: 'item',
  });

  push({ label: 'RECONCILIATION', amount: null, kind: 'section' });
  push({ label: 'Total Assets', amount: data.summary.totalAssets, kind: 'item' });
  push({ label: 'Total Liabilities + Equity', amount: data.summary.liabilitiesAndEquity, kind: 'item' });
  push({ label: 'Raw Difference', amount: data.summary.rawDifference, kind: 'subtotal' });
  push({
    label: 'Known Order-Timing Difference',
    sub: `${data.reconciliation.inFlightOrderCount} order(s) approved/packed/delivered, not yet completed`,
    amount: data.reconciliation.knownOrderTimingDifference,
    kind: 'item',
  });
  push({
    label: 'Known Unallocated Equity Difference',
    sub: `Investor profit-share totals ${data.reconciliation.investorPercentageTotal}%`,
    amount: data.reconciliation.knownUnallocatedEquityDifference,
    kind: 'item',
  });
  push({ label: 'Total Known Difference', amount: data.reconciliation.knownDifference, kind: 'subtotal' });
  push({ label: 'Unexplained Difference', amount: data.reconciliation.unexplainedDifference, kind: 'total' });
  push({
    label: 'Reconciliation Status',
    amount: null,
    raw: STATUS_META[data.reconciliation.status].label,
    kind: 'total',
  });

  return rows;
}

/**
 * Renders the live Balance Sheet as a two-part branded PDF: page 1 is a
 * visual summary (KPI strip, reconciliation status, and hand-drawn — not
 * screenshotted — proportional diagrams of the accounting equation and its
 * asset/liability/equity composition), followed by a complete line-item
 * statement (every Assets/Liabilities/Equity/Memorandum/Reconciliation
 * figure) rendered as a paginated table from page 2 onward. Mirrors the
 * visual language of downloadLedgerStatementPdf (same letterhead/colors)
 * but uses its own layout since a Balance Sheet is a structured statement,
 * not a transaction ledger.
 */
export async function downloadBalanceSheetPdf(data: BalanceSheetResponse, filename: string) {
  const [{ default: jsPDF }, { default: autoTable }, headerImage] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImageDataUrl('/invoice-header_landscape.png'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  const headerTop = 8;
  const headerImgWidth = contentWidth;
  const headerImgHeight = headerImgWidth / HEADER_IMAGE_RATIO;
  const dividerY = headerTop + headerImgHeight + 3;
  const titleY = dividerY + 8;
  const metaY1 = titleY + 6;
  const metaY2 = metaY1 + 5;

  const statusMeta = STATUS_META[data.reconciliation.status];
  const generatedOn = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const asOfLabel = new Date(data.asOf).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  function drawLetterhead() {
    doc.addImage(headerImage, 'PNG', PAGE_MARGIN, headerTop, headerImgWidth, headerImgHeight);
    doc.setDrawColor(...SLATE_300);
    doc.setLineWidth(0.4);
    doc.line(PAGE_MARGIN, dividerY, pageWidth - PAGE_MARGIN, dividerY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...SLATE_900);
    doc.text('BALANCE SHEET STATEMENT', pageWidth / 2, titleY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_500);
    doc.text(`As Of: ${asOfLabel} (Live Position)`, PAGE_MARGIN, metaY1);
    doc.text('Basis: Live snapshot, not a historical record', PAGE_MARGIN, metaY2);
    doc.text(`Generated On: ${generatedOn}`, pageWidth - PAGE_MARGIN, metaY1, { align: 'right' });
    doc.text('Currency: LKR', pageWidth - PAGE_MARGIN, metaY2, { align: 'right' });
  }

  // ---- Page 1: KPI strip + reconciliation status + hand-drawn diagrams ----
  drawLetterhead();
  let y = metaY2 + 8;

  // KPI strip — 3 boxes.
  const kpis: { label: string; value: string; color: [number, number, number] }[] = [
    { label: 'Total Assets', value: data.summary.totalAssets, color: GREEN },
    { label: 'Total Liabilities', value: data.summary.totalLiabilities, color: RED },
    { label: 'Total Equity', value: data.summary.totalEquity, color: BLUE },
  ];
  const kpiGap = 4;
  const kpiWidth = (contentWidth - kpiGap * (kpis.length - 1)) / kpis.length;
  const kpiHeight = 18;
  kpis.forEach((kpi, i) => {
    const x = PAGE_MARGIN + i * (kpiWidth + kpiGap);
    doc.setDrawColor(...SLATE_300);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, kpiWidth, kpiHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_500);
    doc.text(kpi.label.toUpperCase(), x + 4, y + 6.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...kpi.color);
    doc.text(formatCurrency(kpi.value), x + 4, y + 14);
  });
  y += kpiHeight + 6;

  // Reconciliation status box.
  const reconBoxHeight = data.reconciliation.status === 'BALANCED' ? 16 : 34;
  doc.setDrawColor(...statusMeta.color);
  doc.setLineWidth(0.5);
  doc.setFillColor(...WHITE);
  doc.roundedRect(PAGE_MARGIN, y, contentWidth, reconBoxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...statusMeta.color);
  doc.text(statusMeta.label, PAGE_MARGIN + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_500);
  doc.text(
    `Assets ${formatCurrency(data.summary.totalAssets)} vs. Liabilities + Equity ${formatCurrency(data.summary.liabilitiesAndEquity)} — raw difference ${signed(data.summary.rawDifference)}`,
    PAGE_MARGIN + 4,
    y + 12,
  );
  if (data.reconciliation.status !== 'BALANCED') {
    const cols = [
      { label: 'Known Order-Timing Gap', value: data.reconciliation.knownOrderTimingDifference },
      { label: 'Known Unallocated Equity', value: data.reconciliation.knownUnallocatedEquityDifference },
      { label: 'Total Known Difference', value: data.reconciliation.knownDifference },
      { label: 'Unexplained Difference', value: data.reconciliation.unexplainedDifference },
    ];
    const colGap = 3;
    const colWidth = (contentWidth - 8 - colGap * (cols.length - 1)) / cols.length;
    cols.forEach((col, i) => {
      const x = PAGE_MARGIN + 4 + i * (colWidth + colGap);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...SLATE_500);
      doc.text(col.label.toUpperCase(), x, y + 20, { maxWidth: colWidth });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...(i === cols.length - 1 && n(col.value) !== 0 ? RED : SLATE_900));
      doc.text(signed(col.value), x, y + 27);
    });
  }
  y += reconBoxHeight + 8;

  // ---- Diagram 1: Accounting Equation Scale ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SLATE_900);
  doc.text('ACCOUNTING EQUATION — VISUAL SCALE', PAGE_MARGIN, y);
  y += 5;

  const assetsTotal = Math.max(n(data.summary.totalAssets), 0.01);
  const liabTotal = Math.max(n(data.summary.totalLiabilities), 0);
  const eqTotal = Math.max(n(data.summary.totalEquity), 0);
  const liabAndEq = Math.max(liabTotal + eqTotal, 0.01);

  const barHeight = 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_500);
  doc.text(`ASSETS — ${formatCurrency(data.summary.totalAssets)}`, PAGE_MARGIN, y);
  y += 2;
  doc.setFillColor(...GREEN);
  doc.roundedRect(PAGE_MARGIN, y, contentWidth, barHeight, 1, 1, 'F');
  y += barHeight + 5;

  doc.setTextColor(...SLATE_500);
  doc.text(
    `LIABILITIES + EQUITY — ${formatCurrency(data.summary.liabilitiesAndEquity)}`,
    PAGE_MARGIN,
    y,
  );
  y += 2;
  const liabWidth = contentWidth * (liabTotal / liabAndEq);
  const eqWidth = contentWidth - liabWidth;
  doc.setFillColor(...RED);
  doc.rect(PAGE_MARGIN, y, liabWidth, barHeight, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(PAGE_MARGIN + liabWidth, y, eqWidth, barHeight, 'F');
  y += barHeight + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...RED);
  doc.text(`Liabilities ${Math.round((liabTotal / liabAndEq) * 100)}%`, PAGE_MARGIN, y);
  doc.setTextColor(...BLUE);
  doc.text(`Equity ${Math.round((eqTotal / liabAndEq) * 100)}%`, pageWidth - PAGE_MARGIN, y, { align: 'right' });
  y += 9;

  // ---- Diagram 2: Asset Composition ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SLATE_900);
  doc.text('ASSET COMPOSITION', PAGE_MARGIN, y);
  y += 5;

  const assetItems: { label: string; value: number; color: [number, number, number] }[] = [
    { label: 'Cash & Bank', value: n(data.assets.current.cashAndBank), color: GREEN },
    { label: 'Accounts Receivable', value: n(data.assets.current.accountsReceivable), color: BLUE },
    { label: 'Cheques in Hand', value: n(data.assets.current.chequesInHand), color: AMBER },
    { label: 'Inventory', value: n(data.assets.current.inventory), color: PURPLE },
  ];
  for (const item of assetItems) {
    const pct = Math.max(Math.round((item.value / assetsTotal) * 100), 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_900);
    doc.text(item.label, PAGE_MARGIN, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatCurrency(item.value)} (${pct}%)`, pageWidth - PAGE_MARGIN, y, { align: 'right' });
    y += 1.5;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(PAGE_MARGIN, y, contentWidth, 3.5, 1, 1, 'F');
    doc.setFillColor(...item.color);
    doc.roundedRect(PAGE_MARGIN, y, contentWidth * (pct / 100), 3.5, 1, 1, 'F');
    y += 6.5;
  }
  y += 3;

  // ---- Diagram 3: Liabilities & Equity Composition ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SLATE_900);
  doc.text('LIABILITIES & EQUITY COMPOSITION', PAGE_MARGIN, y);
  y += 5;

  const leItems: { label: string; value: number; color: [number, number, number] }[] = [
    { label: 'Accounts Payable', value: n(data.liabilities.current.accountsPayable), color: RED },
    { label: 'Supplier Cheques Issued', value: n(data.liabilities.current.supplierChequesIssued), color: AMBER },
    { label: 'Capital Contributions', value: n(data.equity.capitalContributions), color: BLUE },
    { label: 'Owner Withdrawals', value: Math.abs(n(data.equity.ownerWithdrawals)), color: PURPLE },
    { label: 'Accumulated Earnings', value: Math.max(n(data.equity.accumulatedEarnings), 0), color: GREEN },
  ];
  for (const item of leItems) {
    const pct = Math.max(Math.round((item.value / liabAndEq) * 100), 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_900);
    doc.text(item.label, PAGE_MARGIN, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatCurrency(item.value)} (${pct}%)`, pageWidth - PAGE_MARGIN, y, { align: 'right' });
    y += 1.5;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(PAGE_MARGIN, y, contentWidth, 3.5, 1, 1, 'F');
    doc.setFillColor(...item.color);
    doc.roundedRect(PAGE_MARGIN, y, contentWidth * (pct / 100), 3.5, 1, 1, 'F');
    y += 6.5;
  }

  // ---- Page 2+: complete line-item statement ----
  doc.addPage();
  const rows = buildRows(data);
  const SUMMARY_TOP = metaY2 + 6;

  autoTable(doc, {
    startY: SUMMARY_TOP,
    margin: { top: SUMMARY_TOP, left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 20 },
    theme: 'grid',
    head: [['Item', 'Note', 'Amount']],
    body: rows.map((row) => [
      row.label,
      row.sub ?? '',
      row.raw ?? (row.amount === null ? 'Not supported' : formatCurrency(row.amount)),
    ]),
    styles: { fontSize: 8, cellPadding: 2.2, lineColor: SLATE_300, lineWidth: 0.2, valign: 'middle' },
    headStyles: { fillColor: SLATE_900, textColor: 255, fontStyle: 'bold', halign: 'left' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      1: { fontSize: 6.5, textColor: SLATE_500 },
      2: { halign: 'right' },
    },
    didParseCell: (cellData) => {
      if (cellData.section !== 'body') return;
      const row = rows[cellData.row.index];
      if (!row) return;
      if (row.kind === 'section') {
        cellData.cell.styles.fillColor = SLATE_900;
        cellData.cell.styles.textColor = 255;
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fontSize = 9;
      } else if (row.kind === 'subsection') {
        cellData.cell.styles.fillColor = [226, 232, 240];
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.textColor = SLATE_900;
      } else if (row.kind === 'subtotal') {
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fillColor = [241, 245, 249];
      } else if (row.kind === 'total') {
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fillColor = GOLD;
        cellData.cell.styles.textColor = SLATE_900;
      }
      if (cellData.column.index === 2 && row.amount !== null) {
        const amt = n(row.amount);
        if (row.kind === 'item' || row.kind === 'subtotal') {
          cellData.cell.styles.textColor = amt < 0 ? RED : cellData.cell.styles.textColor;
        }
      }
      if (cellData.column.index === 2 && row.amount === null) {
        cellData.cell.styles.fontStyle = 'italic';
        cellData.cell.styles.textColor = SLATE_500;
      }
    },
    didDrawPage: () => {
      drawLetterhead();
    },
  });

  // ---- Accounting notes + unsupported categories, after the table ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let noteY = (doc as any).lastAutoTable.finalY + 8;
  const ensureRoom = (needed: number) => {
    if (noteY + needed > pageHeight - PAGE_MARGIN - 12) {
      doc.addPage();
      drawLetterhead();
      noteY = SUMMARY_TOP;
    }
  };

  if (data.accountingWarnings.length > 0) {
    ensureRoom(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_900);
    doc.text('ACCOUNTING DISCLOSURES & NOTES', PAGE_MARGIN, noteY);
    noteY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_500);
    for (const warning of data.accountingWarnings) {
      const lines = doc.splitTextToSize(`• ${warning}`, contentWidth);
      ensureRoom(lines.length * 3.6 + 2);
      doc.text(lines, PAGE_MARGIN, noteY);
      noteY += lines.length * 3.6 + 2;
    }
    noteY += 4;
  }

  if (data.unsupported.length > 0) {
    ensureRoom(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_900);
    doc.text(`NOT CURRENTLY SUPPORTED (${data.unsupported.length})`, PAGE_MARGIN, noteY);
    noteY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_500);
    const lines = doc.splitTextToSize(data.unsupported.join('  ·  '), contentWidth);
    ensureRoom(lines.length * 3.6);
    doc.text(lines, PAGE_MARGIN, noteY);
    noteY += lines.length * 3.6;
  }

  // ---- Footer on every page ----
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_500);
    doc.text('Electro Mart Trading — Confidential Balance Sheet', PAGE_MARGIN, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 8, { align: 'right' });
  }

  doc.save(filename);
}
