const db = require('../config/database');
const AppError = require('../utils/AppError');
const bus = require('../utils/eventBus');

function _applyScope(scope, params, where) {
  if (scope.role === 'warehouse_staff') {
    params.push(scope.warehouseId);
    where.push(`po.warehouse_id = $${params.length}`);
  } else if (scope.role === 'supplier') {
    params.push(scope.supplierId);
    where.push(`po.supplier_id = $${params.length}`);
  }
}

function _nextPoNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  return `PO-${ts}`;
}

async function list({ page = 1, limit = 20, status, supplierId, warehouseId } = {}, scope) {
  const params = [];
  const where  = ['1=1'];

  _applyScope(scope, params, where);

  if (status) { params.push(status); where.push(`po.status = $${params.length}`); }
  if (supplierId && scope.role !== 'supplier') { params.push(supplierId); where.push(`po.supplier_id = $${params.length}`); }
  if (warehouseId && scope.role !== 'warehouse_staff') { params.push(warehouseId); where.push(`po.warehouse_id = $${params.length}`); }

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT po.id, po.po_number, po.status, po.total_amount, po.order_date, po.expected_date, po.created_at,
            s.name AS supplier_name,
            w.name AS warehouse_name,
            u.first_name || ' ' || u.last_name AS ordered_by_name
     FROM purchase_orders po
     JOIN suppliers  s ON s.id = po.supplier_id
     JOIN warehouses w ON w.id = po.warehouse_id
     JOIN users      u ON u.id = po.ordered_by
     WHERE ${where.join(' AND ')}
     ORDER BY po.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const countParams = params.slice(0, params.length - 2);
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*)
     FROM purchase_orders po
     JOIN suppliers  s ON s.id = po.supplier_id
     JOIN warehouses w ON w.id = po.warehouse_id
     JOIN users      u ON u.id = po.ordered_by
     WHERE ${where.join(' AND ')}`,
    countParams,
  );

  return { purchaseOrders: rows, total: parseInt(count, 10), page, limit };
}

async function getById(id, scope) {
  const { rows } = await db.query(
    `SELECT po.*, s.name AS supplier_name, w.name AS warehouse_name
     FROM purchase_orders po
     JOIN suppliers  s ON s.id = po.supplier_id
     JOIN warehouses w ON w.id = po.warehouse_id
     WHERE po.id = $1`,
    [id],
  );
  const po = rows[0];
  if (!po) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');

  if (scope.role === 'warehouse_staff' && po.warehouse_id !== scope.warehouseId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  if (scope.role === 'supplier' && po.supplier_id !== scope.supplierId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const { rows: items } = await db.query(
    `SELECT poi.*, p.sku, p.name AS product_name, p.unit
     FROM purchase_order_items poi
     JOIN products p ON p.id = poi.product_id
     WHERE poi.purchase_order_id = $1`,
    [id],
  );

  return { ...po, items };
}

async function create({ supplierId, warehouseId, notes, expectedDate, items }, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  if (!items || items.length === 0) throw new AppError('Order must have at least one item', 422);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

    const { rows: [po] } = await client.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, warehouse_id, total_amount, ordered_by, notes, expected_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [_nextPoNumber(), supplierId, warehouseId, totalAmount, scope.userId, notes || null, expectedDate || null],
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [po.id, item.productId, item.quantity, item.unitPrice],
      );
    }

    await client.query('COMMIT');
    return po;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function approve(id, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const { rows } = await db.query(
    `UPDATE purchase_orders
     SET status = 'approved', approved_by = $1, updated_at = NOW()
     WHERE id = $2 AND status = 'pending'
     RETURNING *`,
    [scope.userId, id],
  );
  if (!rows[0]) throw new AppError('Purchase order not found or not in pending status', 404, 'NOT_FOUND');
  const po = rows[0];
  bus.emit('PO_APPROVED', { poId: po.id, poNumber: po.po_number, warehouseId: po.warehouse_id, supplierId: po.supplier_id });
  return po;
}

async function updateStatus(id, status, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id],
    );
    if (!rows[0]) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');
    const po = rows[0];

    // Collect socket events — emit only after commit
    const postCommitEvents = [];

    // When a PO is marked received, credit inventory and log stock movements
    if (status === 'received') {
      const { rows: items } = await client.query(
        `SELECT poi.product_id, poi.quantity, poi.unit_price
         FROM purchase_order_items poi
         WHERE poi.purchase_order_id = $1`,
        [id],
      );

      for (const item of items) {
        // Upsert inventory item for this warehouse + product
        const { rows: [inv] } = await client.query(
          `INSERT INTO inventory_items (warehouse_id, product_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (warehouse_id, product_id)
           DO UPDATE SET quantity    = inventory_items.quantity + EXCLUDED.quantity,
                         updated_at = NOW()
           RETURNING id, warehouse_id, product_id, quantity, reorder_point`,
          [po.warehouse_id, item.product_id, item.quantity],
        );

        // Record stock movement
        await client.query(
          `INSERT INTO stock_movements
             (inventory_item_id, warehouse_id, product_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
           VALUES ($1, $2, $3, 'IN', $4, 'purchase_order', $5, $6, $7)`,
          [inv.id, po.warehouse_id, item.product_id, item.quantity, id,
           `Received via PO ${po.po_number}`, scope.userId],
        );

        // Mark all items as fully received
        await client.query(
          `UPDATE purchase_order_items
           SET received_quantity = quantity
           WHERE purchase_order_id = $1 AND product_id = $2`,
          [id, item.product_id],
        );

        postCommitEvents.push({ type: 'INVENTORY_CHANGED', payload: {
          inventoryItemId: inv.id,
          warehouseId:     po.warehouse_id,
          productId:       item.product_id,
          newQuantity:     inv.quantity,
          change:          item.quantity,
        }});

        // Auto-resolve any open low_stock alert for this product + warehouse
        if (inv.quantity > inv.reorder_point) {
          await client.query(
            `UPDATE alerts SET is_resolved = TRUE, updated_at = NOW()
             WHERE product_id = $1 AND warehouse_id = $2
               AND type = 'low_stock' AND is_resolved = FALSE`,
            [item.product_id, po.warehouse_id],
          );
          postCommitEvents.push({ type: 'ALERT_RESOLVED', payload: {
            warehouseId: po.warehouse_id,
            productId:   item.product_id,
          }});
        }
      }
    }

    await client.query('COMMIT');

    bus.emit('PO_STATUS_CHANGED', { poId: po.id, poNumber: po.po_number, status, warehouseId: po.warehouse_id, supplierId: po.supplier_id });
    for (const { type, payload } of postCommitEvents) bus.emit(type, payload);

    return po;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { list, getById, create, approve, updateStatus };
