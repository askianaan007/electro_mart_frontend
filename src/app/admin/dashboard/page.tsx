'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  BadgeDollarSign,
  Clock,
  ClipboardCheck,
  CreditCard,
  HandCoins,
  IndianRupee,
  Landmark,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { GreetingHeader } from '@/components/admin/dashboard/greeting-header';
import { HeroKpiCard } from '@/components/admin/dashboard/hero-kpi-card';
import { MiniStatCard } from '@/components/admin/dashboard/mini-stat-card';
import { MoreMetricsStrip } from '@/components/admin/dashboard/more-metrics-strip';
import { BusinessHealth } from '@/components/admin/dashboard/business-health';
import { RevenueAnalyticsCard } from '@/components/admin/dashboard/revenue-analytics-card';
import { TopProductsCard } from '@/components/admin/dashboard/top-products-card';
import { UpcomingChequesCard } from '@/components/admin/dashboard/upcoming-cheques-card';
import { OutstandingPaymentsDialog } from '@/components/admin/dashboard/outstanding-payments-dialog';
import { PendingChequesDialog } from '@/components/admin/dashboard/pending-cheques-dialog';
import { RecentOrdersCard } from '@/components/admin/dashboard/recent-orders-card';
import { ActivityTimeline } from '@/components/admin/dashboard/activity-timeline';
import { QuickActionsPanel } from '@/components/admin/dashboard/quick-actions-panel';
import { QueryErrorState } from '@/components/query-error-state';
import { Rise } from '@/components/admin/dashboard/rise';
import { useAdminDashboard } from '@/hooks/use-dashboard';
import { useActivityLog } from '@/hooks/use-activity-log';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useAdminDashboard();
  const {
    data: activity,
    isLoading: activityLoading,
    isFetching: activityFetching,
    isError: activityIsError,
    error: activityError,
    refetch: refetchActivity,
  } = useActivityLog({ page: 1, limit: 6 });
  const [outstandingDialogOpen, setOutstandingDialogOpen] = useState(false);
  const [pendingChequesDialogOpen, setPendingChequesDialogOpen] = useState(false);

  const creditBalance = Number(data?.creditBalance ?? 0);
  const liquidCash = data?.liquidCash ?? 0;
  const creditSharePct = creditBalance + liquidCash > 0 ? (creditBalance / (creditBalance + liquidCash)) * 100 : 0;

  if (isError) {
    return (
      <div className="space-y-6">
        <GreetingHeader />
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <QueryErrorState error={error} onRetry={() => refetch()} title="Couldn't load the dashboard" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GreetingHeader />

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[136px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

          <Rise step={1} className="h-full">
            <HeroKpiCard
              label="Liquid Cash"
              value={data.liquidCash}
              formatValue={(n) => formatCurrency(n)}
              icon={Wallet}
              gradient="orange"
              featured
              mask="CASH"
              subtitle="Investments + collections − supplier payments − expenses"
              href="/admin/liquid-cash"
            />

          </Rise>

          <Rise step={2} className="h-full">
            <HeroKpiCard
              label="Credit Balance"
              value={creditBalance}
              formatValue={(n) => formatCurrency(n)}
              icon={HandCoins}
              gradient="red"
              mask="DEBT"
              subtitle="Outstanding balance owed to suppliers"
              progress={{ pct: creditSharePct, label: `${creditSharePct.toFixed(0)}% of total cash position` }}
              href="/admin/credit-balance"
            />

          </Rise>

          <Rise step={3} className="h-full">
            <HeroKpiCard
              label="Today's Sales"
              value={Number(data.todaysSales)}
              formatValue={(n) => formatCurrency(n)}
              icon={IndianRupee}
              gradient="green"
              mask="SALE"
              subtitle="Sales recorded today"
            />

          </Rise>


          <Rise step={4} className="h-full">
            <HeroKpiCard
              label="Total Sales"
              value={data.netSales}
              formatValue={(n) => formatCurrency(n)}
              icon={BadgeDollarSign}
              gradient="purple"
              mask="REVN"
              subtitle="All-time net sales from completed orders, after returns"
              href="/admin/sales-analysis"
            />

          </Rise>

          <Rise step={5} className="h-full">
            <HeroKpiCard
              label="Total Collected"
              value={data.totalCollected}
              formatValue={(n) => formatCurrency(n)}
              icon={Landmark}
              gradient="teal"
              mask="PAID"
              subtitle="All-time dealer payments collected (cheques counted once cleared)"
              href="/admin/payments"
            />

          </Rise>

          <Rise step={6} className="h-full">
            <HeroKpiCard
              label="Pending Dealer Cheques"
              value={data.pendingDealerCheques}
              formatValue={(n) => formatCurrency(n)}
              icon={Clock}
              gradient="blue"
              mask="CHQ"
              subtitle="Cheque payments recorded but not yet cleared by the bank"
              onClick={() => setPendingChequesDialogOpen(true)}
            />

          </Rise>
        </div>
      )}

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] w-full rounded-xl sm:h-[84px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">

          <Rise step={4} className="h-full">
            <MiniStatCard
              label="Outstanding Payments"
              value={formatCurrency(data.outstandingPayments)}
              icon={Wallet}
              tone="primary"
              onClick={() => setOutstandingDialogOpen(true)}
            />

          </Rise>

          <Rise step={5} className="h-full">
            <MiniStatCard
              label="Invoice Due"
              value={formatCurrency(data.invoiceDue)}
              icon={Receipt}
              tone="primary"
              href="/admin/invoices"
            />

          </Rise>

          <Rise step={6} className="h-full">
            <MiniStatCard
              label="Total Expenses"
              value={formatCurrency(data.totalExpenses)}
              icon={CreditCard}
              tone="warning"
              change={data.totalExpensesChangePct}
              changeLabel="vs Last Month"
              href="/admin/expenses"
            />

          </Rise>

          <Rise step={7} className="h-full">
            <MiniStatCard
              label="Profit"
              value={formatCurrency(data.profit)}
              icon={TrendingUp}
              tone="success"
              change={data.profitChangePct}
              changeLabel="vs Last Month"
              href="/admin/equity"
            />

          </Rise>

          <Rise step={8} className="h-full">
            <MiniStatCard
              label="Pending Approvals"
              value={data.pendingApprovals}
              icon={ClipboardCheck}
              tone={data.pendingApprovals > 0 ? 'warning' : 'primary'}
            />

          </Rise>

          <Rise step={9} className="h-full">
            <MiniStatCard
              label="Out of Stock Items"
              value={data.outOfStockItems}
              icon={AlertTriangle}
              tone={data.outOfStockItems > 0 ? 'destructive' : 'primary'}
              href="/admin/inventory"
            />

          </Rise>
        </div>
      )}

      {isLoading || !data ? (
        <div className="grid gap-4 lg:grid-cols-5" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-xl lg:col-span-3" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Rise step={10} className="h-full lg:col-span-2">
            <BusinessHealth data={data} />
          </Rise>
          <Rise step={11} className="h-full lg:col-span-3">
            <MoreMetricsStrip data={data} />
          </Rise>
        </div>
      )}

      {isLoading || !data ? (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-[520px] rounded-xl lg:col-span-2" />
          <Skeleton className="h-[520px] rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Rise step={12} className="h-full lg:col-span-2">
            <RevenueAnalyticsCard data={data.monthlyRevenue} />
          </Rise>
          <Rise step={13} className="h-full">
            <TopProductsCard items={data.topProducts} />
          </Rise>
        </div>
      )}

      {isLoading || !data ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : (
        <Rise step={14}>
          <UpcomingChequesCard cheques={data.upcomingCheques} />
        </Rise>
      )}

      {isLoading || !data ? (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Rise step={15} className="h-full lg:col-span-2">
            <RecentOrdersCard orders={data.recentOrders} />
          </Rise>
          <Rise step={16} className="h-full">
            <ActivityTimeline
              items={activity?.data ?? []}
              isLoading={activityLoading}
              isFetching={activityFetching}
              isError={activityIsError}
              error={activityError}
              onRetry={() => refetchActivity()}
            />
          </Rise>
        </div>
      )}

      <QuickActionsPanel />

      <OutstandingPaymentsDialog
        open={outstandingDialogOpen}
        onOpenChange={setOutstandingDialogOpen}
        dealers={data?.outstandingByDealer ?? []}
      />

      <PendingChequesDialog
        open={pendingChequesDialogOpen}
        onOpenChange={setPendingChequesDialogOpen}
        totalAmount={data?.pendingDealerCheques ?? 0}
      />
    </div>
  );
}
