import type { Purchase, PurchaseReturn, ReplacementReceipt, SupplierPayment } from '@/lib/api/types';

/**
 * Builds a supplier Statement of Account (the Emax_Statement_of_Account
 * layout) from the supplier's full transaction history. Always fed the
 * *whole* history so a month/period statement gets a correct opening
 * balance brought forward; the period only decides which entries are
 * listed. Follows the same rules as the backend's supplierBalance():
 *
 *   balance = purchases − returns + replacements − transport − payments
 *
 * where a bounced (RETURNED) cheque doesn't count as paid — it's shown as
 * the original cheque plus a "cheque returned" reversal so the ledger reads
 * like the bank statement while still netting to zero.
 */

export type StatementEntryType =
  | 'Invoice'
  | 'Return'
  | 'Replacement'
  | 'Transport'
  | 'Cheque'
  | 'Cheque returned'
  | 'Transfer'
  | 'Cash';

export interface StatementEntry {
  /** ISO timestamp of the business date (purchaseDate, returnDate, …). */
  date: string;
  /** Local yyyy-mm-dd of `date` — what periods and months are cut on. */
  dayKey: string;
  reference: string;
  type: StatementEntryType;
  description: string;
  mode: string;
  qty: number | null;
  unitPrice: number | null;
  debit: number;
  credit: number;
  balance: number;
  // tie-breakers for entries on the same day
  createdAt: string;
  rank: number;
}

export type StatementPeriod = { kind: 'all' } | { kind: 'range'; fromMonth: string; toMonth: string };

export interface SummaryLine {
  label: string;
  count: number | null;
  amount: number;
  emphasis?: 'subtotal' | 'total';
}

export interface MonthlyRow {
  monthKey: string; // yyyy-mm
  purchases: number;
  returns: number; // negative
  replacements: number; // positive
  payments: number; // negative (incl. transport, net of bounced cheques)
  net: number;
}

export interface SupplierStatement {
  period: StatementPeriod;
  periodLabel: string;
  statementDate: Date;
  openingBalance: number;
  closingBalance: number;
  entries: StatementEntry[];
  totalDebit: number;
  totalCredit: number;
  summary: SummaryLine[];
  hasReplacements: boolean;
  monthly: MonthlyRow[];
  monthlyTotal: Omit<MonthlyRow, 'monthKey'>;
  /** Closing balance over the entire history — compare with the system's supplier balance. */
  allTimeBalance: number;
}

const RANK: Record<StatementEntryType, number> = {
  Invoice: 0,
  Replacement: 1,
  Return: 2,
  Transport: 3,
  Cheque: 4,
  Transfer: 5,
  Cash: 6,
  'Cheque returned': 7,
};

const MODE_LABEL: Record<SupplierPayment['mode'], string> = {
  CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank Transfer',
  CASH: 'Cash',
};

