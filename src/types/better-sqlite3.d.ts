declare module 'better-sqlite3' {
  export interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): void;
    all(sql: string, ...params: any[]): any[];
    get(sql: string, ...params: any[]): any;
    run(sql: string, ...params: any[]): { changes: number; lastInsertRowid: number };
    close(): void;
    constructor(path: string, options?: { fileMode?: number; journalMode?: number; verbose?: boolean });
  }

  export interface Statement {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): { changes: number; lastInsertRowid: number };
    iterate(...params: any[]): IterableIterator<any>;
    columns(): any[];
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

  type DatabaseConstructor = new (path: string, options?: DatabaseOptions) => Database;

  const Database: DatabaseConstructor;
  export default Database;
}