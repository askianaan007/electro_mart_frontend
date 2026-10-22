'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  Ban,
  CheckCircle2,
  ClipboardCopy,
  History,
  Hourglass,
  Package,
  PencilLine,
  Receipt,
  Repeat,
  ShieldCheck,
  StickyNote,
  Trash2,
  Truck,
  Undo2,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PageHeader } from '@/components/page-header';
import { PageSkeleton } from '@/components/loading-state';
import { QueryErrorState } from '@/components/query-error-state';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/status-badge';
import { UnitStatusBadge } from '@/components/scan/unit-status-badge';
import {
  ConditionDialog,
  CorrectSerialDialog,
  NotesDialog,
  SupplierReplacementDialog,
  WarrantyDialog,
  WarrantySwapDialog,
} from '@/components/scan/unit-action-dialogs';
import { StockAdjustmentDialog } from '@/components/admin/stock-adjustment-dialog';
import { useProductUnit, useRemoveUnit } from '@/hooks/use-product-units';
import { getErrorMessage } from '@/lib/api/error';
import type { UnitTone } from '@/lib/api/types';
import { UNIT_EVENT_LABEL, UNIT_STATUS_LABEL } from '@/lib/serial';
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

const TONE_CLASS: Record<UnitTone, string> = {
  success: 'border-success/30 bg-success/5',
  info: 'border-info/30 bg-info/5',
  warning: 'border-warning/40 bg-warning/10',
  purple: 'border-purple/30 bg-purple/5',
  muted: 'border-border bg-muted/40',
};

const TONE_DOT: Record<UnitTone, string> = {
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  purple: 'bg-purple',
  muted: 'bg-muted-foreground',
};

type ActionKey = 'correct' | 'warranty' | 'notes' | 'condition' | 'swap' | 'replacement' | 'writeoff' | 'delete';

