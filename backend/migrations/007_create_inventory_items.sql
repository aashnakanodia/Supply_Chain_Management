CREATE TABLE inventory_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id      UUID NOT NULL REFERENCES warehouses (id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products   (id) ON DELETE CASCADE,
  quantity          INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  reorder_point     INTEGER NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (warehouse_id, product_id)
);

CREATE INDEX idx_inventory_warehouse_id ON inventory_items (warehouse_id);
CREATE INDEX idx_inventory_product_id   ON inventory_items (product_id);
