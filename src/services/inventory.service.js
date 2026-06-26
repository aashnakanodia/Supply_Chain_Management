const db = require('../config/database');
const AppError = require('../utils/AppError');
const bus = require('../utils/eventBus');

/**
 * Scope enforcement: warehouse_staff → their warehouse only.
 * Supplier role cannot browse inventory (no PII leak of stock levels).
 * Appended before user-supplied filters so it cannot be overridden.
 */
function _applyScope(scope, params, where) {
  if (scope.role === 'warehouse_staff') {
    params.push(scope.warehouseId);
    where.push(`ii.warehouse_id = $${params.length}`);
  } else if (scope.role === 'supplier') {
    // Suppliers see only their own catalogued products across warehouses
    params.push(scope.supplierId);
    where.push(`sp.supplier_id = $${params.length}`);
  }
}

async function list({ page = 1, limit = 20, warehouseId, productId, lowStock } = {}, scope) {
  const params = [];
  const where  = ['1=1'];

  _applyScope(scope, params, where);

  if (warehouseId && scope.role !== 'warehouse_staff') {
    params.push(warehouseId);
    where.push(`ii.warehouse_id = $${params.length}`);
  }
  if (productId) { params.push(productId); where.push(`ii.product_id = $${params.length}`); }
  if (lowStock)  { where.push('ii.quantity <= ii.reorder_point'); }

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const supplierJoin = scope.role === 'supplier'
    ? `JOIN supplier_products sp ON sp.product_id = ii.product_id`
    : '';

  const { rows } = await db.query(
    `SELECT ii.id, ii.warehouse_id, ii.product_id, ii.quantity, ii.reserved_quantity,
            ii.reorder_point, ii.updated_at,
            w.name AS warehouse_name,
            p.sku, p.name AS product_name, p.unit
     FROM inventory_items ii
     JOIN warehouses w ON w.id = ii.warehouse_id
     JOIN products   p ON p.id = ii.product_id
     ${supplierJoin}
     WHERE ${where.join(' AND ')}
     ORDER BY w.name, p.name
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const countParams = params.slice(0, params.length - 2);
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*)
     FROM inventory_items ii
     JOIN warehouses w ON w.id = ii.warehouse_id
     JOIN products   p ON p.id = ii.product_id
     ${supplierJoin}
     WHERE ${where.join(' AND ')}`,
    countParams,
  );

  return { inventory: rows, total: parseInt(count, 10), page, limit };
}

