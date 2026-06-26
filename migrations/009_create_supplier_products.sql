CREATE TABLE supplier_products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id     UUID           NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
  product_id      UUID           NOT NULL REFERENCES products  (id) ON DELETE CASCADE,
  unit_price      NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  lead_time_days  INTEGER        NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
  min_order_qty   INTEGER        NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1),
  is_preferred    BOOLEAN        NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  UNIQUE (supplier_id, product_id)
);

CREATE INDEX idx_supplier_products_supplier_id ON supplier_products (supplier_id);
CREATE INDEX idx_supplier_products_product_id  ON supplier_products (product_id);
CREATE INDEX idx_supplier_products_preferred   ON supplier_products (is_preferred);
