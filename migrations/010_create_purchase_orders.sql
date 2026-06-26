CREATE TYPE po_status AS ENUM (
  'draft',
  'pending',
  'approved',
  'ordered',
  'received',
  'cancelled'
);

CREATE TABLE purchase_orders (
  id              UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number       VARCHAR(50) NOT NULL UNIQUE,
  supplier_id     UUID      NOT NULL REFERENCES suppliers  (id) ON DELETE RESTRICT,
  warehouse_id    UUID      NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  status          po_status NOT NULL DEFAULT 'draft',
  total_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  ordered_by      UUID      NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  approved_by     UUID               REFERENCES users (id) ON DELETE SET NULL,
  notes           TEXT,
  order_date      DATE,
  expected_date   DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_po_supplier_id  ON purchase_orders (supplier_id);
CREATE INDEX idx_po_warehouse_id ON purchase_orders (warehouse_id);
CREATE INDEX idx_po_status       ON purchase_orders (status);
CREATE INDEX idx_po_ordered_by   ON purchase_orders (ordered_by);
CREATE INDEX idx_po_created_at   ON purchase_orders (created_at DESC);
