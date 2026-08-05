import { formatCurrency } from '@/lib/utils';
import type { Invoice } from '@/lib/api/types';

const PAGE_HEIGHT_MM = 297;
const HEADER_HEIGHT_MM = (210 * 263) / 1541;
const FOOTER_HEIGHT_MM = (210 * 457) / 1544;

const TOTAL_TABLE_ROWS = 26;

const BILL_TO_RED = '#ED1C24';
const INFO_BLUE = '#DCEEFB';
const TABLE_HEAD_NAVY = '#13245C';

function formatInvoiceDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export function InvoicePrintLayout({ invoice }: { invoice: Invoice }) {
  const items = invoice.order?.items ?? [];
  const subtotal = Number(invoice.subtotal);
  const discountTotal = Number(invoice.discountTotal);
  const grandTotal = Number(invoice.grandTotal);
  const fillerRows = Math.max(0, TOTAL_TABLE_ROWS - items.length);

  return (
    <div
      className="relative mx-auto bg-white text-black shadow-lg print:m-0 print:shadow-none"
      style={{ width: '210mm', minHeight: `${PAGE_HEIGHT_MM}mm` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/invoice-header.png" alt="" className="block w-full" style={{ height: `${HEADER_HEIGHT_MM}mm` }} />

      <div
        className="flex flex-col text-[10px]"
        style={{ minHeight: `${PAGE_HEIGHT_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM}mm`, padding: '16px' }}
      >
        <div className="py-1 pl-2 font-bold uppercase text-white" style={{ background: BILL_TO_RED }}>
          Bill To :
        </div>

        <div className="flex justify-between gap-6 px-2 py-2 leading-[1.6]" style={{ background: INFO_BLUE }}>
          <div>
            <p>
              <span className="font-bold">Customer Name:</span> {invoice.dealer?.businessName ?? '—'}
            </p>
            <p>
              <span className="font-bold">Address:</span> {invoice.dealer?.address ?? '—'}
            </p>
            <p>
              <span className="font-bold">Phone:</span> {invoice.dealer?.phone ?? '—'}
            </p>
            <p>
              <span className="font-bold">Email:</span> {invoice.dealer?.email ?? '—'}
            </p>
          </div>
          <div className="text-right">
            <p>
              <span className="font-bold">Issue Date:</span> {formatInvoiceDate(invoice.createdAt)}
            </p>
            <p>
              <span className="font-bold">Delivery Date:</span> {formatInvoiceDate(invoice.order?.deliveredAt)}
            </p>
            <p>
              <span className="font-bold">Invoice Ref:</span> #{invoice.invoiceNumber}
            </p>
          </div>
        </div>

        <div className="mt-2 flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-white" style={{ background: TABLE_HEAD_NAVY }}>
                <th rowSpan={2} className="w-[6%] border border-black px-1.5 py-1 align-middle">
                  S.No
                </th>
                <th rowSpan={2} className="w-[13%] border border-black px-1.5 py-1 align-middle">
                  Product Code
                </th>
                <th rowSpan={2} className="border border-black px-1.5 py-1 text-left align-middle">
                  Item / Description
                </th>
                <th rowSpan={2} className="w-[6%] border border-black px-1.5 py-1 align-middle">
                  Qty
                </th>
                <th rowSpan={2} className="w-[12%] border border-black px-1.5 py-1 align-middle">
                  Unit Price
                </th>
                <th colSpan={2} className="border border-black px-1.5 py-0.5">
                  Discount
                </th>
                <th rowSpan={2} className="w-[14%] border border-black px-1.5 py-1 align-middle">
                  Total Amount
                </th>
              </tr>
              <tr className="text-white" style={{ background: TABLE_HEAD_NAVY }}>
                <th className="w-[8%] border border-black px-1.5 py-0.5">%</th>
                <th className="w-[11%] border border-black px-1.5 py-0.5">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const lineTotal = Number(item.lineTotal);
                const allocatedDiscount = Number(item.allocatedDiscount);
                const discountPct = lineTotal > 0 ? (allocatedDiscount / lineTotal) * 100 : 0;
                return (
                  <tr key={item.id} className="break-inside-avoid">
                    <td className="border border-black px-1.5 py-1 text-center">{index + 1}</td>
                    <td className="border border-black px-1.5 py-1 text-center">{item.product.productCode}</td>
                    <td className="border border-black px-1.5 py-1">{item.product.name}</td>
                    <td className="border border-black px-1.5 py-1 text-center">{item.quantity}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="border border-black px-1.5 py-1 text-center">
                      {allocatedDiscount > 0 ? `${discountPct.toFixed(1)}%` : '-'}
                    </td>
                    <td className="border border-black px-1.5 py-1 text-right">
                      {allocatedDiscount > 0 ? formatCurrency(allocatedDiscount) : '-'}
                    </td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatCurrency(item.netLineTotal)}</td>
                  </tr>
                );
              })}
              {Array.from({ length: fillerRows }, (_, i) => (
                <tr key={`filler-${i}`} className="break-inside-avoid">
                  <td className="border border-black px-1.5 py-1 text-center">{items.length + i + 1}</td>
                  <td className="border border-black px-1.5 py-1">&nbsp;</td>
                  <td className="border border-black px-1.5 py-1">&nbsp;</td>
                  <td className="border border-black px-1.5 py-1">&nbsp;</td>
                  <td className="border border-black px-1.5 py-1">&nbsp;</td>
                  <td className="border border-black px-1.5 py-1">&nbsp;</td>
                  <td className="border border-black px-1.5 py-1">&nbsp;</td>
                  <td className="border border-black px-1.5 py-1">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div className="text-center">
            <div className="w-[60mm] border-t border-black" />
            <p className="mt-1">For, Customer</p>
          </div>

          <table className="border-collapse" style={{ background: INFO_BLUE }}>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 font-semibold">TOTAL GROSS AMOUNT</td>
                <td className="border border-black px-2 py-1 text-right">{formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 font-semibold">TOTAL DISCOUNT AMOUNT</td>
                <td className="border border-black px-2 py-1 text-right text-red-600">
                  {discountTotal > 0 ? `-${formatCurrency(discountTotal)}` : '-'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 font-semibold">TOTAL DELIVERY COST</td>
                <td className="border border-black px-2 py-1 text-right">-</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 font-bold">TOTAL NET AMOUNT DUE</td>
                <td className="border border-black px-2 py-1 text-right font-bold">{formatCurrency(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/invoice-footer.png" alt="" className="block w-full" style={{ height: `${FOOTER_HEIGHT_MM}mm` }} />
    </div>
  );
}
