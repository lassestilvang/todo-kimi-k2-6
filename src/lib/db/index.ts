import { join } from "path";
import { createDatabase, type Database } from "./driver";
import { runMigrations } from "./migrations";
import { config } from "@/lib/config";

let db: Database | null = null;

// Re-export Database type for convenience
export type { Database };

/**
 * Execute a function within a database transaction.
 * Provides a consistent interface for both SQLite and PostgreSQL.
 * @param fn The function to execute within a transaction
 * @returns The return value of the function
 */
export async function withTransaction<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const database = getDb();
  // SQLite transaction is synchronous, PostgreSQL is async
  // We handle both by checking the result type
  const result = database.transaction(() => fn(database));
  // If result is a promise, await it (PostgreSQL case)
  return result instanceof Promise ? await result : result;
}

/**
 * Execute a function within a database transaction (synchronous version).
 * Use this when you don't need to await the result.
 * @param fn The function to execute within a transaction
 * @returns The return value of the function
 */
export function withTransactionSync<T>(fn: (db: Database) => T): T {
  const database = getDb();
  // For synchronous functions with SQLite, transaction returns T directly
  return database.transaction(() => fn(database)) as T;
}

export function getDb(): Database {
  if (!db) {
    // Use configured database URL or default path
    const dbPath = config.database.url || join(process.cwd(), "data", "planner.db");
    db = createDatabase();

    // SQLite-specific configuration
    if (!config.isProduction && dbPath.startsWith("file:")) {
      db.exec("PRAGMA journal_mode = WAL");
    }

    initializeSchema(db);
    // Migrations handled separately
    void runMigrations();
  }
  return db;
}

export function setDb(testDb: Database): void {
  db = testDb;
}

/**
 * Resets the database singleton. Only for testing purposes.
 * This allows testing the actual database initialization path.
 */
export function resetDb(): void {
  if (db && typeof (db as Database & { _reset: () => void })._reset === "function") {
    (db as Database & { _reset: () => void })._reset();
  }
  db = null;
}

/**
 * Initializes the database schema. Called automatically by getDb() on first use.
 * Exported for testing purposes.
 */
