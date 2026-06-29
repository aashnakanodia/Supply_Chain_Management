CREATE TABLE purchase_order_items (
  id                  UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id   UUID           NOT NULL REFERENCES purchase_orders (id) ON DELETE CASCADE,
  product_id          UUID           NOT NULL REFERENCES products          (id) ON DELETE RESTRICT,
  quantity            INTEGER        NOT NULL CHECK (quantity > 0),
  unit_price          NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  received_quantity   INTEGER        NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  UNIQUE (purchase_order_id, product_id)
);

CREATE INDEX idx_po_items_po_id      ON purchase_order_items (purchase_order_id);
CREATE INDEX idx_po_items_product_id ON purchase_order_items (product_id);
