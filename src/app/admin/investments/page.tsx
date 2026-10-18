'use client';

import { useState } from 'react';
import { FileText, MoreHorizontal, Plus, Search, TrendingUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { TableSkeleton } from '@/components/loading-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { InvestorStatementDialog } from '@/components/admin/investor-statement-dialog';
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
  const [statementInvestor, setStatementInvestor] = useState<Investor | null>(null);

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

  const ledgerFiltersActive =
    !!ledgerSearch || investorFilter !== 'all' || typeFilter !== 'all' || !!dateFrom || !!dateTo;

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

  const investorActions = (investor: Investor, className?: string) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-8', className)}
          aria-label={`Actions for ${investor.name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setStatementInvestor(investor)}>
          <FileText />
          Statement
        </DropdownMenuItem>
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
  );

  const investmentActions = (investment: Investment, className?: string) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('size-8', className)} aria-label="Entry actions">
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
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investments"
        description="Manage equity partners and their capital ledger."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setEditingInvestor(undefined);
                setInvestorFormOpen(true);
              }}
            >
              <Plus />
              Add Investor
            </Button>
            <Button
              onClick={() => {
                setEditingInvestment(undefined);
                setInvestmentFormOpen(true);
              }}
            >
              <Plus />
              Add Entry
            </Button>
          </>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader
          title="Investors"
          description="Equity partners and their profit-share allocation"
          className="pb-3"
          actions={
            !investorsLoading && investors && investors.data.length > 0 ? (
              <Badge variant={totalProfitShare > 100 ? 'destructive' : 'muted'} className="tabular-nums">
                Profit share allocated: {totalProfitShare}% of 100%
              </Badge>
            ) : undefined
          }
        />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search investors..."
              value={investorSearch}
              onChange={(e) => setInvestorSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </FilterBar>
        {investorsLoading ? (
          <TableSkeleton rows={3} />
        ) : investorsError ? (
          <QueryErrorState error={investorsErrorObj} onRetry={() => refetchInvestors()} />
        ) : !investors || investors.data.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No investors yet"
            description="Add an investor to start tracking equity"
          />
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
                      <TableCell className="whitespace-normal break-words text-muted-foreground">
                        {investor.phone ?? '—'}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-muted-foreground">
                        {investor.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {Number(investor.profitSharePercentage)}%
                      </TableCell>
                      <TableCell className="text-right">{investorActions(investor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 p-4 sm:hidden">
              {filteredInvestors.map((investor) => (
                <div key={investor.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{investor.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {Number(investor.profitSharePercentage)}% share
                      </p>
                    </div>
                    {investorActions(investor, '-mr-2 -mt-1 shrink-0')}
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

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader
          title="Investment Ledger"
          description="Capital contributions and withdrawals"
          isFetching={investmentsFetching && !investmentsLoading}
          className="pb-3"
        />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-[14rem]">
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
          <div className="flex items-center gap-2">
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
          </div>
          {ledgerFiltersActive && (
            <Button variant="ghost" size="sm" onClick={clearLedgerFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

        {investmentsLoading ? (
          <TableSkeleton rows={6} />
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
            <EmptyState
              icon={TrendingUp}
              title="No investment entries"
              description="Record a contribution or withdrawal"
            />
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
                      <TableCell className="whitespace-normal break-words tabular-nums text-muted-foreground">
                        {formatDate(investment.investmentDate)}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words font-medium">
                        {investment.investor?.name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{investment.mode.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium tabular-nums',
                          Number(investment.amount) >= 0 ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {Number(investment.amount) >= 0 ? '+' : ''}
                        {formatCurrency(investment.amount)}
                      </TableCell>
                      <TableCell className="min-w-[12rem] whitespace-normal break-words">{investment.reason}</TableCell>
                      <TableCell className="text-right">{investmentActions(investment)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className={cn('space-y-3 p-4 sm:hidden', investmentsFetching && 'opacity-60 transition-opacity')}>
              {investments.data.map((investment) => (
                <div key={investment.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{investment.investor?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{investment.mode.replace('_', ' ')}</p>
                    </div>
                    {investmentActions(investment, '-mr-2 -mt-1 shrink-0')}
                  </div>
                  <p className="mt-2 break-words text-sm">{investment.reason}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{formatDate(investment.investmentDate)}</span>
                    <span
                      className={cn(
                        'shrink-0 break-words text-sm font-medium tabular-nums',
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

      <InvestorFormDialog open={investorFormOpen} onOpenChange={setInvestorFormOpen} investor={editingInvestor} />
      <InvestorStatementDialog
        open={!!statementInvestor}
        onOpenChange={(open) => !open && setStatementInvestor(null)}
        investor={statementInvestor}
      />
      <InvestmentFormDialog
        open={investmentFormOpen}
        onOpenChange={setInvestmentFormOpen}
        investment={editingInvestment}
      />

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
              className={buttonVariants({ variant: 'destructive' })}
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
