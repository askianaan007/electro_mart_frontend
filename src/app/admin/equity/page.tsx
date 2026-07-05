'use client';

import { useState } from 'react';
import { MoreHorizontal, PieChart, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProfitEntryFormDialog } from '@/components/admin/profit-entry-form-dialog';
import { useEquitySummary } from '@/hooks/use-equity';
import { useDeleteProfitEntry, useProfitEntries } from '@/hooks/use-profit-entries';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ProfitEntry } from '@/lib/api/types';

export default function EquityPage() {
  const { data: equity, isLoading: equityLoading } = useEquitySummary();
  const { data: profitEntries, isLoading: profitEntriesLoading } = useProfitEntries({ page: 1, limit: 50 });

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProfitEntry | undefined>(undefined);
  const [deletingEntry, setDeletingEntry] = useState<ProfitEntry | null>(null);

  const deleteEntry = useDeleteProfitEntry();

  function confirmDelete() {
    if (!deletingEntry) return;
    deleteEntry.mutate(deletingEntry.id, {
      onSuccess: () => {
        toast.success('Profit entry deleted');
        setDeletingEntry(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeletingEntry(null);
      },
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Equity</h1>
        <p className="text-sm text-muted-foreground">
          Investment + equal profit share − equal expense share, per investor
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
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Profit Entries</h2>
          <Button
            size="sm"
            onClick={() => {
              setEditingEntry(undefined);
              setFormOpen(true);
            }}
          >
            <Plus />
            Add Entry
          </Button>
        </div>
        <div className="rounded-xl border border-border bg-card">
          {profitEntriesLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !profitEntries || profitEntries.data.length === 0 ? (
            <EmptyState icon={PieChart} title="No profit entries yet" description="Record realized profit for a period" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Remarks</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitEntries.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {formatDate(entry.periodStart)} – {formatDate(entry.periodEnd)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{entry.remarks ?? '—'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingEntry(entry);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeletingEntry(entry)}>
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <ProfitEntryFormDialog open={formOpen} onOpenChange={setFormOpen} entry={editingEntry} />

      <AlertDialog open={!!deletingEntry} onOpenChange={(open) => !open && setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this profit entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change every investor&apos;s equity, since profit is split equally across all investors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
