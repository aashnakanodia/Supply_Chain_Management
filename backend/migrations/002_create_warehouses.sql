CREATE TABLE warehouses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(150) NOT NULL,
  address     TEXT,
  city        VARCHAR(100),
  country     VARCHAR(100),
  capacity    INTEGER CHECK (capacity >= 0),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_warehouses_is_active ON warehouses (is_active);
