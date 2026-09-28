import type { jsPDF as JsPDF } from 'jspdf';
import { loadImageDataUrl } from '@/lib/statement-pdf';
import type { SupplierStatement } from '@/lib/supplier-statement';

/**
 * A4 Statement of Account PDF in the Emax_Statement_of_Account layout:
 *   page 1 (portrait)   — ACCOUNT SUMMARY + Monthly movement
 *   page 2+ (landscape) — STATEMENT OF ACCOUNT ledger with running balance
 * Every page carries the letterhead (public/invoice-header.png) and a faint
 * full-page logo watermark (public/logo-icon.png).
 */

type RGB = [number, number, number];
const NAVY: RGB = [31, 56, 100]; // #1F3864 — table headers, titles
const BAND: RGB = [192, 192, 192]; // #C0C0C0 — SOA info band
const SUBTLE: RGB = [242, 242, 242]; // #F2F2F2 — opening / total rows
const YELLOW: RGB = [255, 255, 0]; // #FFFF00 — balance due
const GRID: RGB = [217, 217, 217]; // #D9D9D9
const BLUE: RGB = [0, 0, 255]; // entered values, as in the sample
const RED: RGB = [255, 0, 0];
const GREEN: RGB = [0, 128, 0];
const TEXT: RGB = [0, 0, 0];
const MUTED: RGB = [110, 110, 110];

// Narrow side margins — the landscape ledger needs the width.
const MARGIN_PORTRAIT = 10;
const MARGIN_LANDSCAPE = 7;
const HEADER_RATIO = 1541 / 263; // public/invoice-header.png (portrait pages)
const HEADER_LANDSCAPE_RATIO = 2000 / 160; // public/invoice-header_landscape.png
const LOGO_RATIO = 516 / 458; // public/logo-icon.png
// The letterhead images carry their own white space, so they're placed
// full-bleed: from the very top edge, across the whole page width.
const HEADER_TOP = 0;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WATERMARK_OPACITY = 0.07;

/** #,##0.00;(#,##0.00);- — the sample's accounting format. */
export function money(n: number) {
  const v = Math.round(n * 100) / 100;
  if (v === 0) return '-';
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `(${s})` : s;
}

function count(n: number | null) {
  if (n === null) return '';
  return n === 0 ? '-' : n.toLocaleString('en-US');
}

// d-mmm-yyyy with fixed 3-letter months (en-GB would print "Sept").
function shortDate(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

function monthShort(key: string) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]}-${y}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lastTableY = (doc: JsPDF) => (doc as any).lastAutoTable.finalY as number;

