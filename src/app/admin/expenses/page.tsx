'use client';

import { useState } from 'react';
import { MoreHorizontal, Plus, Receipt, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
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
import { ExpenseFormDialog } from '@/components/admin/expense-form-dialog';
import { useDeleteExpense, useExpenses } from '@/hooks/use-expenses';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Expense } from '@/lib/api/types';

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
  const { data, isLoading } = useExpenses({
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Receipt className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Expenses</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Shared business expenses, split equally across investors.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus />
          Add Expense
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-auto"
          />
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
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
            <EmptyState icon={Receipt} title="No expenses recorded" description="Add a business expense to track it here" />
          )
        ) : (
          <>
            <div className="hidden sm:block">
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
                      <TableCell className="whitespace-normal break-words">{formatDate(expense.expenseDate)}</TableCell>
                      <TableCell className="whitespace-normal break-words font-medium">{expense.description}</TableCell>
                      <TableCell className="whitespace-normal break-words text-right">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-muted-foreground">
                        {expense.remarks ?? '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(expense)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setDeletingExpense(expense)}>
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
            </div>

            <div className="space-y-3 p-4 sm:hidden">
              {data.data.map((expense) => (
                <div key={expense.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words font-medium">{expense.description}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mr-2 -mt-1 shrink-0">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(expense)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeletingExpense(expense)}>
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="mt-1 break-words text-lg font-semibold">{formatCurrency(expense.amount)}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(expense.expenseDate)}</span>
                    <span className="break-words text-right">{expense.remarks ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end border-t border-border px-4 py-3 text-sm font-medium">
              Page total: {formatCurrency(total)}
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
