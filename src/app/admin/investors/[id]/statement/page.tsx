'use client';

import { FitToWidth } from '@/components/fit-to-width';
import { useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { QueryErrorState } from '@/components/query-error-state';
import {
  InvestorStatementPrintLayout,
  type CurrentEquityPosition,
  type StatementContributionLine,
  type StatementWithdrawalLine,
} from '@/components/admin/investor-statement-print-layout';
import { useInvestor } from '@/hooks/use-investors';
import { useEquitySummary } from '@/hooks/use-equity';
import { api } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/fetch-all-pages';
import { businessToday } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import { PrintButton } from '@/components/print-button';

// Pure string / UTC arithmetic: local-Date + toISOString shifts the day in
// Sri Lanka (UTC+05:30) — the month end came out a day early and, just after
// midnight, "this month" could still be last month.
function currentMonth() {
  return businessToday().slice(0, 7);
}

function lastDayOfMonth(month: string) {
  const [year, mon] = month.split('-').map(Number);
  // Day 0 of the next month is the last day of this one.
  const days = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return `${month}-${String(days).padStart(2, '0')}`;
}

function monthLabel(month: string) {
  const [year, mon] = month.split('-').map(Number);
  return new Date(year, mon - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function GeneratingOverlay() {
  return (
    <div
      className="flex h-96 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/40"
      aria-busy="true"
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm font-medium text-muted-foreground">Generating statement…</p>
    </div>
  );
}

export default function InvestorStatementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromMonth = searchParams.get('from') || currentMonth();
  const toMonth = searchParams.get('to') || currentMonth();
  const [draftFrom, setDraftFrom] = useState(fromMonth);
  const [draftTo, setDraftTo] = useState(toMonth);

  const dateFrom = `${fromMonth}-01`;
  const dateTo = lastDayOfMonth(toMonth);

  const {
    data: investor,
    isLoading: investorLoading,
    isError: investorIsError,
    error: investorError,
    refetch: refetchInvestor,
  } = useInvestor(id);
  const {
    data: equity,
    isLoading: equityLoading,
    isError: equityIsError,
    error: equityError,
    refetch: refetchEquity,
  } = useEquitySummary();

  const {
    data: investmentRows,
    isLoading: investmentsLoading,
    isError: investmentsIsError,
    error: investmentsError,
    refetch: refetchInvestments,
  } = useQuery({
    queryKey: ['investor-statement', 'investments', id, dateFrom, dateTo],
    queryFn: () =>
      fetchAllPages((page, limit) => api.investments.list({ investorId: id, dateFrom, dateTo, page, limit })),
    enabled: !!id,
  });

  const isLoading = investorLoading || equityLoading || investmentsLoading;
  const ready = !isLoading && !!investor;

  const computed = useMemo(() => {
    const investments = investmentRows ?? [];

    const contributionLines: StatementContributionLine[] = investments
      .filter((inv) => Number(inv.amount) >= 0)
      .map((inv) => ({
        date: inv.investmentDate,
        mode: inv.mode.replace('_', ' '),
        reason: inv.reason,
        remarks: inv.remarks,
        amount: Number(inv.amount),
      }));
    const contributionTotal = contributionLines.reduce((sum, l) => sum + l.amount, 0);

    const withdrawalLines: StatementWithdrawalLine[] = investments
      .filter((inv) => Number(inv.amount) < 0)
      .map((inv) => ({
        date: inv.investmentDate,
        mode: inv.mode.replace('_', ' '),
        reason: inv.reason,
        remarks: inv.remarks,
        amount: Math.abs(Number(inv.amount)),
      }));
    const withdrawalTotal = withdrawalLines.reduce((sum, l) => sum + l.amount, 0);

    const netForPeriod = contributionTotal - withdrawalTotal;

    const equityEntry = equity?.entries.find((e) => e.investorId === id);
    const currentPosition: CurrentEquityPosition | null = equityEntry
      ? {
          profitSharePercentage: Number(equityEntry.profitSharePercentage),
          totalInvestment: Number(equityEntry.totalInvestment),
          profitShare: Number(equityEntry.profitShare),
          expenseShare: Number(equityEntry.expenseShare),
          equity: Number(equityEntry.equity),
        }
      : null;

    return { contributionLines, contributionTotal, withdrawalLines, withdrawalTotal, netForPeriod, currentPosition };
  }, [investmentRows, equity, id]);

  function applyPeriod() {
    if (!draftFrom || !draftTo || draftFrom > draftTo) return;
    router.replace(`/admin/investors/${id}/statement?from=${draftFrom}&to=${draftTo}`);
  }

  const periodLabel =
    fromMonth === toMonth ? monthLabel(fromMonth) : `${monthLabel(fromMonth)} – ${monthLabel(toMonth)}`;
  const generatedDate = new Date().toLocaleDateString('en-GB');

  function handleExportExcel() {
    if (!investor) return;
    const { contributionLines, contributionTotal, withdrawalLines, withdrawalTotal, netForPeriod, currentPosition } =
      computed;

    const rows: (string | number)[][] = [
      ['Investor', investor.name],
      ['Phone', investor.phone ?? ''],
      ['Email', investor.email ?? ''],
      ['Profit Share %', Number(investor.profitSharePercentage)],
      ['Statement Period', periodLabel],
      ['Generated On', generatedDate],
      [''],
      ['CAPITAL CONTRIBUTIONS'],
      ['Date', 'Mode', 'Reason', 'Amount'],
      ...contributionLines.map((l) => [l.date.slice(0, 10), l.mode, l.reason, l.amount]),
      ['', '', 'Total', contributionTotal],
      [''],
      ['WITHDRAWALS'],
      ['Date', 'Mode', 'Reason', 'Amount'],
      ...withdrawalLines.map((l) => [l.date.slice(0, 10), l.mode, l.reason, -l.amount]),
      ['', '', 'Total', -withdrawalTotal],
      [''],
      ['Net Capital Movement For This Period', netForPeriod],
      [''],
      ['CURRENT EQUITY POSITION (all-time, as of generation date)'],
      ...(currentPosition
        ? [
            ['Profit Share %', currentPosition.profitSharePercentage],
            ['Total Investment (all-time)', currentPosition.totalInvestment],
            ['Profit Share (all-time)', currentPosition.profitShare],
            ['Expense Share (all-time)', -currentPosition.expenseShare],
            ['Total Equity', currentPosition.equity],
          ]
        : [['No equity position on record for this investor']]),
    ];

    downloadCsv(
      `investor-statement-${investor.name.replace(/\s+/g, '-').toLowerCase()}-${fromMonth}-to-${toMonth}.csv`,
      ['Electro Mart Tradings — Investor Statement'],
      rows,
    );
  }

  const loadError = investorIsError
    ? investorError
    : equityIsError
      ? equityError
      : investmentsIsError
        ? investmentsError
        : null;
  const hasLoadError = investorIsError || equityIsError || investmentsIsError;

  return (
    <div className="space-y-6">
      <PageHeader
        className="print:hidden"
        title={investor ? `${investor.name} — Statement` : 'Investor Statement'}
        description={`Capital contributions, withdrawals and current equity position for ${periodLabel}.`}
        backHref="/admin/investments"
        backLabel="Back to Investments"
        actions={
          <>
            <Button variant="outline" onClick={handleExportExcel} disabled={!ready}>
              <Download />
              Excel
            </Button>
            <PrintButton variant="default" disabled={!ready} />
          </>
        }
      />

      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3 shadow-xs print:hidden sm:flex-row sm:flex-wrap sm:items-center sm:px-5">
        <span className="text-sm font-medium text-foreground">Statement period</span>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="month"
            value={draftFrom}
            max={draftTo || undefined}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="w-auto"
            aria-label="From month"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="month"
            value={draftTo}
            min={draftFrom || undefined}
            max={currentMonth()}
            onChange={(e) => setDraftTo(e.target.value)}
            className="w-auto"
            aria-label="To month"
          />
          <Button variant="outline" size="sm" onClick={applyPeriod}>
            Update
          </Button>
        </div>
      </div>

      {hasLoadError ? (
        <div className="rounded-xl border border-border bg-card shadow-xs print:hidden">
          <QueryErrorState
            error={loadError}
            title="Couldn't generate this statement"
            onRetry={() => {
              if (investorIsError) refetchInvestor();
              if (equityIsError) refetchEquity();
              if (investmentsIsError) refetchInvestments();
            }}
          />
        </div>
      ) : !ready ? (
        <GeneratingOverlay />
      ) : (
        <div className="rounded-xl border border-border bg-muted/40 p-2.5 print:border-0 print:bg-transparent print:p-0 sm:p-8">
          <FitToWidth>
            <InvestorStatementPrintLayout
              investor={investor}
              periodLabel={periodLabel}
              generatedDate={generatedDate}
              {...computed}
            />
          </FitToWidth>
        </div>
      )}
    </div>
  );
}
