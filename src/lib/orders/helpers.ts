import { validateDbRow } from '@/lib/utils/validate-db-row';
import { DbOrderSchema } from '@/lib/schemas/order.schema';
import { Order, OrderStatus, CancellationReason } from '@/lib/types';
import { normalizeDbDate } from '@/lib/db/utils/normalize-db-date';

export function mapDbRowToOrder(row: unknown): Order {
  const validated = validateDbRow(row, DbOrderSchema, 'mapDbRowToOrder');

  return {
    id: validated.id,
    user_id: validated.user_id,
    customer_name: validated.customer_name,
    total_amount: validated.total_amount,
    status: validated.status as OrderStatus,
    cancellation_reason: validated.cancellation_reason as CancellationReason | null,

    created_at: normalizeDbDate(validated.created_at),
    updated_at: normalizeDbDate(validated.updated_at),
  };
}
