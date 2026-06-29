CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku             VARCHAR(100) NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  category        VARCHAR(100),
  unit            VARCHAR(50)  NOT NULL DEFAULT 'piece',
  unit_price      NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  reorder_level   INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  lead_time_days  INTEGER NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_sku      ON products (sku);
CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_is_active ON products (is_active);
