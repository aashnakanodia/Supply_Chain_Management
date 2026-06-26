CREATE TYPE shipment_status AS ENUM (
  'pending',
  'in_transit',
  'arrived',
  'completed',
  'cancelled'
);

CREATE TABLE shipments (
  id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_number   VARCHAR(50)     NOT NULL UNIQUE,
  purchase_order_id UUID            NOT NULL REFERENCES purchase_orders (id) ON DELETE RESTRICT,
  warehouse_id      UUID            NOT NULL REFERENCES warehouses       (id) ON DELETE RESTRICT,
  status            shipment_status NOT NULL DEFAULT 'pending',
  carrier           VARCHAR(150),
  tracking_number   VARCHAR(150),
  shipped_date      DATE,
  expected_arrival  DATE,
  actual_arrival    DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipments_po_id        ON shipments (purchase_order_id);
CREATE INDEX idx_shipments_warehouse_id ON shipments (warehouse_id);
CREATE INDEX idx_shipments_status       ON shipments (status);
CREATE INDEX idx_shipments_created_at   ON shipments (created_at DESC);
