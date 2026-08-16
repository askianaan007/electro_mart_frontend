'use client';

import Link from 'next/link';
import { ArrowUpRight, Coins, Phone, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import type { AdminDashboardSummary } from '@/lib/api/types';

export function OutstandingPaymentsDialog({
  open,
  onOpenChange,
  dealers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealers: AdminDashboardSummary['outstandingByDealer'];
}) {
  const total = dealers.reduce((sum, d) => sum + Number(d.outstandingBalance), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Outstanding payments breakdown" className="sm:max-w-2xl rounded-3xl border border-border/60 bg-card/95 backdrop-blur-2xl p-6 shadow-2xl select-none overflow-hidden max-h-[90vh] flex flex-col">
        {/* Specular Shimmer Top Curve Overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-3xl bg-gradient-to-b from-white/20 via-white/5 to-transparent dark:from-white/10" />

        {/* Dialog Header */}
        <DialogHeader className="relative z-10 space-y-1 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-xs">
              <Coins className="size-4.5" />
            </div>
            <DialogTitle className="text-lg sm:text-xl font-extrabold tracking-tight">
              Outstanding Dealer Payments
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground font-medium">
            Detailed breakdown of unsettled accounts receivable grouped by dealer
          </DialogDescription>
        </DialogHeader>

        {/* Total Outstanding Hero Banner */}
        <div className="relative z-10 my-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 shadow-2xs">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Total Combined Receivables
            </p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {formatCurrency(total)}
            </p>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-background/60 px-3 py-1 text-xs font-extrabold text-foreground backdrop-blur-md">
              {dealers.length} {dealers.length === 1 ? 'Dealer' : 'Dealers'}
            </span>
          </div>
        </div>

        {/* Dealers Breakdown List */}
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto pr-1">
          {dealers.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-muted/40 p-8 text-center backdrop-blur-md">
              <p className="text-sm font-bold text-foreground">No Outstanding Payments</p>
              <p className="text-xs text-muted-foreground mt-1">All dealer accounts are currently fully settled.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
                <table className="w-full min-w-[550px] text-xs">
                  <thead className="bg-muted/60 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="px-4 py-3 text-left">Dealer / Owner</th>
                      <th className="px-4 py-3 text-left">Contact Phone</th>
                      <th className="px-4 py-3 text-right">Outstanding Amount</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {dealers.map((dealer) => (
                      <tr key={dealer.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 items-center justify-center rounded-full bg-muted border border-border/60 text-muted-foreground font-bold text-xs shrink-0">
                              {dealer.businessName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate text-xs sm:text-sm">
                                {dealer.businessName}
                              </p>
                              {dealer.ownerName && (
                                <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                  <User className="size-3 text-muted-foreground/70" />
                                  <span>{dealer.ownerName}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                          {dealer.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="size-3 text-muted-foreground/70" />
                              {dealer.phone}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-black text-amber-600 dark:text-amber-400">
                            {formatCurrency(dealer.outstandingBalance)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/dealers/${dealer.id}`}
                            onClick={() => onOpenChange(false)}
                            className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                          >
                            <span>Profile</span>
                            <ArrowUpRight className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="space-y-3 sm:hidden">
                {dealers.map((dealer) => (
                  <div
                    key={dealer.id}
                    className="rounded-2xl border border-border/60 bg-background/60 p-3.5 backdrop-blur-md space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-8 items-center justify-center rounded-full bg-muted border border-border/60 text-muted-foreground font-bold text-xs shrink-0">
                          {dealer.businessName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-foreground truncate">{dealer.businessName}</p>
                          {dealer.ownerName && (
                            <p className="text-[10px] text-muted-foreground">{dealer.ownerName}</p>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/admin/dealers/${dealer.id}`}
                        onClick={() => onOpenChange(false)}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary border border-primary/20 shrink-0"
                      >
                        <span>View</span>
                        <ArrowUpRight className="size-3" />
                      </Link>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                      {dealer.phone ? (
                        <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                          <Phone className="size-3 text-muted-foreground/70" />
                          {dealer.phone}
                        </span>
                      ) : (
                        <span />
                      )}

                      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-black text-amber-600 dark:text-amber-400">
                        {formatCurrency(dealer.outstandingBalance)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
