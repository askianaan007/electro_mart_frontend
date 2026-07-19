import { MapPin, Phone } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Supplier } from '@/lib/api/types';

export interface StatementPurchaseLine {
  date: string;
  quantity: number;
  productName: string;
  productDescription?: string | null;
  unitPrice: number;
  total: number;
}

export interface StatementTransportLine {
  date: string;
  invoiceNumber: string;
  amount: number;
}

export interface StatementReturnLine {
  date: string;
  returnNumber: string;
  reason: string;
  amount: number;
}

export interface StatementSettlementLine {
  date: string;
  mode: string;
  reference: string;
  amount: number;
  chequeStatus?: string | null;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-[7mm] text-[12pt] font-bold uppercase tracking-wide">{children}</h2>;
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="border border-black px-3 py-3 text-center italic text-gray-500">
        {label}
      </td>
    </tr>
  );
}

export function SupplierStatementPrintLayout({
  supplier,
  periodLabel,
  generatedDate,
  purchaseLines,
  purchaseTotal,
  transportLines,
  transportTotal,
  returnLines,
  returnTotal,
  settlementLines,
  settlementTotal,
  netPayable,
  balanceForPeriod,
}: {
  supplier: Supplier;
  periodLabel: string;
  generatedDate: string;
  purchaseLines: StatementPurchaseLine[];
  purchaseTotal: number;
  transportLines: StatementTransportLine[];
  transportTotal: number;
  returnLines: StatementReturnLine[];
  returnTotal: number;
  settlementLines: StatementSettlementLine[];
  settlementTotal: number;
  netPayable: number;
  balanceForPeriod: number;
}) {
  return (
    <div className="relative mx-auto bg-white px-[14mm] py-[10mm] text-black print:m-0" style={{ width: '210mm' }}>
      <h1 className="text-[16pt] font-bold uppercase tracking-wide">Electro Mart Tradings</h1>
      <div className="mt-[2mm] flex items-center gap-2 text-[10pt] font-semibold">
        <MapPin className="size-3.5 shrink-0" />
        <span>192, Maliga Road Maligaikadu – Karaithivu 32250</span>
      </div>
      <div className="mt-[1mm] flex items-center gap-2 text-[10pt] font-semibold">
        <Phone className="size-3.5 shrink-0" />
        <span>+94754353543</span>
      </div>

      <h1 className="mt-[8mm] text-center text-[19pt] font-bold tracking-wide">SUPPLIER STATEMENT</h1>

      <div className="mt-[7mm] flex justify-between gap-8 text-[10.5pt] leading-relaxed">
        <div>
          <p>
            <span className="font-bold">Supplier:</span> {supplier.name}
          </p>
          {supplier.address && (
            <p>
              <span className="font-bold">Address:</span> {supplier.address}
            </p>
          )}
          {supplier.phone && (
            <p>
              <span className="font-bold">Phone:</span> {supplier.phone}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-bold">
            Statement Period: <span className="font-normal">{periodLabel}</span>
          </p>
          <p className="mt-1 font-bold">
            Generated On: <span className="font-normal">{generatedDate}</span>
          </p>
        </div>
      </div>

      <SectionTitle>Purchases</SectionTitle>
      <table className="mt-[3mm] w-full border-collapse text-[9.5pt]">
        <thead>
          <tr>
            <th className="w-[7%] border border-black px-2 py-1.5 text-left">No</th>
            <th className="w-[14%] border border-black px-2 py-1.5 text-left">Date</th>
            <th className="w-[10%] border border-black px-2 py-1.5 text-right">Qty</th>
            <th className="border border-black px-2 py-1.5 text-left">Item &amp; Description</th>
            <th className="w-[16%] border border-black px-2 py-1.5 text-right">Unit Price</th>
            <th className="w-[16%] border border-black px-2 py-1.5 text-right">Total Price</th>
          </tr>
        </thead>
        <tbody>
          {purchaseLines.length === 0 ? (
            <EmptyRow colSpan={6} label="No purchases recorded in this period" />
          ) : (
            purchaseLines.map((line, index) => (
              <tr key={index} className="break-inside-avoid">
                <td className="border border-black px-2 py-1.5">{index + 1}</td>
                <td className="border border-black px-2 py-1.5">{formatShortDate(line.date)}</td>
                <td className="border border-black px-2 py-1.5 text-right">{line.quantity}</td>
                <td className="border border-black px-2 py-1.5">
                  <span>{line.productName}</span>
                </td>
                <td className="border border-black px-2 py-1.5 text-right">{formatCurrency(line.unitPrice)}</td>
                <td className="border border-black px-2 py-1.5 text-right">{formatCurrency(line.total)}</td>
              </tr>
            ))
          )} 
        </tbody>
      </table>
      {purchaseLines.length > 0 && (
        <div className="flex justify-end break-inside-avoid">
          <div className="-mt-px flex w-[40%] min-w-[65mm] justify-between border border-black bg-[#F4C430] px-3 py-1.5 text-[10pt] font-bold">
            <span>TOTAL AMOUNT</span>
            <span>{formatCurrency(purchaseTotal)}</span>
          </div>
        </div>
      )}

      <SectionTitle>Transport Charges</SectionTitle>
      <table className="mt-[3mm] w-full border-collapse text-[9.5pt]">
        <thead>
          <tr>
            <th className="w-[7%] border border-black px-2 py-1.5 text-left">No</th>
            <th className="w-[16%] border border-black px-2 py-1.5 text-left">Date</th>
            <th className="border border-black px-2 py-1.5 text-left">Purchase Invoice #</th>
            <th className="w-[20%] border border-black px-2 py-1.5 text-right">Charge Amount</th>
          </tr>
        </thead>
        <tbody>
          {transportLines.length === 0 ? (
            <EmptyRow colSpan={4} label="No transport charges recorded in this period" />
          ) : (
            transportLines.map((line, index) => (
              <tr key={index} className="break-inside-avoid">
                <td className="border border-black px-2 py-1.5">{index + 1}</td>
                <td className="border border-black px-2 py-1.5">{formatShortDate(line.date)}</td>
                <td className="border border-black px-2 py-1.5">{line.invoiceNumber}</td>
                <td className="border border-black px-2 py-1.5 text-right">{formatCurrency(line.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {transportLines.length > 0 && (
        <div className="flex justify-end break-inside-avoid">
          <div className="-mt-px flex w-[40%] min-w-[65mm] justify-between border border-black bg-[#F4C430] px-3 py-1.5 text-[10pt] font-bold">
            <span>TOTAL AMOUNT</span>
            <span>{formatCurrency(transportTotal)}</span>
          </div>
        </div>
      )}

      <SectionTitle>Purchase Returns</SectionTitle>
      <table className="mt-[3mm] w-full border-collapse text-[9.5pt]">
        <thead>
          <tr>
            <th className="w-[7%] border border-black px-2 py-1.5 text-left">No</th>
            <th className="w-[16%] border border-black px-2 py-1.5 text-left">Date</th>
            <th className="border border-black px-2 py-1.5 text-left">Return #</th>
            <th className="border border-black px-2 py-1.5 text-left">Reason</th>
            <th className="w-[18%] border border-black px-2 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {returnLines.length === 0 ? (
            <EmptyRow colSpan={5} label="No purchase returns recorded in this period" />
          ) : (
            returnLines.map((line, index) => (
              <tr key={index} className="break-inside-avoid">
                <td className="border border-black px-2 py-1.5">{index + 1}</td>
                <td className="border border-black px-2 py-1.5">{formatShortDate(line.date)}</td>
                <td className="border border-black px-2 py-1.5">{line.returnNumber}</td>
                <td className="border border-black px-2 py-1.5">{line.reason}</td>
                <td className="border border-black px-2 py-1.5 text-right">−{formatCurrency(line.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {returnLines.length > 0 && (
        <div className="flex justify-end break-inside-avoid">
          <div className="-mt-px flex w-[40%] min-w-[65mm] justify-between border border-black bg-[#F4C430] px-3 py-1.5 text-[10pt] font-bold">
            <span>TOTAL AMOUNT</span>
            <span>−{formatCurrency(returnTotal)}</span>
          </div>
        </div>
      )}

      <div className="mt-[8mm] text-[10pt] leading-relaxed">
        <p>Gross Purchase Amount: {formatCurrency(purchaseTotal)}</p>
        {transportTotal > 0 && <p>Transportation Charges: {formatCurrency(transportTotal)}</p>}
        {returnTotal > 0 && <p>Purchase Returns: −{formatCurrency(returnTotal)}</p>}
        <p className="mt-[3mm] text-[11pt] font-bold">Net Amount Payable: {formatCurrency(netPayable)}</p>
      </div>

      <SectionTitle>Settlements</SectionTitle>
      <table className="mt-[3mm] w-full border-collapse text-[9.5pt]">
        <thead>
          <tr>
            <th className="w-[7%] border border-black px-2 py-1.5 text-left">No</th>
            <th className="w-[16%] border border-black px-2 py-1.5 text-left">Date</th>
            <th className="w-[16%] border border-black px-2 py-1.5 text-left">Mode</th>
            <th className="border border-black px-2 py-1.5 text-left">Reference</th>
            <th className="w-[18%] border border-black px-2 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {settlementLines.length === 0 ? (
            <EmptyRow colSpan={5} label="No settlements recorded in this period" />
          ) : (
            settlementLines.map((line, index) => (
              <tr key={index} className="break-inside-avoid">
                <td className="border border-black px-2 py-1.5">{index + 1}</td>
                <td className="border border-black px-2 py-1.5">{formatShortDate(line.date)}</td>
                <td className="border border-black px-2 py-1.5">
                  {line.mode}
                  {line.chequeStatus ? ` (${line.chequeStatus})` : ''}
                </td>
                <td className="border border-black px-2 py-1.5">{line.reference || '—'}</td>
                <td className="border border-black px-2 py-1.5 text-right">{formatCurrency(line.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {settlementLines.length > 0 && (
        <div className="flex justify-end break-inside-avoid">
          <div className="mt-[-1px] flex w-[40%] min-w-[65mm] justify-between border border-black bg-[#F4C430] px-3 py-1.5 text-[10pt] font-bold">
            <span>TOTAL SETTLED</span>
            <span>{formatCurrency(settlementTotal)}</span>
          </div>
        </div>
      )}

      <div className="mt-[8mm] break-inside-avoid border-t-2 border-black pt-[4mm] text-[12pt] font-bold">
        Balance For This Period: {formatCurrency(balanceForPeriod)}
      </div>

      <div className="mb-[6mm] mt-[16mm] flex break-inside-avoid justify-between text-[10pt]">
        <div>
          <p className="font-bold">PREPARED BY</p>
          <div className="mt-[10mm] w-[55mm] border-t border-black" />
        </div>
        <div>
          <p className="font-bold">SUPPLIER ACKNOWLEDGEMENT</p>
          <div className="mt-[10mm] w-[55mm] border-t border-black" />
        </div>
      </div>
    </div>
  );
}
