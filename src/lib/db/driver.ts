/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Statement {
  run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number };
  get(...params: unknown[]): any;
  all(...params: unknown[]): any[];
}

export interface Database {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  close(): void;
}

export function createDatabase(path: string): Database {
  try {
    // Node.js runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BetterSqlite3 = require("better-sqlite3");
    return new BetterSqlite3(path);
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
      };
    } catch {
      throw new Error(
        "No SQLite driver available. Install better-sqlite3 for Node.js or use Bun for bun:sqlite."
      );
    }
  }
}