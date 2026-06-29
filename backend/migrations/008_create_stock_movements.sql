CREATE TYPE movement_type AS ENUM (
  'IN',           -- goods received
  'OUT',          -- goods dispatched
  'TRANSFER_OUT', -- leaving this warehouse
  'TRANSFER_IN',  -- arriving at this warehouse
  'ADJUSTMENT'    -- manual stock correction
);

CREATE TABLE stock_movements (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID          NOT NULL REFERENCES inventory_items (id) ON DELETE RESTRICT,
  warehouse_id      UUID          NOT NULL REFERENCES warehouses       (id) ON DELETE RESTRICT,
  product_id        UUID          NOT NULL REFERENCES products          (id) ON DELETE RESTRICT,
  movement_type     movement_type NOT NULL,
  quantity          INTEGER       NOT NULL CHECK (quantity <> 0),
  -- Polymorphic reference: what triggered this movement
  reference_type    VARCHAR(50),   -- 'purchase_order', 'shipment', 'manual', etc.
  reference_id      UUID,
  notes             TEXT,
  created_by        UUID          NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_inventory_item_id ON stock_movements (inventory_item_id);
CREATE INDEX idx_stock_movements_warehouse_id      ON stock_movements (warehouse_id);
CREATE INDEX idx_stock_movements_product_id        ON stock_movements (product_id);
CREATE INDEX idx_stock_movements_created_at        ON stock_movements (created_at DESC);
CREATE INDEX idx_stock_movements_reference         ON stock_movements (reference_type, reference_id);
