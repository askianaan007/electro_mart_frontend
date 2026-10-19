'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, MoreHorizontal, Plus, Receipt, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { TableSkeleton } from '@/components/loading-state';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExpenseFormDialog } from '@/components/admin/expense-form-dialog';
import { useDeleteExpense, useExpenses } from '@/hooks/use-expenses';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Expense } from '@/lib/api/types';

function PayoutBadge({ expense, className }: { expense: Expense; className?: string }) {
  if (!expense.representativeSettlement) return null;
  return (
    <Badge variant="info" className={className} title="Commission settlement payout — reverse the settlement's payment to correct it">
      Commission payout · {expense.representativeSettlement.settlementNumber}
    </Badge>
  );
}

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const filtersActive = !!search || !!dateFrom || !!dateTo;

  const deleteExpense = useDeleteExpense();
  const { data, isLoading, isFetching, isError, error, refetch } = useExpenses({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  function openCreate() {
    setEditingExpense(undefined);
    setFormOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditingExpense(expense);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deletingExpense) return;
    deleteExpense.mutate(deletingExpense.id, {
      onSuccess: () => {
        toast.success('Expense deleted');
        setDeletingExpense(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeletingExpense(null);
      },
    });
  }

  function clearFilters() {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  const total = (data?.data ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

  // A commission settlement payout is locked: the backend rejects editing/deleting it, and the
  // correction path is reversing the settlement's payment instead.
  const expenseActions = (expense: Expense, className?: string) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className} aria-label="Expense actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {expense.representativeSettlement ? (
          <>
            <DropdownMenuLabel className="max-w-64 whitespace-normal text-xs font-normal text-muted-foreground">
              This is a commission settlement payout and can&apos;t be edited or deleted. Reverse the
              settlement&apos;s payment instead.
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/admin/commission/settlements/${expense.representativeSettlement.id}`}>
                <ExternalLink />
                View settlement {expense.representativeSettlement.settlementNumber}
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={() => openEdit(expense)}>Edit</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeletingExpense(expense)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Shared business expenses, split equally across investors."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Add Expense
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="All expenses" isFetching={isFetching && !isLoading} className="pb-3" />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="min-w-0 w-full sm:w-auto"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="min-w-0 w-full sm:w-auto"
              />
            </div>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X />
                Clear
              </Button>
            )}
          </div>
        </FilterBar>

        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching expenses"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title="No expenses recorded"
              description="Add a business expense to track it here"
            />
          )
        ) : (
          <>
            <div className={cn('hidden lg:block', isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-muted-foreground">{formatDate(expense.expenseDate)}</TableCell>
                      <TableCell className="whitespace-normal break-words font-medium">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{expense.description}</span>
                          <PayoutBadge expense={expense} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-muted-foreground">
                        {expense.remarks ?? '—'}
                      </TableCell>
                      <TableCell>
                        {expenseActions(expense)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className={cn('space-y-3 p-4 lg:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((expense) => (
                <div key={expense.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{expense.description}</p>
                      <PayoutBadge expense={expense} className="mt-1" />
                    </div>
                    {expenseActions(expense, '-mr-2 -mt-1 shrink-0')}
                  </div>
                  <p className="mt-1 break-words text-lg font-semibold tabular-nums">
                    {formatCurrency(expense.amount)}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(expense.expenseDate)}</span>
                    <span className="break-words text-right">{expense.remarks ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/40 px-4 py-3 text-sm sm:px-5">
              <span className="text-muted-foreground">Page total</span>
              <span className="font-semibold tabular-nums text-foreground">{formatCurrency(total)}</span>
            </div>
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} expense={editingExpense} />

      <AlertDialog open={!!deletingExpense} onOpenChange={(open) => !open && setDeletingExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>This expense entry will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteExpense.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
