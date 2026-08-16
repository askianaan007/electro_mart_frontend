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
import { useAdminDashboard } from '@/hooks/use-dashboard';
import { useActivityLog } from '@/hooks/use-activity-log';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useAdminDashboard();
  const { data: activity, isLoading: activityLoading } = useActivityLog({ page: 1, limit: 6 });
  const [outstandingDialogOpen, setOutstandingDialogOpen] = useState(false);
  const [pendingChequesDialogOpen, setPendingChequesDialogOpen] = useState(false);

  const creditBalance = Number(data?.creditBalance ?? 0);
  const liquidCash = data?.liquidCash ?? 0;
  const creditSharePct = creditBalance + liquidCash > 0 ? (creditBalance / (creditBalance + liquidCash)) * 100 : 0;

  if (isError) {
    return (
      <div className="space-y-6">
        <GreetingHeader />
        <QueryErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GreetingHeader />

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[168px] w-full rounded-[22px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <HeroKpiCard
            label="Liquid Cash"
            value={data.liquidCash}
            formatValue={(n) => formatCurrency(n)}
            icon={Wallet}
            gradient="orange"
            mask="CASH"
            subtitle="Investments + collections − supplier payments − expenses"
            href="/admin/liquid-cash"
          />
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
          <HeroKpiCard
            label="Today's Sales"
            value={Number(data.todaysSales)}
            formatValue={(n) => formatCurrency(n)}
            icon={IndianRupee}
            gradient="green"
            mask="SALE"
            subtitle="Sales recorded today"
          />

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
        </div>

      )}

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <MiniStatCard
            label="Outstanding Payments"
            value={formatCurrency(data.outstandingPayments)}
            icon={Wallet}
            tone="primary"
            onClick={() => setOutstandingDialogOpen(true)}
          />
          <MiniStatCard
            label="Invoice Due"
            value={formatCurrency(data.invoiceDue)}
            icon={Receipt}
            tone="primary"
            href="/admin/invoices"
          />
          <MiniStatCard
            label="Total Expenses"
            value={formatCurrency(data.totalExpenses)}
            icon={CreditCard}
            tone="warning"
            change={data.totalExpensesChangePct}
            changeLabel="vs Last Month"
            href="/admin/expenses"
          />
          <MiniStatCard
            label="Profit"
            value={formatCurrency(data.profit)}
            icon={TrendingUp}
            tone="success"
            change={data.profitChangePct}
            changeLabel="vs Last Month"
            href="/admin/equity"
          />
          <MiniStatCard
            label="Pending Approvals"
            value={data.pendingApprovals}
            icon={ClipboardCheck}
            tone={data.pendingApprovals > 0 ? 'warning' : 'primary'}
          />
          <MiniStatCard
            label="Out of Stock Items"
            value={data.outOfStockItems}
            icon={AlertTriangle}
            tone={data.outOfStockItems > 0 ? 'destructive' : 'primary'}
            href="/admin/inventory"
          />
        </div>
      )}

      {isLoading || !data ? (
        <div className="grid gap-5 lg:grid-cols-5">
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-2xl lg:col-span-3" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <BusinessHealth data={data} />
          </div>
          <div className="lg:col-span-3">
            <MoreMetricsStrip data={data} />
          </div>
        </div>
      )}

      {isLoading || !data ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueAnalyticsCard data={data.monthlyRevenue} />
          </div>
          <TopProductsCard items={data.topProducts} />
        </div>
      )}

      {isLoading || !data ? (
        <Skeleton className="h-56 w-full rounded-2xl" />
      ) : (
        <UpcomingChequesCard cheques={data.upcomingCheques} />
      )}

      {isLoading || !data ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentOrdersCard orders={data.recentOrders} />
          </div>
          {activityLoading ? (
            <Skeleton className="h-96 rounded-2xl" />
          ) : (
            <ActivityTimeline items={activity?.data ?? []} />
          )}
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
