CREATE TYPE user_role AS ENUM (
  'admin',
  'procurement_manager',
  'warehouse_staff',
  'supplier',
  'viewer'
);

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          VARCHAR(254) NOT NULL UNIQUE,
  password_hash  VARCHAR(72)  NOT NULL,
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  role           user_role    NOT NULL DEFAULT 'viewer',
  -- warehouse_staff must have warehouse_id set; enforced at app layer
  warehouse_id   UUID REFERENCES warehouses (id) ON DELETE SET NULL,
  -- supplier-role users must have supplier_id set; enforced at app layer
  supplier_id    UUID REFERENCES suppliers (id) ON DELETE SET NULL,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_warehouse_staff_has_warehouse
    CHECK (role <> 'warehouse_staff' OR warehouse_id IS NOT NULL),
  CONSTRAINT chk_supplier_has_supplier
    CHECK (role <> 'supplier' OR supplier_id IS NOT NULL)
);

CREATE INDEX idx_users_email        ON users (email);
CREATE INDEX idx_users_role         ON users (role);
CREATE INDEX idx_users_warehouse_id ON users (warehouse_id);
CREATE INDEX idx_users_supplier_id  ON users (supplier_id);
