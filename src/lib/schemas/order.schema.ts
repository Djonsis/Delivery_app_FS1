import { z } from 'zod';
import { PortableNumber } from './schema-helpers';

export const DbOrderSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid().nullable(),
    customer_name: z.string().min(1),
    total_amount: PortableNumber.refine(val => val >= 0),
    status: z.string().min(1),
    cancellation_reason: z.string().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export type DbOrder = z.infer<typeof DbOrderSchema>;