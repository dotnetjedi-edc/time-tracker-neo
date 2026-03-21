-- Time Tracker Database Schema
-- All tables include user_id for multi-user isolation (Clerk userId)
-- All IDs use TEXT UUIDs for distributed ID generation

CREATE TABLE IF NOT EXISTS tags (
  id         TEXT    PRIMARY KEY,
  user_id    TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  color      TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags (user_id);

CREATE TABLE IF NOT EXISTS tasks (
  id                  TEXT    PRIMARY KEY,
  user_id             TEXT    NOT NULL,
  name                TEXT    NOT NULL,
  comment             TEXT,
  total_time_seconds  INTEGER NOT NULL DEFAULT 0,
  position            INTEGER NOT NULL DEFAULT 0,
  tag_ids             TEXT    NOT NULL DEFAULT '[]',  -- JSON array of tag ids
  lifecycle_status    TEXT    NOT NULL DEFAULT 'active',
  archived_at         TEXT,
  created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks (user_id);

CREATE TABLE IF NOT EXISTS sessions (
  id             TEXT    PRIMARY KEY,
  user_id        TEXT    NOT NULL,
  task_id        TEXT    NOT NULL,
  origin         TEXT    NOT NULL DEFAULT 'timer',
  started_at     TEXT    NOT NULL,
  ended_at       TEXT,
  date           TEXT    NOT NULL,
  segments       TEXT    NOT NULL DEFAULT '[]',      -- JSON array of SessionSegment
  audit_events   TEXT    NOT NULL DEFAULT '[]',      -- JSON array of SessionAuditEvent
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON sessions (task_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date    ON sessions (date);

CREATE TABLE IF NOT EXISTS active_timers (
  user_id             TEXT    PRIMARY KEY,
  task_id             TEXT    NOT NULL,
  session_id          TEXT    NOT NULL,
  segment_start_time  TEXT    NOT NULL,
  updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (task_id)   REFERENCES tasks    (id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
);
