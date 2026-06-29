CREATE TABLE chat_sessions (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL DEFAULT 'New Conversation',
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user_id    ON chat_sessions (user_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions (created_at DESC);
