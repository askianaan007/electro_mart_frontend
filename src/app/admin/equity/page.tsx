'use client';

import Link from 'next/link';
import { History, PieChart } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { useEquitySummary } from '@/hooks/use-equity';
import { useInvestments } from '@/hooks/use-investments';
import { useExpenses } from '@/hooks/use-expenses';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type HistoryRow = {
  id: string;
  date: string;
  type: 'Investment' | 'Withdrawal' | 'Expense';
  description: string;
  who: string;
  amount: number;
};

export default function EquityPage() {
  const { data: equity, isLoading: equityLoading } = useEquitySummary();
  const { data: investments, isLoading: investmentsLoading } = useInvestments({ page: 1, limit: 50 });
  const { data: expenses, isLoading: expensesLoading } = useExpenses({ page: 1, limit: 50 });

  const historyLoading = investmentsLoading || expensesLoading;

  const history: HistoryRow[] = [
    ...(investments?.data ?? []).map((investment) => ({
      id: `investment-${investment.id}`,
      date: investment.investmentDate,
      type: (Number(investment.amount) < 0 ? 'Withdrawal' : 'Investment') as HistoryRow['type'],
      description: investment.reason,
      who: investment.investor?.name ?? '—',
      amount: Number(investment.amount),
    })),
    ...(expenses?.data ?? []).map((expense) => ({
      id: `expense-${expense.id}`,
      date: expense.expenseDate,
      type: 'Expense' as HistoryRow['type'],
      description: expense.description,
      who: '—',
      amount: -Number(expense.amount),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Equity</h1>
        <p className="text-sm text-muted-foreground">
          Investment + profit share − expense share, per investor. Profit is calculated automatically from every
          completed sale — no manual entry needed.
        </p>
      </div>

      <section className="space-y-3">
        <div className="rounded-xl border border-border bg-card">
          {equityLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !equity || equity.entries.length === 0 ? (
            <EmptyState icon={PieChart} title="No investors yet" description="Add investors under the Investments page" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead className="text-right">Share %</TableHead>
                  <TableHead className="text-right">Investment</TableHead>
                  <TableHead className="text-right">Profit share</TableHead>
                  <TableHead className="text-right">Expense share</TableHead>
                  <TableHead className="text-right">Equity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equity.entries.map((entry) => (
                  <TableRow key={entry.investorId}>
                    <TableCell className="font-medium">{entry.investorName}</TableCell>
                    <TableCell className="text-right">{Number(entry.profitSharePercentage)}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.totalInvestment)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.profitShare)}</TableCell>
                    <TableCell className="text-right">−{formatCurrency(entry.expenseShare)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(entry.equity)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">{Number(equity.totals.percentageTotal)}%</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(equity.totals.totalInvestment)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(equity.totals.totalProfit)}</TableCell>
                  <TableCell className="text-right font-semibold">−{formatCurrency(equity.totals.totalExpenses)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(equity.totals.totalEquity)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
        {equity && Number(equity.totals.percentageTotal) !== 100 && (
          <p className="text-sm font-medium text-destructive">
            Warning: profit share percentages sum to {Number(equity.totals.percentageTotal)}%, not 100%.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          &quot;Profit share&quot; is each investor&apos;s cut of gross profit computed live from{' '}
          <Link href="/admin/sales-analysis" className="text-primary hover:underline">
            Sales Analysis
          </Link>{' '}
          (all completed orders to date), weighted by their profit share %.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">History</h2>
        <p className="-mt-2 text-sm text-muted-foreground">
          Every investment, withdrawal, and expense affecting equity. Manage them from the{' '}
          <Link href="/admin/investments" className="text-primary hover:underline">
            Investments
          </Link>{' '}
          and{' '}
          <Link href="/admin/expenses" className="text-primary hover:underline">
            Expenses
          </Link>{' '}
          pages.
        </p>
        <div className="rounded-xl border border-border bg-card">
          {historyLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <EmptyState icon={History} title="No history yet" description="Investments and expenses will appear here" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Investor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.date)}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>{row.who}</TableCell>
                    <TableCell
                      className={cn('text-right font-medium', row.amount >= 0 ? 'text-success' : 'text-destructive')}
                    >
                      {row.amount >= 0 ? '+' : ''}
                      {formatCurrency(row.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