export function initializeSchema(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '📋',
      color TEXT DEFAULT '#6366f1',
      is_inbox INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🏷️',
      color TEXT DEFAULT '#8b5cf6',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      notes TEXT,
      list_id INTEGER REFERENCES lists(id),
      date TEXT,
      deadline TEXT,
      estimate TEXT,
      actual_time TEXT,
      priority TEXT DEFAULT 'none' CHECK(priority IN ('critical', 'high', 'medium', 'low', 'none')),
      recurring TEXT CHECK(recurring IN ('none', 'daily', 'weekly', 'weekdays', 'monthly', 'yearly', 'custom')),
      recurring_config TEXT,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sort_order INTEGER DEFAULT 0,
      assignee_id INTEGER REFERENCES users(id),
      created_by INTEGER REFERENCES users(id),
      workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
      archived INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS task_labels (
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, label_id)
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      remind_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
    CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(list_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed_date ON tasks(completed, date);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline_completed ON tasks(deadline, completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority_deadline ON tasks(priority, deadline);
    CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON tasks(recurring);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);
    CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_logs_task ON task_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_task ON reminders(task_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_at ON reminders(remind_at);
    -- Task shares
    CREATE TABLE IF NOT EXISTS task_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      permission TEXT DEFAULT 'view' CHECK(permission IN ('view', 'edit')),
      share_token TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_task_shares_task ON task_shares(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_shares_user ON task_shares(user_id);
    CREATE INDEX IF NOT EXISTS idx_task_shares_token ON task_shares(share_token);

    -- Task dependencies (blockers)
    CREATE TABLE IF NOT EXISTS task_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, depends_on_task_id)
    );
    CREATE INDEX IF NOT EXISTS idx_dependencies_task ON task_dependencies(task_id);
    CREATE INDEX IF NOT EXISTS idx_dependencies_depends_on ON task_dependencies(depends_on_task_id);

    -- Task templates
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      list_id INTEGER REFERENCES lists(id),
      priority TEXT DEFAULT 'none' CHECK(priority IN ('critical', 'high', 'medium', 'low', 'none')),
      label_ids TEXT,
      subtasks TEXT,
      category_id INTEGER REFERENCES template_categories(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Template categories
    CREATE TABLE IF NOT EXISTS template_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Task comments
    CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id);

    -- Comment mentions (for @mentions)
    CREATE TABLE IF NOT EXISTS comment_mentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_id INTEGER NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(comment_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_mentions_user ON comment_mentions(user_id);
    CREATE INDEX IF NOT EXISTS idx_mentions_task ON comment_mentions(task_id);

    -- External Integrations (Slack, Discord webhooks)
    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('slack', 'discord', 'email')),
      webhook_url TEXT,
      channel TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, type)
    );
    CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id);

    -- Task votes for prioritization
    CREATE TABLE IF NOT EXISTS task_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      value INTEGER NOT NULL CHECK(value IN (-1, 1)),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_votes_task ON task_votes(task_id);
    CREATE INDEX IF NOT EXISTS idx_votes_user ON task_votes(user_id);

    -- Time tracking entries
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds INTEGER,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);

    -- Task attachments
    CREATE TABLE IF NOT EXISTS task_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_attachments_task ON task_attachments(task_id);

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      avatar_url TEXT,
      password_hash TEXT,
      preferences TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- User preferences as JSON
    -- preferences: {"theme": "dark|light", "notifications": true, "workHours": {"start": 9, "end": 17}}

    -- Calendar sync
    CREATE TABLE IF NOT EXISTS calendar_sync (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT DEFAULT 'google' CHECK(provider IN ('google', 'outlook')),
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Saved filter presets
    CREATE TABLE IF NOT EXISTS filter_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      filter_type TEXT,
      list_id INTEGER,
      label_ids TEXT,
      priority TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_filter_presets_user ON filter_presets(user_id);

    -- Custom views
    CREATE TABLE IF NOT EXISTS custom_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      filter_preset TEXT,
      list_id INTEGER,
      label_ids TEXT,
      priority TEXT,
      sort_field TEXT DEFAULT 'date' CHECK(sort_field IN ('name', 'date', 'deadline', 'priority', 'created_at', 'updated_at')),
      sort_direction TEXT DEFAULT 'asc' CHECK(sort_direction IN ('asc', 'desc')),
      view_type TEXT DEFAULT 'today' CHECK(view_type IN ('today', 'next7', 'upcoming', 'all', 'list', 'blocked')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_custom_views_user ON custom_views(user_id);

    -- Habit tracking for recurring tasks
    CREATE TABLE IF NOT EXISTS habit_streaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      streak_count INTEGER DEFAULT 0,
      last_completed TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id)
    );
    CREATE INDEX IF NOT EXISTS idx_habit_streaks_task ON habit_streaks(task_id);
    CREATE INDEX IF NOT EXISTS idx_habit_streaks_streak ON habit_streaks(streak_count DESC);

    CREATE TABLE IF NOT EXISTS habit_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_habit_completions_task ON habit_completions(task_id);
    CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(date);

    -- Activity logs
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('task', 'list', 'label', 'template', 'user')),
      entity_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_activity_logs_task ON activity_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

    -- Ensure default inbox list exists
    INSERT OR IGNORE INTO lists (id, name, emoji, color, is_inbox) VALUES (1, 'Inbox', '📥', '#6366f1', 1);

    -- Recurring task exceptions (skip specific dates)
    CREATE TABLE IF NOT EXISTS recurring_exceptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      exception_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, exception_date)
    );
    CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_task ON recurring_exceptions(task_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_date ON recurring_exceptions(exception_date);

    -- Task connections (semantic relationships in knowledge graph)
    CREATE TABLE IF NOT EXISTS task_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      target_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      connection_type TEXT NOT NULL CHECK(connection_type IN ('prerequisite', 'inspiration', 'similar', 'contrast', 'related', 'learned_from')),
      strength REAL DEFAULT 0.5 CHECK(strength BETWEEN 0 AND 1),
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_task_id, target_task_id, connection_type)
    );
    CREATE INDEX IF NOT EXISTS idx_task_connections_source ON task_connections(source_task_id);
    CREATE INDEX IF NOT EXISTS idx_task_connections_target ON task_connections(target_task_id);
    CREATE INDEX IF NOT EXISTS idx_task_connections_type ON task_connections(connection_type);

    -- User insights (lessons learned and patterns)
    CREATE TABLE IF NOT EXISTS task_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      insight_type TEXT NOT NULL CHECK(insight_type IN ('lesson_learned', 'pattern_observed', 'success_factor', 'failure_reason')),
      content TEXT NOT NULL,
      context_tags TEXT, -- JSON array of tags
      confidence REAL CHECK(confidence BETWEEN 0 AND 1),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_task_insights_task ON task_insights(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_insights_user ON task_insights(user_id);
    CREATE INDEX IF NOT EXISTS idx_task_insights_type ON task_insights(insight_type);

    -- Skill tracking (implicit from task completion)
    CREATE TABLE IF NOT EXISTS user_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill_name TEXT NOT NULL,
      proficiency_level INTEGER DEFAULT 1 CHECK(proficiency_level BETWEEN 1 AND 5),
      evidence_task_ids TEXT, -- JSON array of task IDs that demonstrate this skill
      last_used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, skill_name)
    );
    CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_skills_proficiency ON user_skills(proficiency_level DESC);

    -- Habit-context connections (context-aware task analysis)
    CREATE TABLE IF NOT EXISTS habit_contexts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      context_type TEXT NOT NULL CHECK(context_type IN ('time_of_day', 'location', 'mood', 'energy_level', 'external_trigger')),
      context_value TEXT NOT NULL,
      frequency INTEGER DEFAULT 1,
      success_rate REAL DEFAULT 1.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_habit_contexts_task ON habit_contexts(task_id);
    CREATE INDEX IF NOT EXISTS idx_habit_contexts_type ON habit_contexts(context_type);

    -- Decision journal entries
    CREATE TABLE IF NOT EXISTS decision_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      decision_type TEXT NOT NULL CHECK(decision_type IN ('priority', 'approach', 'tool', 'timeline', 'allocation', 'cancellation')),
      question TEXT NOT NULL,
      chosen_option_id INTEGER,
      rationale TEXT,
      outcome TEXT,
      outcome_notes TEXT,
      outcome_rating INTEGER CHECK(outcome_rating BETWEEN -1 AND 1),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_decision_entries_task ON decision_entries(task_id);
    CREATE INDEX IF NOT EXISTS idx_decision_entries_user ON decision_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_decision_entries_type ON decision_entries(decision_type);

    -- Decision options
    CREATE TABLE IF NOT EXISTS decision_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_entry_id INTEGER NOT NULL REFERENCES decision_entries(id) ON DELETE CASCADE,
      option_text TEXT NOT NULL,
      pros TEXT, -- JSON array
      cons TEXT, -- JSON array
      estimated_impact TEXT,
      estimated_effort TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_decision_options_decision ON decision_options(decision_entry_id);

    -- Decision templates
    CREATE TABLE IF NOT EXISTS decision_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      prompt_template TEXT NOT NULL,
      option_template TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_decision_templates_user ON decision_templates(user_id);

    -- Integration settings for external tools
    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('github', 'slack', 'notion', 'trello', 'linear', 'asana', 'clickup', 'todoist')),
      name TEXT NOT NULL,
      config TEXT, -- JSON configuration
      enabled INTEGER DEFAULT 1,
      sync_direction TEXT DEFAULT 'bidirectional' CHECK(sync_direction IN ('import', 'export', 'bidirectional')),
      last_sync_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, type)
    );
    CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id);
    CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
    CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON integrations(enabled);

    -- Task mappings for integration sync
    CREATE TABLE IF NOT EXISTS task_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      integration_id INTEGER NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
      external_task_id TEXT NOT NULL,
      local_task_id INTEGER,
      field_mappings TEXT, -- JSON mapping of field names
      sync_rules TEXT, -- JSON rules for sync
      last_sync_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(integration_id, external_task_id)
    );
    CREATE INDEX IF NOT EXISTS idx_task_mappings_integration ON task_mappings(integration_id);
    CREATE INDEX IF NOT EXISTS idx_task_mappings_local ON task_mappings(local_task_id);

    -- Activity log for knowledge graph events
    CREATE TABLE IF NOT EXISTS knowledge_graph_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL CHECK(activity_type IN ('task_connected', 'insight_extracted', 'skill_updated', 'context_recorded', 'decision_made', 'integration_synced')),
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      details TEXT, -- JSON with activity details
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_knowledge_activities_user ON knowledge_graph_activities(user_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_activities_task ON knowledge_graph_activities(task_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_activities_type ON knowledge_graph_activities(activity_type);
    CREATE INDEX IF NOT EXISTS idx_knowledge_activities_created ON knowledge_graph_activities(created_at DESC);

    -- Cognitive load tracking
    CREATE TABLE IF NOT EXISTS cognitive_load_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      task_count INTEGER DEFAULT 0,
      completed_count INTEGER DEFAULT 0,
      avg_time_to_complete REAL DEFAULT 0,
      energy_level REAL, -- 1-10 scale
      distraction_score REAL, -- 0-1 scale
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_cognitive_load_user_date ON cognitive_load_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_cognitive_load_user_created ON cognitive_load_logs(user_id, created_at DESC);

    -- Custom view sharing
    CREATE TABLE IF NOT EXISTS custom_view_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      view_id INTEGER NOT NULL REFERENCES custom_views(id) ON DELETE CASCADE,
      shared_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shared_with INTEGER REFERENCES users(id) ON DELETE CASCADE,
      share_token TEXT UNIQUE,
      permission TEXT DEFAULT 'view' CHECK(permission IN ('view', 'edit')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_view_shares_view ON custom_view_shares(view_id);
    CREATE INDEX IF NOT EXISTS idx_view_shares_token ON custom_view_shares(share_token);

    -- Goal tracking (must be created before goal_milestones)
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      target_count INTEGER NOT NULL,
      target_unit TEXT NOT NULL,
      period TEXT NOT NULL CHECK(period IN ('daily', 'weekly', 'monthly', 'yearly')),
      current_count INTEGER DEFAULT 0,
      streak_count INTEGER DEFAULT 0,
      last_updated TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_goals_period ON goals(period);

    -- Goal milestones
    CREATE TABLE IF NOT EXISTS goal_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      target_count INTEGER NOT NULL,
      current_count INTEGER DEFAULT 0,
      due_date TEXT,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_milestones_goal ON goal_milestones(goal_id);

    -- User settings
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      work_start_hour INTEGER DEFAULT 9,
      work_end_hour INTEGER DEFAULT 17,
      preferred_pomodoro_minutes INTEGER DEFAULT 25,
      preferred_break_minutes INTEGER DEFAULT 5,
      theme TEXT DEFAULT 'system' CHECK(theme IN ('light', 'dark', 'system')),
      language TEXT DEFAULT 'en',
      timezone TEXT DEFAULT 'UTC',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

    -- Rate limit log for persistence across restarts
    CREATE TABLE IF NOT EXISTS rate_limit_log (
      key TEXT PRIMARY KEY,
      count INTEGER DEFAULT 1,
      reset_time INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_rate_limit_reset ON rate_limit_log(reset_time);
  `);
}
