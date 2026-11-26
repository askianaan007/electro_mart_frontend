import { formatStatementDate } from '@/lib/statement-pdf';
import { businessToday, formatCurrency } from '@/lib/utils';
import type { OutstandingInvoice } from '@/lib/api/types';

const MARGIN = 16;
type Rgb = [number, number, number];
const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];
// Only for hairlines between rows; all text stays black.
const LINE: Rgb = [190, 190, 190];

const DAY_MS = 24 * 60 * 60 * 1000;

interface Badge {
  fill: Rgb;
  border: Rgb;
  ink: Rgb;
}

// Pale fills with dark ink, so the date still reads on a black and white print.
const AGE_BADGES: (Badge & { upTo: number; label: string })[] = [
  { upTo: 30, label: 'Up to 30 days', fill: [220, 252, 231], border: [22, 163, 74], ink: [20, 83, 45] },
  { upTo: 60, label: '31 to 60 days', fill: [254, 243, 199], border: [217, 119, 6], ink: [120, 53, 15] },
  { upTo: Infinity, label: 'Over 60 days', fill: [254, 226, 226], border: [220, 38, 38], ink: [127, 29, 29] },
];
const NOT_DELIVERED: Badge = { fill: [243, 244, 246], border: [156, 163, 175], ink: [55, 65, 81] };

