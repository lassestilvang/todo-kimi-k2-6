/* eslint-disable @typescript-eslint/no-explicit-any */
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
      "goals", "user_settings", "rate_limit_log", "migrations", "workspaces", "workspace_users",
      // Knowledge graph tables
      "task_connections", "decision_entries", "decision_options", "decision_templates",
      "task_insights", "user_skills", "habit_contexts", "knowledge_graph_activities",
      "cognitive_load_logs", "task_mappings", "smart_inbox_sources",
      "workflows", "workflow_executions"
    ];
    schemaTables.forEach(name => tables.set(name, new Map()));

    // Create default inbox
    const listsTable = tables.get("lists");
    if (listsTable) {
      listsTable.set(1, {
        id: 1,
        name: "Inbox",
        emoji: "📥",
        color: "#6366f1",
        is_inbox: 1,
        user_id: null as number | null,
        created_at: new Date().toISOString()
      });
    }
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

          get: (...params: unknown[]) => {
            if (!table) return undefined;
            // For SELECT queries with params, filter by WHERE conditions
            if (params.length > 0) {
              const allRecords = Array.from(table.values());
              const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
              if (whereMatch) {
                const whereClause = whereMatch[1];

                // Handle OR conditions like "user_id = ? OR user_id IS NULL"
                const orMatch = whereClause.match(/([\w.]+)\s*=\s*\?\s*OR\s+([\w.]+)\s+IS\s+NULL/i);
                if (orMatch) {
                  const col = orMatch[1].replace(/^[a-z]+\./i, '');
                  const nullCol = orMatch[2];
                  const paramValue = params[0];
                  return allRecords.find(r =>
                    r && (r[col] === paramValue || r[nullCol] === null || r[nullCol] === undefined)
                  );
                }

                // Parse all conditions: both parameterized (?,) and literal values
                const paramConditions: Array<{ column: string; paramIndex: number }> = [];
                const literalConditions: Array<{ column: string; value: unknown }> = [];

                // Extract parameterized conditions: column = ?
                const paramMatches = [...whereClause.matchAll(/([\w.]+)\s*=\s*\?/gi)];
                paramMatches.forEach((match, idx) => {
                  const col = match[1].replace(/^[a-z]+\./i, '');
                  paramConditions.push({ column: col, paramIndex: idx });
                });

                // Extract literal numeric conditions: column = 123 (not followed by ?)
                const literalMatches = [...whereClause.matchAll(/([\w.]+)\s*=\s*(\d+)\b(?!\s*\?)/gi)];
                literalMatches.forEach((match) => {
                  const col = match[1].replace(/^[a-z]+\./i, '');
                  const val = Number(match[2]);
                  literalConditions.push({ column: col, value: val });
                });

                // First, filter by parameterized conditions
                const firstResult = allRecords.find(r =>
                  r && paramConditions.every(cond =>
                    r[cond.column] === params[cond.paramIndex]
                  )
                );

                if (!firstResult) return undefined;

                // Then filter by literal conditions
                for (const cond of literalConditions) {
                  if (firstResult[cond.column] !== cond.value) {
                    return undefined;
                  }
                }

                return firstResult;
              }
            }
            return table instanceof Map ? Array.from(table.values())[0] : undefined;
          },
          all: (...params: unknown[]) => {
            if (!table) return [];
            if (params.length === 0) {
              return Array.from(table.values());
            }
            const allRecords = Array.from(table.values());
            const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
            if (whereMatch) {
              const whereClause = whereMatch[1];

              // Handle OR conditions like "user_id = ? OR user_id IS NULL"
              const orMatch = whereClause.match(/([\w.]+)\s*=\s*\?\s*OR\s+([\w.]+)\s+IS\s+NULL/i);
              if (orMatch) {
                const col = orMatch[1].replace(/^[a-z]+\./i, '');
                const nullCol = orMatch[2];
                const paramValue = params[0];
                return allRecords.filter(r =>
                  r && (r[col] === paramValue || r[nullCol] === null || r[nullCol] === undefined)
                );
              }

              // Parse all conditions: both parameterized (?,) and literal values
              const paramConditions: Array<{ column: string; paramIndex: number }> = [];
              const literalConditions: Array<{ column: string; value: unknown }> = [];

              // Extract parameterized conditions: column = ?
              const paramMatches = [...whereClause.matchAll(/([\w.]+)\s*=\s*\?/gi)];
              paramMatches.forEach((match, idx) => {
                const col = match[1].replace(/^[a-z]+\./i, '');
                paramConditions.push({ column: col, paramIndex: idx });
              });

              // Extract literal numeric conditions: column = 123 (not followed by ?)
              const literalMatches = [...whereClause.matchAll(/([\w.]+)\s*=\s*(\d+)\b(?!\s*\?)/gi)];
              literalMatches.forEach((match) => {
                const col = match[1].replace(/^[a-z]+\./i, '');
                const val = Number(match[2]);
                literalConditions.push({ column: col, value: val });
              });

              // Filter by both parameterized and literal conditions
              return allRecords.filter(r => {
                // Check parameterized conditions
                const paramMatch = paramConditions.every(cond =>
                  r && r[cond.column] === params[cond.paramIndex]
                );
                if (!paramMatch) return false;

                // Check literal conditions
                const literalMatch = literalConditions.every(cond =>
                  r && r[cond.column] === cond.value
                );
                return literalMatch;
              });
            }
            return allRecords;
          },
        };
      }

      // Handle SELECT statements
      if (lowerSql.includes("select")) {
        const tableName = parseTableName(sql);
        const table = tableName && tables.get(tableName.toLowerCase());

        if (lowerSql.includes("count(*)")) {
          const tableSize = table instanceof Map ? table.size : 0;
          return {
            run: () => ({ lastInsertRowid: 0, changes: 0 }),
            get: () => ({ count: tableSize }),
            all: () => [{ count: tableSize }],
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
          // Check for task_labels join (for getTaskRelations)
          const hasTaskLabelsJoin = lowerSql.includes("join task_labels tl on");
          const hasTaskDependenciesJoin = lowerSql.includes("join tasks t on");

          if (hasTaskLabelsJoin) {
            // Handle task_labels join for getTaskRelations
            // SELECT l.*, tl.task_id FROM labels l JOIN task_labels tl ON l.id = tl.label_id WHERE tl.task_id IN (...)
            return {
              run: () => ({ lastInsertRowid: 0, changes: 0 }),
              get: () => undefined,
              all: (...params: unknown[]) => {
                const labelsTable = tables.get("labels");
                const taskLabelsTable = tables.get("task_labels");
                const labels = labelsTable ? Array.from(labelsTable.values()) : [];
                const taskLabels = taskLabelsTable ? Array.from(taskLabelsTable.values()) : [];

                return labels
                  .map((label: Record<string, unknown>) => {
                    // Find matching task_labels entries
                    const matchingLabels = taskLabels.filter((tl: Record<string, unknown>) =>
                      tl.label_id === label.id && params.includes(tl.task_id)
                    );
                    return matchingLabels.map((tl: Record<string, unknown>) => ({
                      ...label,
                      task_id: tl.task_id,
                    }));
                  })
                  .flat();
              },
            };
          }

          if (hasTaskDependenciesJoin && lowerSql.includes("task_dependencies")) {
            // Handle task_dependencies joins for getTaskRelations
            return {
              run: () => ({ lastInsertRowid: 0, changes: 0 }),
              get: () => undefined,
              all: (...params: unknown[]) => {
                const depsTable = tables.get("task_dependencies");
                const tasksTable = tables.get("tasks");
                const deps = depsTable ? Array.from(depsTable.values()) : [];

                return deps
                  .filter((dep: Record<string, unknown>) => params.includes(dep.depends_on_task_id) || params.includes(dep.task_id))
                  .map((dep: Record<string, unknown>) => {
                    const task = tasksTable?.get(dep.task_id as number);
                    return {
                      ...dep,
                      blocked_task_name: task?.name,
                      blocking_task_name: tasksTable?.get(dep.depends_on_task_id as number)?.name,
                    };
                  });
              },
            };
          }

          // Handle IN clause queries for task_logs, task_comments, etc. (from getTaskRelations)
          // These don't have JOIN, they're simple SELECTs with IN clause
          if (lowerSql.includes("in (") && !hasTaskLabelsJoin && !hasTaskDependenciesJoin) {
            // Determine which table to query based on FROM clause
            let tableKey: string | null = null;
            if (lowerSql.includes("from task_logs")) tableKey = "task_logs";
            else if (lowerSql.includes("from task_comments")) tableKey = "task_comments";
            else if (lowerSql.includes("from subtasks where task_id in")) tableKey = "subtasks";
            else if (lowerSql.includes("from reminders where task_id in")) tableKey = "reminders";
            else if (lowerSql.includes("from task_attachments")) tableKey = "task_attachments";
            else if (lowerSql.includes("from time_entries")) tableKey = "time_entries";
            else if (lowerSql.includes("from recurring_exceptions")) tableKey = "recurring_exceptions";

            if (tableKey) {
              return {
                run: () => ({ lastInsertRowid: 0, changes: 0 }),
                get: () => undefined,
                all: (...params: unknown[]) => {
                  const targetTable = tables.get(tableKey);
                  if (!targetTable) return [];
                  let result = Array.from(targetTable.values());
                  // Filter by task_id IN (...) - params are all task IDs
                  // For single task_id queries, params[0] is the task_id
                  const taskIds = params.filter((p): p is number => typeof p === 'number');
                  if (taskIds.length > 0) {
                    result = result.filter((r: Record<string, unknown>) => taskIds.includes(r.task_id as number));
                  }
                  // Handle ORDER BY if present
                  const orderByMatch = sql.match(/ORDER\s+BY\s+(\w+)/i);
                  if (orderByMatch) {
                    const col = orderByMatch[1];
                    result.sort((a, b) => {
                      const aVal = a?.[col];
                      const bVal = b?.[col];
                      if (aVal == null && bVal == null) return 0;
                      if (aVal == null) return -1;
                      if (bVal == null) return 1;
                      if (typeof aVal === 'string' && typeof bVal === 'string') {
                        return aVal.localeCompare(bVal);
                      }
                      return (Number(aVal) - Number(bVal));
                    });
                  }
                  return result;
                },
              };
            }
          }

          if (hasRemindersJoin) {
            // Determine which table to query based on FROM clause
            let tableKey: string | null = null;
            if (lowerSql.includes("from subtasks where task_id in")) tableKey = "subtasks";
            else if (lowerSql.includes("from reminders where task_id in")) tableKey = "reminders";
            else if (lowerSql.includes("from task_logs where task_id in")) tableKey = "task_logs";
            else if (lowerSql.includes("from task_comments where task_id in")) tableKey = "task_comments";
            else if (lowerSql.includes("from task_attachments where task_id in")) tableKey = "task_attachments";
            else if (lowerSql.includes("from time_entries where task_id in")) tableKey = "time_entries";
            else if (lowerSql.includes("from recurring_exceptions where task_id in")) tableKey = "recurring_exceptions";

            if (tableKey) {
              return {
                run: () => ({ lastInsertRowid: 0, changes: 0 }),
                get: () => undefined,
                all: (...params: unknown[]) => {
                  const targetTable = tables.get(tableKey);
                  if (!targetTable) return [];
                  let result = Array.from(targetTable.values());
                  // Filter by task_id IN (...) - params are all task IDs
                  result = result.filter((r: Record<string, unknown>) => params.includes(r.task_id));
                  // Handle ORDER BY if present
                  const orderByMatch = sql.match(/ORDER\s+BY\s+(\w+)/i);
                  if (orderByMatch) {
                    const col = orderByMatch[1];
                    result.sort((a, b) => {
                      const aVal = a?.[col];
                      const bVal = b?.[col];
                      if (aVal == null && bVal == null) return 0;
                      if (aVal == null) return -1;
                      if (bVal == null) return 1;
                      if (typeof aVal === 'string' && typeof bVal === 'string') {
                        return aVal.localeCompare(bVal);
                      }
                      return (Number(aVal) - Number(bVal));
                    });
                  }
                  return result;
                },
              };
            }
          }

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
                })) as any[];

                // Apply WHERE clause filtering for date/reminder conditions
                if (isDue) {
                  result = result.filter((r: any) => r.remind_at <= now && r.task_completed === 0);
                } else if (isUpcoming) {
                  result = result.filter((r: any) => r.remind_at >= now);
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
               
              get: (...params: unknown[]): any => {
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

            // Handle WHERE with multiple conditions (e.g., id = ? AND user_id = ? AND enabled = 1)
            const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
            if (whereMatch && params.length > 0) {
              const whereClause = whereMatch[1];

              // Parse multiple conditions
              const conditions: Array<{ column: string; value: unknown }> = [];
              let paramIdx = 0;

              // Handle chained conditions like "id = ? AND user_id = ?"
              const conditionsMatch = whereClause.match(/([\w.]+)\s*=\s*\?/gi);
              if (conditionsMatch) {
                conditionsMatch.forEach(match => {
                  // Extract just the column name from the match
                  const colMatch = match.match(/^([\w.]+)\s*=\s*\?/i);
                  if (colMatch) {
                    const columnName = colMatch[1].replace(/^[a-z]+\./i, '');
                    conditions.push({ column: columnName, value: params[paramIdx++] });
                  }
                });
              }

              // Handle literal conditions like "enabled = 1" in the WHERE clause
              const literalMatches = [...whereClause.matchAll(/([\w.]+)\s*=\s*(\d+)\b(?!\s*\?)/gi)];
              literalMatches.forEach(match => {
                const col = match[1].replace(/^[a-z]+\./i, '');
                const val = Number(match[2]);
                conditions.push({ column: col, value: val });
              });

              // Filter records matching all conditions
              if (conditions.length > 0) {
                const result = allRecords.find(r =>
                  r && conditions.every(cond => r[cond.column] === cond.value)
                );

                if (result) return result;
                return undefined;
              }
            }

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

            // Handle WHERE with email = ? pattern for user lookup (auth)
            const emailWhereMatch = sql.match(/WHERE\s+email\s*=\s*\?/i);
            if (emailWhereMatch && params.length > 0) {
              const email = params[0] as string;
              return allRecords.find(r => r && r.email === email);
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
              const whereClause = sql.split('WHERE')[1]?.split('ORDER BY')[0]?.split('LIMIT')[0]?.trim() || '';

              // Handle task_id IN (...) pattern - params are task IDs to match
              const inMatch = whereClause.match(/task_id\s+in\s*\(/i);
              if (inMatch && params.length > 0) {
                result = result.filter(r => r && params.includes(r.task_id));
              } else {
                // Handle other WHERE patterns
                // Handle user_id = ? OR user_id IS NULL pattern (user_id can be null or match param)
                if (/\buser_id\s*=\s*\d+\s+OR\s+user_id\s+IS\s+NULL\b/i.test(whereClause)) {
                  const userIdMatch = whereClause.match(/\buser_id\s*=\s*(\d+)\b/i);
                  if (userIdMatch) {
                    const userId = parseInt(userIdMatch[1], 10);
                    result = result.filter(r => r && (r.user_id === userId || r.user_id === null || r.user_id === undefined));
                  }
                } else if (/\buser_id\s*=\s*\?\s+OR\s+user_id\s+IS\s+NULL\b/i.test(whereClause)) {
                  const userId = params[0] as number;
                  result = result.filter(r => r && (r.user_id === userId || r.user_id === null || r.user_id === undefined));
                } else {
                  // Handle user_id = ? pattern (for user-isolated queries)
                  const userIdMatch = whereClause.match(/\buser_id\s*=\s*\?/i);
                  if (userIdMatch && params.length > 0) {
                    const userId = params[0];
                    result = result.filter(r => r && r.user_id === userId);
                  }
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
                if (dateMatch && dateMatch.index !== undefined) {
                  // Find the index of date in WHERE clause
                  const paramCountBeforeDate = (whereClause.substring(0, dateMatch.index).match(/\?/g) || []).length;
                  const date = params[paramCountBeforeDate];
                  result = result.filter(r => r && r.date === date);
                }

                // Handle date >= ? pattern (for upcoming/next7 views)
                const dateGteMatch = whereClause.match(/date\s*>\s*\?/i);
                if (dateGteMatch && dateGteMatch.index !== undefined) {
                  const paramCountBeforeDate = (whereClause.substring(0, dateGteMatch.index).match(/\?/g) || []).length;
                  const date = params[paramCountBeforeDate] as string;

                  result = result.filter((r: any) => r && r.date >= date);
                }

                // Handle email = ? pattern for user lookup (auth)
                const emailMatch = whereClause.match(/email\s*=\s*\?/i);
                if (emailMatch && params.length > 0) {
                  const email = params[0] as string;
                  result = result.filter(r => r && r.email === email);
                }
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

        return {
          run: (...params: unknown[]) => {
            if (!table) return { lastInsertRowid: 0, changes: 0 };
            let changes = 0;

            // Handle WHERE id = ? AND user_id = ? pattern
            const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?\s+AND\s+(\w+)\s*=\s*\?/i);
            if (whereMatch) {
              const [col1, col2] = [whereMatch[1], whereMatch[2]];
              const [val1, val2] = [params[0], params[1]];
              for (const [key, record] of Array.from(table.entries())) {
                if (record[col1] === val1 && record[col2] === val2) {
                  table.delete(key);
                  changes++;
                }
              }
            } else {
              // Handle simple WHERE id = ? pattern
              const simpleWhereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
              if (simpleWhereMatch) {
                const col = simpleWhereMatch[1];
                const val = params[0];
                for (const [key, record] of Array.from(table.entries())) {
                  if (record[col] === val) {
                    table.delete(key);
                    changes++;
                  }
                }
              } else {
                // No WHERE clause - delete all
                changes = table.size;
                table.clear();
              }
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
      // Handle multiple statements (separated by semicolons)
      const statements = sql.split(';').filter(s => s.trim().length > 0);

      for (const stmt of statements) {
        const trimmedStmt = stmt.trim();

        // Handle CREATE TABLE
        const createMatch = trimmedStmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
        if (createMatch) {
          const tableName = createMatch[1].toLowerCase();
          if (!tables.has(tableName)) {
            tables.set(tableName, new Map());
          }
          continue;
        }

        // Handle CREATE INDEX (ignore for mock)
        if (trimmedStmt.toLowerCase().includes("create index")) {
          continue;
        }

        // Handle INSERT via exec (used in tests)
        if (trimmedStmt.toLowerCase().includes("insert")) {
          // Replace SQL functions with their values
          let processedStmt = trimmedStmt;
          // Replace datetime('now') with current ISO timestamp
          processedStmt = processedStmt.replace(/datetime\s*\(\s*'now'\s*\)/gi, new Date().toISOString());
          // Replace CURRENT_TIMESTAMP with current ISO timestamp
          processedStmt = processedStmt.replace(/CURRENT_TIMESTAMP/gi, new Date().toISOString());

          const tableName = parseTableName(processedStmt);
          const table = tableName && tables.get(tableName.toLowerCase());
          const columns = parseColumns(processedStmt);
          const valuesMatch = processedStmt.match(/VALUES\s*\(([^)]+)\)/i);

          if (table && valuesMatch && columns.length > 0) {
            const valuesStr = valuesMatch[1];
            // Parse values with proper handling of quotes and parentheses
            const values: any[] = [];
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
                record[col] = val.slice(1, -1).split(',').map((v: string) => v.trim().replace(/['"]/g, ''));
              } else {
                record[col] = val;
              }
            });

            // Auto-generate ID if not provided
            if (!record.id) {
              let maxId = 0;
              table.forEach((rec) => {
                if (rec.id !== undefined && rec.id !== null) {
                  maxId = Math.max(maxId, Number(rec.id));
                }
              });
              record.id = maxId + 1;
            }
            table.set(record.id as number, record);
          }
        }
      }
    },

    // Mock database - no-op close for testing environments where native bindings unavailable
    close: () => { /* no-op */ },

    transaction<T>(fn: () => T): T {
      return fn();
    },

    _reset: reset,
  };
}

export default createMockDatabase;