'use client';

import { useState } from 'react';
import { Loader2, MoreHorizontal, Plus, Search, TrendingUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { InvestorFormDialog } from '@/components/admin/investor-form-dialog';
import { InvestmentFormDialog } from '@/components/admin/investment-form-dialog';
import { useAllInvestors, useDeleteInvestor } from '@/hooks/use-investors';
import { useDeleteInvestment, useInvestments } from '@/hooks/use-investments';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Investment, Investor } from '@/lib/api/types';

export default function InvestmentsPage() {
  const [investorFormOpen, setInvestorFormOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | undefined>(undefined);
  const [deletingInvestor, setDeletingInvestor] = useState<Investor | null>(null);

  const [investmentFormOpen, setInvestmentFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | undefined>(undefined);
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null);

  const [investorSearch, setInvestorSearch] = useState('');
  const debouncedInvestorSearch = useDebouncedValue(investorSearch);

  const [investorFilter, setInvestorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'DEPOSIT' | 'WITHDRAWAL'>('all');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const debouncedLedgerSearch = useDebouncedValue(ledgerSearch);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const {
    data: investors,
    isLoading: investorsLoading,
    isError: investorsError,
    error: investorsErrorObj,
    refetch: refetchInvestors,
  } = useAllInvestors();
  const totalProfitShare = (investors?.data ?? []).reduce(
    (sum, investor) => sum + Number(investor.profitSharePercentage),
    0,
  );
  const filteredInvestors = (investors?.data ?? []).filter((investor) => {
    if (!debouncedInvestorSearch) return true;
    const term = debouncedInvestorSearch.toLowerCase();
    return (
      investor.name.toLowerCase().includes(term) ||
      investor.phone?.toLowerCase().includes(term) ||
      investor.email?.toLowerCase().includes(term)
    );
  });

  const ledgerFiltersActive = !!ledgerSearch || investorFilter !== 'all' || typeFilter !== 'all' || !!dateFrom || !!dateTo;

  const {
    data: investments,
    isLoading: investmentsLoading,
    isFetching: investmentsFetching,
    isError: investmentsError,
    error: investmentsErrorObj,
    refetch: refetchInvestments,
  } = useInvestments({
    page,
    limit: 20,
    investorId: investorFilter === 'all' ? undefined : investorFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
    search: debouncedLedgerSearch || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const deleteInvestor = useDeleteInvestor();
  const deleteInvestment = useDeleteInvestment();

  function confirmDeleteInvestor() {
    if (!deletingInvestor) return;
    deleteInvestor.mutate(deletingInvestor.id, {
      onSuccess: () => {
        toast.success('Investor deleted');
        setDeletingInvestor(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeletingInvestor(null);
      },
    });
  }

  function confirmDeleteInvestment() {
    if (!deletingInvestment) return;
    deleteInvestment.mutate(deletingInvestment.id, {
      onSuccess: () => {
        toast.success('Investment entry deleted');
        setDeletingInvestment(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeletingInvestment(null);
      },
    });
  }

  function clearLedgerFilters() {
    setLedgerSearch('');
    setInvestorFilter('all');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <TrendingUp className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Investments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage equity partners and their capital ledger</p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">Investors</h2>
            {!investorsLoading && investors && investors.data.length > 0 && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  totalProfitShare > 100
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                Profit share allocated: {totalProfitShare}% of 100%
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-56">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search investors..."
                value={investorSearch}
                onChange={(e) => setInvestorSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingInvestor(undefined);
                setInvestorFormOpen(true);
              }}
            >
              <Plus />
              Add Investor
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card">
          {investorsLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : investorsError ? (
            <QueryErrorState error={investorsErrorObj} onRetry={() => refetchInvestors()} />
          ) : !investors || investors.data.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No investors yet" description="Add an investor to start tracking equity" />
          ) : filteredInvestors.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching investors"
              description="Try a different search term"
              action={
                <Button variant="outline" size="sm" onClick={() => setInvestorSearch('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Share %</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvestors.map((investor) => (
                      <TableRow key={investor.id}>
                        <TableCell className="whitespace-normal break-words font-medium">{investor.name}</TableCell>
                        <TableCell className="whitespace-normal break-words">{investor.phone ?? '—'}</TableCell>
                        <TableCell className="whitespace-normal break-words">{investor.email ?? '—'}</TableCell>
                        <TableCell className="text-right">{Number(investor.profitSharePercentage)}%</TableCell>
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
                                  setEditingInvestor(investor);
                                  setInvestorFormOpen(true);
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => setDeletingInvestor(investor)}>
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
                {filteredInvestors.map((investor) => (
                  <div key={investor.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words font-medium">{investor.name}</p>
                        <p className="text-xs text-muted-foreground">{Number(investor.profitSharePercentage)}% share</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="-mr-2 -mt-1 shrink-0">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingInvestor(investor);
                              setInvestorFormOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeletingInvestor(investor)}>
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
                      <span>{investor.phone ?? '—'}</span>
                      <span className="break-words">{investor.email ?? '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">Investment Ledger</h2>
            {investmentsFetching && !investmentsLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingInvestment(undefined);
              setInvestmentFormOpen(true);
            }}
          >
            <Plus />
            Add Entry
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 sm:min-w-[12rem]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reason..."
              value={ledgerSearch}
              onChange={(e) => {
                setLedgerSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={investorFilter}
            onValueChange={(value) => {
              setInvestorFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="All investors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All investors</SelectItem>
              {investors?.data.map((investor) => (
                <SelectItem key={investor.id} value={investor.id}>
                  {investor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value as 'all' | 'DEPOSIT' | 'WITHDRAWAL');
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="DEPOSIT">Deposits</SelectItem>
              <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
            </SelectContent>
          </Select>
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
          {ledgerFiltersActive && (
            <Button variant="ghost" size="sm" onClick={clearLedgerFilters}>
              Clear filters
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card">
          {investmentsLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : investmentsError ? (
            <QueryErrorState error={investmentsErrorObj} onRetry={() => refetchInvestments()} />
          ) : !investments || investments.data.length === 0 ? (
            ledgerFiltersActive ? (
              <EmptyState
                icon={Search}
                title="No matching entries"
                description="Try adjusting or clearing your filters"
                action={
                  <Button variant="outline" size="sm" onClick={clearLedgerFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={TrendingUp} title="No investment entries" description="Record a contribution or withdrawal" />
            )
          ) : (
            <>
              <div className={cn('hidden sm:block', investmentsFetching && 'opacity-60 transition-opacity')}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Investor</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investments.data.map((investment) => (
                      <TableRow key={investment.id}>
                        <TableCell className="whitespace-normal break-words">{formatDate(investment.investmentDate)}</TableCell>
                        <TableCell className="whitespace-normal break-words font-medium">
                          {investment.investor?.name ?? '—'}
                        </TableCell>
                        <TableCell>{investment.mode.replace('_', ' ')}</TableCell>
                        <TableCell
                          className={cn(
                            'whitespace-normal break-words text-right font-medium',
                            Number(investment.amount) >= 0 ? 'text-success' : 'text-destructive',
                          )}
                        >
                          {Number(investment.amount) >= 0 ? '+' : ''}
                          {formatCurrency(investment.amount)}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words">{investment.reason}</TableCell>
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
                                  setEditingInvestment(investment);
                                  setInvestmentFormOpen(true);
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => setDeletingInvestment(investment)}>
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

              <div className={cn('space-y-3 p-4 sm:hidden', investmentsFetching && 'opacity-60 transition-opacity')}>
                {investments.data.map((investment) => (
                  <div key={investment.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words font-medium">{investment.investor?.name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{investment.mode.replace('_', ' ')}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="-mr-2 -mt-1 shrink-0">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingInvestment(investment);
                              setInvestmentFormOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeletingInvestment(investment)}>
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="mt-2 break-words text-sm">{investment.reason}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(investment.investmentDate)}</span>
                      <span
                        className={cn(
                          'shrink-0 break-words text-sm font-medium',
                          Number(investment.amount) >= 0 ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {Number(investment.amount) >= 0 ? '+' : ''}
                        {formatCurrency(investment.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <PaginationBar meta={investments.meta} onPageChange={setPage} />
            </>
          )}
        </div>
      </section>

      <InvestorFormDialog open={investorFormOpen} onOpenChange={setInvestorFormOpen} investor={editingInvestor} />
      <InvestmentFormDialog open={investmentFormOpen} onOpenChange={setInvestmentFormOpen} investment={editingInvestment} />

      <AlertDialog open={!!deletingInvestor} onOpenChange={(open) => !open && setDeletingInvestor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this investor?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deletingInvestor?.name}&quot; will be permanently removed. This only works if they have no
              investment history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteInvestor}
              disabled={deleteInvestor.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingInvestment} onOpenChange={(open) => !open && setDeletingInvestment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>This investment ledger entry will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteInvestment}
              disabled={deleteInvestment.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
