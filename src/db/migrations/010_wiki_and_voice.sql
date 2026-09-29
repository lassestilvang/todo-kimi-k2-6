-- Migration 010: Project wiki tables

-- Create wiki pages table
CREATE TABLE IF NOT EXISTS wiki_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  parent_id INTEGER,
  author_id INTEGER NOT NULL,
  views INTEGER DEFAULT 0,
  last_edited_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (last_edited_by) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES wiki_pages(id)
);

-- Create wiki revisions table
CREATE TABLE IF NOT EXISTS wiki_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL,
  content TEXT,
  editor_id INTEGER NOT NULL,
  changes_summary TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (page_id) REFERENCES wiki_pages(id),
  FOREIGN KEY (editor_id) REFERENCES users(id)
);

-- Create wiki comments table
CREATE TABLE IF NOT EXISTS wiki_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER NOT NULL,
  line_number INTEGER,
  resolved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (page_id) REFERENCES wiki_pages(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Create wiki task links table
CREATE TABLE IF NOT EXISTS wiki_task_links (
  page_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (page_id, task_id),
  FOREIGN KEY (page_id) REFERENCES wiki_pages(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Create voice commands history
CREATE TABLE IF NOT EXISTS voice_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  command TEXT NOT NULL,
  transcribed_text TEXT,
  action_taken TEXT,
  success INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wiki_pages_project ON wiki_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_parent ON wiki_pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_wiki_revisions_page ON wiki_revisions(page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_comments_page ON wiki_comments(page_id);
CREATE INDEX IF NOT EXISTS idx_voice_commands_user ON voice_commands(user_id);
CREATE INDEX IF NOT EXISTS idx_wiki_task_links_task ON wiki_task_links(task_id);