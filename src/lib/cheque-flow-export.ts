import type { ChequeFlowEntry, ChequeFlowSummary } from '@/lib/api/types';
import { formatCurrency } from '@/lib/utils';
import { bySide, formatDay, groupByMonth, monthLabel, sideTotals, STATUS_META } from '@/lib/cheque-flow';
import { GREEN, RED, SLATE_300, SLATE_500, SLATE_900, loadImageDataUrl } from '@/lib/statement-pdf';

export interface ChequeFlowExportOptions {
  /** e.g. "October 2026" or "All months". */
  periodLabel: string;
  /** Human description of active filters, or '' when none. */
  filterLabel: string;
  entries: ChequeFlowEntry[];
  summary: ChequeFlowSummary;
  fileBase: string;
}

const ORANGE: [number, number, number] = [220, 104, 3];
const GREEN_HEX = '#079455';
const ORANGE_HEX = '#DC6803';

/** Remarks plus where a linked cheque was recorded, e.g. "From Payments". */
function remarksText(e: ChequeFlowEntry) {
  const from = e.source === 'MANUAL' ? '' : (e.kindLabel ?? `From ${e.sourceLabel}`);
  return [from, e.remarks].filter(Boolean).join(' · ');
}

function statusText(e: ChequeFlowEntry) {
  return STATUS_META[e.status].label;
}

/** Customer and supplier rows paired by position — the sheet's side-by-side layout, not a match. */
function pairRows(entries: ChequeFlowEntry[]) {
  const customers = bySide(entries, 'RECEIVABLE');
  const suppliers = bySide(entries, 'PAYABLE');
  return Array.from({ length: Math.max(customers.length, suppliers.length) }, (_, i) => [
    customers[i] ?? null,
    suppliers[i] ?? null,
  ]) as [ChequeFlowEntry | null, ChequeFlowEntry | null][];
}

