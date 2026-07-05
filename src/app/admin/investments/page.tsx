'use client';

import { useState } from 'react';
import { MoreHorizontal, Plus, TrendingUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
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

  const [investorFilter, setInvestorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'DEPOSIT' | 'WITHDRAWAL'>('all');
  const [page, setPage] = useState(1);

  const { data: investors, isLoading: investorsLoading } = useAllInvestors();
  const { data: investments, isLoading: investmentsLoading } = useInvestments({
    page,
    limit: 20,
    investorId: investorFilter === 'all' ? undefined : investorFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Investments</h1>
        <p className="text-sm text-muted-foreground">Manage equity partners and their capital ledger</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Investors</h2>
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
        <div className="rounded-xl border border-border bg-card">
          {investorsLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !investors || investors.data.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No investors yet" description="Add an investor to start tracking equity" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="text-right">Share %</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {investors.data.map((investor) => (
                  <TableRow key={investor.id}>
                    <TableCell className="font-medium">{investor.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{investor.phone ?? '—'}</TableCell>
                    <TableCell className="hidden md:table-cell">{investor.email ?? '—'}</TableCell>
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
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-medium">Investment Ledger</h2>
          <div className="flex items-center gap-2">
            <Select
              value={investorFilter}
              onValueChange={(value) => {
                setInvestorFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48">
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
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="DEPOSIT">Deposits</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
              </SelectContent>
            </Select>
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
        </div>

        <div className="rounded-xl border border-border bg-card">
          {investmentsLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !investments || investments.data.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No investment entries" description="Record a contribution or withdrawal" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Reason</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments.data.map((investment) => (
                    <TableRow key={investment.id}>
                      <TableCell>{formatDate(investment.investmentDate)}</TableCell>
                      <TableCell className="font-medium">{investment.investor?.name ?? '—'}</TableCell>
                      <TableCell>{investment.mode.replace('_', ' ')}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium',
                          Number(investment.amount) >= 0 ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {Number(investment.amount) >= 0 ? '+' : ''}
                        {formatCurrency(investment.amount)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{investment.reason}</TableCell>
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
