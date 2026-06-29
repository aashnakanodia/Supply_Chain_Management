CREATE TYPE message_role AS ENUM ('user', 'assistant');

CREATE TABLE chat_messages (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   UUID         NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
  role         message_role NOT NULL,
  content      TEXT         NOT NULL,
  tokens_used  INTEGER      CHECK (tokens_used >= 0),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session_id  ON chat_messages (session_id);
CREATE INDEX idx_chat_messages_created_at  ON chat_messages (created_at ASC);
