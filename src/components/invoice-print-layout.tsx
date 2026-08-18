import { useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { Invoice } from '@/lib/api/types';

const PAGE_HEIGHT_MM = 297;
const HEADER_HEIGHT_MM = (210 * 263) / 1541;
const FOOTER_HEIGHT_MM = (210 * 457) / 1544;

const CAPACITY_SINGLE_PAGE = 20; // Page 1 with Bill To AND Summary totals
const CAPACITY_FIRST_PAGE = 18; // Page 1 with Bill To, NO Summary totals
const CAPACITY_MIDDLE_PAGE = 24; // Middle page with NO Bill To, NO Summary totals
const CAPACITY_LAST_PAGE = 16; // Last page with NO Bill To, WITH Summary totals

const BILL_TO_RED = '#ED1C24';
const INFO_BLUE = '#DCEEFB';
const TABLE_HEAD_NAVY = '#13245C';

type InvoiceItem = NonNullable<Invoice['order']>['items'][number];

interface PageChunk {
  pageNumber: number;
  totalPages: number;
  items: InvoiceItem[];
  startIndex: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  targetRowCount: number;
  fillerRowsCount: number;
}

function partitionInvoiceItems(items: InvoiceItem[]): PageChunk[] {
  const totalItems = items.length;

  if (totalItems <= CAPACITY_SINGLE_PAGE) {
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        items,
        startIndex: 0,
        isFirstPage: true,
        isLastPage: true,
        targetRowCount: CAPACITY_SINGLE_PAGE,
        fillerRowsCount: Math.max(0, CAPACITY_SINGLE_PAGE - totalItems),
      },
    ];
  }

  const chunks: { items: InvoiceItem[]; startIndex: number }[] = [];
  let currentIndex = 0;
  let remaining = totalItems;
  let isFirst = true;

  while (remaining > 0 || isFirst) {
    if (isFirst) {
      let take = Math.min(remaining, CAPACITY_FIRST_PAGE);
      if (remaining > CAPACITY_SINGLE_PAGE && remaining <= CAPACITY_FIRST_PAGE) {
        take = Math.ceil(remaining / 2);
      }
      chunks.push({
        items: items.slice(currentIndex, currentIndex + take),
        startIndex: currentIndex,
      });
      currentIndex += take;
      remaining -= take;
      isFirst = false;
    } else {
      if (remaining <= CAPACITY_LAST_PAGE) {
        chunks.push({
          items: items.slice(currentIndex, currentIndex + remaining),
          startIndex: currentIndex,
        });
        currentIndex += remaining;
        remaining = 0;
      } else {
        let take = Math.min(remaining, CAPACITY_MIDDLE_PAGE);
        if (remaining > CAPACITY_LAST_PAGE && remaining <= CAPACITY_MIDDLE_PAGE) {
          take = Math.ceil(remaining / 2);
        }
        chunks.push({
          items: items.slice(currentIndex, currentIndex + take),
          startIndex: currentIndex,
        });
        currentIndex += take;
        remaining -= take;
      }
    }
  }

  const totalPages = chunks.length;
  return chunks.map((chunk, index) => {
    const pageNumber = index + 1;
    const isFirstPage = pageNumber === 1;
    const isLastPage = pageNumber === totalPages;
    const targetRowCount = isFirstPage
      ? isLastPage
        ? CAPACITY_SINGLE_PAGE
        : CAPACITY_FIRST_PAGE
      : isLastPage
        ? CAPACITY_LAST_PAGE
        : CAPACITY_MIDDLE_PAGE;

    return {
      pageNumber,
      totalPages,
      items: chunk.items,
      startIndex: chunk.startIndex,
      isFirstPage,
      isLastPage,
      targetRowCount,
      fillerRowsCount: Math.max(0, targetRowCount - chunk.items.length),
    };
  });
}

function formatInvoiceDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export function InvoicePrintLayout({ invoice }: { invoice: Invoice }) {
  useEffect(() => {
    if (invoice?.invoiceNumber) {
      const prevTitle = document.title;
      document.title = invoice.invoiceNumber;
      return () => {
        document.title = prevTitle;
      };
    }
  }, [invoice?.invoiceNumber]);

  const items = invoice.order?.items ?? [];
  const subtotal = Number(invoice.subtotal);
  const discountTotal = Number(invoice.discountTotal);
  const grandTotal = Number(invoice.grandTotal);

  const pages = partitionInvoiceItems(items);
  const issueDateFormatted = formatInvoiceDate(invoice.createdAt);
  const deliveryDateFormatted = formatInvoiceDate(invoice.order?.deliveredAt);

  return (
    <div className="invoice-print-wrapper flex flex-col gap-8 print:block print:gap-0">
      <style jsx global>{`
        @media print {
          @page {
            size: 210mm 297mm;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .invoice-print-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          .invoice-page {
            width: 210mm !important;
            height: 296.5mm !important;
            min-height: 296.5mm !important;
            max-height: 296.5mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding-bottom: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          .invoice-page:last-child,
          .invoice-page:last-of-type {
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {pages.map((page) => (
        <div
          key={`page-${page.pageNumber}`}
          className="invoice-page relative mx-auto flex flex-col justify-between overflow-hidden bg-white text-black shadow-lg pb-4 print:m-0 print:pb-0 print:shadow-none"
          style={{ width: '210mm', height: `${PAGE_HEIGHT_MM}mm`, boxSizing: 'border-box' }}
        >
          {/* Header Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/invoice-header.png"
            alt=""
            className="block w-full flex-shrink-0"
            style={{ height: `${HEADER_HEIGHT_MM}mm` }}
          />

          {/* Main Content Area */}
          <div
            className="flex flex-1 flex-col justify-between min-h-0 overflow-hidden text-[10px]"
            style={{ padding: '16px' }}
          >
            <div className="flex flex-1 flex-col">
              {/* Bill To Section (First Page Only) */}
              {page.isFirstPage && (
                <>
                  <div className="py-1 pl-2 font-bold uppercase text-white" style={{ background: BILL_TO_RED }}>
                    Bill To :
                  </div>

                  <div className="flex justify-between gap-6 px-2 py-2 leading-[1.6]" style={{ background: INFO_BLUE }}>
                    <div>
                      {invoice.dealer?.businessName && (
                        <p>
                          <span className="font-bold">Customer Name:</span> {invoice.dealer.businessName}
                        </p>
                      )}
                      {invoice.dealer?.address && (
                        <p>
                          <span className="font-bold">Address:</span> {invoice.dealer.address}
                        </p>
                      )}
                      {invoice.dealer?.phone && (
                        <p>
                          <span className="font-bold">Phone:</span> {invoice.dealer.phone}
                        </p>
                      )}
                      {invoice.dealer?.email && (
                        <p>
                          <span className="font-bold">Email:</span> {invoice.dealer.email}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {issueDateFormatted && (
                        <p>
                          <span className="font-bold">Issue Date:</span> {issueDateFormatted}
                        </p>
                      )}
                      {deliveryDateFormatted && (
                        <p>
                          <span className="font-bold">Delivery Date:</span> {deliveryDateFormatted}
                        </p>
                      )}
                      {invoice.invoiceNumber && (
                        <p>
                          <span className="font-bold">Invoice Ref:</span> #{invoice.invoiceNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Items Table */}
              <div className="mt-2 flex-1">
                <table className="w-full border-collapse table-fixed text-[9px]">
                  <thead>
                    <tr className="text-white" style={{ background: TABLE_HEAD_NAVY }}>
                      <th rowSpan={2} className="w-[6%] border border-black px-1.5 py-1 align-middle">
                        S.No
                      </th>
                      <th rowSpan={2} className="w-[14%] border border-black px-1.5 py-1 text-left align-middle">
                        Product Code
                      </th>
                      <th rowSpan={2} className="w-[24%] border border-black px-1.5 py-1 text-left align-middle truncate">
                        Item / Description
                      </th>
                      <th rowSpan={2} className="w-[6%] border border-black px-1.5 py-1 align-middle">
                        Qty
                      </th>
                      <th rowSpan={2} className="w-[13%] border border-black px-1.5 py-1 align-middle">
                        Unit Price
                      </th>
                      <th colSpan={2} className="border border-black px-1.5 py-0.5">
                        Discount
                      </th>
                      <th rowSpan={2} className="w-[16%] border border-black px-1.5 py-1 align-middle">
                        Total Amount
                      </th>
                    </tr>
                    <tr className="text-white" style={{ background: TABLE_HEAD_NAVY }}>
                      <th className="w-[8%] border border-black px-1.5 py-0.5">%</th>
                      <th className="w-[13%] border border-black px-1.5 py-0.5">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.items.map((item, itemIdx) => {
                      const globalIndex = page.startIndex + itemIdx + 1;
                      const lineTotal = Number(item.lineTotal);
                      const allocatedDiscount = Number(item.allocatedDiscount);
                      const discountPct = lineTotal > 0 ? (allocatedDiscount / lineTotal) * 100 : 0;
                      return (
                        <tr key={item.id ?? `item-${globalIndex}`} className="break-inside-avoid">
                          <td className="border border-black px-1.5 py-1 text-center">{globalIndex}</td>
                          <td className="border border-black px-1.5 py-1 text-left truncate">{item.product.productCode}</td>
                          <td className="border border-black px-1.5 py-1 truncate" title={item.product.name}>
                            {item.product.name}
                          </td>
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
                    {Array.from({ length: page.fillerRowsCount }, (_, i) => (
                      <tr key={`filler-${page.pageNumber}-${i}`} className="break-inside-avoid">
                        <td className="border border-black px-1.5 py-1 text-center">
                          {page.startIndex + page.items.length + i + 1}
                        </td>
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
            </div>

            {/* Bottom Footer Details */}
            <div className="mt-3 pb-2 flex flex-shrink-0 flex-col justify-end gap-1">
              {page.isLastPage ? (
                <div className="flex items-end justify-between">
                  <div className="text-center">
                    <div className="w-[60mm] border-t border-black" />
                    <p className="mt-1">For, Customer Signature</p>
                  </div>

                  <table className="border-collapse text-[9px]" style={{ background: INFO_BLUE }}>
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
              ) : (
                <div className="flex items-center justify-between border-t border-gray-200 pt-1 text-[9px] italic text-gray-500">
                  <span>Continued on next page...</span>
                  <span>
                    Page {page.pageNumber} of {page.totalPages}
                  </span>
                </div>
              )}
              {page.isLastPage && page.totalPages > 1 && (
                <div className="text-right text-[9px] text-gray-500">
                  Page {page.pageNumber} of {page.totalPages}
                </div>
              )}
            </div>
          </div>

          {/* Footer Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/invoice-footer.png"
            alt=""
            className="block w-full flex-shrink-0"
            style={{ height: `${FOOTER_HEIGHT_MM}mm` }}
          />
        </div>
      ))}
    </div>
  );
}

