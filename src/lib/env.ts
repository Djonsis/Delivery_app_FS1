/**
 * @file Centralized environment helpers.
 * Use these functions to check the current runtime environment (local/studio vs. cloud/production).
 * This enforces the rule from docs/conventions.md to avoid direct process.env checks in business logic.
 */

/**
 * Checks if the application is running in a cloud environment (App Hosting, Cloud Run).
 * @returns {boolean} True if in a cloud environment, false otherwise.
 */
export const isCloud = (): boolean => Boolean(process.env.K_SERVICE);

/**
 * Checks if the application is running in a local development environment (e.g., Firebase Studio).
 * @returns {boolean} True if in a local environment, false otherwise.
 */
export const isLocal = (): boolean => !isCloud();
