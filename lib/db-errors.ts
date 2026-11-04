/**
 * Database Error Classification Utilities
 *
 * Dedicated, zero-dependency module decoupled from authentication providers,
 * environment secret assertions, and NextAuth initialization lifecycle.
 */

/**
 * Detects whether a database error is specifically due to a missing column (Prisma P2022 or PostgreSQL 42703),
 * indicating that the database is running on the pre-migration baseline schema.
 * Strictly excludes P2021 (missing table), connection errors, and avoids broad substring matching.
 */
export function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    code?: unknown;
    meta?: Record<string, unknown>;
  };

  // Standard Prisma missing column error code
  if (err.code === "P2022") return true;

  // Direct PostgreSQL driver SQLSTATE for undefined_column (e.g. pg, postgres.js, Neon serverless)
  if (err.code === "42703") return true;

  // Structured metadata from database wrappers or driver errors
  if (err.meta && typeof err.meta === "object") {
    if (
      err.meta.code === "42703" ||
      err.meta.database_error_code === "42703" ||
      err.meta.originalCode === "42703"
    ) {
      return true;
    }
  }

  return false;
}
