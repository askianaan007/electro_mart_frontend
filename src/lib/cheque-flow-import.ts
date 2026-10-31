import type { ChequeFlowDirection, ChequeFlowImportRow } from '@/lib/api/types';

/** The fields a column can be mapped to. */
export const IMPORT_FIELDS = [
  { key: 'chequeNumber', label: 'Cheque no.', required: false },
  { key: 'bankName', label: 'Bank', required: true },
  { key: 'chequeDate', label: 'Cheque date', required: true },
  { key: 'partyName', label: 'Customer / supplier name', required: true },
  { key: 'invoiceRef', label: 'Invoice ref', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'clearedDate', label: 'Cleared date', required: false },
  { key: 'remarks', label: 'Remarks', required: false },
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number]['key'];
export type CellValue = string | number | boolean | Date | null;
export type SheetRows = CellValue[][];

/** One side-by-side block of the sheet (e.g. customer cheques in A–H). */
export interface ImportBlock {
  id: string;
  /** null = ignore this block. */
  direction: ChequeFlowDirection | null;
  /** Title found above the headers, e.g. "CUSTOMER CHEQUES". */
  title: string;
  /** field → column index, or null when not in the sheet. */
  mapping: Record<ImportField, number | null>;
}

export interface ParsedSheet {
  headerRow: number;
  /** Header text per column index. */
  headers: string[];
  blocks: ImportBlock[];
}