/** The date text and colour for a delivery, aged in Sri Lanka calendar days. */
function deliveryBadge(deliveredAt: string | null): { label: string; badge: Badge } {
  if (!deliveredAt) return { label: 'Not delivered', badge: NOT_DELIVERED };
  const delivered = new Date(deliveredAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
  const days = Math.max(0, Math.round((Date.parse(businessToday()) - Date.parse(delivered)) / DAY_MS));
  return {
    label: `${formatStatementDate(deliveredAt)}   ${days} ${days === 1 ? 'day' : 'days'}`,
    badge: AGE_BADGES.find((b) => days <= b.upTo)!,
  };
}

// Summed in cents so long lists don't pick up rounding noise.
const sum = (rows: OutstandingInvoice[], key: 'amount' | 'paid' | 'due') =>
  rows.reduce((total, row) => total + Math.round(row[key] * 100), 0) / 100;

export const totalDue = (rows: OutstandingInvoice[]) => sum(rows, 'due');

// A large finite number, so two undelivered invoices compare as equal.
const deliveredTime = (row: OutstandingInvoice) =>
  row.deliveredAt ? Date.parse(row.deliveredAt) : Number.MAX_SAFE_INTEGER;

function groupByDealer(rows: OutstandingInvoice[]) {
  const groups = new Map<string, OutstandingInvoice[]>();
  for (const row of rows) {
    const list = groups.get(row.dealer.id);
    if (list) list.push(row);
    else groups.set(row.dealer.id, [row]);
  }
  // Oldest delivery first, both for the invoices of a dealer and for the dealers
  // themselves (by their oldest one). Not delivered goes last.
  return [...groups.values()]
    .map((list) => list.sort((a, b) => deliveredTime(a) - deliveredTime(b)))
    .sort((a, b) => deliveredTime(a[0]) - deliveredTime(b[0]) || totalDue(b) - totalDue(a));
}

/**
 * Keeps dealers whose total outstanding balance is at least `minAmount`, then
 * splits their invoices: pending (nothing collected yet) and partly paid.
 */
export function filterDues(invoices: OutstandingInvoice[], minAmount: number) {
  const included = groupByDealer(invoices).filter((list) => totalDue(list) >= minAmount);
  const rows = included.flat();
  return {
    dealerCount: included.length,
    all: rows,
    pending: rows.filter((r) => r.paid === 0),
    partial: rows.filter((r) => r.paid > 0),
  };
}

const isBadgeCell = (raw: unknown): raw is { label: string; badge: Badge } =>
  typeof raw === 'object' && raw !== null && 'badge' in raw;

export async function downloadDealerDuesPdf(invoices: OutstandingInvoice[], minAmount: number) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const right = pageWidth - MARGIN;
  const width = right - MARGIN;
  const { dealerCount, all, pending, partial } = filterDues(invoices, minAmount);

  function text(value: string, x: number, y: number, size: number, bold = false, align: 'left' | 'right' = 'left') {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...BLACK);
    doc.text(value, x, y, { align });
  }

  /** A rounded label starting at x, vertically centred on `middle`. */
  function drawBadge(label: string, badge: Badge, x: number, middle: number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const badgeWidth = doc.getTextWidth(label) + 5;
    doc.setFillColor(...badge.fill);
    doc.setDrawColor(...badge.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, middle - 3, badgeWidth, 6, 1.5, 1.5, 'FD');
    doc.setTextColor(...badge.ink);
    doc.text(label, x + 2.5, middle, { baseline: 'middle' });
    return badgeWidth;
  }

  function rule(y: number, weight: number) {
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(weight);
    doc.line(MARGIN, y, right, y);
  }

  // Letterhead, typeset so it prints sharp in black and white.
  text('ELECTRO MART TRADING', MARGIN, 20, 16, true);
  text('192 Maliga Road, Malaigaikadu, Karaitivu, Kalmunai', MARGIN, 27, 8.5);
  text('076 860 4800  |  075 075 0725  |  075 677 2045', MARGIN, 32, 8.5);
  text('electromarttrade@gmail.com', MARGIN, 37, 8.5);
  text('Outstanding Payments', right, 20, 14, true, 'right');
  text(`Date: ${formatStatementDate(businessToday())}`, right, 27, 8.5, false, 'right');
  if (minAmount > 0) {
    text(`Dealers owing ${formatCurrency(minAmount)} or more`, right, 32, 8.5, false, 'right');
  }
  text('Amounts in LKR', right, 37, 8.5, false, 'right');
  rule(44, 0.6);

  const summary = [
    { label: 'Dealers', value: String(dealerCount) },
    { label: 'Invoices', value: String(all.length) },
    { label: 'Total to collect', value: formatCurrency(totalDue(all)) },
  ];
  summary.forEach((item, i) => {
    const x = MARGIN + i * (width / 3);
    text(item.label, x, 53, 8.5);
    text(item.value, x, 61, 13, true);
  });
  rule(68, 0.2);

  text('Delivered date colours', MARGIN, 76, 8.5);
  let legendX = MARGIN + 38;
  for (const badge of AGE_BADGES) {
    legendX += drawBadge(badge.label, badge, legendX, 74.9) + 4;
  }

  let y = 90;

  function section(title: string, note: string, rows: OutstandingInvoice[], showPaid: boolean) {
    // Keep a heading together with the first rows of its table.
    if (y > pageHeight - 65) {
      doc.addPage();
      y = 20;
    }
    text(title, MARGIN, y, 12, true);
    text(note, right, y, 8.5, false, 'right');
    y += 6;
    if (rows.length === 0) {
      text('No invoices.', MARGIN, y + 5, 9);
      y += 17;
      return;
    }

    const columns = showPaid
      ? ['Invoice Number', 'Delivered Date', 'Invoice Amount', 'Paid', 'To Collect']
      : ['Invoice Number', 'Delivered Date', 'To Collect'];
    const last = columns.length - 1;

    const body = groupByDealer(rows).flatMap((list) => {
      const { businessName, phone } = list[0].dealer;
      // Extra room above each customer so the groups read apart.
      const customer = {
        fontStyle: 'bold' as const,
        fontSize: 10,
        cellPadding: { top: 9, bottom: 3.5, left: 1.5, right: 1.5 },
      };
      return [
        [
          { content: `${businessName}     Phone: ${phone || 'Not available'}`, colSpan: last, styles: customer },
          { content: formatCurrency(totalDue(list)), styles: { ...customer, halign: 'right' as const } },
        ],
        ...list.map((r) => [
          r.invoiceNumber,
          // Width comes from `content`; the badge itself is drawn in didDrawCell.
          { content: `${deliveryBadge(r.deliveredAt).label}      `, ...deliveryBadge(r.deliveredAt) },
          ...(showPaid ? [formatCurrency(r.amount), formatCurrency(r.paid)] : []),
          formatCurrency(r.due),
        ]),
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { top: 16, left: MARGIN, right: MARGIN, bottom: 18 },
      theme: 'plain',
      head: [columns],
      body,
      foot: [
        [
          { content: `Total ${title.toLowerCase()}`, colSpan: showPaid ? 2 : last },
          ...(showPaid ? [formatCurrency(sum(rows, 'amount')), formatCurrency(sum(rows, 'paid'))] : []),
          formatCurrency(totalDue(rows)),
        ],
      ],
      showFoot: 'lastPage',
      rowPageBreak: 'avoid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: { top: 3.5, bottom: 3.5, left: 1.5, right: 1.5 }, textColor: BLACK },
      headStyles: { fontStyle: 'bold', fillColor: WHITE },
      footStyles: { fontStyle: 'bold', fillColor: WHITE },
      didParseCell: (data) => {
        // Number columns line up right; labels spanning columns stay left.
        if (data.cell.colSpan === 1 && data.column.index >= 2) data.cell.styles.halign = 'right';
      },
      willDrawCell: (data) => {
        if (isBadgeCell(data.cell.raw)) data.cell.text = [];
      },
      didDrawCell: (data) => {
        const { x, y: cellY, width: w, height: h } = data.cell;
        const line = (at: number, weight: number, color: Rgb) => {
          doc.setDrawColor(...color);
          doc.setLineWidth(weight);
          doc.line(x, at, x + w, at);
        };
        if (data.section === 'head') line(cellY + h, 0.4, BLACK);
        else if (data.section === 'foot') line(cellY, 0.4, BLACK);
        else line(cellY + h, 0.1, LINE);
        const raw: unknown = data.cell.raw;
        if (data.section === 'body' && isBadgeCell(raw)) drawBadge(raw.label, raw.badge, x + 1.5, cellY + h / 2);
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  section('Pending Invoices', 'Nothing collected yet', pending, false);
  section('Partly Paid Invoices', 'Balance still to collect', partial, true);

  if (y > pageHeight - 36) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.6);
  doc.rect(MARGIN, y - 4, width, 16);
  text('TOTAL TO COLLECT', MARGIN + 4, y + 5.5, 12, true);
  text(formatCurrency(totalDue(all)), right - 4, y + 5.5, 12, true, 'right');

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    text('Paid includes cheques not yet cleared and wallet credit.', MARGIN, pageHeight - 9, 7.5);
    text(`Page ${i} of ${pages}`, right, pageHeight - 9, 7.5, false, 'right');
  }

  doc.save(`outstanding_payments_${businessToday().replaceAll('-', '_')}.pdf`);
}
