import { z } from 'zod';
import { serverLogger } from '@/lib/server-logger';

const log = serverLogger.withCategory('DB_VALIDATOR');

export class DbValidationError extends Error {
    constructor(
        message: string,
        public readonly context: string,
        public readonly row: unknown,
        public readonly zodError?: z.ZodError
    ) {
        super(message);
        this.name = 'DbValidationError';
    }
}

/**
 * Validates a single database row against a Zod schema.
 * Refactored to support ZodEffects (transformations like PortableNumber).
 * * @param row - Raw database row
 * @param schema - Zod schema (uses generic ZodType to handle Input vs Output types)
 * @param context - Context for logging (e.g., 'mapDbProductToProduct')
 */
export function validateDbRow<TOutput, TInput>(
    row: unknown,
    schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>,
    context: string
): TOutput {
    try {
        return schema.parse(row);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorDetails = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            log.error('Database row validation failed', {
                context,
                errors: errorDetails,
                row,
            });
            
            throw new DbValidationError(
                `Validation failed in ${context}: ${errorDetails}`,
                context,
                row,
                error
            );
        }
        throw error;
    }
}

/**
 * Validates multiple database rows.
 */
export function validateDbRows<TOutput, TInput>(
    rows: unknown[],
    schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>,
    context: string,
    options: { skipInvalid?: boolean } = {}
): TOutput[] {
    const results: TOutput[] = [];
    
    for (let i = 0; i < rows.length; i++) {
        try {
            const validated = schema.parse(rows[i]);
            results.push(validated);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errorDetails = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
                
                if (options.skipInvalid) {
                    log.warn(`Skipping invalid row ${i} in ${context}`, {
                        context,
                        rowIndex: i,
                        errors: errorDetails,
                        row: rows[i],
                    });
                    continue;
                } else {
                    log.error(`Validation failed for row ${i} in ${context}`, {
                        context,
                        rowIndex: i,
                        errors: errorDetails,
                        row: rows[i],
                    });
                    
                    throw new DbValidationError(
                        `Validation failed in ${context} at row ${i}: ${errorDetails}`,
                        context,
                        rows[i],
                        error
                    );
                }
            }
            throw error;
        }
    }
    
    return results;
}
