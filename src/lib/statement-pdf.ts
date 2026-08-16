import { formatCurrency } from '@/lib/utils';

const PAGE_MARGIN = 14;
// public/invoice-header_landscape.png is 2000x160px — kept in sync with the letterhead asset.
const HEADER_IMAGE_RATIO = 2000 / 160;

export const GOLD: [number, number, number] = [244, 196, 48];
export const SLATE_900: [number, number, number] = [15, 23, 42];
export const SLATE_500: [number, number, number] = [100, 116, 139];
export const SLATE_300: [number, number, number] = [203, 213, 225];
export const GREEN: [number, number, number] = [22, 163, 74];
export const RED: [number, number, number] = [220, 38, 38];
export const AMBER: [number, number, number] = [217, 119, 6];
export const BLUE: [number, number, number] = [37, 99, 235];

export type ChequeLikeStatus = 'PENDING' | 'CLEARED' | 'RETURNED';

const STATUS_COLOR: Record<ChequeLikeStatus, [number, number, number]> = {
  CLEARED: GREEN,
  PENDING: AMBER,
  RETURNED: RED,
};

export function formatStatementDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function loadImageDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** A single row on the ledger table — already display-ready strings/labels, domain-agnostic. */
export interface LedgerStatementRow {
  date: string;
  typeLabel: string;
  status: ChequeLikeStatus | null;
  description: string;
  mode: string | null;
  faceAmount: string | number;
  balanceBefore: string | number;
  balanceAfter: string | number;
}

export interface LedgerStatementSummaryItem {
  label: string;
  value: number;
  color: [number, number, number];
}

export interface LedgerStatementOptions {
  filename: string;
  /** e.g. "LIQUID CASH STATEMENT" */
  title: string;
  filterSummary: string;
  dateFrom?: string;
  dateTo?: string;
  /** Up to 5 boxes rendered under the letterhead on page 1. */
  summaryItems: LedgerStatementSummaryItem[];
  /** e.g. "CLOSING CASH POSITION" */
  closingLabel: string;
  closingValue: number;
  rows: LedgerStatementRow[];
}

/**
 * Renders any of the "official statement" ledgers (Liquid Cash, Credit
 * Balance, …) as a branded, multi-page PDF — the company letterhead
 * (public/invoice-header_landscape.png) and title repeat on every page via
 * autoTable's didDrawPage hook, a snapshot summary strip sits under the
 * letterhead on page 1 only, and a closing-balance bar + signature blocks
 * are appended after the table (spilling onto a fresh lettered page if the
 * table ends too close to the bottom). Domain-specific callers (see
 * liquid-cash-pdf.ts, credit-balance-pdf.ts) just map their rows/summary
 * into this shape — all the layout math lives here, once.
 */
