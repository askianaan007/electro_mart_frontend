import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { ProductUnitCondition, ProductUnitStatus } from '@/lib/api/types';
import { UNIT_STATUS_LABEL } from '@/lib/serial';

const VARIANT: Record<ProductUnitStatus, BadgeProps['variant']> = {
  IN_STOCK: 'success',
  ALLOCATED: 'info',
  SOLD: 'default',
  RETURNED_TO_SUPPLIER: 'purple',
  WRITTEN_OFF: 'muted',
};

export function UnitStatusBadge({
  status,
  condition,
  className,
}: {
  status: ProductUnitStatus;
  condition?: ProductUnitCondition;
  className?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Badge variant={VARIANT[status]} className={className}>
        {UNIT_STATUS_LABEL[status] ?? status}
      </Badge>
      {condition === 'DEFECTIVE' && <Badge variant="warning">Defective</Badge>}
    </span>
  );
}
