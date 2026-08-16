'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Download,
  FileSpreadsheet,
  HandCoins,
  Info,
  Landmark,
  Loader2,
  PieChart as PieChartIcon,
  Receipt,
  RefreshCw,
  Scale,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QueryErrorState } from '@/components/query-error-state';
import { StatCard } from '@/components/stat-card';
import { useBalanceSheetSummary } from '@/hooks/use-balance-sheet';
import { downloadBalanceSheetPdf } from '@/lib/balance-sheet-pdf';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { BalanceSheetResponse, ReconciliationStatus } from '@/lib/api/types';

const STATUS_META: Record<
  ReconciliationStatus,
  { label: string; icon: typeof CheckCircle2; badge: 'success' | 'warning' | 'destructive'; border: string; bg: string }
> = {
  BALANCED: {
    label: 'Balanced Position',
    icon: CheckCircle2,
    badge: 'success',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
  },
  BALANCED_WITH_KNOWN_TIMING_DIFFERENCE: {
    label: 'Balanced — Known Order Timing Difference',
    icon: Clock,
    badge: 'warning',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
  },
  UNBALANCED: {
    label: 'Unbalanced — Needs Investigation',
    icon: AlertTriangle,
    badge: 'destructive',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5',
  },
};

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
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <p className={cn('break-words text-xs sm:text-sm', strong ? 'font-black text-foreground' : 'font-medium text-muted-foreground')}>
          {label}
        </p>
        {sub && <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{sub}</p>}
      </div>
      <p className={cn('shrink-0 whitespace-nowrap text-xs sm:text-sm', strong ? 'font-black text-foreground' : 'font-bold')}>
        {value === null ? <span className="text-[10px] text-muted-foreground/70 font-semibold italic">Not supported</span> : formatCurrency(value)}
      </p>
    </div>
  );
}

function SectionTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3 border-t-2 border-border/60 pt-2.5">
      <p className="text-xs sm:text-sm font-extrabold text-foreground uppercase tracking-wider">{label}</p>
      <p className="whitespace-nowrap text-xs sm:text-sm font-black text-primary">{formatCurrency(value)}</p>
    </div>
  );
}

function signedCurrency(value: string) {
  const n = Number(value);
  return `${n > 0 ? '+' : ''}${formatCurrency(value)}`;
}