export function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function lastDayOfMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
}

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function collectEntries(input: {
  purchases: Purchase[];
  returns: PurchaseReturn[];
  replacements: ReplacementReceipt[];
  payments: SupplierPayment[];
}): Omit<StatementEntry, 'balance'>[] {
  const entries: Omit<StatementEntry, 'balance'>[] = [];
  const push = (e: Omit<StatementEntry, 'balance' | 'dayKey' | 'rank'>) =>
    entries.push({ ...e, dayKey: dayKey(e.date), rank: RANK[e.type] });

  for (const p of input.purchases) {
    for (const item of p.items) {
      push({
        date: p.purchaseDate,
        createdAt: p.createdAt,
        reference: p.invoiceNumber,
        type: 'Invoice',
        description: `Purchase - ${item.product?.name ?? 'Unknown product'}`,
        mode: '',
        qty: item.quantity,
        unitPrice: Number(item.unitCost),
        debit: Number(item.lineTotal),
        credit: 0,
      });
    }
    const transport = Number(p.transportCharges);
    if (transport > 0) {
      push({
        date: p.purchaseDate,
        createdAt: p.createdAt,
        reference: '',
        type: 'Transport',
        description: `Transport for Invoice #${p.invoiceNumber}`,
        mode: '',
        qty: null,
        unitPrice: null,
        debit: 0,
        credit: transport,
      });
    }
  }

  for (const r of input.returns) {
    for (const item of r.items) {
      push({
        date: r.returnDate,
        createdAt: r.createdAt,
        reference: r.returnNumber,
        type: 'Return',
        description: `Return - ${item.product?.name ?? 'Unknown product'}${r.reason ? ` (${r.reason})` : ''}`,
        mode: '',
        qty: -item.quantity,
        unitPrice: Number(item.unitCost),
        debit: 0,
        credit: Number(item.lineTotal),
      });
    }
  }

  for (const rep of input.replacements) {
    for (const item of rep.items) {
      push({
        date: rep.receivedDate,
        createdAt: rep.createdAt,
        reference: rep.replacementNumber,
        type: 'Replacement',
        description: `Replacement - ${item.product?.name ?? 'Unknown product'}${
          rep.purchaseReturn?.returnNumber ? ` (for ${rep.purchaseReturn.returnNumber})` : ''
        }`,
        mode: '',
        qty: item.quantity,
        unitPrice: Number(item.unitCost),
        debit: Number(item.lineTotal),
        credit: 0,
      });
    }
  }

  for (const pay of input.payments) {
    const amount = Number(pay.amount);
    const type: StatementEntryType =
      pay.mode === 'CHEQUE' ? 'Cheque' : pay.mode === 'BANK_TRANSFER' ? 'Transfer' : 'Cash';
    const pending = pay.mode === 'CHEQUE' && pay.chequeStatus === 'PENDING';
    push({
      date: pay.paymentDate,
      createdAt: pay.createdAt,
      reference: pay.reference ?? '',
      type,
      description:
        pay.remarks?.trim() ||
        (type === 'Cheque' ? 'Cheque issued' : type === 'Transfer' ? 'Bank transfer' : 'Cash payment'),
      mode: `${MODE_LABEL[pay.mode]}${pending ? ' (Pending)' : ''}`,
      qty: null,
      unitPrice: null,
      debit: 0,
      credit: amount,
    });
    if (pay.mode === 'CHEQUE' && pay.chequeStatus === 'RETURNED') {
      const when = pay.chequeStatusUpdatedAt ?? pay.paymentDate;
      push({
        date: when,
        createdAt: when,
        reference: pay.reference ?? '',
        type: 'Cheque returned',
        description: `Cheque${pay.reference ? ` #${pay.reference}` : ''} returned unpaid (reversed)`,
        mode: 'Cheque',
        qty: null,
        unitPrice: null,
        debit: amount,
        credit: 0,
      });
    }
  }

  entries.sort(
    (a, b) =>
      a.dayKey.localeCompare(b.dayKey) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.rank - b.rank ||
      a.reference.localeCompare(b.reference),
  );
  return entries;
}

