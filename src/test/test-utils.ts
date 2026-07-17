import { Database, openDatabase } from 'better-sqlite3';
import { setupSchema } from '@/lib/db/schema';

let testDb: Database | null = null;

export async function setupTestDb(): Promise<Database> {
  if (testDb) {
    return testDb;
  }

  testDb = openDatabase(':memory:');
  await setupSchema(testDb);
  return testDb;
}

export async function cleanupTestDb(): Promise<void> {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}

export async function createTestTasks(): Promise<any[]> {
  const db = await setupTestDb();

  // Create test users
  db.prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)').run(
    1, 'test@example.com', 'Test User', new Date().toISOString()
  );

  // Create test lists
  db.prepare('INSERT INTO lists (id, user_id, name, emoji, color, is_inbox, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    1, 1, 'Inbox', '📥', '#6366f1', 1, new Date().toISOString()
  );

  // Create test labels
  db.prepare('INSERT INTO labels (id, user_id, name, icon, color, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    1, 1, 'Design', '🎨', '#ff6b6b', new Date().toISOString()
  );

  // Create test tasks
  db.prepare('INSERT INTO tasks (id, user_id, name, description, list_id, date, deadline, priority, recurring, recurring_config, completed, completed_at, created_at, updated_at, sort_order, archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    1, 1, 'Design homepage mockup', 'Create wireframes for new homepage', 1, '2024-01-15', '2024-01-20', 'high', 'none', null, 0, null, new Date().toISOString(), new Date().toISOString(), 0, 0
  );

  db.prepare('INSERT INTO tasks (id, user_id, name, description, list_id, date, deadline, priority, recurring, recurring_config, completed, completed_at, created_at, updated_at, sort_order, archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    2, 1, 'Write project documentation', 'Document API endpoints and usage', 1, '2024-01-16', '2024-01-25', 'medium', 'none', null, 1, new Date().toISOString(), new Date().toISOString(), 1, 0
  );

  db.prepare('INSERT INTO tasks (id, user_id, name, description, list_id, date, deadline, priority, recurring, recurring_config, completed, completed_at, created_at, updated_at, sort_order, archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    3, 1, 'Code review pending PRs', 'Review pull requests for main branch', 1, '2024-01-17', '2024-01-18', 'low', 'none', null, 1, new Date().toISOString(), new Date().toISOString(), 2, 0
  );

  return [
    { id: 1, name: 'Design homepage mockup', description: 'Create wireframes', priority: 'high', completed: false, user_id: 1 },
    { id: 2, name: 'Write project documentation', description: 'Document API', priority: 'medium', completed: true, user_id: 1 },
    { id: 3, name: 'Code review pending PRs', description: 'Review PRs', priority: 'low', completed: true, user_id: 1 }
  ];
}

export const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  created_at: new Date().toISOString()
};

export const mockTasks = [
  {
    id: 1,
    user_id: 1,
    name: 'Design homepage mockup',
    description: 'Create wireframes for new homepage design',
    notes: null,
    list_id: 1,
    date: '2024-01-15',
    deadline: '2024-01-20',
    estimate: '1:30',
    actual_time: null,
    priority: 'high' as const,
    recurring: 'none' as const,
    recurring_config: null,
    completed: false,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sort_order: 0,
    archived: false,
    labels: [{ id: 1, name: 'Design', icon: '🎨', color: '#ff6b6b', created_at: new Date().toISOString() }],
    subtasks: [],
    reminders: [],
    logs: [],
    comments: [],
    attachments: [],
    blockers: [],
    blocked_by: [],
    time_entries: [],
    recurring_exceptions: []
  }
];

export const mockConnections = [
  {
    id: 1,
    source_task_id: 1,
    target_task_id: 2,
    connection_type: 'related' as const,
    strength: 0.8,
    notes: 'Both involve design work',
    created_at: new Date().toISOString()
  }
];

export const mockInsights = [
  {
    id: 1,
    task_id: 2,
    user_id: 1,
    insight_type: 'lesson_learned' as const,
    content: 'Completed documentation task ahead of schedule by breaking into smaller chunks',
    context_tags: ['productivity', 'planning'],
    confidence: 0.9,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const mockSkills = [
  {
    id: 1,
    user_id: 1,
    skill_name: 'Documentation',
    proficiency_level: 4,
    evidence_task_ids: '[2]',
    last_used_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  }
];

// Test utilities
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data)
});

export const mockError = (message: string, status = 500) => ({
  ok: false,
  status,
  json: async () => ({ error: message }),
  text: async () => JSON.stringify({ error: message })
});