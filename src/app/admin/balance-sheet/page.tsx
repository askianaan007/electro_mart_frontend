'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  HandCoins,
  Info,
  PieChart as PieChartIcon,
  Receipt,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QueryErrorState } from '@/components/query-error-state';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { useBalanceSheetSummary } from '@/hooks/use-balance-sheet';
import { downloadBalanceSheetPdf } from '@/lib/balance-sheet-pdf';
import { businessToday, cn, formatCurrency, formatDate } from '@/lib/utils';
import type { BalanceSheetResponse, ReconciliationStatus } from '@/lib/api/types';

const STATUS_META: Record<
  ReconciliationStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    badge: 'success' | 'warning' | 'destructive';
    border: string;
    bg: string;
    iconTone: string;
  }
> = {
  BALANCED: {
    label: 'Balanced Position',
    icon: CheckCircle2,
    badge: 'success',
    border: 'border-success/30',
    bg: 'bg-success/5',
    iconTone: 'bg-success/10 text-success',
  },
  BALANCED_WITH_KNOWN_TIMING_DIFFERENCE: {
    label: 'Balanced — Known Order Timing Difference',
    icon: Clock,
    badge: 'warning',
    border: 'border-warning/30',
    bg: 'bg-warning/5',
    iconTone: 'bg-warning/10 text-warning',
  },
  UNBALANCED: {
    label: 'Unbalanced — Needs Investigation',
    icon: AlertTriangle,
    badge: 'destructive',
    border: 'border-destructive/30',
    bg: 'bg-destructive/5',
    iconTone: 'bg-destructive/10 text-destructive',
  },
};

/** Negative statement figures render in the destructive colour. */
function amountTone(value: string | number) {
  return Number(value) < 0 ? 'text-destructive' : 'text-foreground';
}

function LineItem({
  label,
  value,
  sub,
  strong,
}: {
  label: string;
  value: string | null;
  sub?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0">
      <div className="min-w-0 pl-3">
        <p className={cn('break-words text-sm', strong ? 'font-semibold text-foreground' : 'text-foreground/90')}>{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <p
        className={cn(
          'shrink-0 whitespace-nowrap text-sm tabular-nums',
          strong ? 'font-semibold' : 'font-medium',
          value === null ? 'text-muted-foreground' : amountTone(value),
        )}
      >
        {value === null ? <span className="text-xs italic text-muted-foreground">Not supported</span> : formatCurrency(value)}
      </p>
    </div>
  );
}

function SectionTotal({ label, value, grand }: { label: string; value: string; grand?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3',
        grand
          ? 'mt-4 rounded-lg border border-border bg-muted/60 px-3 py-3'
          : 'mb-2 border-t border-border px-3 pt-2.5 pb-1',
      )}
    >
      <p className={cn('text-foreground', grand ? 'text-[15px] font-semibold' : 'text-sm font-semibold')}>{label}</p>
      <p
        className={cn(
          'whitespace-nowrap tabular-nums',
          grand ? 'text-[15px] font-semibold' : 'text-sm font-semibold',
          amountTone(value),
        )}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="pb-1 pt-1 text-xs font-semibold text-muted-foreground">{children}</p>;
}

function signedCurrency(value: string) {
  const n = Number(value);
  return `${n > 0 ? '+' : ''}${formatCurrency(value)}`;
}

