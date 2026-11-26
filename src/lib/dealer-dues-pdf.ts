import { formatStatementDate, loadImageDataUrl, GOLD, RED, SLATE_300, SLATE_500, SLATE_900 } from '@/lib/statement-pdf';
import { businessToday, formatCurrency } from '@/lib/utils';
import type { OutstandingInvoice, OutstandingReport } from '@/lib/api/types';

const MARGIN = 14;
// public/invoice-header_landscape.png is 2000x160px.
const HEADER_RATIO = 2000 / 160;
// Summed in cents so long lists don't pick up rounding noise.
const sum = <T>(rows: T[], value: (row: T) => number) =>
  rows.reduce((total, row) => total + Math.round(value(row) * 100), 0) / 100;

export const totalDue = (rows: OutstandingInvoice[]) => sum(rows, (r) => r.due);
export const totalCheques = (rows: OutstandingReport['pendingCheques']) => sum(rows, (r) => r.amount);

/**
 * Keeps only dealers whose total outstanding balance is at least `minAmount`,
 * biggest balance first, along with those dealers' uncleared cheques.
 */
export function filterDues(report: OutstandingReport, minAmount: number) {
  const byDealer = new Map<string, OutstandingInvoice[]>();
  for (const invoice of report.invoices) {
    const list = byDealer.get(invoice.dealer.id);
    if (list) list.push(invoice);
    else byDealer.set(invoice.dealer.id, [invoice]);
  }
  const dealers = [...byDealer.values()]
    .filter((list) => totalDue(list) >= minAmount)
    .sort((a, b) => totalDue(b) - totalDue(a));
  const included = new Set(dealers.map((list) => list[0].dealer.id));
  return {
    dealers,
    invoices: dealers.flat(),
    cheques: report.pendingCheques.filter((c) => included.has(c.dealer.id)),
  };
}

/** Invoice amount, paid and balance totals for a footer row. */
const totalCells = (rows: OutstandingInvoice[]) =>
  [sum(rows, (r) => r.amount), sum(rows, (r) => r.paid), totalDue(rows)].map((v) => formatCurrency(v));

/** Number columns line up right in headings and footers too, not only in the body. */
const alignRight = (from: number) => (data: { column: { index: number }; cell: { styles: { halign: string } } }) => {
  if (data.column.index >= from) data.cell.styles.halign = 'right';
};

