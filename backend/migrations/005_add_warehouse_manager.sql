-- Add manager_id after users table exists (circular dependency resolution)
ALTER TABLE warehouses
  ADD COLUMN manager_id UUID REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX idx_warehouses_manager_id ON warehouses (manager_id);
