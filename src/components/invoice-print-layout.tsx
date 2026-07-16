import { formatCurrency } from '@/lib/utils';
import type { Invoice } from '@/lib/api/types';

const PAGE_HEIGHT_MM = 297;
const HEADER_HEIGHT_MM = (291 / 3250) * PAGE_HEIGHT_MM;
const FOOTER_HEIGHT_MM = (126 / 3250) * PAGE_HEIGHT_MM;

function formatInvoiceDate(value: string) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export function InvoicePrintLayout({ invoice }: { invoice: Invoice }) {
  const items = invoice.order?.items ?? [];
  const subtotal = Number(invoice.subtotal);
  const discount = Number(invoice.discountTotal);
  const discountPct = subtotal > 0 ? (discount / subtotal) * 100 : 0;

  return (
    <div
      className="relative mx-auto bg-white text-black shadow-lg print:m-0 print:shadow-none"
      style={{ width: '210mm', minHeight: `${PAGE_HEIGHT_MM}mm` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/invoice-header.png"
        alt=""
        className="block w-full"
        style={{ height: `${HEADER_HEIGHT_MM}mm` }}
      />

      <div
        className="flex flex-col px-[14mm] pb-[6mm]"
        style={{ minHeight: `${PAGE_HEIGHT_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM}mm` }}
      >
        <h1 className="mt-[8mm] text-center text-[22pt] font-bold tracking-wide">INVOICE</h1>

        <div className="mt-[9mm] flex justify-between gap-8 text-[10.5pt] leading-relaxed">
          <div>
            <p>
              <span className="font-bold">Customer Name</span>: {invoice.dealer?.businessName}
            </p>
            <p>
              <span className="font-bold">Address:</span> {invoice.dealer?.address ?? '—'}
            </p>
            {invoice.dealer?.phone && (
              <p>
                <span className="font-bold">Phone:</span> {invoice.dealer.phone}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold">
              Invoice Date: <span className="font-normal">{formatInvoiceDate(invoice.createdAt)}</span>
            </p>
            <p className="mt-1 font-bold">
              Invoice Number: <span className="font-normal">#{invoice.invoiceNumber}</span>
            </p>
          </div>
        </div>

        <table className="mt-[8mm] w-full border-collapse text-[10pt]">
          <thead>
            <tr>
              <th className="border border-black px-2 py-2 text-left">No</th>
              <th className="border border-black px-2 py-2 text-left">Item &amp; Description</th>
              <th className="border border-black px-2 py-2 text-right">Qty</th>
              <th className="border border-black px-2 py-2 text-right">Unit Price</th>
              <th className="border border-black px-2 py-2 text-right">Total Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-black px-2 py-2">{index + 1}</td>
                <td className="border border-black px-2 py-2">{item.product.name}</td>
                <td className="border border-black px-2 py-2 text-right">{item.quantity}</td>
                <td className="border border-black px-2 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="border border-black px-2 py-2 text-right">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-[9mm] flex justify-between gap-8">
          <div className="max-w-[55%] text-[9.5pt] leading-relaxed">
            <p className="font-bold">NOTES / TERMS:</p>
            <p className="mt-2">Warranty Period: 2 Years</p>
            <p>Warranty Card Is Essential For Warranty Claims</p>
            <p className="font-semibold">Cheque payments should be made within a period of two months only</p>
          </div>
          <table className="h-fit border-collapse text-[10pt]">
            <tbody>
              <tr>
                <td className="border border-black px-4 py-2">Sub-Total</td>
                <td className="border border-black px-4 py-2 text-right">{formatCurrency(subtotal)}</td>
              </tr>
              {discount > 0 && (
                <tr>
                  <td className="border border-black px-4 py-2">Discount ({discountPct.toFixed(1)}%)</td>
                  <td className="border border-black px-4 py-2 text-right text-red-600">
                    -{formatCurrency(discount)}
                  </td>
                </tr>
              )}
              <tr>
                <td className="border border-black px-4 py-2 font-bold">Total</td>
                <td className="border border-black px-4 py-2 text-right font-bold">
                  {formatCurrency(invoice.grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex-1" />

        <p className="mb-[10mm] text-[10pt]">
          The goods have been received in good condition and in the correct quantity
        </p>

        <div className="mb-[6mm] flex justify-between text-[10pt]">
          <div>
            <p className="font-bold">AUTHORIZED BY</p>
            <div className="mt-[10mm] w-[55mm] border-t border-black" />
          </div>
          <div>
            <p className="font-bold">CUSTOMER SIGNATURE</p>
            <div className="mt-[10mm] w-[55mm] border-t border-black" />
          </div>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/invoice-footer.png"
        alt=""
        className="block w-full"
        style={{ height: `${FOOTER_HEIGHT_MM}mm` }}
      />
    </div>
  );
}