async function getById(id, scope) {
  const { rows } = await db.query(
    `SELECT ii.*, w.name AS warehouse_name, p.sku, p.name AS product_name, p.unit
     FROM inventory_items ii
     JOIN warehouses w ON w.id = ii.warehouse_id
     JOIN products   p ON p.id = ii.product_id
     WHERE ii.id = $1`,
    [id],
  );
  const item = rows[0];
  if (!item) throw new AppError('Inventory item not found', 404, 'NOT_FOUND');

  // Enforce scoped access on the fetched record
  if (scope.role === 'warehouse_staff' && item.warehouse_id !== scope.warehouseId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  return item;
}

async function adjust(id, { quantity, reason }, scope) {
  if (scope.role !== 'admin' && scope.role !== 'warehouse_staff') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const item = await getById(id, scope); // also enforces scope

  const client = await require('../config/database').getClient();
  try {
    await client.query('BEGIN');

    const newQty = item.quantity + quantity;
    if (newQty < 0) throw new AppError('Adjustment would result in negative stock', 422);

    const { rows } = await client.query(
      `UPDATE inventory_items SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newQty, id],
    );

    await client.query(
      `INSERT INTO stock_movements
         (inventory_item_id, warehouse_id, product_id, movement_type, quantity, reference_type, notes, created_by)
       VALUES ($1, $2, $3, 'ADJUSTMENT', $4, 'manual', $5, $6)`,
      [id, item.warehouse_id, item.product_id, quantity, reason || null, scope.userId],
    );

    // Capture events to emit after commit (never emit inside a transaction)
    let newAlertPayload  = null;
    let alertWasResolved = false;

    // Auto-alert if stock dropped to or below reorder point
    if (newQty <= item.reorder_point) {
      const { rows: existing } = await client.query(
        `SELECT id FROM alerts
         WHERE product_id = $1 AND warehouse_id = $2
           AND type = 'low_stock' AND is_resolved = FALSE`,
        [item.product_id, item.warehouse_id],
      );
      if (existing.length === 0) {
        const severity = newQty === 0 ? 'critical' : newQty <= Math.floor(item.reorder_point * 0.1) ? 'critical' : 'high';
        const { rows: [alert] } = await client.query(
          `INSERT INTO alerts (type, severity, title, message, warehouse_id, product_id)
           VALUES ('low_stock', $1, $2, $3, $4, $5)
           RETURNING id, type, severity, title`,
          [
            severity,
            `${item.product_name} stock low — ${item.warehouse_name}`,
            `Stock is now ${newQty} units, at or below reorder point of ${item.reorder_point}. Warehouse: ${item.warehouse_name}.`,
            item.warehouse_id,
            item.product_id,
          ],
        );
        newAlertPayload = { ...alert, warehouseId: item.warehouse_id, productId: item.product_id };
      }
    }

    // Auto-resolve existing low_stock alert if stock is replenished above reorder point
    if (newQty > item.reorder_point) {
      await client.query(
        `UPDATE alerts SET is_resolved = TRUE, updated_at = NOW()
         WHERE product_id = $1 AND warehouse_id = $2
           AND type = 'low_stock' AND is_resolved = FALSE`,
        [item.product_id, item.warehouse_id],
      );
      alertWasResolved = true;
    }

    await client.query('COMMIT');

    // Emit after commit — transaction is safe, broadcast the changes
    bus.emit('INVENTORY_CHANGED', {
      inventoryItemId: id,
      warehouseId:     item.warehouse_id,
      productId:       item.product_id,
      newQuantity:     newQty,
      change:          quantity,
    });
    if (newAlertPayload)  bus.emit('NEW_ALERT',      newAlertPayload);
    if (alertWasResolved) bus.emit('ALERT_RESOLVED', { warehouseId: item.warehouse_id, productId: item.product_id });

    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function create({ warehouseId, productId, quantity, reorderPoint = 0 }, scope) {
  if (scope.role !== 'admin' && scope.role !== 'warehouse_staff') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  if (scope.role === 'warehouse_staff') warehouseId = scope.warehouseId;

  const { rowCount: whOk } = await db.query(
    `SELECT 1 FROM warehouses WHERE id = $1 AND is_active = TRUE`, [warehouseId],
  );
  if (!whOk) throw new AppError('Warehouse not found', 404, 'NOT_FOUND');

  const { rowCount: prodOk } = await db.query(
    `SELECT 1 FROM products WHERE id = $1 AND is_active = TRUE`, [productId],
  );
  if (!prodOk) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const { rowCount: exists } = await db.query(
    `SELECT 1 FROM inventory_items WHERE warehouse_id = $1 AND product_id = $2`,
    [warehouseId, productId],
  );
  if (exists) {
    throw new AppError(
      'Inventory item already exists for this warehouse and product — use the adjust endpoint to change quantity',
      409, 'CONFLICT',
    );
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows: [item] } = await client.query(
      `INSERT INTO inventory_items (warehouse_id, product_id, quantity, reorder_point)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [warehouseId, productId, quantity, reorderPoint],
    );

    if (quantity > 0) {
      await client.query(
        `INSERT INTO stock_movements
           (inventory_item_id, warehouse_id, product_id, movement_type, quantity, reference_type, notes, created_by)
         VALUES ($1, $2, $3, 'IN', $4, 'manual', 'Opening stock', $5)`,
        [item.id, warehouseId, productId, quantity, scope.userId],
      );
    }

    let newAlertPayload = null;

    if (quantity <= reorderPoint) {
      const { rows: [names] } = await client.query(
        `SELECT p.name AS product_name, w.name AS warehouse_name
         FROM products p, warehouses w WHERE p.id = $1 AND w.id = $2`,
        [productId, warehouseId],
      );
      const severity = quantity === 0 ? 'critical' : 'high';
      const { rows: [alert] } = await client.query(
        `INSERT INTO alerts (type, severity, title, message, warehouse_id, product_id)
         VALUES ('low_stock', $1, $2, $3, $4, $5)
         RETURNING id, type, severity, title`,
        [
          severity,
          `${names.product_name} stock low — ${names.warehouse_name}`,
          `Opening stock is ${quantity} units, at or below reorder point of ${reorderPoint}. Warehouse: ${names.warehouse_name}.`,
          warehouseId,
          productId,
        ],
      );
      newAlertPayload = { ...alert, warehouseId, productId };
    }

    await client.query('COMMIT');

    bus.emit('INVENTORY_CHANGED', { inventoryItemId: item.id, warehouseId, productId, newQuantity: quantity, change: quantity });
    if (newAlertPayload) bus.emit('NEW_ALERT', newAlertPayload);

    return item;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { list, getById, create, adjust };