/** One labelled line inside a section card. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-1.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs text-muted-foreground sm:text-[13px]">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function money(value: string | null | undefined) {
  return value == null ? '—' : formatCurrency(value);
}

export default function UnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useProductUnit(id);
  const [action, setAction] = useState<ActionKey | null>(null);
  const removeUnit = useRemoveUnit();

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Serial unit" onBack={() => router.back()} />
        <Card>
          <QueryErrorState error={error} onRetry={() => refetch()} />
        </Card>
      </div>
    );
  }
  if (isLoading || !data) return <PageSkeleton cards={3} />;

  const { unit, statusSummary, warranty, currentSale } = data;
  const product = unit.product;
  const neverOnOrder = !data.timeline.some((e) => e.type === 'ASSIGNED_TO_ORDER');
  const inStock = unit.status === 'IN_STOCK';
  const onOrder = (unit.status === 'SOLD' || unit.status === 'ALLOCATED') && !!unit.orderId;
  const awaitingReplacement = unit.status === 'RETURNED_TO_SUPPLIER' && !unit.replacedBy;
  const close = (open: boolean) => !open && setAction(null);

  function copyLink() {
    try {
      void navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  }

  function confirmDelete() {
    removeUnit.mutate(unit.id, {
      onSuccess: () => {
        toast.success('Serial removed');
        router.push('/admin/units');
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
        setAction(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="font-mono">{unit.serialNumber}</span>}
        onBack={() => router.back()}
        meta={<UnitStatusBadge status={unit.status} condition={unit.condition} />}
        description={product.name}
        actions={
          // K. Actions — only what the current status allows (the server re-checks every rule).
          <div className="flex flex-wrap gap-2">
            {onOrder && (
              <Button variant="outline" onClick={() => setAction('swap')}>
                <Repeat />
                Warranty swap
              </Button>
            )}
            {awaitingReplacement && (
              <Button variant="outline" onClick={() => setAction('replacement')}>
                <Truck />
                Register supplier replacement
              </Button>
            )}
            {inStock && (
              <Button variant="outline" onClick={() => setAction('condition')}>
                {unit.condition === 'GOOD' ? <Wrench /> : <CheckCircle2 />}
                {unit.condition === 'GOOD' ? 'Mark defective' : 'Mark good'}
              </Button>
            )}
            {inStock && (
              <Button variant="outline" onClick={() => setAction('writeoff')}>
                <Ban />
                Write off
              </Button>
            )}
            {inStock && neverOnOrder && (
              <Button variant="outline" onClick={() => setAction('correct')}>
                <PencilLine />
                Correct serial
              </Button>
            )}
            <Button variant="outline" onClick={() => setAction('notes')}>
              <StickyNote />
              Notes
            </Button>
            <Button variant="ghost" onClick={copyLink}>
              <ClipboardCopy />
              Copy link
            </Button>
            {inStock && neverOnOrder && (
              <Button
                variant="outline"
                onClick={() => setAction('delete')}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 />
                Remove
              </Button>
            )}
          </div>
        }
      />

      {/* A. Status header */}
      <div className={cn('rounded-xl border p-4 sm:p-5', TONE_CLASS[statusSummary.tone])}>
        <div className="flex items-start gap-3">
          <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', TONE_DOT[statusSummary.tone])} />
          <div className="min-w-0 space-y-1">
            <p className="text-lg font-semibold text-foreground">{statusSummary.headline}</p>
            <p className="text-sm text-muted-foreground">{statusSummary.subline}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <UnitStatusBadge status={unit.status} />
              <Badge variant={unit.condition === 'GOOD' ? 'success' : 'warning'}>
                {unit.condition === 'GOOD' ? 'Good' : 'Defective'}
              </Badge>
              <Badge
                variant={
                  warranty.state === 'VALID' ? 'success' : warranty.state === 'EXPIRED' ? 'destructive' : 'muted'
                }
              >
                {warranty.state === 'VALID'
                  ? `Warranty valid · ${warranty.daysLeft} day(s) left`
                  : warranty.state === 'EXPIRED'
                    ? 'Warranty expired'
                    : 'Warranty not set'}
              </Badge>
              {warranty.manual && <Badge variant="outline">Warranty edited by hand</Badge>}
            </div>
          </div>
        </div>
        {unit.notes && (
          <p className="mt-3 border-t border-border/60 pt-3 text-sm text-foreground">Note: {unit.notes}</p>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* B. Product */}
        <Section title="Product" icon={Package}>
          <div className="flex gap-4">
            {(product.images?.[0]?.url ?? product.imageUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images?.[0]?.url ?? product.imageUrl ?? ''}
                alt=""
                className="size-20 shrink-0 rounded-lg border border-border object-cover"
              />
            )}
            <dl className="min-w-0 flex-1">
              <Row label="Name">{product.name}</Row>
              <Row label="Code">
                <span className="font-mono">{product.productCode}</span>
              </Row>
              {product.brand && <Row label="Brand">{product.brand}</Row>}
              {product.model && <Row label="Model">{product.model}</Row>}
              {product.category && <Row label="Category">{product.category}</Row>}
              <Row label="Warranty terms">
                {[product.warranty, warranty.months ? `${warranty.months} months` : null].filter(Boolean).join(' · ') ||
                  '—'}
              </Row>
            </dl>
          </div>
        </Section>

        {/* C. Received from */}
        <Section title="Received from" icon={Truck}>
          <dl>
            {unit.purchase ? (
              <>
                <Row label="Purchase">
                  <Link href={`/admin/purchases/${unit.purchase.id}`} className="text-primary hover:underline">
                    {unit.purchase.invoiceNumber}
                  </Link>{' '}
                  · {formatDate(unit.purchase.purchaseDate)}
                </Row>
                <Row label="Supplier">
                  <Link href={`/admin/suppliers/${unit.purchase.supplier.id}`} className="text-primary hover:underline">
                    {unit.purchase.supplier.name}
                  </Link>
                  {unit.purchase.supplier.phone ? ` · ${unit.purchase.supplier.phone}` : ''}
                </Row>
                <Row label="Unit cost">
                  {money(
                    unit.purchase.items?.find((i) => i.productId === unit.productId)?.unitCost ??
                      data.timeline.find((e) => e.type === 'REGISTERED')?.amount,
                  )}
                </Row>
              </>
            ) : unit.source === 'REPLACEMENT' ? (
              <Row label="Supplier replacement">
                for{' '}
                {unit.replacesUnit ? (
                  <Link
                    href={`/admin/units/${unit.replacesUnit.id}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {unit.replacesUnit.serialNumber}
                  </Link>
                ) : (
                  'a returned unit'
                )}
                {unit.replacement && ` · ${unit.replacement.replacementNumber}`}
              </Row>
            ) : (
              <Row label="Source">Registered from existing stock</Row>
            )}
            <Row label="Received">{formatDate(unit.receivedAt)}</Row>
            <Row label="Registered by">
              {unit.createdByAdminName ?? '—'} · {formatDateTime(unit.createdAt)}
            </Row>
          </dl>
        </Section>
      </div>

      {/* D. Current sale */}
      {currentSale && (
        <Section
          title={unit.status === 'ALLOCATED' ? 'Allocated to order' : 'Current sale'}
          icon={Receipt}
          actions={
            unit.status === 'SOLD' ? (
              <Button size="sm" variant="outline" onClick={() => setAction('warranty')}>
                <ShieldCheck />
                Edit warranty
              </Button>
            ) : undefined
          }
        >
          <div className="grid gap-x-8 lg:grid-cols-2">
            <dl>
              <Row label="Order">
                <span className="inline-flex flex-wrap items-center gap-2">
                  <Link href={`/admin/orders/${currentSale.order.id}`} className="text-primary hover:underline">
                    {currentSale.order.orderNumber}
                  </Link>
                  <OrderStatusBadge status={currentSale.order.status} />
                </span>
              </Row>
              {currentSale.invoice && (
                <Row label="Invoice">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <Link href={`/admin/invoices/${currentSale.invoice.id}`} className="text-primary hover:underline">
                      {currentSale.invoice.invoiceNumber}
                    </Link>
                    <PaymentStatusBadge status={currentSale.invoice.paymentStatus} />
                  </span>
                </Row>
              )}
              <Row label="Sale price (this unit)">{money(currentSale.netUnitPrice)}</Row>
              {currentSale.order.deliveredAt && (
                <Row label="Delivered">{formatDate(currentSale.order.deliveredAt)}</Row>
              )}
              {currentSale.order.completedAt && (
                <Row label="Completed">{formatDate(currentSale.order.completedAt)}</Row>
              )}
            </dl>
            <dl>
              <Row label="Buyer">
                <Link href={`/admin/dealers/${currentSale.dealer.id}`} className="text-primary hover:underline">
                  {currentSale.dealer.businessName}
                </Link>
              </Row>
              {currentSale.dealer.ownerName && <Row label="Owner">{currentSale.dealer.ownerName}</Row>}
              {currentSale.dealer.phone && <Row label="Phone">{currentSale.dealer.phone}</Row>}
              {currentSale.dealer.address && <Row label="Address">{currentSale.dealer.address}</Row>}
              {currentSale.rep && (
                <Row label="Representative">
                  {currentSale.rep.name}
                  {currentSale.rep.phone ? ` · ${currentSale.rep.phone}` : ''}
                </Row>
              )}
              <Row label="Warranty">
                {warranty.startsAt ? `${formatDate(warranty.startsAt)} → ` : ''}
                {warranty.expiresAt ? formatDate(warranty.expiresAt) : 'not set'}
                {warranty.daysLeft !== null && warranty.daysLeft >= 0 ? ` · ${warranty.daysLeft} day(s) left` : ''}
              </Row>
            </dl>
          </div>
        </Section>
      )}

      {/* E. Customer returns */}
      {data.customerReturns.length > 0 && (
        <Section title={`Customer returns (${data.customerReturns.length})`} icon={Undo2}>
          <div className="space-y-3">
            {data.customerReturns.map((r) => (
              <div
                key={r.eventId}
                className={cn(
                  'rounded-lg border p-3',
                  r.reversed ? 'border-dashed border-border opacity-70' : 'border-border',
                )}
              >
                <p className="text-sm font-medium text-foreground">
                  ↩ {r.returnNumber ?? 'Return'} · {formatDate(r.returnDate)} · from {r.dealer.businessName ?? '—'}
                  {r.order && (
                    <>
                      {' '}
                      (
                      <Link href={`/admin/orders/${r.order.id}`} className="text-primary hover:underline">
                        {r.order.orderNumber}
                      </Link>
                      {r.order.invoice && ` / ${r.order.invoice.invoiceNumber}`})
                    </>
                  )}
                  {r.reversed && (
                    <Badge variant="muted" className="ml-2">
                      Reversed
                    </Badge>
                  )}
                  {r.documentDeleted && (
                    <Badge variant="muted" className="ml-2">
                      Document deleted
                    </Badge>
                  )}
                </p>
                <dl className="mt-1">
                  <Row label="Reason (on the return)">
                    {r.reasonNow ?? r.reasonAtTime ?? '—'}
                    {r.reasonEdited && (
                      <span className="text-muted-foreground"> (originally: &ldquo;{r.reasonAtTime}&rdquo;)</span>
                    )}
                  </Row>
                  <Row label="This unit">
                    {r.condition === 'DEFECTIVE' ? 'Defective' : 'Good'}
                    {r.faultNote ? ` — “${r.faultNote}”` : ''}
                  </Row>
                  <Row label="Credited for this unit">{money(r.creditedAmount)}</Row>
                  <Row label="Recorded by">
                    {r.recordedBy} · {formatDateTime(r.recordedAt)}
                  </Row>
                  {r.next && (
                    <Row label="Then">
                      {UNIT_EVENT_LABEL[r.next.type] ?? r.next.type}
                      {r.next.documentRef ? ` · ${r.next.documentRef}` : ''} · {formatDate(r.next.eventDate)}
                    </Row>
                  )}
                </dl>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* F. Returns to supplier */}
      {data.supplierReturns.length > 0 && (
        <Section title={`Returns to supplier (${data.supplierReturns.length})`} icon={ArrowLeftRight}>
          <div className="space-y-3">
            {data.supplierReturns.map((r) => (
              <div
                key={r.eventId}
                className={cn(
                  'rounded-lg border p-3',
                  r.reversed ? 'border-dashed border-border opacity-70' : 'border-border',
                )}
              >
                <p className="text-sm font-medium text-foreground">
                  ↪ {r.returnNumber ?? 'Return'} · {formatDate(r.returnDate)} · to{' '}
                  {r.supplier.id ? (
                    <Link href={`/admin/suppliers/${r.supplier.id}`} className="text-primary hover:underline">
                      {r.supplier.name}
                    </Link>
                  ) : (
                    (r.supplier.name ?? '—')
                  )}
                  {r.purchase && (
                    <>
                      {' '}
                      (linked to{' '}
                      <Link href={`/admin/purchases/${r.purchase.id}`} className="text-primary hover:underline">
                        {r.purchase.invoiceNumber}
                      </Link>
                      )
                    </>
                  )}
                  {r.isCancellation && (
                    <Badge variant="purple" className="ml-2">
                      Purchase cancelled
                    </Badge>
                  )}
                  {r.reversed && (
                    <Badge variant="muted" className="ml-2">
                      Reversed
                    </Badge>
                  )}
                  {r.documentDeleted && (
                    <Badge variant="muted" className="ml-2">
                      Document deleted
                    </Badge>
                  )}
                </p>
                <dl className="mt-1">
                  <Row label="Reason (on the return)">
                    {r.isCancellation && r.purchase?.cancelReason
                      ? r.purchase.cancelReason
                      : (r.reasonNow ?? r.reasonAtTime ?? '—')}
                    {r.reasonEdited && (
                      <span className="text-muted-foreground"> (originally: &ldquo;{r.reasonAtTime}&rdquo;)</span>
                    )}
                  </Row>
                  <Row label="This unit">
                    {r.condition === 'DEFECTIVE' ? 'Defective' : 'Good'}
                    {r.unitCost ? `, unit cost ${formatCurrency(r.unitCost)}` : ''}
                  </Row>
                  {r.replacement && (
                    <Row label="Replacement">
                      {r.replacement.state === 'RECEIVED' ? (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <CheckCircle2 className="size-4 text-success" />
                          <Link
                            href={`/admin/units/${r.replacement.unit.id}`}
                            className="font-mono text-primary hover:underline"
                          >
                            {r.replacement.unit.serialNumber}
                          </Link>
                          received {formatDate(r.replacement.unit.receivedAt)} ·{' '}
                          {UNIT_STATUS_LABEL[r.replacement.unit.status]}
                        </span>
                      ) : (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <Hourglass className="size-4 text-warning" />
                          Awaiting · {r.replacement.days} day(s)
                          {awaitingReplacement && (
                            <Button size="sm" variant="link" onClick={() => setAction('replacement')}>
                              Register supplier replacement
                            </Button>
                          )}
                        </span>
                      )}
                    </Row>
                  )}
                  <Row label="Recorded by">
                    {r.recordedBy} · {formatDateTime(r.recordedAt)}
                  </Row>
                </dl>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* G. Warranty swaps */}
      {data.swaps.length > 0 && (
        <Section title="Warranty swaps" icon={Repeat}>
          <ul className="space-y-2 text-sm">
            {data.swaps.map((swap, index) => (
              <li key={index} className="rounded-lg border border-border p-3">
                <p className="font-medium text-foreground">
                  {swap.type === 'WARRANTY_SWAP_OUT' ? 'Swapped out' : 'Given as a replacement'} ·{' '}
                  {formatDate(swap.eventDate)}
                  {swap.partyName ? ` · ${swap.partyName}` : ''}
                  {swap.documentRef ? ` · ${swap.documentRef}` : ''}
                </p>
                <p className="text-muted-foreground">
                  {swap.reason ? `“${swap.reason}”` : ''}
                  {swap.faultNote ? ` · fault: ${swap.faultNote}` : ''}
                  {swap.details ? ` · ${swap.details}` : ''} · by {swap.recordedBy}
                </p>
              </li>
            ))}
          </ul>
          {unit.replacesUnit && (
            <p className="mt-3 text-sm text-muted-foreground">
              This unit replaces{' '}
              <Link href={`/admin/units/${unit.replacesUnit.id}`} className="font-mono text-primary hover:underline">
                {unit.replacesUnit.serialNumber}
              </Link>
              .
            </p>
          )}
          {unit.replacedBy && (
            <p className="mt-1 text-sm text-muted-foreground">
              Replaced by{' '}
              <Link href={`/admin/units/${unit.replacedBy.id}`} className="font-mono text-primary hover:underline">
                {unit.replacedBy.serialNumber}
              </Link>
              .
            </p>
          )}
        </Section>
      )}

      {/* H. Write-off */}
      {data.writeOff && (
        <Section title="Write-off" icon={Ban}>
          <dl>
            <Row label="Date">{formatDate(data.writeOff.eventDate)}</Row>
            <Row label="Reason">{data.writeOff.reason ?? '—'}</Row>
            <Row label="Recorded by">{data.writeOff.recordedBy}</Row>
          </dl>
        </Section>
      )}

      {/* I. Previous sales */}
      {data.previousSales.length > 0 && (
        <Section title="Previous sales" icon={History}>
          <ul className="divide-y divide-border text-sm">
            {data.previousSales.map((sale, index) => (
              <li key={index} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {sale.orderId ? (
                    <Link href={`/admin/orders/${sale.orderId}`} className="text-primary hover:underline">
                      {sale.documentRef ?? 'Order'}
                    </Link>
                  ) : (
                    (sale.documentRef ?? 'Order')
                  )}{' '}
                  · {sale.partyName ?? '—'}
                </span>
                <span className="text-muted-foreground">
                  {formatDate(sale.eventDate)} · {money(sale.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* J. Full timeline */}
      <Section title="Full history" icon={History}>
        <ol className="relative space-y-4 border-l border-border pl-5">
          {data.timeline.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-card bg-primary" />
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-medium text-foreground">{UNIT_EVENT_LABEL[event.type] ?? event.type}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {[
                  event.documentRef,
                  event.partyName,
                  event.reason && `“${event.reason}”`,
                  event.faultNote && `fault: ${event.faultNote}`,
                  event.details,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="text-[11px] text-muted-foreground">
                → {UNIT_STATUS_LABEL[event.statusAfter]} · {event.conditionAfter === 'GOOD' ? 'good' : 'defective'} · by{' '}
                {event.adminName}
                {event.eventDate.slice(0, 10) !== event.createdAt.slice(0, 10) &&
                  ` · dated ${formatDate(event.eventDate)}`}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <CorrectSerialDialog unit={unit} open={action === 'correct'} onOpenChange={close} />
      <WarrantyDialog unit={unit} open={action === 'warranty'} onOpenChange={close} />
      <NotesDialog unit={unit} open={action === 'notes'} onOpenChange={close} />
      <ConditionDialog unit={unit} open={action === 'condition'} onOpenChange={close} />
      <WarrantySwapDialog unit={unit} open={action === 'swap'} onOpenChange={close} />
      <SupplierReplacementDialog unit={unit} open={action === 'replacement'} onOpenChange={close} />
      <StockAdjustmentDialog
        open={action === 'writeoff'}
        onOpenChange={close}
        defaultProductId={unit.productId}
        defaultDirection="OUT"
        defaultSerials={writeOffSerials(unit.serialNumber)}
      />

      <AlertDialog open={action === 'delete'} onOpenChange={close}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove serial {unit.serialNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              Only for a serial registered by mistake. The physical unit stays in stock without a serial; the removal is
              kept in the activity log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={removeUnit.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Remove serial
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Stable array per serial so the dialog's prefill effect doesn't loop.
const writeOffCache = new Map<string, string[]>();
function writeOffSerials(serial: string) {
  let list = writeOffCache.get(serial);
  if (!list) {
    list = [serial];
    writeOffCache.set(serial, list);
  }
  return list;
}
