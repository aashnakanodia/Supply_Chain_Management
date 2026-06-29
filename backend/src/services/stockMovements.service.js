const db = require('../config/database');
const AppError = require('../utils/AppError');

function _applyScope(scope, params, where) {
  if (scope.role === 'supplier') throw new AppError('Access denied', 403, 'FORBIDDEN');
  if (scope.role === 'warehouse_staff') {
    params.push(scope.warehouseId);
    where.push(`sm.warehouse_id = $${params.length}`);
  }
}

async function list({ page = 1, limit = 20, warehouseId, productId, movementType, referenceType } = {}, scope) {
  const params = [];
  const where  = ['1=1'];

  _applyScope(scope, params, where);

  if (warehouseId && scope.role !== 'warehouse_staff') {
    params.push(warehouseId); where.push(`sm.warehouse_id = $${params.length}`);
  }
  if (productId)     { params.push(productId);     where.push(`sm.product_id = $${params.length}`); }
  if (movementType)  { params.push(movementType);  where.push(`sm.movement_type = $${params.length}`); }
  if (referenceType) { params.push(referenceType); where.push(`sm.reference_type = $${params.length}`); }

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT sm.id, sm.movement_type, sm.quantity, sm.reference_type, sm.reference_id,
            sm.notes, sm.created_at,
            w.name  AS warehouse_name,
            p.sku, p.name AS product_name, p.unit,
            u.first_name || ' ' || u.last_name AS created_by_name
     FROM stock_movements sm
     JOIN warehouses w ON w.id = sm.warehouse_id
     JOIN products   p ON p.id = sm.product_id
     LEFT JOIN users u ON u.id = sm.created_by
     WHERE ${where.join(' AND ')}
     ORDER BY sm.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const countParams = params.slice(0, params.length - 2);
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*)
     FROM stock_movements sm
     JOIN warehouses w ON w.id = sm.warehouse_id
     JOIN products   p ON p.id = sm.product_id
     WHERE ${where.join(' AND ')}`,
    countParams,
  );

  return { stockMovements: rows, total: parseInt(count, 10), page, limit };
}

module.exports = { list };
