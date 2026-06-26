CREATE TABLE audit_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES users (id) ON DELETE SET NULL,
  action      VARCHAR(50) NOT NULL,  -- e.g. CREATE, UPDATE, DELETE, LOGIN
  table_name  VARCHAR(100),
  record_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id    ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs (table_name);
CREATE INDEX idx_audit_logs_record_id  ON audit_logs (record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
