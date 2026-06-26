CREATE TABLE suppliers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(200) NOT NULL,
  contact_name   VARCHAR(150),
  email          VARCHAR(254) UNIQUE,
  phone          VARCHAR(30),
  address        TEXT,
  city           VARCHAR(100),
  country        VARCHAR(100),
  payment_terms  VARCHAR(100),
  lead_time_days INTEGER CHECK (lead_time_days >= 0),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_is_active ON suppliers (is_active);
CREATE INDEX idx_suppliers_name      ON suppliers (name);