export async function downloadDealerDuesPdf(report: OutstandingReport, minAmount: number) {
  const [{ default: jsPDF }, { default: autoTable }, header] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImageDataUrl('/invoice-header_landscape.png'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = pageWidth - MARGIN * 2;
  const headerHeight = width / HEADER_RATIO;
  const top = 8 + headerHeight + 8;
  const margin = { top, left: MARGIN, right: MARGIN, bottom: 16 };
  const styles = { fontSize: 8.5, cellPadding: 2.5, lineColor: SLATE_300, lineWidth: 0.2, textColor: SLATE_900 };
  const headStyles = { fillColor: SLATE_900, textColor: 255, fontStyle: 'bold' as const };
  const footStyles = { fillColor: GOLD, textColor: SLATE_900, fontStyle: 'bold' as const };

  const { dealers, invoices, cheques } = filterDues(report, minAmount);

  function text(value: string, x: number, y: number, size: number, color = SLATE_900, bold = false, align: 'left' | 'right' | 'center' = 'left') {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(value, x, y, { align });
  }

  text('DEALER OUTSTANDING PAYMENTS', pageWidth / 2, top, 15, SLATE_900, true, 'center');
  text(`As of ${formatStatementDate(businessToday())}`, MARGIN, top + 7, 9, SLATE_500);
  text(`Minimum outstanding: ${formatCurrency(minAmount)}`, pageWidth - MARGIN, top + 7, 9, SLATE_500, false, 'right');

  const boxes = [
    { label: 'DEALERS', value: String(dealers.length), color: SLATE_900 },
    { label: `TOTAL OUTSTANDING (${invoices.length} INVOICES)`, value: formatCurrency(totalDue(invoices)), color: RED },
    { label: `PENDING CHEQUES (${cheques.length})`, value: formatCurrency(totalCheques(cheques)), color: SLATE_900 },
  ];
  const boxWidth = (width - 6) / 3;
  boxes.forEach((box, i) => {
    const x = MARGIN + i * (boxWidth + 3);
    doc.setDrawColor(...SLATE_300);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, top + 12, boxWidth, 16, 1.5, 1.5, 'FD');
    text(box.label, x + 3, top + 18, 7, SLATE_500);
    text(box.value, x + 3, top + 24.5, 11, box.color, true);
  });

  let y = top + 38;

  function heading(title: string, color: [number, number, number]) {
    // Keep the heading with at least the first rows of its table.
    if (y > pageHeight - 55) {
      doc.addPage();
      y = top;
    }
    text(title, MARGIN, y, 12, color, true);
    y += 4;
  }

  /** Where the last table ended, plus a gap. */
  function moveBelowTable() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  const groupFill: [number, number, number] = [241, 245, 249];

  heading('Outstanding Payments', RED);
  autoTable(doc, {
    startY: y,
    margin,
    theme: 'grid',
    head: [['Invoice Number', 'Delivered Date', 'Invoice Amount', 'Paid', 'Balance Due']],
    body: dealers.flatMap((list) => {
      const { businessName, phone } = list[0].dealer;
      return [
        [
          {
            content: phone ? `${businessName}   |   ${phone}` : businessName,
            colSpan: 4,
            styles: { fontStyle: 'bold' as const, fillColor: groupFill },
          },
          {
            content: formatCurrency(totalDue(list)),
            styles: { fontStyle: 'bold' as const, halign: 'right' as const, fillColor: groupFill },
          },
        ],
        ...list.map((r) => [
          r.invoiceNumber,
          r.deliveredAt ? formatStatementDate(r.deliveredAt) : 'Not delivered',
          formatCurrency(r.amount),
          formatCurrency(r.paid),
          formatCurrency(r.due),
        ]),
      ];
    }),
    foot: [[{ content: 'TOTAL', colSpan: 2 }, ...totalCells(invoices)]],
    showFoot: 'lastPage',
    rowPageBreak: 'avoid',
    styles,
    headStyles,
    footStyles,
    columnStyles: { 4: { fontStyle: 'bold' } },
    didParseCell: (data) => {
      // The dealer name and footer label span several columns and stay left.
      if (data.cell.colSpan === 1) alignRight(2)(data);
    },
  });
  moveBelowTable();

  heading('Pending Payments (cheques not cleared)', SLATE_900);
  if (cheques.length === 0) {
    text('No pending cheques.', MARGIN, y + 3, 9, SLATE_500);
  } else {
    autoTable(doc, {
      startY: y,
      margin,
      theme: 'grid',
      head: [['Dealer', 'Invoice Number', 'Cheque Number', 'Bank', 'Cheque Date', 'Amount']],
      body: cheques.map((c) => [
        c.dealer.businessName,
        c.invoiceNumber ?? 'Advance',
        c.chequeNumber ?? 'N/A',
        c.bankName ?? 'N/A',
        c.chequeDate ? formatStatementDate(c.chequeDate) : 'N/A',
        formatCurrency(c.amount),
      ]),
      foot: [[{ content: 'TOTAL', colSpan: 5 }, formatCurrency(totalCheques(cheques))]],
      showFoot: 'lastPage',
      rowPageBreak: 'avoid',
      styles,
      headStyles,
      footStyles,
      didParseCell: alignRight(5),
    });
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.addImage(header, 'PNG', MARGIN, 8, width, headerHeight);
    text('Pending cheques are already counted in Paid.', MARGIN, pageHeight - 8, 7.5, SLATE_500);
    text(`Page ${i} of ${pages}`, pageWidth - MARGIN, pageHeight - 8, 7.5, SLATE_500, false, 'right');
  }

  doc.save(`dealer_dues_${businessToday().replaceAll('-', '_')}.pdf`);
}
