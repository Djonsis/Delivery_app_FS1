
import { z, ZodError } from 'zod';
import { serverLogger } from '../server-logger';

const validatorLogger = serverLogger.withCategory('DB_VALIDATOR');

export class DbValidationError extends Error {
    constructor(
        public readonly context: string,
        public readonly zodError: ZodError,
        public readonly rawData: unknown
    ) {
        super(`Database validation failed for ${context}`);
        this.name = 'DbValidationError';
    }
}

/**
 * Validates a single database row against a Zod schema.
 * Throws a detailed DbValidationError on failure.
 * 
 * @param row The raw row from the database (e.g., from node-postgres).
 * @param schema The Zod schema to validate against.
 * @param context A string describing the validation context (e.g., 'products.service:mapDbProductToProduct').
 * @returns The validated and transformed data, matching the schema's inferred type.
 * @throws {DbValidationError} If validation fails.
 */
export function validateDbRow<T>(row: unknown, schema: z.ZodSchema<T>, context: string): T {
    const result = schema.safeParse(row);

    if (result.success) {
        return result.data;
    }

    validatorLogger.error(
        `Validation failed for ${context}`,
        {
            errors: result.error.errors,
            rawData: row,
        }
    );
    
    throw new DbValidationError(context, result.error, row);
}