export function buildSupplierStatement(
  input: {
    purchases: Purchase[];
    returns: PurchaseReturn[];
    replacements: ReplacementReceipt[];
    payments: SupplierPayment[];
  },
  period: StatementPeriod,
  statementDate = new Date(),
): SupplierStatement {
  const all = collectEntries(input);

  const startKey = period.kind === 'range' ? `${period.fromMonth}-01` : null;
  const endKey = period.kind === 'range' ? lastDayOfMonth(period.toMonth) : null;

  let openingBalance = 0;
  let allTimeBalance = 0;
  const inPeriod: Omit<StatementEntry, 'balance'>[] = [];
  for (const e of all) {
    const delta = e.debit - e.credit;
    allTimeBalance += delta;
    if (startKey && e.dayKey < startKey) openingBalance += delta;
    else if (!endKey || e.dayKey <= endKey) inPeriod.push(e);
  }

  let running = openingBalance;
  const entries: StatementEntry[] = inPeriod.map((e) => {
    running = round2(running + e.debit - e.credit);
    return { ...e, balance: running };
  });

  const sumOf = (types: StatementEntryType[], side: 'debit' | 'credit') =>
    round2(entries.filter((e) => types.includes(e.type)).reduce((s, e) => s + e[side], 0));
  const countOf = (types: StatementEntryType[]) => entries.filter((e) => types.includes(e.type)).length;

  const purchases = sumOf(['Invoice'], 'debit');
  const returns = sumOf(['Return'], 'credit');
  const replacements = sumOf(['Replacement'], 'debit');
  const transport = sumOf(['Transport'], 'credit');
  const cheques = sumOf(['Cheque'], 'credit');
  const bounced = sumOf(['Cheque returned'], 'debit');
  const transfers = sumOf(['Transfer', 'Cash'], 'credit');
  const hasReplacements = countOf(['Replacement']) > 0;
  const hasBounced = countOf(['Cheque returned']) > 0;

  const netPurchases = round2(purchases - returns + replacements);
  const totalPayments = round2(-transport - cheques + bounced - transfers);
  const closingBalance = round2(openingBalance + netPurchases + totalPayments);

  const summary: SummaryLine[] = [];
  if (period.kind === 'range') {
    summary.push({ label: 'Opening balance brought forward', count: null, amount: round2(openingBalance) });
  }
  summary.push(
    { label: 'Total purchases (invoiced)', count: countOf(['Invoice']), amount: purchases },
    { label: 'Less: Goods returned (credit notes)', count: countOf(['Return']), amount: -returns },
  );
  if (hasReplacements) {
    summary.push({
      label: 'Add: Replacements received for returns',
      count: countOf(['Replacement']),
      amount: replacements,
    });
  }
  summary.push(
    { label: 'Net purchases', count: null, amount: netPurchases, emphasis: 'subtotal' },
    { label: 'Less: Transportation charges paid', count: countOf(['Transport']), amount: -transport },
    { label: 'Less: Cheques issued (cleared & pending)', count: countOf(['Cheque']), amount: -cheques },
  );
  if (hasBounced) {
    summary.push({ label: 'Add: Cheques returned unpaid', count: countOf(['Cheque returned']), amount: bounced });
  }
  summary.push(
    {
      label: 'Less: Cash transferred (bank transfers / cash)',
      count: countOf(['Transfer', 'Cash']),
      amount: -transfers,
    },
    {
      label: period.kind === 'range' ? 'Total payments in period' : 'Total payments to date',
      count: countOf(['Transport', 'Cheque', 'Transfer', 'Cash']),
      amount: totalPayments,
      emphasis: 'subtotal',
    },
  );

  // Monthly movement — every month in the window, including quiet ones.
  const firstMonth =
    period.kind === 'range' ? period.fromMonth : (entries[0]?.dayKey.slice(0, 7) ?? dayKey(statementDate.toISOString()).slice(0, 7));
  const lastMonth =
    period.kind === 'range'
      ? period.toMonth
      : [entries[entries.length - 1]?.dayKey.slice(0, 7) ?? firstMonth, firstMonth].sort().pop()!;
  const monthly: MonthlyRow[] = [];
  for (let [y, m] = firstMonth.split('-').map(Number); `${y}-${String(m).padStart(2, '0')}` <= lastMonth; ) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const monthEntries = entries.filter((e) => e.dayKey.startsWith(key));
    const sum = (types: StatementEntryType[], side: 'debit' | 'credit') =>
      round2(monthEntries.filter((e) => types.includes(e.type)).reduce((s, e) => s + e[side], 0));
    const row = {
      monthKey: key,
      purchases: sum(['Invoice'], 'debit'),
      returns: -sum(['Return'], 'credit'),
      replacements: sum(['Replacement'], 'debit'),
      payments: round2(-sum(['Transport', 'Cheque', 'Transfer', 'Cash'], 'credit') + sum(['Cheque returned'], 'debit')),
      net: 0,
    };
    row.net = round2(row.purchases + row.returns + row.replacements + row.payments);
    monthly.push(row);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  const monthlyTotal = monthly.reduce(
    (t, r) => ({
      purchases: round2(t.purchases + r.purchases),
      returns: round2(t.returns + r.returns),
      replacements: round2(t.replacements + r.replacements),
      payments: round2(t.payments + r.payments),
      net: round2(t.net + r.net),
    }),
    { purchases: 0, returns: 0, replacements: 0, payments: 0, net: 0 },
  );

  return {
    period,
    periodLabel:
      period.kind === 'all'
        ? 'Whole account (all transactions)'
        : period.fromMonth === period.toMonth
          ? monthLabel(period.fromMonth)
          : `${monthLabel(period.fromMonth)} – ${monthLabel(period.toMonth)}`,
    statementDate,
    openingBalance: round2(openingBalance),
    closingBalance,
    entries,
    totalDebit: round2(entries.reduce((s, e) => s + e.debit, 0)),
    totalCredit: round2(entries.reduce((s, e) => s + e.credit, 0)),
    summary,
    hasReplacements,
    monthly,
    monthlyTotal,
    allTimeBalance: round2(allTimeBalance),
  };
}
