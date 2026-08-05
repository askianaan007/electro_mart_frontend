import { MapPin, Phone } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Investor } from '@/lib/api/types';

export interface StatementContributionLine {
  date: string;
  mode: string;
  reason: string;
  remarks?: string | null;
  amount: number;
}

export interface StatementWithdrawalLine {
  date: string;
  mode: string;
  reason: string;
  remarks?: string | null;
  amount: number;
}

/** All-time (not period-scoped) — the investor's current position, exactly what /admin/equity shows today. */
export interface CurrentEquityPosition {
  profitSharePercentage: number;
  totalInvestment: number;
  profitShare: number;
  expenseShare: number;
  equity: number;
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

export function InvestorStatementPrintLayout({
  investor,
  periodLabel,
  generatedDate,
  contributionLines,
  contributionTotal,
  withdrawalLines,
  withdrawalTotal,
  netForPeriod,
  currentPosition,
}: {
  investor: Investor;
  periodLabel: string;
  generatedDate: string;
  contributionLines: StatementContributionLine[];
  contributionTotal: number;
  withdrawalLines: StatementWithdrawalLine[];
  withdrawalTotal: number;
  netForPeriod: number;
  currentPosition: CurrentEquityPosition | null;
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

      <h1 className="mt-[8mm] text-center text-[19pt] font-bold tracking-wide">INVESTOR STATEMENT</h1>

      <div className="mt-[7mm] flex justify-between gap-8 text-[10.5pt] leading-relaxed">
        <div>
          <p>
            <span className="font-bold">Investor:</span> {investor.name}
          </p>
          {investor.phone && (
            <p>
              <span className="font-bold">Phone:</span> {investor.phone}
            </p>
          )}
          {investor.email && (
            <p>
              <span className="font-bold">Email:</span> {investor.email}
            </p>
          )}
          <p>
            <span className="font-bold">Profit Share:</span> {Number(investor.profitSharePercentage)}%
          </p>
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

      <SectionTitle>Capital Contributions</SectionTitle>
      <table className="mt-[3mm] w-full border-collapse text-[9.5pt]">
        <thead>
          <tr>
            <th className="w-[7%] border border-black px-2 py-1.5 text-left">No</th>
            <th className="w-[14%] border border-black px-2 py-1.5 text-left">Date</th>
            <th className="w-[16%] border border-black px-2 py-1.5 text-left">Mode</th>
            <th className="border border-black px-2 py-1.5 text-left">Reason</th>
            <th className="w-[18%] border border-black px-2 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {contributionLines.length === 0 ? (
            <EmptyRow colSpan={5} label="No contributions recorded in this period" />
          ) : (
            contributionLines.map((line, index) => (
              <tr key={index} className="break-inside-avoid">
                <td className="border border-black px-2 py-1.5">{index + 1}</td>
                <td className="border border-black px-2 py-1.5">{formatShortDate(line.date)}</td>
                <td className="border border-black px-2 py-1.5">{line.mode}</td>
                <td className="border border-black px-2 py-1.5">{line.reason}</td>
                <td className="border border-black px-2 py-1.5 text-right">{formatCurrency(line.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {contributionLines.length > 0 && (
        <div className="flex justify-end break-inside-avoid">
          <div className="-mt-px flex w-[40%] min-w-[65mm] justify-between border border-black bg-[#F4C430] px-3 py-1.5 text-[10pt] font-bold">
            <span>TOTAL CONTRIBUTIONS</span>
            <span>{formatCurrency(contributionTotal)}</span>
          </div>
        </div>
      )}

      <SectionTitle>Withdrawals</SectionTitle>
      <table className="mt-[3mm] w-full border-collapse text-[9.5pt]">
        <thead>
          <tr>
            <th className="w-[7%] border border-black px-2 py-1.5 text-left">No</th>
            <th className="w-[14%] border border-black px-2 py-1.5 text-left">Date</th>
            <th className="w-[16%] border border-black px-2 py-1.5 text-left">Mode</th>
            <th className="border border-black px-2 py-1.5 text-left">Reason</th>
            <th className="w-[18%] border border-black px-2 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {withdrawalLines.length === 0 ? (
            <EmptyRow colSpan={5} label="No withdrawals recorded in this period" />
          ) : (
            withdrawalLines.map((line, index) => (
              <tr key={index} className="break-inside-avoid">
                <td className="border border-black px-2 py-1.5">{index + 1}</td>
                <td className="border border-black px-2 py-1.5">{formatShortDate(line.date)}</td>
                <td className="border border-black px-2 py-1.5">{line.mode}</td>
                <td className="border border-black px-2 py-1.5">{line.reason}</td>
                <td className="border border-black px-2 py-1.5 text-right">−{formatCurrency(line.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {withdrawalLines.length > 0 && (
        <div className="flex justify-end break-inside-avoid">
          <div className="-mt-px flex w-[40%] min-w-[65mm] justify-between border border-black bg-[#F4C430] px-3 py-1.5 text-[10pt] font-bold">
            <span>TOTAL WITHDRAWALS</span>
            <span>−{formatCurrency(withdrawalTotal)}</span>
          </div>
        </div>
      )}

      <div className="mt-[8mm] break-inside-avoid border-t-2 border-black pt-[4mm] text-[12pt] font-bold">
        Net Capital Movement For This Period: {netForPeriod >= 0 ? '' : '−'}
        {formatCurrency(Math.abs(netForPeriod))}
      </div>

      <SectionTitle>Current Equity Position</SectionTitle>
      <p className="mt-[1mm] text-[9pt] italic text-gray-600">
        All-time figures as of {generatedDate} — not limited to the statement period above.
      </p>
      {currentPosition ? (
        <table className="mt-[3mm] w-full border-collapse text-[9.5pt]">
          <tbody>
            <tr className="break-inside-avoid">
              <td className="w-[50%] border border-black px-2 py-1.5 font-semibold">Profit Share %</td>
              <td className="border border-black px-2 py-1.5 text-right">{currentPosition.profitSharePercentage}%</td>
            </tr>
            <tr className="break-inside-avoid">
              <td className="border border-black px-2 py-1.5 font-semibold">Total Investment (all-time)</td>
              <td className="border border-black px-2 py-1.5 text-right">{formatCurrency(currentPosition.totalInvestment)}</td>
            </tr>
            <tr className="break-inside-avoid">
              <td className="border border-black px-2 py-1.5 font-semibold">Profit Share (all-time)</td>
              <td className="border border-black px-2 py-1.5 text-right">{formatCurrency(currentPosition.profitShare)}</td>
            </tr>
            <tr className="break-inside-avoid">
              <td className="border border-black px-2 py-1.5 font-semibold">Expense Share (all-time)</td>
              <td className="border border-black px-2 py-1.5 text-right">−{formatCurrency(currentPosition.expenseShare)}</td>
            </tr>
            <tr className="break-inside-avoid bg-[#F4C430]">
              <td className="border border-black px-2 py-1.5 font-bold">Total Equity</td>
              <td className="border border-black px-2 py-1.5 text-right font-bold">{formatCurrency(currentPosition.equity)}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="mt-[3mm] text-[9.5pt] italic text-gray-500">No equity position on record for this investor.</p>
      )}

      <div className="mb-[6mm] mt-[16mm] flex break-inside-avoid justify-between text-[10pt]">
        <div>
          <p className="font-bold">PREPARED BY</p>
          <div className="mt-[10mm] w-[55mm] border-t border-black" />
        </div>
        <div>
          <p className="font-bold">INVESTOR ACKNOWLEDGEMENT</p>
          <div className="mt-[10mm] w-[55mm] border-t border-black" />
        </div>
      </div>
    </div>
  );
}
