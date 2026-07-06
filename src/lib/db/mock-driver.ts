/**
 * Mock database driver for testing environments
 * This provides a pure JavaScript implementation of the Database interface
 * for use in test environments where native SQLite bindings may not work.
 */


export interface MockStatement {
  run: (...params: unknown[]) => { lastInsertRowid: number; changes: number };
  get: (...params: unknown[]) => Record<string, unknown> | undefined;
  all: (...params: unknown[]) => Record<string, unknown>[];
}

export interface MockDatabase {
  prepare(sql: string): MockStatement;
  exec(sql: string): void;
  close(): void;
  transaction<T>(fn: () => T): T;
  _reset?: () => void;
}

/**
 * Creates a mock database for testing purposes
 */
export function createMockDatabase(): MockDatabase {
  // Create instance-local storage for proper test isolation
  const tables: Map<string, Map<number, Record<string, unknown>>> = new Map();
  let lastInsertId = 0;

  // Reset function for test cleanup
  function reset() {
    tables.clear();
    lastInsertId = 0;

    // Re-initialize tables with schema on reset
    const schemaTables = [
      "lists", "labels", "tasks", "task_labels", "subtasks", "task_logs",
      "reminders", "task_shares", "task_dependencies", "templates",
      "template_categories", "task_comments", "comment_mentions",
      "integrations", "task_votes", "time_entries", "task_attachments",
      "users", "calendar_sync", "filter_presets", "custom_views",
      "habit_streaks", "habit_completions", "activity_logs",
      "recurring_exceptions", "custom_view_shares", "goal_milestones",
      "goals", "user_settings", "rate_limit_log", "migrations", "workspaces", "workspace_users"
    ];
    schemaTables.forEach(name => tables.set(name, new Map()));

    // Create default inbox
    tables.get("lists")!.set(1, {
      id: 1,
      name: "Inbox",
      emoji: "📥",
      color: "#6366f1",
      is_inbox: 1,
      user_id: null as number | null,
      created_at: new Date().toISOString()
    });
  }

  // Initialize tables with schema on creation
  reset();

  // Helper functions
  function parseTableName(sql: string): string | null {
    // Handle INSERT INTO table ... or INSERT OR REPLACE INTO table ...
    const intoMatch = sql.match(/INTO\s+(\w+)/i);
    // Handle UPDATE table SET ...
    const updateMatch = sql.match(/UPDATE\s+(\w+)/i);
    // Handle SELECT ... FROM table ...
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    // Handle DELETE FROM table ...
    const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
    // Handle INSERT OR REPLACE INTO table ...
    const insertReplaceMatch = sql.match(/INSERT\s+(?:OR\s+REPLACE)?\s+INTO\s+\w+\s*(?:$|\s)/i);

    const tableName = intoMatch?.[1] || updateMatch?.[1] || fromMatch?.[1] || deleteMatch?.[1];
    return tableName?.toLowerCase() || null;
  }

  function parseColumns(sql: string): string[] {
    const match = sql.match(/INTO\s+\w+\s*\(([^)]+)\)/i);
    if (!match) return [];
    return match[1].split(',').map(c => c.trim());
  }

  return {
    prepare(sql: string): MockStatement {
      const lowerSql = sql.toLowerCase();

      // Handle INSERT statements (including INSERT OR REPLACE)
      if (lowerSql.includes("insert")) {
        const tableName = parseTableName(sql);
        const table = tableName && tables.get(tableName.toLowerCase());
        const columns = parseColumns(sql);

        return {
          run: (...params: unknown[]) => {
            if (!tableName || !table) {
              return { lastInsertRowid: 0, changes: 0 };
            }

            const firstCol = columns[0]?.toLowerCase();
            const explicitId = firstCol === 'id' ? params[0] as number : null;

            if (explicitId !== null && explicitId !== undefined) {
              lastInsertId = Math.max(lastInsertId, explicitId);
            } else {
              lastInsertId++;
            }

            const record: Record<string, unknown> = { id: explicitId ?? lastInsertId };

            // Parse VALUES clause to handle both parameters and literals
            const valuesMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);
            if (valuesMatch && columns.length > 0) {
              const valuesStr = valuesMatch[1];
              // Parse values - split by comma but handle parentheses and whitespace
              const valueTokens: string[] = [];
              let parenDepth = 0;
              let currentToken = '';
              for (const char of valuesStr) {
                if (char === '(' || char === '{' || char === '[') parenDepth++;
                if (char === ')' || char === '}' || char === ']') parenDepth--;
                if (char === ',' && parenDepth === 0) {
                  valueTokens.push(currentToken.trim());
                  currentToken = '';
                } else {
                  currentToken += char;
                }
              }
              if (currentToken.trim()) valueTokens.push(currentToken.trim());

              // Match tokens to columns
              let paramIdx = 0;
              columns.forEach((col, i) => {
                const valueToken = valueTokens[i];
                let val: unknown;

                if (valueToken === '?') {
                  // Parameter
                  val = params[paramIdx++];
                } else if (valueToken?.toUpperCase() === 'CURRENT_TIMESTAMP') {
                  // Literal CURRENT_TIMESTAMP
                  val = new Date().toISOString();
                } else if (valueToken?.toUpperCase() === 'NULL') {
                  // Literal NULL
                  val = null;
                } else if (valueToken?.match(/^\d+$/)) {
                  // Numeric literal
                  val = Number(valueToken);
                } else if (valueToken?.startsWith("'") || valueToken?.startsWith('"')) {
                  // String literal (remove quotes)
                  const quote = valueToken[0];
                  val = valueToken.slice(1, -1);
                } else {
                  val = valueToken;
                }

                record[col] = val;
              });
            }

            table.set(explicitId ?? lastInsertId, record);
            return { lastInsertRowid: explicitId ?? lastInsertId, changes: 1 };
          },
          get: () => table?.get(lastInsertId),
          all: () => table ? [table.get(lastInsertId)!] : [],
        };
      }

      // Handle SELECT statements
      if (lowerSql.includes("select")) {
        const tableName = parseTableName(sql);
        const table = tableName && tables.get(tableName.toLowerCase());

        if (lowerSql.includes("count(*)")) {
          return {
            run: () => ({ lastInsertRowid: 0, changes: 0 }),
            get: () => ({ count: table?.size || 0 }),
            all: () => [{ count: table?.size || 0 }],
          };
        }

        if (lowerSql.includes("pragma")) {
          return {
            run: () => ({ lastInsertRowid: 0, changes: 0 }),
            get: () => ({ journal_mode: "wal" }),
            all: () => [{ journal_mode: "wal" }],
          };
        }

        if (lowerSql.includes("sqlite_master")) {
          const result = Array.from(tables.keys()).map(name => ({ name, type: 'table', tbl_name: name }));
          return {
            run: () => ({ lastInsertRowid: 0, changes: result.length }),
            get: () => result[0],
            all: () => result,
          };
        }

        // Handle JOIN queries - join reminders/tasks or task_shares/users
        if (lowerSql.includes("join")) {
          // Parse the JOIN types
          const hasRemindersJoin = lowerSql.includes("join tasks t on r.task_id = t.id");
          const hasTaskSharesJoin = lowerSql.includes("left join users u on");

          if (hasRemindersJoin) {
            // Handle getDueReminders and getUpcomingReminders
            const now = new Date().toISOString();
            const isDue = lowerSql.includes("<=");
            const isUpcoming = lowerSql.includes(">=");

            // Get reminders from the reminders table
            const remindersTable = tables.get("reminders");
            const reminders = remindersTable ? Array.from(remindersTable.values()) : [];
            const tasksTable = tables.get("tasks");

            return {
              run: () => ({ lastInsertRowid: 0, changes: 0 }),
              get: () => undefined,
              all: (...params: unknown[]) => {
                let result = reminders.map((reminder: Record<string, unknown>) => ({
                  ...reminder,
                  task_name: tasksTable?.get(reminder.task_id as number)?.name || "Unknown",
                  task_completed: tasksTable?.get(reminder.task_id as number)?.completed || 0,
                }));

                // Apply WHERE clause filtering for date/reminder conditions
                if (isDue) {
                  result = result.filter(r => r.remind_at <= now && r.task_completed === 0);
                } else if (isUpcoming) {
                  result = result.filter(r => r.remind_at >= now);
                }

                // Handle LIMIT parameter
                if (params.length > 0) {
                  const limit = params[params.length - 1] as number;
                  result = result.slice(0, limit);
                }

                return result;
              },
            };
          }

          if (hasTaskSharesJoin) {
            // Handle getTaskShares - join task_shares with users
            // Always use task_shares table directly
            return {
              run: () => ({ lastInsertRowid: 0, changes: 0 }),
              get: (...params: unknown[]) => {
                // For token lookup with WHERE share_token = ?
                if (params.length === 1 && lowerSql.includes("share_token")) {
                  const token = params[0] as string;
                  const shares = tables.get("task_shares");
                  const sharesArray = shares ? Array.from(shares.values()) : [];
                  const found = sharesArray.find((s: Record<string, unknown>) => s.share_token === token);
                  if (found) {
                    return { ...found };
                  }
                  return null;
                }
                // For task_id lookup
                if (params.length === 1) {
                  const id = params[0];
                  const numericId = typeof id === 'string' ? Number(id) : (typeof id === 'number' ? id : Number(id));
                  const shares = tables.get("task_shares");
                  const found = shares?.get(numericId);
                  if (found) {
                    const usersTable = tables.get("users");
                    const user = usersTable?.get(found.user_id as number);
                    return {
                      ...found,
                      user: user ? {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        avatar_url: user.avatar_url,
                        created_at: user.created_at,
                      } : undefined,
                    };
                  }
                }
                return undefined;
              },
              all: (...params: unknown[]) => {
                // For task_id lookup - parse WHERE clause for ts.task_id = ?
                const shares = tables.get("task_shares");
                let sharesArray = shares ? Array.from(shares.values()) : [];

                // Parse WHERE conditions from the SQL
                if (lowerSql.includes("where") && params.length > 0) {
                  const whereParts = sql.split('WHERE')[1]?.split('ORDER BY')[0]?.split('LIMIT')[0] || '';
                  const whereConditions = whereParts.match(/[\w.]+(?=\s*=\s*\?)/g) || [];

                  // Match params to conditions
                  whereConditions.forEach((col, idx) => {
                    // Remove table prefix (e.g., 'ts.' -> '') but keep the column name
                    const cleanedCol = col.replace(/^[a-z]+\./i, '');
                    const paramIdx = Math.max(0, params.length - whereConditions.length + idx);
                    if (paramIdx < params.length) {
                      sharesArray = sharesArray.filter((s: Record<string, unknown>) => s[cleanedCol] === params[paramIdx]);
                    }
                  });
                }

                const usersTable = tables.get("users");
                return sharesArray.map((share: Record<string, unknown>) => {
                  const user = usersTable?.get(share.user_id as number);
                  return {
                    id: share.id,
                    task_id: share.task_id,
                    user_id: share.user_id || undefined,
                    permission: share.permission,
                    share_token: share.share_token || undefined,
                    created_at: share.created_at,
                    user: user ? {
                      id: user.id,
                      email: user.email,
                      name: user.name,
                      avatar_url: user.avatar_url,
                      created_at: user.created_at,
                    } : undefined,
                  };
                });
              },
            };
          }

          // Default JOIN handling - return empty
          return {
            run: () => ({ lastInsertRowid: 0, changes: 0 }),
            get: () => undefined,
            all: () => [],
          };
        }

        const orderByMatch = sql.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)/i);
        const limitMatch = sql.match(/LIMIT\s+\?/i) ? 'param' : sql.match(/LIMIT\s+(\d+)/i);
        const whereMatch = sql.match(/WHERE\s+(?:[\w.]+\s*=\s*\?)/i);

        return {
          run: () => ({ lastInsertRowid: 0, changes: 0 }),
          get: (...params: unknown[]) => {
            // Check the table for the record
            if (!table || table.size === 0) return undefined;

            if (params.length > 0 && whereMatch) {
              // Handle WHERE clause with filtering
              const whereParts = sql.split('WHERE')[1]?.split('ORDER BY')[0]?.split('LIMIT')[0] || '';
              const whereConditions = whereParts.match(/[\w.]+(?=\s*=\s*\?)/g) || [];

              if (whereConditions.length > 0) {
                // Filter results for WHERE conditions and return first match
                const records = Array.from(table.values());
                let result: Record<string, unknown> | undefined;

                for (let i = 0; i < whereConditions.length; i++) {
                  // Remove table prefix (e.g., 'ts.' -> '') but keep the column name
                  const col = whereConditions[i].replace(/^[a-z]+\./i, '');
                  const paramIdx = Math.max(0, params.length - whereConditions.length + i);
                  const val = params[paramIdx];

                  const found = records.find(r => r && r[col] === val);
                  if (found) {
                    result = found;
                    break;
                  }
                }
                return result;
              }

              // Default: treat as ID lookup
              const id = params[0];
              const numericId = typeof id === 'string' ? Number(id) : (typeof id === 'number' ? id : Number(id));
              return table.get(numericId);
            }

            // No params - return first record
            return table.values().next().value;
          },
          all: (...params: unknown[]) => {
            if (!table) return [];
            let result = Array.from(table.values());

            if (lowerSql.includes("order by")) {
              // Handle ORDER BY - extract all ORDER BY clauses
              const orderByMatches = [...sql.matchAll(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)/gi)];
              // Sort by each ORDER BY column in sequence
              orderByMatches.reverse().forEach(match => {
                const col = match[1];
                const dir = match[2]?.toUpperCase() === 'DESC' ? -1 : 1;
                result.sort((a, b) => {
                  const aVal = a?.[col];
                  const bVal = b?.[col];
                  if (aVal == null && bVal == null) return 0;
                  if (aVal == null) return 1 * dir;
                  if (bVal == null) return -1 * dir;
                  if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return aVal.localeCompare(bVal) * dir;
                  }
                  return (Number(aVal) - Number(bVal)) * dir;
                });
              });
            }

            if (whereMatch && params.length > 0) {
              // Parse all WHERE conditions with ? to determine which param matches which column
              const whereParts = sql.split('WHERE')[1]?.split('ORDER BY')[0]?.split('LIMIT')[0] || '';
              const whereConditions = whereParts.match(/[\w.]+(?=\s*=\s*\?)/g) || [];

              // Count how many params are used for WHERE conditions
              // Match params to conditions in order
              whereConditions.forEach((col, idx) => {
                // Remove table prefix (e.g., 'ts.' -> '') but keep the column name
                const cleanedCol = col.replace(/^[a-z]+\./i, '');
                const paramIdx = Math.max(0, params.length - whereConditions.length + idx);
                if (paramIdx < params.length) {
                  result = result.filter(r => r && r[cleanedCol] === params[paramIdx]);
                }
              });
            }

            // Handle LIMIT with parameter or literal
            if (limitMatch === 'param' && params.length > 0) {
              // LIMIT ? uses the last parameter
              const limitParam = params[params.length - 1] as number;
              result = result.slice(0, limitParam);
            } else if (typeof limitMatch === 'object' && limitMatch !== null) {
              result = result.slice(0, parseInt((limitMatch as RegExpMatchArray)[1], 10));
            }
            return result;
          },
        };
      }

      // Handle UPDATE statements
      if (lowerSql.includes("update")) {
        const tableName = parseTableName(sql);
        const table = tableName && tables.get(tableName.toLowerCase());
        const setMatch = sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/i);
        let lastUpdatedId: number | null = null;

        return {
          run: (...params: unknown[]) => {
            if (!table) return { lastInsertRowid: 0, changes: 0 };
            let changes = 0;
            const setValues: Record<string, unknown> = {};

            // Count actual parameters in SET clause
            let setParamCount = 0;
            if (setMatch) {
              const setClause = setMatch[1];
              // Count question marks as parameters
              const questionMarks = setClause.match(/\?/g) || [];
              setParamCount = questionMarks.length;
            }

            // Extract values for SET columns (params before the WHERE id)
            const setParams = params.slice(0, setParamCount);
            const targetId = setParamCount < params.length ? params[setParamCount] : null;

            if (setMatch) {
              const setClause = setMatch[1];
              // Match patterns like "column = ?", "column = CURRENT_TIMESTAMP", or "column = 0"
              const assignments = setClause.split(',').map(s => s.trim());
              let setParamIdx = 0;
              assignments.forEach((assignment) => {
                // Split on first '=' only - handle "column = value"
                const eqIndex = assignment.indexOf('=');
                if (eqIndex === -1) return;

                const col = assignment.substring(0, eqIndex).trim();
                const valExpr = assignment.substring(eqIndex + 1).trim();

                if (col) {
                  // Handle CURRENT_TIMESTAMP in SQL (not a parameter)
                  if (valExpr?.toUpperCase() === 'CURRENT_TIMESTAMP') {
                    setValues[col] = new Date().toISOString();
                  } else if (valExpr?.toUpperCase() === '?') {
                    // Parameter - use value from setParams
                    setValues[col] = setParams[setParamIdx++];
                  } else if (valExpr?.match(/^\d+$/)) {
                    // Numeric literal
                    setValues[col] = Number(valExpr);
                  } else if (valExpr?.toUpperCase() === 'NULL') {
                    // NULL literal
                    setValues[col] = null;
                  }
                }
              });
            }

            // Check for WHERE id = ? pattern
            const whereIdMatch = sql.match(/WHERE\s+id\s*=\s*\?/i);

            table.forEach((record, key) => {
              // If WHERE id = ?, only update matching record
              if (whereIdMatch && targetId !== null && key !== targetId && key !== Number(targetId)) {
                return;
              }
              Object.assign(record, setValues);
              changes++;
              lastUpdatedId = key;
            });

            return { lastInsertRowid: lastUpdatedId || 0, changes };
          },
          get: (...params: unknown[]) => {
            if (!table || table.size === 0) return undefined;
            if (params.length > 0) {
              const id = params[0];
              return table.get(typeof id === 'string' ? Number(id) : id as number);
            }
            if (lastUpdatedId !== null) {
              return table.get(lastUpdatedId);
            }
            return table.values().next().value;
          },
          all: () => [],
        };
      }

      // Handle DELETE statements
      if (lowerSql.includes("delete")) {
        const tableName = parseTableName(sql);
        const table = tableName && tables.get(tableName.toLowerCase());
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);

        return {
          run: (...params: unknown[]) => {
            if (!table) return { lastInsertRowid: 0, changes: 0 };
            let changes = 0;

            const toRemove = params[params.length - 1];
            if (whereMatch) {
              for (const [key, record] of Array.from(table.entries())) {
                if (record[whereMatch[1]] === toRemove) {
                  table.delete(key);
                  changes++;
                }
              }
            } else {
              changes = table.size;
              table.clear();
            }

            return { lastInsertRowid: 0, changes };
          },
          get: () => undefined,
          all: () => [],
        };
      }

      // Default statement
      return {
        run: () => ({ lastInsertRowid: 0, changes: 0 }),
        get: () => undefined,
        all: () => [],
      };
    },

    exec(sql: string): void {
      const createMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      if (createMatch) {
        const tableName = createMatch[1].toLowerCase();
        if (!tables.has(tableName)) {
          tables.set(tableName, new Map());
        }
      }
    },

    close: () => {},

    transaction<T>(fn: () => T): T {
      return fn();
    },

    _reset: reset,
  };
}

export default createMockDatabase;