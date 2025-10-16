import { z, ZodError } from 'zod';
import { serverLogger } from '../server-logger';

const validatorLogger = serverLogger.withCategory('DB_VALIDATOR');

/**
 * Custom error class for database validation failures
 * 
 * Contains:
 * - tableName: Which table the data came from
 * - zodError: Detailed validation errors from Zod
 * - rawData: The invalid data (for debugging)
 */
export class DbValidationError extends Error {
    constructor(
        public readonly tableName: string,
        public readonly zodError: ZodError,
        public readonly rawData: unknown
    ) {
        const errorSummary = zodError.errors
            .map(err => `${err.path.join('.')}: ${err.message}`)
            .join('; ');
        
        super(`Database validation failed for table "${tableName}": ${errorSummary}`);
        this.name = 'DbValidationError';
        
        // Maintains proper stack trace for where our error was thrown (only in V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DbValidationError);
        }
    }
}

/**
 * Validates a single database row against a Zod schema
 * 
 * @param row - Raw row from database (Record<string, unknown>)
 * @param schema - Zod schema to validate against
 * @param tableName - Name of the table (for logging and error messages)
 * @returns Validated and transformed data
 * @throws DbValidationError if validation fails
 * 
 * @example
 * '''typescript
 * const validated = validateDbRow(
 *   dbRow, 
 *   DbProductSchema, 
 *   'products'
 * );
 * '''
 */
export function validateDbRow<T>(
    row: unknown,
    schema: z.ZodSchema<T>,
    tableName: string
): T {
    try {
        const validated = schema.parse(row);
        
        validatorLogger.debug(
            `Successfully validated row from table "${tableName}"`,
            { 
                id: (row as Record<string, unknown>)?.id,
                tableName 
            }
        );
        
        return validated;
    } catch (error: unknown) {
        if (error instanceof ZodError) {
            validatorLogger.error(
                `Validation failed for table "${tableName}"`,
                {
                    tableName,
                    errors: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message,
                        received: 'received' in e ? String((e as {received: unknown}).received) : undefined, // Safely access potentially available property
                    })),
                    rowId: (row as Record<string, unknown>)?.id,
                    // Don't log full rawData in production to avoid leaking sensitive info
                    rawDataSample: process.env.NODE_ENV === 'development' 
                        ? row 
                        : { id: (row as Record<string, unknown>)?.id },
                }
            );
            
            throw new DbValidationError(tableName, error, row);
        }
        
        // Re-throw unexpected errors
        throw error;
    }
}

/**
 * Validates multiple database rows
 * 
 * @param rows - Array of raw rows from database
 * @param schema - Zod schema to validate against
 * @param tableName - Name of the table (for logging)
 * @param options - Configuration options
 * @returns Array of validated rows
 * @throws DbValidationError if any validation fails (by default)
 * 
 * @example
 * '''typescript
 * // Strict mode (default): throw on first error
 * const products = validateDbRows(
 *   dbRows, 
 *   DbProductSchema, 
 *   'products'
 * );
 * 
 * // Lenient mode: skip invalid rows and log warnings
 * const products = validateDbRows(
 *   dbRows, 
 *   DbProductSchema, 
 *   'products',
 *   { skipInvalid: true }
 * );
 * '''
 */
export function validateDbRows<T>(
    rows: unknown[],
    schema: z.ZodSchema<T>,
    tableName: string,
    options: {
        /**
         * If true, skip invalid rows and log warnings instead of throwing.
         * Use for non-critical batch operations (e.g., listing products).
         * Default: false (strict mode)
         */
        skipInvalid?: boolean;
    } = {}
): T[] {
    const { skipInvalid = false } = options;
    const validated: T[] = [];
    const errors: Array<{ index: number; error: DbValidationError }> = [];

    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        
        try {
            const validatedRow = validateDbRow(row, schema, `${tableName}[${index}]`);
            validated.push(validatedRow);
        } catch (error: unknown) {
            if (error instanceof DbValidationError) {
                if (skipInvalid) {
                    // Log warning but continue processing
                    validatorLogger.warn(
                        `Skipped invalid row at index ${index} in table "${tableName}"`,
                        {
                            index,
                            tableName,
                            rowId: (row as Record<string, unknown>)?.id,
                            errorSummary: error.message,
                        }
                    );
                    errors.push({ index, error });
                    continue; // Skip this row
                } else {
                    // Strict mode: fail fast
                    throw new DbValidationError(
                        `${tableName}[${index}]`,
                        error.zodError,
                        error.rawData
                    );
                }
            }
            
            // Re-throw unexpected errors
            throw error;
        }
    }

    // Summary log if we skipped any rows
    if (errors.length > 0) {
        validatorLogger.warn(
            `Validation completed with ${errors.length} skipped rows out of ${rows.length} total`,
            {
                tableName,
                totalRows: rows.length,
                validRows: validated.length,
                skippedRows: errors.length,
                skippedIndices: errors.map(e => e.index),
            }
        );
    } else {
        validatorLogger.debug(
            `Successfully validated all ${rows.length} rows from table "${tableName}"`
        );
    }

    return validated;
}

/**
 * Type-safe wrapper for validateDbRow with better inference
 * Useful when you want TypeScript to infer the return type automatically
 * 
 * @example
 * '''typescript
 * const product = safeValidateDbRow(dbRow, DbProductSchema, 'products');
 * // TypeScript knows product is DbProduct type
 * '''
 */
export function safeValidateDbRow<TSchema extends z.ZodTypeAny>(
    row: unknown,
    schema: TSchema,
    tableName: string
): z.infer<TSchema> {
    return validateDbRow(row, schema, tableName);
}
