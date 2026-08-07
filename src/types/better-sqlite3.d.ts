 
declare module 'better-sqlite3' {
  export interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): void;
    all<T = unknown>(sql: string, ...params: unknown[]): T[];
    get<T = unknown>(sql: string, ...params: unknown[]): T | undefined;
    run(sql: string, ...params: unknown[]): { changes: number; lastInsertRowid: number };
    close(): void;
  }

  export interface Statement {
    all<T = unknown>(...params: unknown[]): T[];
    get<T = unknown>(...params: unknown[]): T | undefined;
    run(...params: unknown[]): { changes: number; lastInsertRowid: number };
    iterate<T = unknown>(...params: unknown[]): IterableIterator<T>;
    columns(): unknown[];
    plainString: string;
    unstableToString(): string;
    free(): void;
  }

  export interface RunResult {
    changes: number;
    lastInsertRowid: number;
  }

  export interface DatabaseOptions {
    fileMode?: number;
    journalMode?: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF';
    verbose?: boolean;
  }

   
  const Database: new (path: string, options?: DatabaseOptions) => Database;
  export default Database;
}