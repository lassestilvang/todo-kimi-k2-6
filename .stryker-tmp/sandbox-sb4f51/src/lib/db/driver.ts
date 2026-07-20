/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck


// SQLite Statement (sync)
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
export interface Statement {
  run(...params: unknown[]): {
    lastInsertRowid: number | bigint;
    changes: number;
  };
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
  if (stryMutAct_9fa48("3499")) {
    {}
  } else {
    stryCov_9fa48("3499");
    return stryMutAct_9fa48("3502") ? typeof window === "undefined" : stryMutAct_9fa48("3501") ? false : stryMutAct_9fa48("3500") ? true : (stryCov_9fa48("3500", "3501", "3502"), typeof window !== (stryMutAct_9fa48("3503") ? "" : (stryCov_9fa48("3503"), "undefined")));
  }
}

/**
 * Create a database connection based on configuration
 * Supports SQLite (development) and PostgreSQL (production)
 */
export function createDatabase(): Database {
  if (stryMutAct_9fa48("3504")) {
    {}
  } else {
    stryCov_9fa48("3504");
    // In browser, return a no-op database
    if (stryMutAct_9fa48("3506") ? false : stryMutAct_9fa48("3505") ? true : (stryCov_9fa48("3505", "3506"), isBrowser())) {
      if (stryMutAct_9fa48("3507")) {
        {}
      } else {
        stryCov_9fa48("3507");
        return createNoOpDatabase();
      }
    }

    // Dynamic import config to avoid issues in edge cases
    let config: {
      database: {
        url: string;
      };
      isProduction: boolean;
    };
    try {
      if (stryMutAct_9fa48("3508")) {
        {}
      } else {
        stryCov_9fa48("3508");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        config = require("@/lib/config").config;
      }
    } catch {
      if (stryMutAct_9fa48("3509")) {
        {}
      } else {
        stryCov_9fa48("3509");
        config = stryMutAct_9fa48("3510") ? {} : (stryCov_9fa48("3510"), {
          database: stryMutAct_9fa48("3511") ? {} : (stryCov_9fa48("3511"), {
            url: stryMutAct_9fa48("3512") ? "" : (stryCov_9fa48("3512"), "./prisma/dev.db")
          }),
          isProduction: stryMutAct_9fa48("3513") ? true : (stryCov_9fa48("3513"), false)
        });
      }
    }
    const dbUrl = config.database.url;

    // Check if this is a PostgreSQL URL
    if (stryMutAct_9fa48("3516") ? (dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")) && config.isProduction : stryMutAct_9fa48("3515") ? false : stryMutAct_9fa48("3514") ? true : (stryCov_9fa48("3514", "3515", "3516"), (stryMutAct_9fa48("3518") ? dbUrl.startsWith("postgresql://") && dbUrl.startsWith("postgres://") : stryMutAct_9fa48("3517") ? false : (stryCov_9fa48("3517", "3518"), (stryMutAct_9fa48("3519") ? dbUrl.endsWith("postgresql://") : (stryCov_9fa48("3519"), dbUrl.startsWith(stryMutAct_9fa48("3520") ? "" : (stryCov_9fa48("3520"), "postgresql://")))) || (stryMutAct_9fa48("3521") ? dbUrl.endsWith("postgres://") : (stryCov_9fa48("3521"), dbUrl.startsWith(stryMutAct_9fa48("3522") ? "" : (stryCov_9fa48("3522"), "postgres://")))))) || config.isProduction)) {
      if (stryMutAct_9fa48("3523")) {
        {}
      } else {
        stryCov_9fa48("3523");
        return createPostgreSQLDatabase(dbUrl);
      }
    }

    // Default to SQLite
    return createSQLiteDatabase(dbUrl);
  }
}
function createSQLiteDatabase(path: string): Database {
  if (stryMutAct_9fa48("3524")) {
    {}
  } else {
    stryCov_9fa48("3524");
    try {
      if (stryMutAct_9fa48("3525")) {
        {}
      } else {
        stryCov_9fa48("3525");
        // Node.js runtime
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const BetterSqlite3 = require("better-sqlite3");
        const db = new BetterSqlite3(path);

        // Wrap the transaction method to properly handle BEGIN/COMMIT/ROLLBACK
        const originalTransaction = db.transaction.bind(db);
        db.transaction = <T,>(fn: () => T): T => {
          if (stryMutAct_9fa48("3526")) {
            {}
          } else {
            stryCov_9fa48("3526");
            const result = originalTransaction(fn);
            // For synchronous functions, the transaction is already complete
            // better-sqlite3 handles this automatically when the function returns
            return result;
          }
        };
        return db;
      }
    } catch {
      if (stryMutAct_9fa48("3527")) {
        {}
      } else {
        stryCov_9fa48("3527");
        try {
          if (stryMutAct_9fa48("3528")) {
            {}
          } else {
            stryCov_9fa48("3528");
            // Bun runtime
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const {
              Database: BunDatabase
            } = require("bun:sqlite");
            const db = new BunDatabase(path);
            return stryMutAct_9fa48("3529") ? {} : (stryCov_9fa48("3529"), {
              prepare: stryMutAct_9fa48("3530") ? () => undefined : (stryCov_9fa48("3530"), (sql: string) => db.query(sql)),
              exec: stryMutAct_9fa48("3531") ? () => undefined : (stryCov_9fa48("3531"), (sql: string) => db.run(sql)),
              close: stryMutAct_9fa48("3532") ? () => undefined : (stryCov_9fa48("3532"), () => db.close()),
              transaction: <T,>(fn: () => T): T => {
                if (stryMutAct_9fa48("3533")) {
                  {}
                } else {
                  stryCov_9fa48("3533");
                  const tx = db.transaction();
                  tx.start();
                  try {
                    if (stryMutAct_9fa48("3534")) {
                      {}
                    } else {
                      stryCov_9fa48("3534");
                      const result = fn();
                      tx.commit();
                      return result;
                    }
                  } catch (e) {
                    if (stryMutAct_9fa48("3535")) {
                      {}
                    } else {
                      stryCov_9fa48("3535");
                      tx.rollback();
                      throw e;
                    }
                  }
                }
              }
            });
          }
        } catch {
          if (stryMutAct_9fa48("3536")) {
            {}
          } else {
            stryCov_9fa48("3536");
            throw new Error(stryMutAct_9fa48("3537") ? "" : (stryCov_9fa48("3537"), "No SQLite driver available. Install better-sqlite3 for Node.js or use Bun for bun:sqlite."));
          }
        }
      }
    }
  }
}
function createPostgreSQLDatabase(url: string): Database {
  if (stryMutAct_9fa48("3538")) {
    {}
  } else {
    stryCov_9fa48("3538");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      Pool
    } = require("pg");
    const pool = new Pool(stryMutAct_9fa48("3539") ? {} : (stryCov_9fa48("3539"), {
      connectionString: url
    }));

    // For PostgreSQL, return async-compatible statement wrappers
    // Note: This requires callers to handle promises when using PostgreSQL
    return stryMutAct_9fa48("3540") ? {} : (stryCov_9fa48("3540"), {
      prepare: stryMutAct_9fa48("3541") ? () => undefined : (stryCov_9fa48("3541"), (sql: string): Statement => stryMutAct_9fa48("3542") ? {} : (stryCov_9fa48("3542"), {
        run: (...params: unknown[]) => {
          if (stryMutAct_9fa48("3543")) {
            {}
          } else {
            stryCov_9fa48("3543");
            // For INSERT ... RETURNING, we need to get the returned id
            // Note: This async handling is simplified - PostgreSQL support is experimental
            void pool.query(sql, params);
            return stryMutAct_9fa48("3544") ? {} : (stryCov_9fa48("3544"), {
              lastInsertRowid: 0,
              changes: 0
            });
          }
        },
        get: stryMutAct_9fa48("3545") ? () => undefined : (stryCov_9fa48("3545"), (...params: unknown[]) => pool.query(sql, params).then(stryMutAct_9fa48("3546") ? () => undefined : (stryCov_9fa48("3546"), (r: any) => r.rows[0]))),
        all: stryMutAct_9fa48("3547") ? () => undefined : (stryCov_9fa48("3547"), (...params: unknown[]) => pool.query(sql, params).then(stryMutAct_9fa48("3548") ? () => undefined : (stryCov_9fa48("3548"), (r: any) => r.rows)))
      })),
      exec: (sql: string) => {
        if (stryMutAct_9fa48("3549")) {
          {}
        } else {
          stryCov_9fa48("3549");
          pool.query(sql);
        }
      },
      close: () => {
        if (stryMutAct_9fa48("3550")) {
          {}
        } else {
          stryCov_9fa48("3550");
          pool.end();
        }
      },
      transaction: async <T,>(fn: () => T | Promise<T>): Promise<T> => {
        if (stryMutAct_9fa48("3551")) {
          {}
        } else {
          stryCov_9fa48("3551");
          const client = await pool.connect();
          try {
            if (stryMutAct_9fa48("3552")) {
              {}
            } else {
              stryCov_9fa48("3552");
              await client.query(stryMutAct_9fa48("3553") ? "" : (stryCov_9fa48("3553"), "BEGIN"));
              const result = await fn();
              await client.query(stryMutAct_9fa48("3554") ? "" : (stryCov_9fa48("3554"), "COMMIT"));
              return result;
            }
          } catch (error) {
            if (stryMutAct_9fa48("3555")) {
              {}
            } else {
              stryCov_9fa48("3555");
              await client.query(stryMutAct_9fa48("3556") ? "" : (stryCov_9fa48("3556"), "ROLLBACK"));
              throw error;
            }
          } finally {
            if (stryMutAct_9fa48("3557")) {
              {}
            } else {
              stryCov_9fa48("3557");
              client.release();
            }
          }
        }
      }
    });
  }
}

/**
 * Create a no-op database for browser environments
 * This prevents native module loading in the browser
 */
function createNoOpDatabase(): Database {
  if (stryMutAct_9fa48("3558")) {
    {}
  } else {
    stryCov_9fa48("3558");
    return stryMutAct_9fa48("3559") ? {} : (stryCov_9fa48("3559"), {
      prepare: stryMutAct_9fa48("3560") ? () => undefined : (stryCov_9fa48("3560"), () => stryMutAct_9fa48("3561") ? {} : (stryCov_9fa48("3561"), {
        run: stryMutAct_9fa48("3562") ? () => undefined : (stryCov_9fa48("3562"), () => stryMutAct_9fa48("3563") ? {} : (stryCov_9fa48("3563"), {
          lastInsertRowid: 0,
          changes: 0
        })),
        get: () => undefined,
        all: stryMutAct_9fa48("3564") ? () => undefined : (stryCov_9fa48("3564"), () => stryMutAct_9fa48("3565") ? ["Stryker was here"] : (stryCov_9fa48("3565"), []))
      })),
      exec: () => {},
      close: () => {},
      transaction: stryMutAct_9fa48("3566") ? () => undefined : (stryCov_9fa48("3566"), <T,>(fn: () => T): T => fn())
    });
  }
}