-- Migration 011: Social productivity feed

-- Create feed posts table
CREATE TABLE IF NOT EXISTS feed_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata TEXT,
  visibility TEXT DEFAULT 'team',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create feed likes table
CREATE TABLE IF NOT EXISTS feed_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES feed_posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create feed comments table
CREATE TABLE IF NOT EXISTS feed_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES feed_posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create user follows table (for social connections)
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id INTEGER NOT NULL,
  followee_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, followee_id),
  FOREIGN KEY (follower_id) REFERENCES users(id),
  FOREIGN KEY (followee_id) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feed_posts_user ON feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_likes_post ON feed_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_post ON feed_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followee ON user_follows(followee_id);