export async function downloadSupplierStatementPdf(supplierName: string, statement: SupplierStatement) {
  const [{ default: jsPDF, GState }, { default: autoTable }, header, headerLandscape, logo] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImageDataUrl('/invoice-header.png'),
    loadImageDataUrl('/invoice-header_landscape.png'),
    loadImageDataUrl('/logo-icon.png'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setProperties({
    title: `Statement of Account — ${supplierName}`,
    subject: statement.periodLabel,
    author: 'Electro Mart Trading',
  });
  const statementDate = shortDate(statement.statementDate);
  const dueLabel = `TOTAL DUE TO ${supplierName.toUpperCase()} (to issue payment)`;

  const pageW = () => doc.internal.pageSize.getWidth();
  const pageH = () => doc.internal.pageSize.getHeight();
  const isLandscape = () => pageW() > pageH();
  const mx = () => (isLandscape() ? MARGIN_LANDSCAPE : MARGIN_PORTRAIT);
  // Letterhead box for the current page's orientation — edge to edge.
  const letterheadBox = (landscape = isLandscape()) => {
    const width = landscape ? 297 : 210;
    return { width, height: width / (landscape ? HEADER_LANDSCAPE_RATIO : HEADER_RATIO) };
  };
  const belowHeader = (landscape = isLandscape()) => HEADER_TOP + letterheadBox(landscape).height + 1.5;

  // Watermark goes down first so every table, band and line sits on top of
  // it — like printing on watermarked letterhead paper. Tracked per page so
  // a page autoTable revisits never gets a second copy of either.
  const decorated = new Set<number>();
  function drawLetterhead() {
    const { width, height } = letterheadBox();
    const y = HEADER_TOP + height + 1.5;
    const page = doc.getCurrentPageInfo().pageNumber;
    if (decorated.has(page)) return y;
    decorated.add(page);

    const w = pageW();
    const h = pageH();
    const markW = Math.min(w, h) * 0.62;
    const markH = markW / LOGO_RATIO;
    doc.setGState(new GState({ opacity: WATERMARK_OPACITY }));
    doc.addImage(logo, 'PNG', (w - markW) / 2, (h - markH) / 2 + 8, markW, markH, 'watermark', 'FAST');
    doc.setGState(new GState({ opacity: 1 }));

    const landscape = isLandscape();
    doc.addImage(
      landscape ? headerLandscape : header,
      'PNG',
      (w - width) / 2,
      HEADER_TOP,
      width,
      height,
      landscape ? 'letterhead-landscape' : 'letterhead',
      'FAST',
    );
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.5);
    doc.line(mx(), y, w - mx(), y);
    return y;
  }

  // ───────────────────────── Page 1: ACCOUNT SUMMARY (portrait) ─────────────────────────
  let y = drawLetterhead() + 9;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text('ACCOUNT SUMMARY', pageW() - mx(), y, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text(`Supplier : ${supplierName}`, mx(), y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Period : ${statement.periodLabel}`, mx(), y);
  doc.setFont('helvetica', 'bold');
  const dateLabel = 'Statement date: ';
  doc.setTextColor(...GREEN);
  doc.text(statementDate, pageW() - mx(), y, { align: 'right' });
  doc.setTextColor(...TEXT);
  doc.text(dateLabel, pageW() - mx() - doc.getTextWidth(statementDate), y, { align: 'right' });
  y += 6;

  const summaryBody = statement.summary.map((line) => [line.label, count(line.count), money(line.amount)]);
  summaryBody.push([dueLabel, '', money(statement.closingBalance)]);
  const dueRowIndex = summaryBody.length - 1;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_PORTRAIT, right: MARGIN_PORTRAIT, top: belowHeader(false) + 6, bottom: 16 },
    theme: 'plain',
    head: [['Account summary', 'No. of entries', 'Amount (LKR)']],
    body: summaryBody,
    styles: { font: 'helvetica', fontSize: 9.5, textColor: TEXT, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 } },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 32, halign: 'center' },
      2: { cellWidth: 42, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'head') {
        if (data.column.index > 0) data.cell.styles.halign = 'center';
        return;
      }
      const line = statement.summary[data.row.index];
      if (data.row.index === dueRowIndex) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 10.5;
        data.cell.styles.fillColor = data.column.index === 2 ? YELLOW : SUBTLE;
      } else if (line?.emphasis) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      const { x, y: cy, width, height } = data.cell;
      doc.setDrawColor(...(data.row.index === dueRowIndex ? TEXT : GRID));
      if (data.row.index === dueRowIndex) {
        // medium top, double bottom — as in the sample
        doc.setLineWidth(0.5);
        doc.line(x, cy, x + width, cy);
        doc.setLineWidth(0.25);
        doc.line(x, cy + height - 0.8, x + width, cy + height - 0.8);
        doc.line(x, cy + height, x + width, cy + height);
        return;
      }
      doc.setLineWidth(0.2);
      doc.line(x, cy + height, x + width, cy + height);
      if (statement.summary[data.row.index]?.emphasis) {
        doc.setDrawColor(...TEXT);
        doc.line(x, cy, x + width, cy);
      }
    },
    willDrawPage: () => {
      drawLetterhead();
    },
  });

  // Monthly movement
  const showRepl = statement.hasReplacements;
  const monthlyHead = [
    'Monthly movement',
    'Purchases',
    'Returns',
    ...(showRepl ? ['Replacements'] : []),
    'Payments (incl. transport)',
    'Net movement',
  ];
  const monthlyRow = (label: string, r: SupplierStatement['monthlyTotal']) => [
    label,
    money(r.purchases),
    money(r.returns),
    ...(showRepl ? [money(r.replacements)] : []),
    money(r.payments),
    money(r.net),
  ];
  const monthlyBody = statement.monthly.map((r) => monthlyRow(monthShort(r.monthKey), r));
  monthlyBody.push(monthlyRow('Total', statement.monthlyTotal));
  const monthlyTotalIndex = monthlyBody.length - 1;
  const lastCol = monthlyHead.length - 1;

  autoTable(doc, {
    startY: lastTableY(doc) + 9,
    margin: { left: MARGIN_PORTRAIT, right: MARGIN_PORTRAIT, top: belowHeader(false) + 6, bottom: 16 },
    theme: 'plain',
    head: [monthlyHead],
    body: monthlyBody,
    styles: { font: 'helvetica', fontSize: 9, textColor: TEXT, cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 }, halign: 'right' },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle' },
    columnStyles: { 0: { halign: 'left', cellWidth: 34 } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === monthlyTotalIndex) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = data.column.index === lastCol ? YELLOW : SUBTLE;
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      const { x, y: cy, width, height } = data.cell;
      if (data.row.index === monthlyTotalIndex) {
        doc.setDrawColor(...TEXT);
        doc.setLineWidth(0.5);
        doc.line(x, cy, x + width, cy);
        doc.setLineWidth(0.25);
        doc.line(x, cy + height - 0.8, x + width, cy + height - 0.8);
        doc.line(x, cy + height, x + width, cy + height);
      } else {
        doc.setDrawColor(...GRID);
        doc.setLineWidth(0.2);
        doc.line(x, cy + height, x + width, cy + height);
      }
    },
    willDrawPage: () => {
      drawLetterhead();
    },
  });

  // ───────────────────── Page 2+: STATEMENT OF ACCOUNT (landscape) ─────────────────────
  doc.addPage('a4', 'landscape');
  const ledgerFirstPage = doc.getNumberOfPages();
  y = drawLetterhead() + 3;

  // Grey info band + title, like rows 2–7 of the SOA sheet
  const bandH = 22;
  const bandW = pageW() - mx() * 2;
  doc.setFillColor(...BAND);
  doc.rect(mx(), y, bandW, bandH, 'F');
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT);
  doc.setFont('helvetica', 'bold');
  doc.text('Supplier:', mx() + 3, y + 5.5);
  doc.text('Statement date:', mx() + 3, y + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.text(supplierName, mx() + 32, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text(statementDate, mx() + 32, y + 10.5);
  doc.setTextColor(...TEXT);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${statement.periodLabel}`, mx() + 80, y + 10.5);

  const dueValue = money(statement.closingBalance);
  const dueBoxW = 44;
  const dueBoxX = mx() + bandW - dueBoxW - 2;
  doc.setFillColor(...YELLOW);
  doc.rect(dueBoxX, y + 2.5, dueBoxW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(dueValue, dueBoxX + dueBoxW - 2, y + 7.4, { align: 'right' });
  doc.setFontSize(9.5);
  doc.text(`Balance due to ${supplierName}:`, dueBoxX - 3, y + 7.4, { align: 'right' });

  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text('STATEMENT OF ACCOUNT', pageW() / 2, y + 18.5, { align: 'center' });
  y += bandH + 2;

  const TYPE_COLOR: Partial<Record<string, RGB>> = { Return: RED, Replacement: GREEN, 'Cheque returned': RED };
  const ledgerBody = [
    ['', '', '', 'Opening balance', '', '', '', '', '', money(statement.openingBalance)],
    ...statement.entries.map((e) => [
      shortDate(e.date),
      e.reference,
      e.type,
      e.description,
      e.mode,
      e.qty === null ? '' : String(e.qty),
      e.unitPrice === null ? '' : money(e.unitPrice),
      e.debit ? money(e.debit) : '',
      e.credit ? money(e.credit) : '',
      money(e.balance),
    ]),
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_LANDSCAPE, right: MARGIN_LANDSCAPE, top: belowHeader(true) + 10, bottom: 16 },
    theme: 'grid',
    head: [
      [
        'Date',
        'Reference',
        'Type',
        'Description',
        'Mode of Payment',
        'Qty',
        'Unit Price',
        'Debit (Invoices)',
        'Credit (Payments / Returns)',
        'Balance Due',
      ],
    ],
    body: ledgerBody,
    foot: [
      [
        { content: 'TOTAL / CLOSING BALANCE DUE', colSpan: 7, styles: { halign: 'right' } },
        money(statement.totalDebit),
        money(statement.totalCredit),
        money(statement.closingBalance),
      ],
    ],
    showFoot: 'lastPage',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: TEXT,
      lineColor: GRID,
      lineWidth: 0.2,
      cellPadding: { top: 1.8, bottom: 1.8, left: 1.8, right: 1.8 },
      valign: 'middle',
      overflow: 'linebreak',
    },
    // Transparent body cells so the watermark shows through the ledger.
    bodyStyles: { fillColor: false },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 8 },
    footStyles: { fillColor: SUBTLE, textColor: TEXT, fontStyle: 'bold', halign: 'right', fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 21 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 30 },
      5: { cellWidth: 11, halign: 'right' },
      6: { cellWidth: 21, halign: 'right' },
      7: { cellWidth: 25, halign: 'right' },
      8: { cellWidth: 27, halign: 'right' },
      9: { cellWidth: 27, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'foot' && data.column.index === 9) data.cell.styles.fillColor = YELLOW;
      if (data.section !== 'body') return;
      if (data.row.index === 0) {
        data.cell.styles.fillColor = SUBTLE;
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 9) data.cell.styles.textColor = BLUE;
        return;
      }
      const entry = statement.entries[data.row.index - 1];
      const typeColor = TYPE_COLOR[entry.type];
      if (typeColor && [5, 6, 7, 8].includes(data.column.index)) {
        data.cell.styles.textColor = typeColor;
      } else if ([5, 6, 8].includes(data.column.index)) {
        data.cell.styles.textColor = BLUE;
      }
    },
    willDrawPage: () => {
      drawLetterhead();
      if (doc.getCurrentPageInfo().pageNumber > ledgerFirstPage) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...NAVY);
        doc.text(`STATEMENT OF ACCOUNT — ${supplierName} (continued)`, mx(), belowHeader(true) + 6);
      }
    },
  });

  // ───────────────────────────────── Footer on every page ─────────────────────────────────
  const total = doc.getNumberOfPages();
  const now = new Date();
  const generated = `${shortDate(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const w = pageW();
    const h = pageH();
    doc.setDrawColor(...GRID);
    doc.setLineWidth(0.3);
    doc.line(mx(), h - 11, w - mx(), h - 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Statement of Account — ${supplierName} · ${statement.periodLabel}`, mx(), h - 7);
    doc.text(`Generated ${generated}   ·   Page ${i} of ${total}`, w - mx(), h - 7, { align: 'right' });
  }

  doc.save(statementFileName(supplierName, statement));
}

/**
 * `Emax_Statement_of_Account(jan-2026 to sep-2026).pdf` — matching how the
 * statements were named when kept in Excel. A whole-account statement names
 * the months it actually covers.
 */
export function statementFileName(supplierName: string, statement: SupplierStatement) {
  const supplierPart =
    supplierName
      .split(/\s+/)
      .map((word) => word.replace(/[^A-Za-z0-9]/g, ''))
      .filter(Boolean)
      // "E-MAX" -> "Emax"; mixed-case words ("Samsung") are kept as written.
      .map((word) => (word === word.toUpperCase() ? word.charAt(0) + word.slice(1).toLowerCase() : word))
      .join('_') || 'Supplier';

  const month = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return `${MONTHS[m - 1].toLowerCase()}-${y}`;
  };
  const [from, to] =
    statement.period.kind === 'range'
      ? [statement.period.fromMonth, statement.period.toMonth]
      : [statement.monthly[0]?.monthKey, statement.monthly[statement.monthly.length - 1]?.monthKey];
  const periodPart = !from || !to ? 'all' : from === to ? month(from) : `${month(from)} to ${month(to)}`;

  return `${supplierPart}_Statement_of_Account(${periodPart}).pdf`;
}
