import type { Database, Statement } from "../driver";

interface MockRow {
  id: number;
  [key: string]: unknown;
}

interface MockTable {
  rows: MockRow[];
  nextId: number;
}

const mockTables: Record<string, MockTable> = {};

function getTable(name: string | null): MockTable {
  if (!name) return { rows: [], nextId: 1 };
  if (!mockTables[name]) {
    mockTables[name] = { rows: [], nextId: 1 };
  }
  return mockTables[name];
}

function extractTableName(sql: string): string | null {
  // Try various patterns to extract table name
  const patterns = [
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/i,
    /CREATE\s+TABLE\s+(\w+)/i,
    /INSERT\s+INTO\s+(\w+)/i,
    /SELECT\s+\*\s+FROM\s+(\w+)/i,
    /SELECT\s+FROM\s+(\w+)/i,
    /SELECT\s+COUNT\(\*\)\s+FROM\s+(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = sql.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function createMockDatabase(): Database {
  return {
    prepare(sql: string): Statement {
      const tableName = extractTableName(sql);
      const table = getTable(tableName);

      return {
        run: (...params: unknown[]) => {
          if (sql.toUpperCase().includes("INSERT INTO")) {
            const row: MockRow = {
              id: table.nextId++,
              name: typeof params[0] === "string" ? params[0] : "value",
              emoji: "📋",
              color: "#6366f1",
            };
            table.rows.push(row);
            return { lastInsertRowid: row.id, changes: 1 };
          }
          return { lastInsertRowid: 0, changes: 0 };
        },

        get: (...params: unknown[]) => {
          // Handle COUNT queries
          if (sql.toUpperCase().includes("COUNT(*)")) {
            return { count: table.rows.length } as any;
          }

          // Handle WHERE conditions for filtering
          if (params.length > 0 && typeof params[0] === "string" && params[1] !== undefined) {
            const key = params[0];
            const value = params[1];
            return table.rows.find((row) => row[key] === value) || null;
          }

          // Simple select all or by ID
          return table.rows[0] || null;
        },

        all: () => {
          if (sql.toUpperCase().includes("COUNT(*)")) {
            return [{ count: table.rows.length }];
          }
          return table.rows;
        },
      };
    },

    exec(sql: string): void {
      const createTableMatch = sql.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/i);

      if (createTableMatch) {
        const tableName = createTableMatch[1];
        if (!mockTables[tableName]) {
          mockTables[tableName] = { rows: [], nextId: 1 };
        }
      }

      // Handle INSERT OR IGNORE for inbox list
      if (sql.includes("INSERT OR IGNORE") && sql.includes("lists")) {
        if (!mockTables["lists"]?.rows?.length) {
          mockTables["lists"] = {
            rows: [
              {
                id: 1,
                name: "Inbox",
                emoji: "📥",
                color: "#6366f1",
                is_inbox: 1,
              },
            ],
            nextId: 2,
          };
        }
      }
    },

    close(): void {
      Object.keys(mockTables).forEach((key) => {
        mockTables[key].rows = [];
        mockTables[key].nextId = 1;
      });
    },

    transaction<T>(fn: () => T): T {
      try {
        return fn();
      } catch (error) {
        throw error;
      }
    },
  };
}