const SYNONYMS: Record<ImportField, RegExp> = {
  chequeNumber: /^(cheque|check|chq)\s*(no|number|#|num)?\.?$|^cheque\s*no/,
  bankName: /^bank(\s*name)?$/,
  chequeDate: /^(cheque|check|chq)?\s*date$|^date$|due\s*date|cheque\s*date/,
  partyName: /(customer|supplier|party|payee|drawer|dealer)(\s*name)?$|^name$/,
  invoiceRef: /inv(oice)?\s*(ref|no|number)?/,
  status: /^status$|state/,
  amount: /^(amount|amt|value|total)$/,
  clearedDate: /(cleared|realis|realiz|pass(ed)?)\s*date/,
  remarks: /remark|note|comment/,
};

const text = (v: CellValue): string =>
  v === null || v === undefined ? '' : v instanceof Date ? '' : String(v).replace(/\s+/g, ' ').trim();

function fieldFor(header: string): ImportField | null {
  const h = header
    .toLowerCase()
    .replace(/[^a-z0-9#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!h) return null;
  // Order matters: "cleared date" before "cheque date", names before invoice.
  const order: ImportField[] = [
    'clearedDate',
    'chequeDate',
    'chequeNumber',
    'bankName',
    'invoiceRef',
    'partyName',
    'status',
    'amount',
    'remarks',
  ];
  return order.find((f) => SYNONYMS[f].test(h)) ?? null;
}

const emptyMapping = (): Record<ImportField, number | null> => ({
  chequeNumber: null,
  bankName: null,
  chequeDate: null,
  partyName: null,
  invoiceRef: null,
  status: null,
  amount: null,
  clearedDate: null,
  remarks: null,
});

/**
 * Finds the header row and the side-by-side blocks. A block starts at a
 * "Cheque no" column (or the first mapped column) and runs until the next
 * block. Its side comes from the title above it ("CUSTOMER CHEQUES") or its
 * name column ("SUPPLIER NAME").
 */
export function detectSheet(rows: SheetRows): ParsedSheet | null {
  let headerRow = -1;
  let best = 0;
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const hits = (rows[r] ?? []).filter((v) => fieldFor(text(v))).length;
    if (hits > best) {
      best = hits;
      headerRow = r;
    }
  }
  if (headerRow < 0 || best < 3) return null;

  const width = Math.max(...rows.slice(0, headerRow + 30).map((r) => r?.length ?? 0));
  const headers = Array.from({ length: width }, (_, c) => text(rows[headerRow]?.[c] ?? null));

  // Block starts: each cheque-number column; otherwise one block for the sheet.
  const starts = headers.map((h, c) => (fieldFor(h) === 'chequeNumber' ? c : -1)).filter((c) => c >= 0);
  if (starts.length === 0) {
    const first = headers.findIndex((h) => fieldFor(h));
    starts.push(first);
  }

  const blocks: ImportBlock[] = starts.map((start, i) => {
    const end = starts[i + 1] ?? width;
    const mapping = emptyMapping();
    for (let c = start; c < end; c++) {
      const field = fieldFor(headers[c]);
      if (field && mapping[field] === null) mapping[field] = c;
    }
    // Title: nearest non-empty text above the header within the block.
    let title = '';
    for (let r = headerRow - 1; r >= 0 && !title; r--) {
      for (let c = start; c < end && !title; c++) title = text(rows[r]?.[c] ?? null);
    }
    const sideText = `${title} ${mapping.partyName !== null ? headers[mapping.partyName] : ''}`.toLowerCase();
    const direction: ChequeFlowDirection | null = /supplier|payable|issued|vendor/.test(sideText)
      ? 'PAYABLE'
      : /customer|receivable|received|dealer/.test(sideText)
        ? 'RECEIVABLE'
        : i === 0
          ? 'RECEIVABLE'
          : 'PAYABLE';
    return { id: `block-${start}`, direction, title: title || `Columns from ${columnName(start)}`, mapping };
  });

  return { headerRow, headers, blocks };
}

/** 0 → "A", 26 → "AA". */
export function columnName(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** A date cell → YYYY-MM-DD. Excel dates arrive as UTC-midnight Date objects. */
export function toDay(v: CellValue): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    // An Excel serial date in a cell not formatted as a date.
    if (v > 20000 && v < 80000) {
      return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000).toISOString().slice(0, 10);
    }
    return null;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  // Sri Lankan sheets write day first: 05/09/2026.
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return s; // left for the server to reject with a clear message
}

export interface ExtractResult {
  rows: ChequeFlowImportRow[];
  /** Month headers, subtotal and blank rows that were left out. */
  skippedSubtotals: number;
}

/**
 * Turns the sheet into cheque rows using the blocks' mappings. A row with
 * neither a name nor a cheque number is never a cheque — month headers
 * ("September", 2026-09-01) and SUM subtotals — so it's skipped, not imported.
 */
export function extractRows(rows: SheetRows, sheet: ParsedSheet, blocks: ImportBlock[]): ExtractResult {
  const out: ChequeFlowImportRow[] = [];
  let skippedSubtotals = 0;
  for (let r = sheet.headerRow + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    for (const block of blocks) {
      if (!block.direction) continue;
      const cell = (field: ImportField): CellValue => {
        const c = block.mapping[field];
        return c === null ? null : (row[c] ?? null);
      };
      const party = text(cell('partyName'));
      const chequeNo = cell('chequeNumber');
      const hasChequeNo = text(chequeNo) !== '' || typeof chequeNo === 'number';
      const anything = Object.keys(block.mapping).some((f) => {
        const v = cell(f as ImportField);
        return v !== null && v !== '';
      });
      if (!party && !hasChequeNo) {
        if (anything) skippedSubtotals++;
        continue;
      }
      const raw = (field: ImportField) => {
        const v = cell(field);
        return v instanceof Date ? toDay(v) : typeof v === 'boolean' ? String(v) : v;
      };
      out.push({
        sourceRow: r + 1,
        direction: block.direction,
        // Numbers stay numbers so the server can warn about lost leading zeros.
        chequeNumber: typeof chequeNo === 'number' ? chequeNo : text(chequeNo) || null,
        bankName: raw('bankName') as string | number | null,
        chequeDate: toDay(cell('chequeDate')),
        partyName: party || null,
        invoiceRef: raw('invoiceRef') as string | number | null,
        amount: raw('amount') as string | number | null,
        status: (raw('status') as string | number | null) ?? '',
        clearedDate: toDay(cell('clearedDate')),
        remarks: raw('remarks') as string | number | null,
      });
    }
  }
  return { rows: out, skippedSubtotals };
}

/** Which required fields a block is still missing. */
export function missingFields(block: ImportBlock): string[] {
  if (!block.direction) return [];
  return IMPORT_FIELDS.filter((f) => f.required && block.mapping[f.key] === null).map((f) => f.label);
}

/** Reads every sheet of an .xlsx file in the browser. */
export async function readWorkbook(file: File): Promise<{ sheet: string; data: SheetRows }[]> {
  if (!/\.xlsx$/i.test(file.name)) {
    throw new Error('Choose an .xlsx file. For an older .xls file, open it in Excel and "Save As" .xlsx first.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('The file is larger than 10 MB.');
  const { default: readXlsxFile } = await import('read-excel-file/browser');
  try {
    const sheets = await readXlsxFile(file);
    return sheets.map((s) => ({ sheet: s.sheet, data: s.data as unknown as SheetRows }));
  } catch {
    throw new Error("This file couldn't be read as an Excel workbook. Is it open or damaged?");
  }
}
