
/**
 * @file Centralized environment helpers.
 * Use these functions to check the current runtime environment (local/studio vs. cloud/production).
 * This enforces the rule from docs/conventions.md to avoid direct process.env checks in business logic.
 */
import { serverLogger } from "./server-logger";

const envLogger = serverLogger.withCategory("ENV_HELPER");

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


/**
 * Universal data fetcher that uses mock data in local/dev environment
 * and fetches from the database in production.
 * @param localFn A function that returns mock data.
 * @param dbFn A function that fetches and returns data from the database.
 * @returns A promise that resolves with either mock data or database data.
 */
export async function runLocalOrDb<T>(localFn: () => T | Promise<T>, dbFn: () => Promise<T>): Promise<T> {
  if (isLocal()) {
    envLogger.warn("Running in local/studio environment. Using mock data function.");
    return await localFn();
  }
  return await dbFn();
}
