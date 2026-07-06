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

  // Parse WHERE clause conditions: returns array of {column, value}
  // Also returns the number of WHERE parameters consumed
  function parseWhereConditions(sql: string, params: unknown[]): { column: string; value: unknown }[] {
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (!whereMatch) return [];

    const whereClause = whereMatch[1];
    const conditions = [];

    // Match conditions like "column = ?" with parameter
    const paramMatches = [...whereClause.matchAll(/([\w.]+)\s*=\s*\?/gi)];

    // Match conditions like "column = value" where value is a literal (string or number, NOT SQL keywords)
    const literalMatches = [...whereClause.matchAll(/([\w.]+)\s*=\s*(?:'([^']*)'|(?!ORDER|LIMIT|OFFSET)(?:\b|^)(\w+))/gi)];

    // Track which params we've used for parameterized conditions
    const paramConditions: Record<string, unknown> = {};
    paramMatches.forEach((match, idx) => {
      const col = match[1].replace(/^[a-z]+\./i, '');
      paramConditions[col] = params[idx];
    });

    // Combine conditions - add param conditions first
    const allUsedCols = new Set<string>();
    paramMatches.forEach(m => {
      const col = m[1].replace(/^[a-z]+\./i, '');
      allUsedCols.add(col);
    });

    // Add literal conditions (not already covered by param conditions)
    literalMatches.forEach(match => {
      const col = match[1].replace(/^[a-z]+\./i, '');
      // match[2] is quoted string, match[3] is unquoted value
      const val = match[2] !== undefined ? match[2] : match[3];

      // Skip if already handled as param or no value
      if (allUsedCols.has(col) || !val) return;

      let value: unknown = val;
      // Handle numeric literals
      if (/^\d+$/.test(val)) {
        value = Number(val);
      }
      conditions.push({ column: col, value });
    });

    // Add param conditions
    Object.entries(paramConditions).forEach(([col, val]) => {
      conditions.push({ column: col, value: val });
    });

    return conditions;
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

            // Set default values for columns not in INSERT statement
            // These defaults match the actual database schema
            if (tableName === 'tasks') {
              if (!columns.includes('completed')) {
                record.completed = 0;
              }
              if (!columns.includes('user_id')) {
                record.user_id = null;
              }
            }
            if (tableName === 'lists' && !columns.includes('user_id')) {
              record.user_id = null;
            }

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

        return {
          run: () => ({ lastInsertRowid: 0, changes: 0 }),
          get: (...params: unknown[]) => {
            // Check the table for the record
            if (!table || table.size === 0) return undefined;

            const allRecords = Array.from(table.values());

            // Handle simple WHERE id = ? pattern
            const whereIdMatch = sql.match(/WHERE\s+id\s*=\s*\?/i);
            if (whereIdMatch && params.length > 0) {
              const id = params[params.length - 1] as number;
              return allRecords.find(r => r && r.id === id);
            }

            // Handle WHERE with user_id = ? OR user_id IS NULL pattern
            const hasUserIdCondition = /user_id\s*=\s*\?\s*OR\s*user_id\s*IS\s*NULL/i.test(sql);
            if (hasUserIdCondition && params.length > 0) {
              const userId = params[0] as number;
              return allRecords.find(r => r && (r.user_id === userId || r.user_id === null || r.user_id === undefined));
            }

            // Handle simple WHERE column = ? pattern
            const simpleWhereMatch = sql.match(/WHERE\s+([\w.]+)\s*=\s*\?/i);
            if (simpleWhereMatch && params.length > 0) {
              const col = simpleWhereMatch[1].replace(/^[a-z]+\./i, '');
              const val = params[0];
              return allRecords.find(r => r && r[col] === val);
            }

            // Handle WHERE with literal values like completed = 0
            const literalWhereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
            if (literalWhereMatch) {
              const whereText = literalWhereMatch[1];
              // Handle completed = 0
              if (/\bcompleted\s*=\s*0\b/i.test(whereText)) {
                return allRecords.find(r => r && r.completed === 0);
              }
              // Handle completed = 1
              if (/\bcompleted\s*=\s*1\b/i.test(whereText)) {
                return allRecords.find(r => r && r.completed === 1);
              }
            }

            // No WHERE - return first record
            return allRecords[0];
          },
          all: (...params: unknown[]) => {
            if (!table) return [];
            let result = Array.from(table.values());

            // Handle ORDER BY - extract all ORDER BY clauses
            if (lowerSql.includes("order by")) {
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

            // Handle WHERE clause - parse all conditions
            if (lowerSql.includes("where")) {
              const whereClause = sql.split('WHERE')[1]?.split('ORDER BY')[0]?.split('LIMIT')[0] || '';

              // Handle user_id = ? OR user_id IS NULL pattern - user_id can be null or match param
              // In test/demo mode, return all records (skip user isolation for simplicity)
              if (/\buser_id\s*=\s*\?\s*OR\s*user_id\s*IS\s*NULL\b/i.test(whereClause)) {
                // Skip user_id filtering in mock - all records should be visible
                // This handles the demo mode where tasks have user_id=NULL
              }

              // Handle completed = 0 literal (incomplete tasks)
              if (/\bcompleted\s*=\s*0\b/i.test(whereClause)) {
                result = result.filter(r => r && r.completed === 0);
              }

              // Handle completed = 1 literal (completed tasks)
              if (/\bcompleted\s*=\s*1\b/i.test(whereClause)) {
                result = result.filter(r => r && (r.completed === 1 || r.completed === true));
              }

              // Handle list_id = ? pattern
              const listIdMatch = whereClause.match(/list_id\s*=\s*\?/i);
              if (listIdMatch) {
                const listId = params[0];
                result = result.filter(r => r && r.list_id === listId);
              }

              // Handle date = ? pattern
              const dateMatch = whereClause.match(/date\s*=\s*\?/i);
              if (dateMatch) {
                // Find the index of date in WHERE clause
                const paramCountBeforeDate = (whereClause.substring(0, dateMatch.index!).match(/\?/g) || []).length;
                const date = params[paramCountBeforeDate];
                result = result.filter(r => r && r.date === date);
              }

              // Handle date >= ? pattern (for upcoming/next7 views)
              const dateGteMatch = whereClause.match(/date\s*>\s*\?/i);
              if (dateGteMatch) {
                const paramCountBeforeDate = (whereClause.substring(0, dateGteMatch.index!).match(/\?/g) || []).length;
                const date = params[paramCountBeforeDate];
                result = result.filter(r => r && r.date >= date);
              }
            }

            // Handle LIMIT ? with variable - always use the last param
            const limitParamMatch = sql.match(/LIMIT\s+\?/i);
            if (limitParamMatch && params.length > 0) {
              // LIMIT is the last parameter
              const limitValue = params[params.length - 1] as number;
              result = result.slice(0, Math.max(0, limitValue));
            } else {
              const limitLiteralMatch = sql.match(/LIMIT\s+(\d+)/i);
              if (limitLiteralMatch) {
                const limitValue = parseInt(limitLiteralMatch[1], 10);
                result = result.slice(0, limitValue);
              }
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
            if (whereIdMatch && targetId !== null) {
              // Update only the specific record
              const existing = table.get(Number(targetId));
              if (existing) {
                Object.assign(existing, setValues);
                changes = 1;
              }
              return { lastInsertRowid: Number(targetId), changes };
            }

            // Update all records if no WHERE clause
            table.forEach((record) => {
              Object.assign(record, setValues);
              changes++;
            });

            return { lastInsertRowid: changes > 0 ? Array.from(table.keys())[0] : 0, changes };
          },
          get: (...params: unknown[]) => {
            if (!table || table.size === 0) return undefined;
            // If WHERE id = ? pattern, return that specific record
            const whereIdMatch = sql.match(/WHERE\s+id\s*=\s*\?/i);
            if (whereIdMatch && params.length > 0) {
              const id = params[params.length - 1] as number;
              return table.get(Number(id));
            }
            // Otherwise return first record
            const records = Array.from(table.values());
            return records[0];
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
      // Handle CREATE TABLE
      const createMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      if (createMatch) {
        const tableName = createMatch[1].toLowerCase();
        if (!tables.has(tableName)) {
          tables.set(tableName, new Map());
        }
        return;
      }
      // Handle INSERT via exec (used in tests)
      if (sql.toLowerCase().includes("insert")) {
        const tableName = parseTableName(sql);
        const table = tableName && tables.get(tableName.toLowerCase());
        const columns = parseColumns(sql);
        const valuesMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);

        if (table && valuesMatch && columns.length > 0) {
          const valuesStr = valuesMatch[1];
          // Parse values with proper handling of quotes and parentheses
          const values = [];
          let parenDepth = 0;
          let current = '';
          for (const char of valuesStr) {
            if (char === '(' || char === '{' || char === '[') parenDepth++;
            if (char === ')' || char === '}' || char === ']') parenDepth--;
            if (char === ',' && parenDepth === 0) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          if (current.trim()) values.push(current.trim());

          const record: Record<string, unknown> = {};

          columns.forEach((col, i) => {
            const val = values[i];
            if (val?.startsWith("'") && val?.endsWith("'")) {
              record[col] = val.slice(1, -1);
            } else if (/^\d+$/.test(val)) {
              record[col] = Number(val);
            } else if (val?.startsWith('(') && val?.endsWith(')')) {
              // Handle array literals like ('label1', 'label2')
              record[col] = val.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
            } else {
              record[col] = val;
            }
          });

          if (record.id) {
            table.set(record.id as number, record);
          }
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