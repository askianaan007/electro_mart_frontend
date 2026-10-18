import { Badge, type BadgeProps } from '@/components/ui/badge';

const ORDER_STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  PENDING_APPROVAL: { label: 'Pending Approval', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  PACKED: { label: 'Packed', variant: 'info' },
  DELIVERED: { label: 'Delivered', variant: 'purple' },
  COMPLETED: { label: 'Completed', variant: 'success' },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  PAID: { label: 'Paid', variant: 'success' },
  PENDING: { label: 'Pending', variant: 'muted' },
  PARTIAL: { label: 'Partial', variant: 'warning' },
  OVERDUE: { label: 'Overdue', variant: 'destructive' },
};

const ACCOUNT_STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  INACTIVE: { label: 'Inactive', variant: 'muted' },
};

const STOCK_STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  IN_STOCK: { label: 'In Stock', variant: 'success' },
  OUT_OF_STOCK: { label: 'Out of Stock', variant: 'destructive' },
};

const CHEQUE_STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  CLEARED: { label: 'Cleared', variant: 'success' },
  RETURNED: { label: 'Returned', variant: 'destructive' },
};

const REPRESENTATIVE_STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  SUSPENDED: { label: 'Suspended', variant: 'warning' },
  BLOCKED: { label: 'Blocked', variant: 'destructive' },
  INACTIVE: { label: 'Inactive', variant: 'muted' },
};

const SETTLEMENT_STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  PENDING: { label: 'Pending', variant: 'muted' },
  APPROVED: { label: 'Approved', variant: 'info' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  PAID: { label: 'Paid', variant: 'success' },
};

const COLLECTION_STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  PENDING_VERIFICATION: { label: 'Pending Verification', variant: 'warning' },
  CONFIRMED: { label: 'Confirmed', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
};

const COMMISSION_LINE_STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  PENDING: { label: 'Pending', variant: 'muted' },
  APPROVED: { label: 'Approved', variant: 'info' },
  SETTLED: { label: 'Settled', variant: 'success' },
  REVERSED: { label: 'Reversed', variant: 'destructive' },
};

function humanize(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function StatusBadge({
  status,
  map,
  className,
}: {
  status: string;
  map: Record<string, { label: string; variant: BadgeProps['variant'] }>;
  className?: string;
}) {
  const entry = map[status] ?? { label: humanize(status), variant: 'outline' as const };
  return (
    <Badge variant={entry.variant} className={className}>
      <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {entry.label}
    </Badge>
  );
}

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge status={status} map={ORDER_STATUS_MAP} className={className} />;
}

export function PaymentStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge status={status} map={PAYMENT_STATUS_MAP} className={className} />;
}

export function AccountStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge status={status} map={ACCOUNT_STATUS_MAP} className={className} />;
}

export function StockStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge status={status} map={STOCK_STATUS_MAP} className={className} />;
}

export function ChequeStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge status={status} map={CHEQUE_STATUS_MAP} className={className} />;
}

export function RepresentativeStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge status={status} map={REPRESENTATIVE_STATUS_MAP} className={className} />;
}

export function SettlementStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge status={status} map={SETTLEMENT_STATUS_MAP} className={className} />;
}

export function CollectionStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge status={status} map={COLLECTION_STATUS_MAP} className={className} />;
}

export function CommissionLineStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge status={status} map={COMMISSION_LINE_STATUS_MAP} className={className} />;
}
