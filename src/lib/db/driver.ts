/* eslint-disable @typescript-eslint/no-explicit-any */

// SQLite Statement (sync)
export interface Statement {
  run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number };
  get(...params: unknown[]): any;
  all(...params: unknown[]): any[];
}

export interface Transaction {
  commit(): void;
  rollback(): void;
}

export interface Database {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  close(): void;
  /**
   * Execute a function within a transaction.
   * For SQLite: fn is synchronous and returns T directly
   * For PostgreSQL: fn may be async and returns Promise<T>
   */
  transaction<T>(fn: () => T | Promise<T>): T | Promise<T>;
}

/**
 * Check if running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Create a database connection based on configuration
 * Supports SQLite (development) and PostgreSQL (production)
 */
export function createDatabase(): Database {
  // In browser, return a no-op database
  if (isBrowser()) {
    return createNoOpDatabase();
  }

  // Dynamic import config to avoid issues in edge cases
  let config: { database: { url: string }; isProduction: boolean };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    config = require("@/lib/config").config;
  } catch {
    config = { database: { url: "./prisma/dev.db" }, isProduction: false };
  }

  const dbUrl = config.database.url;

  // Check if this is a PostgreSQL URL
  if (dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://") || config.isProduction) {
    return createPostgreSQLDatabase(dbUrl);
  }

  // Default to SQLite
  return createSQLiteDatabase(dbUrl);
}

function createSQLiteDatabase(path: string): Database {
  try {
    // Node.js runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BetterSqlite3 = require("better-sqlite3");
    const db = new BetterSqlite3(path);

    // Wrap the transaction method to properly handle BEGIN/COMMIT/ROLLBACK
    const originalTransaction = db.transaction.bind(db);
    db.transaction = <T>(fn: () => T): T => {
      const result = originalTransaction(fn);
      // For synchronous functions, the transaction is already complete
      // better-sqlite3 handles this automatically when the function returns
      return result;
    };

    return db;
  } catch {
    try {
      // Bun runtime
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Database: BunDatabase } = require("bun:sqlite");
      const db = new BunDatabase(path);
      return {
        prepare: (sql: string) => db.query(sql),
        exec: (sql: string) => db.run(sql),
        close: () => db.close(),
        transaction: <T>(fn: () => T): T => {
          const tx = db.transaction();
          tx.start();
          try {
            const result = fn();
            tx.commit();
            return result;
          } catch (e) {
            tx.rollback();
            throw e;
          }
        },
      };
    } catch {
      throw new Error(
        "No SQLite driver available. Install better-sqlite3 for Node.js or use Bun for bun:sqlite."
      );
    }
  }
}

function createPostgreSQLDatabase(url: string): Database {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: url,
  });

  // For PostgreSQL, return async-compatible statement wrappers
  // Note: This requires callers to handle promises when using PostgreSQL
  return {
    prepare: (sql: string): Statement => ({
      run: (...params: unknown[]) => {
        // For INSERT ... RETURNING, we need to get the returned id
        // Note: This async handling is simplified - PostgreSQL support is experimental
        void pool.query(sql, params);
        return {
          lastInsertRowid: 0,
          changes: 0,
        };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (...params: unknown[]) => pool.query(sql, params).then((r: any) => r.rows[0]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      all: (...params: unknown[]) => pool.query(sql, params).then((r: any) => r.rows),
    }),
    exec: (sql: string) => {
      pool.query(sql);
    },
    close: () => {
      pool.end();
    },
    transaction: async <T>(fn: () => T | Promise<T>): Promise<T> => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn();
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

/**
 * Create a no-op database for browser environments
 * This prevents native module loading in the browser
 */
function createNoOpDatabase(): Database {
  return {
    prepare: () => ({
      run: () => ({ lastInsertRowid: 0, changes: 0 }),
      get: () => undefined,
      all: () => [],
    }),
    exec: () => {},
    close: () => {},
    transaction: <T>(fn: () => T): T => fn(),
  };
}