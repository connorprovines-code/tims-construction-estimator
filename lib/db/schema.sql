-- Database schema for Turner & Son Homes AI Estimator
-- Sessions and Messages tables for conversation persistence

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);

-- Index for faster message lookups by session
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id, created_at);
