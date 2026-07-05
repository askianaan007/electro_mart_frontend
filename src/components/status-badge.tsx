import { Badge, type BadgeProps } from '@/components/ui/badge';

const ORDER_STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  PENDING_APPROVAL: { label: 'Pending Approval', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  PACKED: { label: 'Packed', variant: 'outline' },
  DELIVERED: { label: 'Delivered', variant: 'secondary' },
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

function StatusBadge({
  status,
  map,
  className,
}: {
  status: string;
  map: Record<string, { label: string; variant: BadgeProps['variant'] }>;
  className?: string;
}) {
  const entry = map[status] ?? { label: status, variant: 'outline' as const };
  return (
    <Badge variant={entry.variant} className={className}>
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
