import { getDb } from './index';

export interface Migration {
  id: number;
  name: string;
  sql: string;
  executed_at: string;
}

export const migrations: Record<number, string> = {
  1: `
    -- Add notes column to tasks
    ALTER TABLE tasks ADD COLUMN notes TEXT;
  `,
  2: `
    -- Add assignee and creator columns to tasks
    ALTER TABLE tasks ADD COLUMN assignee_id INTEGER REFERENCES users(id);
    ALTER TABLE tasks ADD COLUMN created_by INTEGER REFERENCES users(id);
  `,
  3: `
    -- Add recurring_config column to tasks
    ALTER TABLE tasks ADD COLUMN recurring_config TEXT;
  `,
  4: `
    -- Add time_entries table
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
  `,
  5: `
    -- Add goals table
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
  `,
  6: `
    -- Add user_settings table
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
  `,
  7: `
    -- Add share_token column to task_shares
    ALTER TABLE task_shares ADD COLUMN share_token TEXT UNIQUE;
  `,
  8: `
    -- Add indexes for task queries
    CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
  `,
  9: `
    -- Add workspace tables
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workspace_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workspace_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_workspace_users_workspace ON workspace_users(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_users_user ON workspace_users(user_id);
  `,
  10: `
    -- Add workspace_id to tasks and lists
    ALTER TABLE tasks ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL;
    ALTER TABLE lists ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_lists_workspace_id ON lists(workspace_id);
  `,
  11: `
    -- Add user_id to lists and labels for user isolation
    CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);
    CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id);
  `,
  12: `
    -- Add permission_level and expiration to task_shares
    ALTER TABLE task_shares ADD COLUMN permission_level TEXT DEFAULT 'view' CHECK(permission_level IN ('view', 'edit', 'admin'));
    ALTER TABLE task_shares ADD COLUMN expires_at INTEGER;
    ALTER TABLE task_shares ADD COLUMN revoked_at INTEGER;
    UPDATE task_shares SET permission_level = COALESCE(permission, 'view');
    CREATE INDEX IF NOT EXISTS idx_task_shares_expires ON task_shares(expires_at);
  `,
  13: `
    -- Add task_dependencies table for blocker relationships
    -- Note: Uses task_id/depends_on_task_id to be consistent with existing queries
    CREATE TABLE IF NOT EXISTS task_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'hard' CHECK(type IN ('hard', 'soft')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, depends_on_task_id)
    );
    CREATE INDEX IF NOT EXISTS idx_task_deps_task ON task_dependencies(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_deps_depends ON task_dependencies(depends_on_task_id);
  `,
  14: `
    -- Add index on recurring column for generateRecurringTasks performance
    CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON tasks(recurring);
  `,
  15: `
    -- Add user_id to tasks for proper user isolation
    ALTER TABLE tasks ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
  `,
  16: `
    -- Add archived column to tasks for archiving functionality
    ALTER TABLE tasks ADD COLUMN archived INTEGER DEFAULT 0 CHECK(archived IN (0, 1));
    CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);
  `,
  17: `
    -- Add task_votes table for crowdsourced task prioritization
    CREATE TABLE IF NOT EXISTS task_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      value INTEGER NOT NULL CHECK(value IN (-1, 1)),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_task_votes_task ON task_votes(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_votes_user ON task_votes(user_id);
  `,
  18: `
    -- Add decision_entries table for decision tracking
    CREATE TABLE IF NOT EXISTS decision_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      decision_type TEXT NOT NULL,
      question TEXT NOT NULL,
      chosen_option_id INTEGER,
      rationale TEXT,
      outcome TEXT,
      outcome_notes TEXT,
      outcome_rating INTEGER CHECK(outcome_rating BETWEEN -1 AND 1),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_decisions_user ON decision_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_decisions_task ON decision_entries(task_id);
  `,
  19: `
    -- Add decision_options table for decision choices
    CREATE TABLE IF NOT EXISTS decision_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_entry_id INTEGER NOT NULL REFERENCES decision_entries(id) ON DELETE CASCADE,
      option_text TEXT NOT NULL,
      pros TEXT,
      cons TEXT,
      estimated_impact TEXT,
      estimated_effort TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `,
  20: `
    -- Add decision_templates table for reusable decision frameworks
    CREATE TABLE IF NOT EXISTS decision_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      prompt_template TEXT NOT NULL,
      option_template TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_decision_templates_user ON decision_templates(user_id);
  `,
  21: `
    -- Add task_insights table for extracted lessons from tasks
    CREATE TABLE IF NOT EXISTS task_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      insight_type TEXT NOT NULL,
      content TEXT NOT NULL,
      context_tags TEXT,
      confidence REAL DEFAULT 0.5,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_task_insights_task ON task_insights(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_insights_user ON task_insights(user_id);
  `,
  22: `
    -- Add user_skills table for personal skill tracking
    CREATE TABLE IF NOT EXISTS user_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill_name TEXT NOT NULL,
      proficiency_level INTEGER DEFAULT 1 CHECK(proficiency_level BETWEEN 1 AND 5),
      evidence_task_ids TEXT,
      last_used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_skills_unique ON user_skills(user_id, skill_name);
  `,
  23: `
    -- Add smart Inbox Sources table for external task sources
    CREATE TABLE IF NOT EXISTS smart_inbox_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL CHECK(source_type IN ('calendar', 'email', 'slack', 'github', 'manual', 'integration')),
      external_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('critical', 'high', 'medium', 'low', 'none')),
      confidence INTEGER DEFAULT 50,
      priority_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'converted', 'dismissed')),
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_smart_inbox_user ON smart_inbox_sources(user_id);
    CREATE INDEX IF NOT EXISTS idx_smart_inbox_status ON smart_inbox_sources(status);
    CREATE INDEX IF NOT EXISTS idx_smart_inbox_priority ON smart_inbox_sources(priority_score DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_smart_inbox_external ON smart_inbox_sources(user_id, source_type, external_id);
  `,
  24: `
    -- Add AI prediction fields to smart_inbox_sources
    ALTER TABLE smart_inbox_sources ADD COLUMN predicted_priority TEXT DEFAULT 'medium' CHECK(predicted_priority IN ('critical', 'high', 'medium', 'low', 'none'));
    ALTER TABLE smart_inbox_sources ADD COLUMN predicted_due_date TEXT;
    ALTER TABLE smart_inbox_sources ADD COLUMN suggested_labels TEXT;
    ALTER TABLE smart_inbox_sources ADD COLUMN ai_reasoning TEXT;
    CREATE INDEX IF NOT EXISTS idx_smart_inbox_predicted_priority ON smart_inbox_sources(predicted_priority);
  `,
  25: `
    -- Add user_energy_profiles table for smart scheduler
    CREATE TABLE IF NOT EXISTS user_energy_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_energy_profiles_user ON user_energy_profiles(user_id);
  `,
  26: `
    -- Add calendar_events table for scheduler integration
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      source TEXT DEFAULT 'manual',
      external_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_source ON calendar_events(source);
  `,
  27: `
    -- Add velocity_entries table for team analytics
    CREATE TABLE IF NOT EXISTS velocity_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      completed_count INTEGER DEFAULT 0,
      planned_count INTEGER DEFAULT 0,
      story_points INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_velocity_user_date ON velocity_entries(user_id, date);
  `,
  28: `
    -- Add knowledge_entries table
    CREATE TABLE IF NOT EXISTS knowledge_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('lesson_learned', 'best_practice', 'tip', 'insight', 'tool', 'template')),
      category TEXT,
      related_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      tags TEXT,
      confidence REAL DEFAULT 0.5,
      source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'ai_extracted', 'task_completion')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_entries(type);
    CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category);
  `,
  29: `
    -- Add evolution_steps table
    CREATE TABLE IF NOT EXISTS evolution_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      changes TEXT NOT NULL,
      confidence_score REAL DEFAULT 0.5,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_evolution_entry ON evolution_steps(entry_id);
  `,
  30: `
    -- Add pomodoro_timers table for focus mode
    CREATE TABLE IF NOT EXISTS pomodoro_timers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 25,
      remaining_seconds INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'cancelled')),
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_pomodoro_user ON pomodoro_timers(user_id);
    CREATE INDEX IF NOT EXISTS idx_pomodoro_status ON pomodoro_timers(status);
  `,
  31: `
    -- Add distraction_blocks table
    CREATE TABLE IF NOT EXISTS distraction_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source TEXT NOT NULL CHECK(source IN ('time', 'keyword', 'manual')),
      pattern TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      expires_at TEXT,
      reason TEXT,
      blocked_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_distractions_user_active ON distraction_blocks(user_id);
  `,
  32: `
    -- Add focus_sessions table
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK(type IN ('pomodoro', 'deep_work', 'creative_flow', 'break')),
      duration_minutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('planned', 'active', 'completed', 'cancelled', 'interrupted')),
      started_at TEXT,
      completed_at TEXT,
      interruption_count INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_status ON focus_sessions(status);
  `,
  33: `
    -- Add focus_session_history for analytics
    CREATE TABLE IF NOT EXISTS focus_session_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_focus_history_user ON focus_session_history(user_id);
  `,
  34: `
    -- Add user_personas table for productivity personas
    CREATE TABLE IF NOT EXISTS user_personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('deep_work', 'sprint_runner', 'steady_stream', 'creative_genius', 'strategic_planner')),
      work_hours TEXT,
      energy_pattern TEXT,
      preferred_working_styles TEXT,
      focus_traits TEXT,
      productivity_signals TEXT,
      recommendations TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_personas_user ON user_personas(user_id);
  `,
  35: `
    -- Extend tasks with cognitive_load column and parking-lot status
    ALTER TABLE tasks ADD COLUMN cognitive_load TEXT DEFAULT 'medium'
      CHECK(cognitive_load IN ('deep', 'creative', 'routine', 'social', 'emotional'));
    ALTER TABLE tasks ADD COLUMN parked INTEGER DEFAULT 0;
    ALTER TABLE tasks ADD COLUMN parked_until TEXT;
    ALTER TABLE tasks ADD COLUMN park_reason TEXT;
    ALTER TABLE tasks ADD COLUMN reschedule_count INTEGER DEFAULT 0;
    ALTER TABLE tasks ADD COLUMN last_reschedule_at TEXT;
    ALTER TABLE tasks ADD COLUMN deleted_at TEXT;
    ALTER TABLE tasks ADD COLUMN deleted_reason TEXT;
    ALTER TABLE tasks ADD COLUMN decision_autopilot_eligible INTEGER DEFAULT 0;
    ALTER TABLE tasks ADD COLUMN travel_origin TEXT;
    ALTER TABLE tasks ADD COLUMN travel_destination TEXT;

    -- Personal operating principles - persistent rules learned by the system
    CREATE TABLE IF NOT EXISTS operating_principles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rule TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('scheduling', 'priority', 'focus', 'energy', 'communication', 'other')),
      evidence_count INTEGER DEFAULT 1,
      confidence REAL DEFAULT 0.5,
      active INTEGER DEFAULT 1,
      source TEXT DEFAULT 'inferred',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_principles_user ON operating_principles(user_id);

    -- Async waits - tasks waiting on someone else
    CREATE TABLE IF NOT EXISTS async_waits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      waiting_on TEXT NOT NULL,
      waiting_on_type TEXT DEFAULT 'person' CHECK(waiting_on_type IN ('person', 'system', 'event', 'payment', 'response')),
      asked_at TEXT NOT NULL,
      expected_response_days INTEGER DEFAULT 3,
      nudge_threshold_days INTEGER DEFAULT 7,
      status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting', 'nudged', 'resolved', 'abandoned')),
      last_nudge_at TEXT,
      resolved_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_async_waits_user ON async_waits(user_id);
    CREATE INDEX IF NOT EXISTS idx_async_waits_task ON async_waits(task_id);

    -- Weekly reflections - Sunday review answers
    CREATE TABLE IF NOT EXISTS reflections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_of TEXT NOT NULL,
      surprised TEXT,
      worked TEXT,
      did_not_work TEXT,
      should_change TEXT,
      gratitude TEXT,
      extracted_principle_ids TEXT,
      mood_score INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, week_of)
    );
    CREATE INDEX IF NOT EXISTS idx_reflections_user ON reflections(user_id);

    -- Context switches log - track what user is working on over time
    CREATE TABLE IF NOT EXISTS context_switches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      project_tag TEXT,
      switched_at TEXT NOT NULL,
      session_duration_seconds INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_ctx_switches_user_time ON context_switches(user_id, switched_at);

    -- Decision autopilot log
    CREATE TABLE IF NOT EXISTS autopilot_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      decision_type TEXT NOT NULL,
      question TEXT NOT NULL,
      chosen_option TEXT NOT NULL,
      rejected_options TEXT,
      rationale TEXT,
      user_approved INTEGER DEFAULT 0,
      overridden INTEGER DEFAULT 0,
      week_of TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_autopilot_user ON autopilot_decisions(user_id);

    -- Anti-goals - explicit won't-do-this-quarter items
    CREATE TABLE IF NOT EXISTS anti_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      reason TEXT,
      active INTEGER DEFAULT 1,
      valid_until TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_anti_goals_user ON anti_goals(user_id);

    -- Reading / watch queue with optional AI summary
    CREATE TABLE IF NOT EXISTS reading_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url TEXT,
      title TEXT NOT NULL,
      source TEXT,
      item_type TEXT DEFAULT 'article' CHECK(item_type IN ('article', 'video', 'podcast', 'paper', 'book', 'thread')),
      summary TEXT,
      action_items TEXT,
      status TEXT DEFAULT 'queued' CHECK(status IN ('queued', 'in_progress', 'done', 'archived')),
      saved_at TEXT DEFAULT CURRENT_TIMESTAMP,
      consumed_at TEXT,
      created_task_ids TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_reading_queue_user ON reading_queue(user_id);

    -- Inbound webhooks - user-defined webhook endpoints
    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      workflow_id INTEGER,
      secret TEXT,
      active INTEGER DEFAULT 1,
      last_called_at TEXT,
      call_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, slug)
    );
    CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);

    -- Habit ↔ task bridges - link habits with recurring tasks
    CREATE TABLE IF NOT EXISTS habit_task_bridge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      counts_for_both INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(habit_id, task_id)
    );
    CREATE INDEX IF NOT EXISTS idx_habit_task_bridge_user ON habit_task_bridge(user_id);

    -- Briefing preferences
    CREATE TABLE IF NOT EXISTS briefing_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      enabled INTEGER DEFAULT 1,
      delivery_hour INTEGER DEFAULT 8,
      include_voice INTEGER DEFAULT 0,
      include_predictions INTEGER DEFAULT 1,
      include_principles INTEGER DEFAULT 1,
      include_overdue INTEGER DEFAULT 1,
      include_recommendations INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    );

    -- Task afterlife (archive of deleted tasks for archaeology)
    CREATE TABLE IF NOT EXISTS task_afterlife (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_task_id INTEGER,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      priority TEXT,
      completed_count INTEGER DEFAULT 0,
      last_completed_at TEXT,
      resurrect_count INTEGER DEFAULT 0,
      resurrected_as_task_id INTEGER,
      created_at TEXT,
      deleted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      tags TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_afterlife_user ON task_afterlife(user_id);

    -- Anti-procrastination signals (computed lazily but stored to learn)
    CREATE TABLE IF NOT EXISTS procrastination_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      reschedule_count INTEGER NOT NULL,
      days_since_created INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'declined', 'broken_down', 'parked', 'completed')),
      suggested_action TEXT,
      actioned_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_procrastination_user ON procrastination_signals(user_id);

    -- Decision autopilot guardrails
    CREATE TABLE IF NOT EXISTS autopilot_guardrails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scope TEXT NOT NULL,
      allowed_values TEXT,
      denied_values TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, scope)
    );
  `,
};

