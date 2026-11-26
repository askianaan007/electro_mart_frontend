import { formatStatementDate, loadImageDataUrl, GOLD, RED, SLATE_300, SLATE_500, SLATE_900 } from '@/lib/statement-pdf';
import { businessToday, formatCurrency } from '@/lib/utils';
import type { OutstandingInvoice } from '@/lib/api/types';

const MARGIN = 14;
// public/invoice-header_landscape.png is 2000x160px.
const HEADER_RATIO = 2000 / 160;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DueRow = OutstandingInvoice & { days: number | null };

/** Calendar days in Sri Lanka time since delivery. Null when not delivered yet. */
function daysSince(deliveredAt: string | null) {
  if (!deliveredAt) return null;
  const delivered = new Date(deliveredAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
  return Math.max(0, Math.round((Date.parse(businessToday()) - Date.parse(delivered)) / DAY_MS));
}

/** Overdue: delivered at least `minDays` days ago. Everything else still due is pending. */
export function splitDues(invoices: OutstandingInvoice[], minDays: number) {
  const overdue: DueRow[] = [];
  const pending: DueRow[] = [];
  for (const invoice of invoices) {
    const days = daysSince(invoice.deliveredAt);
    (days !== null && days >= minDays ? overdue : pending).push({ ...invoice, days });
  }
  return { overdue, pending };
}

// Summed in cents so long lists don't pick up rounding noise.
const total = (rows: DueRow[], key: 'amount' | 'paid' | 'due') =>
  rows.reduce((sum, r) => sum + Math.round(r[key] * 100), 0) / 100;

export const totalDue = (rows: DueRow[]) => total(rows, 'due');

/** Invoice amount, paid and balance totals, as right aligned footer cells. */
const totalCells = (rows: DueRow[]) =>
  (['amount', 'paid', 'due'] as const).map((key) => ({
    content: formatCurrency(total(rows, key)),
    styles: { halign: 'right' as const },
  }));

function groupByDealer(rows: DueRow[]) {
  const groups = new Map<string, DueRow[]>();
  for (const row of rows) {
    const list = groups.get(row.dealer.id);
    if (list) list.push(row);
    else groups.set(row.dealer.id, [row]);
  }
  // Biggest balance first; oldest delivery first inside each dealer.
  return [...groups.values()]
    .map((list) => list.sort((a, b) => (b.days ?? -1) - (a.days ?? -1)))
    .sort((a, b) => totalDue(b) - totalDue(a));
}

/** Number columns line up right in headings and footers too, not only in the body. */
const alignRight = (from: number) => (data: { column: { index: number }; cell: { styles: { halign: string } } }) => {
  if (data.column.index >= from) data.cell.styles.halign = 'right';
};

export async function downloadDealerDuesPdf(invoices: OutstandingInvoice[], minDays: number) {
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

  const { overdue, pending } = splitDues(invoices, minDays);

  function text(value: string, x: number, y: number, size: number, color = SLATE_900, bold = false, align: 'left' | 'right' | 'center' = 'left') {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(value, x, y, { align });
  }

  text('DEALER PAYMENT DUES', pageWidth / 2, top, 15, SLATE_900, true, 'center');
  text(`As of ${formatStatementDate(businessToday())}`, MARGIN, top + 7, 9, SLATE_500);
  text(`Overdue means ${minDays} days or more after delivery`, pageWidth - MARGIN, top + 7, 9, SLATE_500, false, 'right');

  const boxes = [
    { label: `OVERDUE (${overdue.length})`, value: totalDue(overdue), color: RED },
    { label: `PENDING (${pending.length})`, value: totalDue(pending), color: SLATE_900 },
    { label: 'TOTAL DUE', value: totalDue([...overdue, ...pending]), color: SLATE_900 },
  ];
  const boxWidth = (width - 6) / 3;
  boxes.forEach((box, i) => {
    const x = MARGIN + i * (boxWidth + 3);
    doc.setDrawColor(...SLATE_300);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, top + 12, boxWidth, 16, 1.5, 1.5, 'FD');
    text(box.label, x + 3, top + 18, 7, SLATE_500);
    text(formatCurrency(box.value), x + 3, top + 24.5, 11, box.color, true);
  });

  let y = top + 38;

  function section(title: string, rows: DueRow[], color: [number, number, number]) {
    // Keep the heading with at least the first rows of its table.
    if (y > pageHeight - 55) {
      doc.addPage();
      y = top;
    }
    text(title, MARGIN, y, 12, color, true);
    y += 4;
    if (rows.length === 0) {
      text('Nothing to show.', MARGIN, y + 3, 9, SLATE_500);
      y += 14;
      return;
    }

    const body = groupByDealer(rows).flatMap((list) => {
      const { businessName, phone } = list[0].dealer;
      return [
        [
          {
            content: phone ? `${businessName}   |   ${phone}` : businessName,
            colSpan: 5,
            styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] },
          },
          {
            content: formatCurrency(totalDue(list)),
            styles: { fontStyle: 'bold' as const, halign: 'right' as const, fillColor: [241, 245, 249] as [number, number, number] },
          },
        ],
        ...list.map((r) => [
          r.invoiceNumber,
          r.deliveredAt ? formatStatementDate(r.deliveredAt) : 'Not delivered',
          r.days === null ? 'N/A' : String(r.days),
          formatCurrency(r.amount),
          formatCurrency(r.paid),
          formatCurrency(r.due),
        ]),
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { top, left: MARGIN, right: MARGIN, bottom: 16 },
      theme: 'grid',
      head: [['Invoice Number', 'Delivered Date', 'Days', 'Invoice Amount', 'Paid', 'Balance Due']],
      body,
      foot: [[{ content: `${title} total`, colSpan: 3 }, ...totalCells(rows)]],
      showFoot: 'lastPage',
      rowPageBreak: 'avoid',
      styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: SLATE_300, lineWidth: 0.2, textColor: SLATE_900 },
      headStyles: { fillColor: SLATE_900, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: GOLD, textColor: SLATE_900, fontStyle: 'bold' },
      columnStyles: { 5: { fontStyle: 'bold' } },
      didParseCell: (data) => {
        // The dealer name and footer label span several columns and stay left.
        if (data.cell.colSpan === 1) alignRight(2)(data);
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  section('Overdue Payments', overdue, RED);
  section('Pending Payments', pending, SLATE_900);

  // Grand total of both sections, on a new page if it would not fit.
  if (y > pageHeight - 45) {
    doc.addPage();
    y = top;
  }
  autoTable(doc, {
    startY: y,
    margin: { top, left: MARGIN, right: MARGIN, bottom: 16 },
    theme: 'grid',
    pageBreak: 'avoid',
    head: [['Summary', 'Invoices', 'Invoice Amount', 'Paid', 'Balance Due']],
    body: [
      ['Overdue Payments', String(overdue.length), ...totalCells(overdue)],
      ['Pending Payments', String(pending.length), ...totalCells(pending)],
    ],
    foot: [['GRAND TOTAL', String(overdue.length + pending.length), ...totalCells([...overdue, ...pending])]],
    styles: { fontSize: 9.5, cellPadding: 3, lineColor: SLATE_300, lineWidth: 0.2, textColor: SLATE_900 },
    headStyles: { fillColor: SLATE_900, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: GOLD, textColor: SLATE_900, fontStyle: 'bold' },
    didParseCell: alignRight(1),
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.addImage(header, 'PNG', MARGIN, 8, width, headerHeight);
    text('Paid includes cheques not yet cleared and wallet credit.', MARGIN, pageHeight - 8, 7.5, SLATE_500);
    text(`Page ${i} of ${pages}`, pageWidth - MARGIN, pageHeight - 8, 7.5, SLATE_500, false, 'right');
  }

  doc.save(`dealer_dues_${businessToday().replaceAll('-', '_')}.pdf`);
}