function summaryLines(summary: ChequeFlowSummary) {
  const net = summary.netPending;
  return [
    ['Total customer cheques', summary.receivable.total],
    ['Pending customer cheques (to receive)', summary.receivable.pending],
    ['Cleared customer receipts', summary.receivable.cleared],
    ['Bounced customer cheques', summary.receivable.bounced],
    ['Cancelled customer cheques', summary.receivable.cancelled],
    ['Total supplier cheques', summary.payable.total],
    ['Pending supplier cheques (to pay)', summary.payable.pending],
    ['Cleared supplier payments', summary.payable.cleared],
    ['Bounced supplier cheques', summary.payable.bounced],
    ['Cancelled supplier cheques', summary.payable.cancelled],
    [net < 0 ? 'Net pending cheque flow — additional funds required' : 'Net pending cheque flow', net],
  ] as [string, number][];
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

/** Excel workbook in the same side-by-side layout as the cheque sheet, plus a Summary sheet. */
export async function downloadChequeFlowExcel(options: ChequeFlowExportOptions) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  type Cell = Record<string, unknown> | null;

  const SIDE_COLS = [
    'Cheque No',
    'Bank',
    'Cheque Date',
    'Name',
    'Invoice Ref',
    'Status',
    'Cleared Date',
    'Amount',
    'Remarks',
  ];
  const width = SIDE_COLS.length * 2 + 1;
  const blank = (): Cell[] => Array.from({ length: width }, () => null);
  const head = (value: string, color: string): Record<string, unknown> => ({
    value,
    fontWeight: 'bold',
    textColor: '#FFFFFF',
    backgroundColor: color,
    borderStyle: 'thin',
    borderColor: '#CBD5E1',
  });
  const sideCells = (e: ChequeFlowEntry | null): Cell[] =>
    e
      ? [
          // Text type keeps leading zeros.
          { value: e.chequeNumber ?? '', type: String },
          { value: e.bankName, type: String },
          { value: new Date(`${e.chequeDate}T00:00:00.000Z`), type: Date, format: 'dd mmm yyyy' },
          { value: e.partyName, type: String },
          { value: e.invoiceRef ?? '', type: String },
          {
            value: statusText(e),
            type: String,
            textColor:
              e.status === 'CLEARED'
                ? GREEN_HEX
                : e.status === 'BOUNCED'
                  ? '#D92D20'
                  : e.status === 'PENDING'
                    ? ORANGE_HEX
                    : '#64748B',
          },
          e.clearedDate
            ? { value: new Date(`${e.clearedDate}T00:00:00.000Z`), type: Date, format: 'dd mmm yyyy' }
            : null,
          { value: e.amount, type: Number, format: '#,##0.00' },
          { value: remarksText(e), type: String },
        ]
      : SIDE_COLS.map(() => null);
  const totalCells = (label: string, value: number, color?: string): Cell[] => [
    ...Array.from({ length: SIDE_COLS.length - 2 }, () => null),
    { value: label, fontWeight: 'bold', align: 'right', textColor: color },
    { value, type: Number, format: '#,##0.00', fontWeight: 'bold', textColor: color, topBorderStyle: 'thin' },
    null,
  ];

  const data: Cell[][] = [];
  data.push([
    {
      value: `CHEQUE FLOW — ${options.periodLabel.toUpperCase()}`,
      fontWeight: 'bold',
      fontSize: 14,
      columnSpan: width,
    },
    ...Array.from({ length: width - 1 }, () => null),
  ]);
  data.push([
    {
      value: options.filterLabel
        ? `Filtered: ${options.filterLabel} — totals cover the filtered cheques only`
        : 'All cheques',
      fontStyle: 'italic',
      textColor: options.filterLabel ? ORANGE_HEX : '#64748B',
      columnSpan: width,
    },
    ...Array.from({ length: width - 1 }, () => null),
  ]);
  data.push(blank());
  data.push([
    { ...head('CUSTOMER CHEQUES (to receive)', GREEN_HEX), columnSpan: SIDE_COLS.length },
    ...Array.from({ length: SIDE_COLS.length - 1 }, () => null),
    null,
    { ...head('SUPPLIER CHEQUES (to pay)', ORANGE_HEX), columnSpan: SIDE_COLS.length },
    ...Array.from({ length: SIDE_COLS.length - 1 }, () => null),
  ]);
  data.push([...SIDE_COLS.map((c) => head(c, '#0F172A')), null, ...SIDE_COLS.map((c) => head(c, '#0F172A'))]);

  for (const { month, entries } of groupByMonth(options.entries)) {
    data.push([
      { value: monthLabel(month), fontWeight: 'bold', backgroundColor: '#F1F5F9', columnSpan: width },
      ...Array.from({ length: width - 1 }, () => null),
    ]);
    for (const [c, s] of pairRows(entries)) data.push([...sideCells(c), null, ...sideCells(s)]);
    const ct = sideTotals(bySide(entries, 'RECEIVABLE'));
    const st = sideTotals(bySide(entries, 'PAYABLE'));
    data.push([
      ...totalCells('Pending', ct.pending, ORANGE_HEX),
      null,
      ...totalCells('Pending', st.pending, ORANGE_HEX),
    ]);
    data.push([...totalCells('Cleared', ct.cleared, GREEN_HEX), null, ...totalCells('Cleared', st.cleared, GREEN_HEX)]);
    data.push([...totalCells('Month total', ct.total), null, ...totalCells('Month total', st.total)]);
    if (ct.bounced || ct.cancelled || st.bounced || st.cancelled) {
      data.push([
        ...totalCells('Bounced + cancelled (not in totals)', ct.bounced + ct.cancelled, '#D92D20'),
        null,
        ...totalCells('Bounced + cancelled (not in totals)', st.bounced + st.cancelled, '#D92D20'),
      ]);
    }
    data.push(blank());
  }

  const summaryData: Cell[][] = [
    [{ value: `SUMMARY — ${options.periodLabel.toUpperCase()}`, fontWeight: 'bold', fontSize: 14 }, null],
    [{ value: options.filterLabel ? `Filtered: ${options.filterLabel}` : 'All cheques', fontStyle: 'italic' }, null],
    [null, null],
    ...summaryLines(options.summary).map(([label, value], i, all): Cell[] => [
      { value: label, fontWeight: i === all.length - 1 ? 'bold' : undefined },
      {
        value,
        type: Number,
        format: '#,##0.00',
        fontWeight: i === all.length - 1 ? 'bold' : undefined,
        textColor: i === all.length - 1 ? (value < 0 ? '#D92D20' : GREEN_HEX) : undefined,
      },
    ]),
    [null, null],
    [
      {
        value: 'Net pending compares pending cheques only — it does not include the bank balance.',
        fontStyle: 'italic',
        textColor: '#64748B',
      },
      null,
    ],
  ];

  const sideWidths = [12, 14, 13, 24, 18, 11, 13, 14, 20].map((w) => ({ width: w }));
  await writeXlsxFile([
    {
      sheet: 'Cheque Flow',
      data: data as never,
      columns: [...sideWidths, { width: 3 }, ...sideWidths],
      orientation: 'landscape',
      stickyRowsCount: 5,
    },
    { sheet: 'Summary', data: summaryData as never, columns: [{ width: 52 }, { width: 18 }] },
  ] as never).toFile(`${options.fileBase}.xlsx`);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/** Branded A4 landscape PDF: summary strip, then per month the two sides side by side with totals. */
export async function downloadChequeFlowPdf(options: ChequeFlowExportOptions) {
  const [{ default: jsPDF }, { default: autoTable }, headerImage] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImageDataUrl('/invoice-header_landscape.png').catch(() => null),
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const M = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - M * 2;
  const headerHeight = headerImage ? contentWidth / (2000 / 160) : 0;
  const generatedOn = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const top = 6 + headerHeight + 16;
  function letterhead() {
    if (headerImage) doc.addImage(headerImage, 'PNG', M, 6, contentWidth, headerHeight);
    const y = 6 + headerHeight + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...SLATE_900);
    doc.text(`CHEQUE FLOW — ${options.periodLabel.toUpperCase()}`, M, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...(options.filterLabel ? ORANGE : SLATE_500));
    doc.text(
      options.filterLabel ? `Filtered: ${options.filterLabel} — totals cover filtered cheques only` : 'All cheques',
      M,
      y + 5,
    );
    doc.setTextColor(...SLATE_500);
    doc.text(`Generated ${generatedOn} · LKR`, pageWidth - M, y, { align: 'right' });
  }

  // Summary strip: 7 boxes.
  const s = options.summary;
  const boxes: [string, number, [number, number, number]][] = [
    ['Customer total', s.receivable.total, GREEN],
    ['Pending to receive', s.receivable.pending, GREEN],
    ['Cleared receipts', s.receivable.cleared, GREEN],
    ['Supplier total', s.payable.total, ORANGE],
    ['Pending to pay', s.payable.pending, ORANGE],
    ['Cleared payments', s.payable.cleared, ORANGE],
    [s.netPending < 0 ? 'Additional funds required' : 'Net pending flow', s.netPending, s.netPending < 0 ? RED : GREEN],
  ];
  letterhead();
  const gap = 2.5;
  const boxW = (contentWidth - gap * (boxes.length - 1)) / boxes.length;
  boxes.forEach(([label, value, color], i) => {
    const x = M + i * (boxW + gap);
    doc.setDrawColor(...SLATE_300);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, top, boxW, 15, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE_500);
    doc.text(label.toUpperCase(), x + 2.5, top + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...color);
    doc.text(`${value < 0 ? '-' : ''}${formatCurrency(Math.abs(value))}`, x + 2.5, top + 11.5);
  });
  const bouncedNote = [
    s.receivable.bounced || s.receivable.cancelled
      ? `Customer bounced ${formatCurrency(s.receivable.bounced)}, cancelled ${formatCurrency(s.receivable.cancelled)}`
      : '',
    s.payable.bounced || s.payable.cancelled
      ? `Supplier bounced ${formatCurrency(s.payable.bounced)}, cancelled ${formatCurrency(s.payable.cancelled)}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_500);
  doc.text(
    `Net pending compares pending cheques only — it does not include the bank balance.${bouncedNote ? `  Not in totals: ${bouncedNote}.` : ''}`,
    M,
    top + 20,
  );

  const sideHead = ['Date', 'Cheque No', 'Bank', 'Name', 'Inv. Ref', 'Status', 'Amount'];
  const cells = (e: ChequeFlowEntry | null) =>
    e
      ? [
          formatDay(e.chequeDate),
          e.chequeNumber ?? '—',
          e.bankName,
          e.partyName,
          e.invoiceRef ?? '',
          e.status === 'CLEARED' && e.clearedDate ? `Cleared ${formatDay(e.clearedDate)}` : statusText(e),
          formatCurrency(e.amount),
        ]
      : sideHead.map(() => '');

  let startY = top + 25;
  const months = groupByMonth(options.entries);
  if (months.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('No cheques for this period.', M, startY + 6);
  }
  for (const { month, entries } of months) {
    const pairs = pairRows(entries);
    const ct = sideTotals(bySide(entries, 'RECEIVABLE'));
    const st = sideTotals(bySide(entries, 'PAYABLE'));
    const totalRow = (label: string, a: number, b: number) => [
      ...Array(5).fill(''),
      label,
      formatCurrency(a),
      '',
      ...Array(5).fill(''),
      label,
      formatCurrency(b),
    ];
    autoTable(doc, {
      startY,
      margin: { top, left: M, right: M, bottom: 12 },
      theme: 'grid',
      head: [
        [
          {
            content: monthLabel(month),
            colSpan: 15,
            styles: { fillColor: [241, 245, 249], textColor: SLATE_900, fontSize: 9 },
          },
        ],
        [
          { content: 'CUSTOMER CHEQUES — to receive', colSpan: 7, styles: { fillColor: GREEN } },
          { content: '', styles: { fillColor: [255, 255, 255] } },
          { content: 'SUPPLIER CHEQUES — to pay', colSpan: 7, styles: { fillColor: ORANGE } },
        ],
        [...sideHead, '', ...sideHead],
      ],
      body: [
        ...pairs.map(([c, sp]) => [...cells(c), '', ...cells(sp)]),
        totalRow('Pending', ct.pending, st.pending),
        totalRow('Cleared', ct.cleared, st.cleared),
        totalRow('Total', ct.total, st.total),
      ],
      styles: { fontSize: 6.8, cellPadding: 1.4, lineColor: SLATE_300, lineWidth: 0.15, overflow: 'linebreak' },
      headStyles: { fillColor: SLATE_900, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        6: { halign: 'right', fontStyle: 'bold' },
        7: { cellWidth: 3, fillColor: [255, 255, 255], lineWidth: 0 },
        14: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const pairIndex = data.row.index;
        if (pairIndex >= pairs.length) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [248, 250, 252];
          return;
        }
        const entry = data.column.index < 7 ? pairs[pairIndex][0] : pairs[pairIndex][1];
        if (!entry) return;
        const col = data.column.index % 8;
        if (col === 5) {
          data.cell.styles.textColor =
            entry.status === 'CLEARED'
              ? GREEN
              : entry.status === 'BOUNCED'
                ? RED
                : entry.status === 'PENDING'
                  ? ORANGE
                  : SLATE_500;
        }
        if (entry.dueState === 'overdue') data.cell.styles.fillColor = [254, 228, 226];
      },
      didDrawPage: () => {
        letterhead();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...SLATE_500);
        doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - M, pageHeight - 5, { align: 'right' });
      },
    });
    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  doc.save(`${options.fileBase}.pdf`);
}