function ReconciliationBanner({ data }: { data: BalanceSheetResponse }) {
  const meta = STATUS_META[data.reconciliation.status];
  const Icon = meta.icon;
  const showBreakdown = data.reconciliation.status !== 'BALANCED';

  return (
    <div className={cn('relative isolate overflow-hidden rounded-3xl border p-5 sm:p-6 backdrop-blur-2xl shadow-md transition-all', meta.border, meta.bg)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-background/60 border border-border/60 shrink-0 shadow-2xs">
            <Icon
              className={cn(
                'size-5',
                meta.badge === 'success' && 'text-emerald-600 dark:text-emerald-400',
                meta.badge === 'warning' && 'text-amber-600 dark:text-amber-400',
                meta.badge === 'destructive' && 'text-rose-600 dark:text-rose-400'
              )}
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-foreground">{meta.label}</h2>
              <Badge variant={meta.badge} className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                {data.reconciliation.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground font-medium">
              Assets <span className="font-bold text-foreground">{formatCurrency(data.summary.totalAssets)}</span> vs. Liabilities + Equity{' '}
              <span className="font-bold text-foreground">{formatCurrency(data.summary.liabilitiesAndEquity)}</span> — raw difference{' '}
              <span className="font-black text-primary">{signedCurrency(data.summary.rawDifference)}</span>
            </p>
          </div>
        </div>
      </div>

      {showBreakdown && (
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border/50 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/50 bg-background/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Known Order Timing Gap</p>
            <p className="font-black text-sm text-foreground mt-0.5">{signedCurrency(data.reconciliation.knownOrderTimingDifference)}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              {data.reconciliation.inFlightOrderCount} order{data.reconciliation.inFlightOrderCount === 1 ? '' : 's'} in fulfillment
            </p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Known Unallocated Equity</p>
            <p className="font-black text-sm text-foreground mt-0.5">{signedCurrency(data.reconciliation.knownUnallocatedEquityDifference)}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              Investor share total: {data.reconciliation.investorPercentageTotal}%
            </p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Known Difference</p>
            <p className="font-black text-sm text-foreground mt-0.5">{signedCurrency(data.reconciliation.knownDifference)}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unexplained Difference</p>
            <p
              className={cn(
                'font-black text-sm mt-0.5',
                Number(data.reconciliation.unexplainedDifference) === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
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

  const cashPct = Math.max(Math.round((cash / assets) * 100), 0);
  const arPct = Math.max(Math.round((ar / assets) * 100), 0);
  const chequesPct = Math.max(Math.round((cheques / assets) * 100), 0);
  const invPct = Math.max(Math.round((inv / assets) * 100), 0);

  // Liabilities vs Equity Pct
  const liabPct = Math.max(Math.round((liabilities / liabAndEq) * 100), 0);
  const eqPct = Math.max(Math.round((equity / liabAndEq) * 100), 0);

  return (
    <div className="space-y-6">
      {/* 1. Visual Accounting Equation Scale */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl p-6 shadow-md space-y-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="size-5 text-primary" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
              Accounting Equation Balance Scale
            </h2>
          </div>
          <Badge variant="outline" className="rounded-full px-3 py-1 font-bold text-xs">
            Assets = Liabilities + Equity
          </Badge>
        </div>

        {/* Visual Dual Scale Bar */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 pt-2">
          {/* Left: Assets Scale Bar */}
          <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">Total Assets</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(assets)}</span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-emerald-950/20 p-0.5 flex">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: '100%' }} />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-muted-foreground font-semibold">
              <span>Cash: {cashPct}%</span>
              <span>Receivables: {arPct}%</span>
              <span>Cheques: {chequesPct}%</span>
              <span>Inventory: {invPct}%</span>
            </div>
          </div>

          {/* Right: Liabilities + Equity Scale Bar */}
          <div className="space-y-3 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">Liabilities + Equity</span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">{formatCurrency(liabAndEq)}</span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-blue-950/20 p-0.5 flex gap-1">
              <div className="h-full bg-rose-500 rounded-l-full transition-all duration-1000" style={{ width: `${liabPct}%` }} />
              <div className="h-full bg-blue-500 rounded-r-full transition-all duration-1000" style={{ width: `${eqPct}%` }} />
            </div>
            <div className="flex items-center justify-between pt-1 text-[11px] font-bold">
              <span className="text-rose-600 dark:text-rose-400">Liabilities: {formatCurrency(liabilities)} ({liabPct}%)</span>
              <span className="text-blue-600 dark:text-blue-400">Equity: {formatCurrency(equity)} ({eqPct}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Detailed Assets & Liabilities Proportion Diagrams */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Assets Composition Breakdown */}
        <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-border/50 pb-3">
            <Coins className="size-4.5 text-emerald-500" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
              Assets Composition Breakdown
            </h3>
          </div>

          <div className="space-y-3.5">
            {/* Item 1: Cash & Bank */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Cash &amp; Liquid Bank Balance</span>
                <span className="font-black text-foreground">{formatCurrency(cash)} ({cashPct}%)</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${cashPct}%` }} />
              </div>
            </div>

            {/* Item 2: Accounts Receivable */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Accounts Receivable (Dealer Balances)</span>
                <span className="font-black text-foreground">{formatCurrency(ar)} ({arPct}%)</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${arPct}%` }} />
              </div>
            </div>

            {/* Item 3: Cheques in Hand */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Cheques in Hand (Pending Bank Clearance)</span>
                <span className="font-black text-foreground">{formatCurrency(cheques)} ({chequesPct}%)</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${chequesPct}%` }} />
              </div>
            </div>

            {/* Item 4: Inventory */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Product Inventory (At Current Cost)</span>
                <span className="font-black text-foreground">{formatCurrency(inv)} ({invPct}%)</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${invPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Capital & Liabilities Structure */}
        <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-border/50 pb-3">
            <PieChartIcon className="size-4.5 text-blue-500" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
              Liabilities &amp; Capital Structure
            </h3>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-background/50 p-4 space-y-2">
              <div className="flex justify-between text-xs font-extrabold">
                <span className="text-muted-foreground uppercase">Accounts Payable (Suppliers)</span>
                <span className="text-rose-600 dark:text-rose-400">{formatCurrency(data.liabilities.current.accountsPayable)}</span>
              </div>
              <div className="flex justify-between text-xs font-extrabold">
                <span className="text-muted-foreground uppercase">Supplier Cheques Issued</span>
                <span className="text-rose-600 dark:text-rose-400">{formatCurrency(data.liabilities.current.supplierChequesIssued)}</span>
              </div>
              <div className="border-t border-border/50 pt-2 flex justify-between text-xs font-black">
                <span className="text-foreground">Total Current Liabilities</span>
                <span className="text-rose-600 dark:text-rose-400">{formatCurrency(data.liabilities.totalLiabilities)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/50 p-4 space-y-2">
              <div className="flex justify-between text-xs font-extrabold">
                <span className="text-muted-foreground uppercase">Capital Contributions</span>
                <span className="text-foreground">{formatCurrency(data.equity.capitalContributions)}</span>
              </div>
              <div className="flex justify-between text-xs font-extrabold">
                <span className="text-muted-foreground uppercase">Owner Withdrawals</span>
                <span className="text-amber-600 dark:text-amber-400">{formatCurrency(data.equity.ownerWithdrawals)}</span>
              </div>
              <div className="flex justify-between text-xs font-extrabold">
                <span className="text-muted-foreground uppercase">Accumulated Net Earnings</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(data.equity.accumulatedEarnings)}</span>
              </div>
              <div className="border-t border-border/50 pt-2 flex justify-between text-xs font-black">
                <span className="text-foreground">Total Net Equity</span>
                <span className="text-primary">{formatCurrency(data.equity.totalEquity)}</span>
              </div>
            </div>
          </div>
        </div>
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
      await downloadBalanceSheetPdf(data, `balance-sheet-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6 select-none">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <FileSpreadsheet className="size-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Balance Sheet Statement
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-medium sm:text-sm">
            Live Assets = Liabilities + Equity snapshot composed from Liquid Cash, Credit Balances, and Equity ledgers
          </p>
          {data && (
            <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 pt-0.5">
              <Calendar className="size-3.5 text-primary" />
              <span>Statement as of {formatDate(data.asOf)} (Current Live Position)</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* View Mode Diagram Switch */}
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as 'REGISTER' | 'DIAGRAM')}
            className="shrink-0"
          >
            <TabsList className="h-10 rounded-2xl border border-border/60 bg-card/70 p-1 backdrop-blur-md">
              <TabsTrigger
                value="REGISTER"
                className="rounded-xl px-3 py-1 text-xs font-extrabold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-xs"
              >
                <FileSpreadsheet className="size-3.5 mr-1.5" />
                <span>Register</span>
              </TabsTrigger>
              <TabsTrigger
                value="DIAGRAM"
                className="rounded-xl px-3 py-1 text-xs font-extrabold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-xs"
              >
                <BarChart3 className="size-3.5 mr-1.5" />
                <span>Diagram Stat</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-2xl font-bold h-10 px-4 backdrop-blur-md shadow-xs"
          >
            <RefreshCw className={cn('size-4 mr-1.5', isFetching && 'animate-spin')} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={!data || isExporting}
            className="rounded-2xl font-bold h-10 px-4 shadow-xs"
          >
            {isExporting ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Download className="size-4 mr-1.5" />}
            <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
          </Button>
        </div>
      </div>

      {isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-6">
          <Skeleton className="h-36 rounded-3xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-3xl" />
            <Skeleton className="h-72 rounded-3xl" />
          </div>
        </div>
      ) : (
        <>
          <ReconciliationBanner data={data} />

          {/* 3 Main Summary Stat Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Total Assets" value={formatCurrency(data.summary.totalAssets)} icon={Wallet} tone="success" />
            <StatCard
              label="Total Liabilities"
              value={formatCurrency(data.summary.totalLiabilities)}
              icon={HandCoins}
              tone="destructive"
            />
            <StatCard label="Total Equity" value={formatCurrency(data.summary.totalEquity)} icon={PieChartIcon} />
          </div>

          {/* Tab Switch View Mode: Diagram Stats vs Detailed Register */}
          {viewMode === 'DIAGRAM' ? (
            <BalanceSheetDiagramView data={data} />
          ) : (
            <>
              {/* Detailed Financial Register Tables */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Assets Glass Card */}
                <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl p-6 shadow-md space-y-3">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

                  <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                    <Coins className="size-5 text-emerald-500" />
                    <h2 className="text-base font-extrabold tracking-tight text-foreground uppercase">
                      Assets Register
                    </h2>
                  </div>

                  <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground pt-1">
                    Current Assets
                  </p>
                  <LineItem label="Cash & Bank Balance" value={data.assets.current.cashAndBank} />
                  <LineItem label="Accounts Receivable (Dealers)" value={data.assets.current.accountsReceivable} />
                  <LineItem
                    label="Cheques in Hand"
                    value={data.assets.current.chequesInHand}
                    sub="Pending dealer cheques — recorded but not cleared"
                  />
                  <LineItem label="Product Inventory" value={data.assets.current.inventory} sub="Valued at current wholesale cost" />
                  <LineItem label="Supplier Advances" value={data.assets.current.supplierAdvances} />
                  <LineItem label="Prepaid Expenses" value={data.assets.current.prepaidExpenses} />
                  <LineItem label="Other Current Assets" value={data.assets.current.otherCurrentAssets} />
                  <SectionTotal label="Total Current Assets" value={data.assets.current.totalCurrentAssets} />

                  <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground pt-4">
                    Non-Current Assets
                  </p>
                  <LineItem label="Fixed Assets" value={data.assets.nonCurrent.fixedAssets} />
                  <LineItem label="Accumulated Depreciation" value={data.assets.nonCurrent.accumulatedDepreciation} />
                  <SectionTotal label="Total Non-Current Assets" value={data.assets.nonCurrent.totalNonCurrentAssets} />

                  <SectionTotal label="Total Assets" value={data.assets.totalAssets} />
                </div>

                {/* Liabilities Glass Card */}
                <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl p-6 shadow-md space-y-3">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

                  <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                    <Scale className="size-5 text-rose-500" />
                    <h2 className="text-base font-extrabold tracking-tight text-foreground uppercase">
                      Liabilities Register
                    </h2>
                  </div>

                  <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground pt-1">
                    Current Liabilities
                  </p>
                  <LineItem label="Accounts Payable (Suppliers)" value={data.liabilities.current.accountsPayable} />
                  <LineItem
                    label="Supplier Cheques Issued"
                    value={data.liabilities.current.supplierChequesIssued}
                    sub="Pending supplier cheques — written but not cleared"
                  />
                  <LineItem label="Tax Payable" value={data.liabilities.current.taxPayable} />
                  <LineItem label="Accrued Expenses" value={data.liabilities.current.accruedExpenses} />
                  <LineItem label="Customer Advances" value={data.liabilities.current.customerAdvances} />
                  <SectionTotal label="Total Current Liabilities" value={data.liabilities.current.totalCurrentLiabilities} />

                  <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground pt-4">
                    Non-Current Liabilities
                  </p>
                  <LineItem label="Business Loans" value={data.liabilities.nonCurrent.loans} />
                  <SectionTotal
                    label="Total Non-Current Liabilities"
                    value={data.liabilities.nonCurrent.totalNonCurrentLiabilities}
                  />

                  <SectionTotal label="Total Liabilities" value={data.liabilities.totalLiabilities} />
                </div>
              </div>

              {/* Equity & Memorandum Section */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Equity Glass Card */}
                <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl p-6 shadow-md space-y-3">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                    <PieChartIcon className="size-5 text-blue-500" />
                    <h2 className="text-base font-extrabold tracking-tight text-foreground uppercase">
                      Equity Register
                    </h2>
                  </div>

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
                  <SectionTotal label="Total Net Equity" value={data.equity.totalEquity} />
                </div>

                {/* Memorandum Card */}
                <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 border-dashed bg-card/70 backdrop-blur-2xl p-6 shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="size-5 text-amber-500" />
                      <h2 className="text-base font-extrabold tracking-tight text-foreground uppercase">
                        Memorandum
                      </h2>
                    </div>
                    <Badge variant="muted" className="rounded-full px-2.5 py-0.5 text-[10px] font-black">
                      Excluded From Totals
                    </Badge>
                  </div>

                  <LineItem
                    label="Commission Payable"
                    value={data.memorandum.commissionPayable.value}
                    sub={`${data.memorandum.commissionPayable.pendingOrApprovedLineCount} pending/approved commission line${
                      data.memorandum.commissionPayable.pendingOrApprovedLineCount === 1 ? '' : 's'
                    }`}
                    strong
                  />
                  <p className="mt-3 text-xs text-muted-foreground font-medium leading-relaxed">
                    Unpaid representative commission — deliberately excluded from Total Liabilities because commission expenses are recognized upon settlement payout.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Accounting Notes & Unsupported Items */}
          {data.accountingWarnings.length > 0 && (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-2xl space-y-2">
              <div className="flex items-center gap-2">
                <Info className="size-4.5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                  Accounting Disclosures &amp; Notes
                </h3>
              </div>
              {data.accountingWarnings.map((warning, i) => (
                <p key={i} className="text-xs text-muted-foreground font-medium leading-relaxed">
                  • {warning}
                </p>
              ))}
            </div>
          )}

          {data.unsupported.length > 0 && (
            <div className="rounded-3xl border border-border/60 bg-muted/40 p-5 backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2">
                <Landmark className="size-4.5 text-muted-foreground" />
                <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  Currently Unsupported Ledger Categories ({data.unsupported.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.unsupported.map((field) => (
                  <Badge key={field} variant="outline" className="font-mono text-[10px] rounded-lg">
                    {field}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                These categories currently lack an underlying transaction model and display as unavailable.
              </p>
            </div>
          )}

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Receipt className="size-3.5 text-primary" />
            <span>Every figure is derived live from existing transactional databases — no values are statically cached.</span>
          </p>
        </>
      )}
    </div>
  );
}
