// lib/neon.ts
/**
 * Neon database client
 *
 * Initializes and exports a Neon serverless database client using
 * the DATABASE_URL environment variable. Intended for lightweight
 * queries in server and edge contexts.
 */

import { neon } from "@neondatabase/serverless";

/**
 * Ensure required database configuration is present at startup.
 */
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Shared Neon client instance.
 */
export const client = neon(process.env.DATABASE_URL);