function ReconciliationBanner({ data }: { data: BalanceSheetResponse }) {
  const meta = STATUS_META[data.reconciliation.status];
  const Icon = meta.icon;
  const showBreakdown = data.reconciliation.status !== 'BALANCED';
  const transportDifference = data.reconciliation.knownTransportChargeDifference;

  return (
    <div className={cn('rounded-xl border p-4 shadow-xs sm:p-5', meta.border, meta.bg)}>
      <div className="flex items-start gap-3">
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', meta.iconTone)}>
          <Icon className="size-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{meta.label}</h2>
            <Badge variant={meta.badge}>{data.reconciliation.status.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Assets <span className="font-medium tabular-nums text-foreground">{formatCurrency(data.summary.totalAssets)}</span>{' '}
            vs. Liabilities + Equity{' '}
            <span className="font-medium tabular-nums text-foreground">
              {formatCurrency(data.summary.liabilitiesAndEquity)}
            </span>{' '}
            — raw difference{' '}
            <span className={cn('font-semibold tabular-nums', amountTone(data.summary.rawDifference))}>
              {signedCurrency(data.summary.rawDifference)}
            </span>
          </p>
        </div>
      </div>

      {showBreakdown && (
        <div
          className={cn(
            'mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2',
            transportDifference !== undefined ? 'lg:grid-cols-5' : 'lg:grid-cols-4',
          )}
        >
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">Known Order Timing Gap</p>
            <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', amountTone(data.reconciliation.knownOrderTimingDifference))}>
              {signedCurrency(data.reconciliation.knownOrderTimingDifference)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.reconciliation.inFlightOrderCount} order{data.reconciliation.inFlightOrderCount === 1 ? '' : 's'} in fulfillment
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">Known Unallocated Equity</p>
            <p
              className={cn(
                'mt-0.5 text-sm font-semibold tabular-nums',
                amountTone(data.reconciliation.knownUnallocatedEquityDifference),
              )}
            >
              {signedCurrency(data.reconciliation.knownUnallocatedEquityDifference)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Investor share total: {data.reconciliation.investorPercentageTotal}%
            </p>
          </div>
          {transportDifference !== undefined && (
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-medium text-muted-foreground">Known Transport Charge Difference</p>
              <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', amountTone(transportDifference))}>
                {signedCurrency(transportDifference)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Transport charges deducted from payables (unrecorded counterpart)
              </p>
            </div>
          )}
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">Total Known Difference</p>
            <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', amountTone(data.reconciliation.knownDifference))}>
              {signedCurrency(data.reconciliation.knownDifference)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">Unexplained Difference</p>
            <p
              className={cn(
                'mt-0.5 text-sm font-semibold tabular-nums',
                Number(data.reconciliation.unexplainedDifference) === 0 ? 'text-success' : 'text-destructive',
              )}
            >
              {signedCurrency(data.reconciliation.unexplainedDifference)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CompositionBar({ label, value, pct, barClassName }: { label: string; value: number; pct: number; barClassName: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-foreground">{label}</span>
        <span className="shrink-0 font-medium tabular-nums text-foreground">
          {formatCurrency(value)} <span className="text-muted-foreground">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all duration-700', barClassName)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Interactive Balance Sheet Visual Analytics Diagram View */
function BalanceSheetDiagramView({ data }: { data: BalanceSheetResponse }) {
  const assets = Number(data.summary.totalAssets) || 1;
  const liabilities = Number(data.summary.totalLiabilities);
  const equity = Number(data.summary.totalEquity);
  const liabAndEq = Number(data.summary.liabilitiesAndEquity) || 1;

  // Assets Breakdown Items
  const cash = Number(data.assets.current.cashAndBank) || 0;
  const ar = Number(data.assets.current.accountsReceivable) || 0;
  const cheques = Number(data.assets.current.chequesInHand) || 0;
  const inv = Number(data.assets.current.inventory) || 0;
  const refundCheques = Number(data.assets.current.refundChequesReceivable) || 0;

  const cashPct = Math.max(Math.round((cash / assets) * 100), 0);
  const arPct = Math.max(Math.round((ar / assets) * 100), 0);
  const chequesPct = Math.max(Math.round((cheques / assets) * 100), 0);
  const invPct = Math.max(Math.round((inv / assets) * 100), 0);
  const refundChequesPct = Math.max(Math.round((refundCheques / assets) * 100), 0);

  // Liabilities vs Equity Pct
  const liabPct = Math.max(Math.round((liabilities / liabAndEq) * 100), 0);
  const eqPct = Math.max(Math.round((equity / liabAndEq) * 100), 0);

  return (
    <div className="space-y-4">
      {/* 1. Visual Accounting Equation Scale */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <CardTitle>Accounting Equation Balance Scale</CardTitle>
          <Badge variant="outline">Assets = Liabilities + Equity</Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Left: Assets Scale Bar */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground">Total Assets</span>
              <span className={cn('text-lg font-semibold tabular-nums', amountTone(assets))}>{formatCurrency(assets)}</span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-success transition-all duration-700" style={{ width: '100%' }} />
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground tabular-nums">
              <span>Cash: {cashPct}%</span>
              <span>Receivables: {arPct}%</span>
              <span>Cheques: {chequesPct}%</span>
              <span>Inventory: {invPct}%</span>
            </div>
          </div>

          {/* Right: Liabilities + Equity Scale Bar */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground">Liabilities + Equity</span>
              <span className={cn('text-lg font-semibold tabular-nums', amountTone(liabAndEq))}>{formatCurrency(liabAndEq)}</span>
            </div>
            <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-l-full bg-destructive transition-all duration-700" style={{ width: `${liabPct}%` }} />
              <div className="h-full rounded-r-full bg-primary transition-all duration-700" style={{ width: `${eqPct}%` }} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full bg-destructive" aria-hidden />
                Liabilities: <span className="font-medium text-foreground">{formatCurrency(liabilities)}</span> ({liabPct}%)
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full bg-primary" aria-hidden />
                Equity: <span className={cn('font-medium', amountTone(equity))}>{formatCurrency(equity)}</span> ({eqPct}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Detailed Assets & Liabilities Proportion Diagrams */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Assets Composition Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Assets Composition Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CompositionBar label="Cash & Liquid Bank Balance" value={cash} pct={cashPct} barClassName="bg-success" />
            <CompositionBar label="Accounts Receivable (Dealer Balances)" value={ar} pct={arPct} barClassName="bg-primary" />
            <CompositionBar
              label="Cheques in Hand (Pending Bank Clearance)"
              value={cheques}
              pct={chequesPct}
              barClassName="bg-warning"
            />
            <CompositionBar label="Product Inventory (At Current Cost)" value={inv} pct={invPct} barClassName="bg-purple" />
            {data.assets.current.refundChequesReceivable !== undefined && (
              <CompositionBar
                label="Refund Cheques Receivable (Suppliers)"
                value={refundCheques}
                pct={refundChequesPct}
                barClassName="bg-info"
              />
            )}
          </CardContent>
        </Card>

        {/* Capital & Liabilities Structure */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Liabilities &amp; Capital Structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border">
              <div className="space-y-2 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Accounts Payable (Suppliers)</span>
                  <span className="font-medium tabular-nums">{formatCurrency(data.liabilities.current.accountsPayable)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Supplier Cheques Issued</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(data.liabilities.current.supplierChequesIssued)}
                  </span>
                </div>
                {data.liabilities.current.refundChequesIssued !== undefined && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Refund Cheques Issued</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(data.liabilities.current.refundChequesIssued)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex justify-between gap-3 border-t border-border bg-muted/50 px-3 py-2.5 text-sm font-semibold">
                <span className="text-foreground">Total Current Liabilities</span>
                <span className="tabular-nums text-foreground">{formatCurrency(data.liabilities.totalLiabilities)}</span>
              </div>
            </div>

            <div className="rounded-lg border border-border">
              <div className="space-y-2 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Capital Contributions</span>
                  <span className={cn('font-medium tabular-nums', amountTone(data.equity.capitalContributions))}>
                    {formatCurrency(data.equity.capitalContributions)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Owner Withdrawals</span>
                  <span className={cn('font-medium tabular-nums', amountTone(data.equity.ownerWithdrawals))}>
                    {formatCurrency(data.equity.ownerWithdrawals)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Accumulated Net Earnings</span>
                  <span className={cn('font-medium tabular-nums', amountTone(data.equity.accumulatedEarnings))}>
                    {formatCurrency(data.equity.accumulatedEarnings)}
                  </span>
                </div>
                {data.equity.cashAdjustments !== undefined && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Opening balance &amp; cash adjustments</span>
                    <span className={cn('font-medium tabular-nums', amountTone(data.equity.cashAdjustments))}>
                      {formatCurrency(data.equity.cashAdjustments)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex justify-between gap-3 border-t border-border bg-muted/50 px-3 py-2.5 text-sm font-semibold">
                <span className="text-foreground">Total Net Equity</span>
                <span className={cn('tabular-nums', amountTone(data.equity.totalEquity))}>
                  {formatCurrency(data.equity.totalEquity)}
                </span>
              </div>
              {data.equity.investorEquity !== undefined && (
                <div className="flex justify-between gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  <span>Investor equity (Equity ledger)</span>
                  <span className="tabular-nums">{formatCurrency(data.equity.investorEquity)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BalanceSheetPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useBalanceSheetSummary();
  const [viewMode, setViewMode] = useState<'REGISTER' | 'DIAGRAM'>('REGISTER');
  const [isExporting, setIsExporting] = useState(false);

  async function handleDownloadPdf() {
    if (!data) return;
    setIsExporting(true);
    try {
      await downloadBalanceSheetPdf(data, `balance-sheet-${businessToday()}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Balance Sheet Statement"
        description="Live Assets = Liabilities + Equity snapshot composed from Liquid Cash, Credit Balances, and Equity ledgers."
        meta={
          data && (
            <Badge variant="muted">
              <Calendar />
              As of {formatDate(data.asOf)} (Current Live Position)
            </Badge>
          )
        }
        actions={
          <>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'REGISTER' | 'DIAGRAM')} className="shrink-0">
              <TabsList>
                <TabsTrigger value="REGISTER">
                  <FileSpreadsheet className="size-3.5" />
                  Register
                </TabsTrigger>
                <TabsTrigger value="DIAGRAM">
                  <BarChart3 className="size-3.5" />
                  Diagram Stat
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn(isFetching && 'animate-spin')} />
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button onClick={handleDownloadPdf} disabled={!data} loading={isExporting}>
              {!isExporting && <Download />}
              {isExporting ? 'Generating PDF...' : 'Download PDF'}
            </Button>
          </>
        }
      />

      {isError ? (
        <Card>
          <QueryErrorState error={error} onRetry={() => refetch()} title="Couldn't load the balance sheet" />
        </Card>
      ) : isLoading || !data ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-24 rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[108px] rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          <ReconciliationBanner data={data} />

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Assets" value={formatCurrency(data.summary.totalAssets)} icon={Wallet} tone="success" />
            <StatCard
              label="Total Liabilities"
              value={formatCurrency(data.summary.totalLiabilities)}
              icon={HandCoins}
              tone="destructive"
            />
            <StatCard label="Total Equity" value={formatCurrency(data.summary.totalEquity)} icon={PieChartIcon} />
          </div>

          {viewMode === 'DIAGRAM' ? (
            <BalanceSheetDiagramView data={data} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Assets */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Assets Register</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GroupLabel>Current Assets</GroupLabel>
                    <LineItem label="Cash & Bank Balance" value={data.assets.current.cashAndBank} />
                    <LineItem label="Accounts Receivable (Dealers)" value={data.assets.current.accountsReceivable} />
                    <LineItem
                      label="Cheques in Hand"
                      value={data.assets.current.chequesInHand}
                      sub="Pending dealer cheques — recorded but not cleared"
                    />
                    {data.assets.current.refundChequesReceivable !== undefined && (
                      <LineItem
                        label="Refund Cheques Receivable"
                        value={data.assets.current.refundChequesReceivable}
                        sub="Supplier refund cheques received — not yet cleared"
                      />
                    )}
                    <LineItem label="Product Inventory" value={data.assets.current.inventory} sub="Valued at current wholesale cost" />
                    <LineItem label="Supplier Advances" value={data.assets.current.supplierAdvances} />
                    <LineItem label="Prepaid Expenses" value={data.assets.current.prepaidExpenses} />
                    <LineItem label="Other Current Assets" value={data.assets.current.otherCurrentAssets} />
                    <SectionTotal label="Total Current Assets" value={data.assets.current.totalCurrentAssets} />

                    <GroupLabel>Non-Current Assets</GroupLabel>
                    <LineItem label="Fixed Assets" value={data.assets.nonCurrent.fixedAssets} />
                    <LineItem label="Accumulated Depreciation" value={data.assets.nonCurrent.accumulatedDepreciation} />
                    <SectionTotal label="Total Non-Current Assets" value={data.assets.nonCurrent.totalNonCurrentAssets} />

                    <SectionTotal label="Total Assets" value={data.assets.totalAssets} grand />
                  </CardContent>
                </Card>

                {/* Liabilities */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Liabilities Register</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GroupLabel>Current Liabilities</GroupLabel>
                    <LineItem label="Accounts Payable (Suppliers)" value={data.liabilities.current.accountsPayable} />
                    <LineItem
                      label="Supplier Cheques Issued"
                      value={data.liabilities.current.supplierChequesIssued}
                      sub="Pending supplier cheques — written but not cleared"
                    />
                    {data.liabilities.current.refundChequesIssued !== undefined && (
                      <LineItem
                        label="Refund Cheques Issued"
                        value={data.liabilities.current.refundChequesIssued}
                        sub="Customer refund cheques written — not yet cleared"
                      />
                    )}
                    <LineItem label="Tax Payable" value={data.liabilities.current.taxPayable} />
                    <LineItem label="Accrued Expenses" value={data.liabilities.current.accruedExpenses} />
                    <LineItem label="Customer Advances" value={data.liabilities.current.customerAdvances} />
                    <SectionTotal label="Total Current Liabilities" value={data.liabilities.current.totalCurrentLiabilities} />

                    <GroupLabel>Non-Current Liabilities</GroupLabel>
                    <LineItem label="Business Loans" value={data.liabilities.nonCurrent.loans} />
                    <SectionTotal
                      label="Total Non-Current Liabilities"
                      value={data.liabilities.nonCurrent.totalNonCurrentLiabilities}
                    />

                    <SectionTotal label="Total Liabilities" value={data.liabilities.totalLiabilities} grand />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Equity */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Equity Register</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LineItem
                      label="Capital Contributions"
                      value={data.equity.capitalContributions}
                      sub="Positive capital injections"
                    />
                    <LineItem
                      label="Owner Withdrawals"
                      value={data.equity.ownerWithdrawals}
                      sub="Negative investment records — reduces net equity"
                    />
                    <LineItem
                      label="Accumulated Net Earnings"
                      value={data.equity.accumulatedEarnings}
                      sub="All-time gross sales profit − operational expenses"
                    />
                    {data.equity.cashAdjustments !== undefined && (
                      <LineItem
                        label="Opening balance & cash adjustments"
                        value={data.equity.cashAdjustments}
                        sub="Opening Liquid Cash balance plus evidenced corrections"
                      />
                    )}
                    <SectionTotal label="Total Net Equity" value={data.equity.totalEquity} grand />
                    {data.equity.investorEquity !== undefined && (
                      <p className="mt-2 flex justify-between gap-3 px-3 text-xs text-muted-foreground">
                        <span>Investor equity (Equity ledger: contributions + attributed earnings)</span>
                        <span className="shrink-0 tabular-nums">{formatCurrency(data.equity.investorEquity)}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Memorandum */}
                <Card className="border-dashed">
                  <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-2">
                    <CardTitle>Memorandum</CardTitle>
                    <Badge variant="muted">Excluded From Totals</Badge>
                  </CardHeader>
                  <CardContent>
                    <LineItem
                      label="Commission Payable"
                      value={data.memorandum.commissionPayable.value}
                      sub={`${data.memorandum.commissionPayable.pendingOrApprovedLineCount} pending/approved commission line${
                        data.memorandum.commissionPayable.pendingOrApprovedLineCount === 1 ? '' : 's'
                      }`}
                      strong
                    />
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Unpaid representative commission — deliberately excluded from Total Liabilities because commission
                      expenses are recognized upon settlement payout.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Accounting Notes & Unsupported Items */}
          {data.accountingWarnings.length > 0 && (
            <div className="rounded-xl border border-warning/25 bg-warning/5 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Info className="size-4 text-warning" />
                <h3 className="text-sm font-semibold text-foreground">Accounting Disclosures &amp; Notes</h3>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-muted-foreground">
                {data.accountingWarnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {data.unsupported.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Currently Unsupported Ledger Categories ({data.unsupported.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  These categories currently lack an underlying transaction model and display as unavailable.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {data.unsupported.map((field) => (
                  <Badge key={field} variant="outline" className="font-mono">
                    {field}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Receipt className="size-3.5" />
            <span>Every figure is derived live from existing transactional databases — no values are statically cached.</span>
          </p>
        </>
      )}
    </div>
  );
}