export async function runMigrations(): Promise<void> {
  const db = getDb();

  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      sql TEXT NOT NULL,
      executed_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Get executed migrations
  const executed = db.prepare('SELECT id FROM migrations').all() as {
    id: number;
  }[];
  const executedIds = new Set(executed.map(m => m.id));

  // Run pending migrations
  const migrationEntries = Object.entries(migrations);
  // Sort by migration ID number
  migrationEntries.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

  for (const [id, sql] of migrationEntries) {
    const migrationId = parseInt(id);
    if (!executedIds.has(migrationId)) {
      console.log(`Running migration ${migrationId}...`);
      try {
        db.exec(sql);
        db.prepare(
          'INSERT INTO migrations (id, name, sql) VALUES (?, ?, ?)'
        ).run(migrationId, `migration_${migrationId}`, sql);
        console.log(`Migration ${migrationId} completed`);
      } catch (error) {
        console.error(`Failed to run migration ${migrationId}:`, error);
        throw error;
      }
    }
  }
}

export function getPendingMigrations(): number[] {
  const db = getDb();
  const executed = db.prepare('SELECT id FROM migrations').all() as {
    id: number;
  }[];
  const executedIds = new Set(executed.map(m => m.id));

  return Object.keys(migrations)
    .map(id => parseInt(id))
    .filter(id => !executedIds.has(id))
    .sort((a, b) => a - b);
}