export async function downloadLedgerStatementPdf(options: LedgerStatementOptions) {
  const [{ default: jsPDF }, { default: autoTable }, headerImage] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImageDataUrl('/invoice-header_landscape.png'),
  ]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  // Letterhead spans the full content width, edge to edge like a real letterhead
  // banner — height follows from the asset's own aspect ratio so it never
  // looks stretched or squashed.
  const headerTop = 8;
  const headerImgWidth = contentWidth;
  const headerImgHeight = headerImgWidth / HEADER_IMAGE_RATIO;
  const dividerY = headerTop + headerImgHeight + 3;
  const titleY = dividerY + 8;
  const metaY1 = titleY + 7;
  const metaY2 = metaY1 + 5;
  const SUMMARY_TOP = metaY2 + 6;

  const periodLabel =
    options.dateFrom || options.dateTo
      ? `${options.dateFrom ? formatStatementDate(options.dateFrom) : 'Inception'} — ${options.dateTo ? formatStatementDate(options.dateTo) : 'Present'}`
      : 'All-Time';
  const generatedOn = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  function drawLetterhead() {
    doc.addImage(headerImage, 'PNG', PAGE_MARGIN, headerTop, headerImgWidth, headerImgHeight);

    doc.setDrawColor(...SLATE_300);
    doc.setLineWidth(0.4);
    doc.line(PAGE_MARGIN, dividerY, pageWidth - PAGE_MARGIN, dividerY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...SLATE_900);
    doc.text(options.title, pageWidth / 2, titleY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_500);
    doc.text(`Statement Period: ${periodLabel}`, PAGE_MARGIN, metaY1);
    doc.text(`Filter: ${options.filterSummary}`, PAGE_MARGIN, metaY2);
    doc.text(`Generated On: ${generatedOn}`, pageWidth - PAGE_MARGIN, metaY1, { align: 'right' });
    doc.text('Currency: LKR', pageWidth - PAGE_MARGIN, metaY2, { align: 'right' });
  }

  function drawSummaryStrip(y: number) {
    const items = options.summaryItems;
    const gap = 3;
    const boxWidth = (contentWidth - gap * (items.length - 1)) / items.length;
    const boxHeight = 16;

    items.forEach((item, i) => {
      const x = PAGE_MARGIN + i * (boxWidth + gap);
      doc.setDrawColor(...SLATE_300);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, boxWidth, boxHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...SLATE_500);
      doc.text(item.label.toUpperCase(), x + 3, y + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...item.color);
      const sign = item.value < 0 ? '-' : '';
      doc.text(`${sign}${formatCurrency(Math.abs(item.value))}`, x + 3, y + 12.5);
    });
  }

  const SUMMARY_HEIGHT = 16;
  const TABLE_START_Y = SUMMARY_TOP + SUMMARY_HEIGHT + 6;

  autoTable(doc, {
    startY: TABLE_START_Y,
    margin: { top: SUMMARY_TOP, left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 20 },
    theme: 'grid',
    head: [['Date', 'Type', 'Status', 'Description', 'Mode', 'Previous Balance', 'Amount', 'Balance After']],
    body: options.rows.map((row) => [
      formatStatementDate(row.date),
      row.typeLabel,
      row.status ?? '—',
      row.description,
      row.mode ? row.mode.replace('_', ' ') : '—',
      formatCurrency(row.balanceBefore),
      `${Number(row.faceAmount) >= 0 ? '+' : ''}${formatCurrency(row.faceAmount)}`,
      formatCurrency(row.balanceAfter),
    ]),
    styles: { fontSize: 8, cellPadding: 2.5, lineColor: SLATE_300, lineWidth: 0.2 },
    headStyles: { fillColor: SLATE_900, textColor: 255, fontStyle: 'bold', halign: 'left' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const row = options.rows[data.row.index];
      if (!row) return;
      if (data.column.index === 2 && row.status) {
        data.cell.styles.textColor = STATUS_COLOR[row.status];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 6) {
        const amount = Number(row.faceAmount);
        data.cell.styles.textColor = amount > 0 ? GREEN : amount < 0 ? RED : SLATE_500;
      }
    },
    didDrawPage: (data) => {
      drawLetterhead();
      if (data.pageNumber === 1) drawSummaryStrip(SUMMARY_TOP);
    },
  });

  // Closing balance + signature blocks, appended after the table — on a fresh
  // lettered page if the table ran out too close to the bottom to fit them.
  const CLOSING_BLOCK_HEIGHT = 46;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y = (doc as any).lastAutoTable.finalY + 8;
  if (y + CLOSING_BLOCK_HEIGHT > pageHeight - PAGE_MARGIN) {
    doc.addPage();
    drawLetterhead();
    y = SUMMARY_TOP;
  }

  doc.setFillColor(...GOLD);
  doc.rect(PAGE_MARGIN, y, contentWidth, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...SLATE_900);
  doc.text(options.closingLabel.toUpperCase(), PAGE_MARGIN + 3, y + 6.8);
  doc.text(formatCurrency(options.closingValue), pageWidth - PAGE_MARGIN - 3, y + 6.8, { align: 'right' });

  const sigY = y + 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE_900);
  doc.text('PREPARED BY', PAGE_MARGIN, sigY);
  doc.text('AUTHORIZED SIGNATORY', pageWidth - PAGE_MARGIN - 60, sigY);
  doc.setDrawColor(...SLATE_900);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, sigY + 10, PAGE_MARGIN + 60, sigY + 10);
  doc.line(pageWidth - PAGE_MARGIN - 60, sigY + 10, pageWidth - PAGE_MARGIN, sigY + 10);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_500);
    doc.text('Electro Mart Trading — Confidential Statement', PAGE_MARGIN, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 8, { align: 'right' });
  }

  doc.save(options.filename);
}
