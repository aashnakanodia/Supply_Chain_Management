CREATE TYPE alert_type AS ENUM (
  'low_stock',
  'overstock',
  'delayed_shipment',
  'expiry',
  'system'
);

CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE alerts (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         alert_type     NOT NULL,
  severity     alert_severity NOT NULL DEFAULT 'medium',
  title        VARCHAR(200)   NOT NULL,
  message      TEXT           NOT NULL,
  warehouse_id UUID           REFERENCES warehouses (id) ON DELETE SET NULL,
  product_id   UUID           REFERENCES products   (id) ON DELETE SET NULL,
  is_read      BOOLEAN        NOT NULL DEFAULT FALSE,
  is_resolved  BOOLEAN        NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_warehouse_id  ON alerts (warehouse_id);
CREATE INDEX idx_alerts_product_id    ON alerts (product_id);
CREATE INDEX idx_alerts_type          ON alerts (type);
CREATE INDEX idx_alerts_is_resolved   ON alerts (is_resolved);
CREATE INDEX idx_alerts_created_at    ON alerts (created_at DESC);
