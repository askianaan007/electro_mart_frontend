import type { Invoice, Payment } from '@/lib/api/types';

/** A RETURNED (bounced) cheque never paid anything — mirrors isEffectivePayment on the backend. */
export function paymentCounts(p: Pick<Payment, 'mode' | 'chequeStatus'>) {
  return !(p.mode === 'CHEQUE' && p.chequeStatus === 'RETURNED');
}

/**
 * What an invoice is owed and paid, the same way the backend works it out:
 * net = grand total − returns; paid = effective payments; credit = wallet
 * credit used on it. `excess` is what was paid above net — it sits in the
 * dealer's wallet.
 */
export function invoiceMoney(invoice: Pick<Invoice, 'grandTotal' | 'netGrandTotal' | 'payments' | 'creditUses'>) {
  const net = Number(invoice.netGrandTotal ?? invoice.grandTotal);
  const paid = (invoice.payments ?? []).reduce((sum, p) => (paymentCounts(p) ? sum + Number(p.amount) : sum), 0);
  const credit = (invoice.creditUses ?? []).reduce((sum, u) => sum + Number(u.amount), 0);
  const balance = net - paid - credit;
  return {
    net,
    paid,
    credit,
    due: Math.max(0, balance),
    excess: Math.max(0, -balance),
  };
}
