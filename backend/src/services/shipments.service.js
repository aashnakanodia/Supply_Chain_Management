const db = require('../config/database');
const AppError = require('../utils/AppError');
const bus = require('../utils/eventBus');

function _applyScope(scope, params, where) {
  if (scope.role === 'warehouse_staff') {
    params.push(scope.warehouseId);
    where.push(`s.warehouse_id = $${params.length}`);
  } else if (scope.role === 'supplier') {
    params.push(scope.supplierId);
    where.push(`po.supplier_id = $${params.length}`);
  }
}

function _nextShipmentNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  return `SHP-${ts}`;
}

async function list({ page = 1, limit = 20, status, warehouseId, purchaseOrderId } = {}, scope) {
  const params = [];
  const where  = ['1=1'];

  _applyScope(scope, params, where);

  if (status)          { params.push(status);          where.push(`s.status = $${params.length}`); }
  if (purchaseOrderId) { params.push(purchaseOrderId); where.push(`s.purchase_order_id = $${params.length}`); }
  if (warehouseId && scope.role !== 'warehouse_staff') {
    params.push(warehouseId);
    where.push(`s.warehouse_id = $${params.length}`);
  }

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const supplierJoin = scope.role === 'supplier'
    ? `JOIN purchase_orders po ON po.id = s.purchase_order_id`
    : `LEFT JOIN purchase_orders po ON po.id = s.purchase_order_id`;

  const { rows } = await db.query(
    `SELECT s.id, s.shipment_number, s.status, s.carrier, s.tracking_number,
            s.shipped_date, s.expected_arrival, s.actual_arrival, s.created_at,
            s.purchase_order_id,
            w.name AS warehouse_name,
            po.po_number
     FROM shipments s
     JOIN warehouses w ON w.id = s.warehouse_id
     ${supplierJoin}
     WHERE ${where.join(' AND ')}
     ORDER BY s.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const countParams = params.slice(0, params.length - 2);
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*)
     FROM shipments s
     JOIN warehouses w ON w.id = s.warehouse_id
     ${supplierJoin}
     WHERE ${where.join(' AND ')}`,
    countParams,
  );

  return { shipments: rows, total: parseInt(count, 10), page, limit };
}

async function getById(id, scope) {
  const { rows } = await db.query(
    `SELECT s.*, w.name AS warehouse_name, po.po_number, po.supplier_id, po.status AS po_status
     FROM shipments s
     JOIN warehouses w        ON w.id = s.warehouse_id
     JOIN purchase_orders po  ON po.id = s.purchase_order_id
     WHERE s.id = $1`,
    [id],
  );
  const shipment = rows[0];
  if (!shipment) throw new AppError('Shipment not found', 404, 'NOT_FOUND');

  if (scope.role === 'warehouse_staff' && shipment.warehouse_id !== scope.warehouseId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  if (scope.role === 'supplier' && shipment.supplier_id !== scope.supplierId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  return shipment;
}

async function create({ purchaseOrderId, warehouseId, carrier, trackingNumber, shippedDate, expectedArrival, notes }, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows: poRows } = await client.query(
      `SELECT id, status, warehouse_id, supplier_id, po_number FROM purchase_orders WHERE id = $1`,
      [purchaseOrderId],
    );
    const po = poRows[0];
    if (!po) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');
    if (po.status !== 'approved' && po.status !== 'ordered') {
      throw new AppError(
        `Cannot create shipment: PO must be approved or ordered (currently '${po.status}')`,
        422, 'VALIDATION_ERROR',
      );
    }

    const { rows } = await client.query(
      `INSERT INTO shipments (shipment_number, purchase_order_id, warehouse_id, carrier, tracking_number, shipped_date, expected_arrival, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [_nextShipmentNumber(), purchaseOrderId, warehouseId, carrier || null, trackingNumber || null,
       shippedDate || null, expectedArrival || null, notes || null],
    );
    const shipment = rows[0];

    // Auto-advance PO from approved → ordered when the first shipment is created
    if (po.status === 'approved') {
      await client.query(
        `UPDATE purchase_orders SET status = 'ordered', updated_at = NOW() WHERE id = $1`,
        [purchaseOrderId],
      );
    }

    await client.query('COMMIT');

    if (po.status === 'approved') {
      bus.emit('PO_STATUS_CHANGED', {
        poId:        purchaseOrderId,
        poNumber:    po.po_number,
        status:      'ordered',
        warehouseId: po.warehouse_id,
        supplierId:  po.supplier_id,
      });
    }

    return shipment;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateStatus(id, { status, actualArrival, notes }, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager' && scope.role !== 'warehouse_staff') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Fetch shipment with full PO context needed for the delivered trigger
    const { rows: shipRows } = await client.query(
      `SELECT s.*, w.name AS warehouse_name, po.po_number, po.supplier_id, po.status AS po_status
       FROM shipments s
       JOIN warehouses w        ON w.id = s.warehouse_id
       JOIN purchase_orders po  ON po.id = s.purchase_order_id
       WHERE s.id = $1`,
      [id],
    );
    const shipment = shipRows[0];
    if (!shipment) throw new AppError('Shipment not found', 404, 'NOT_FOUND');

    // Scope checks
    if (scope.role === 'warehouse_staff' && shipment.warehouse_id !== scope.warehouseId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Update shipment status
    const { rows } = await client.query(
      `UPDATE shipments
       SET status         = COALESCE($1, status),
           actual_arrival = COALESCE($2, actual_arrival),
           notes          = COALESCE($3, notes),
           updated_at     = NOW()
       WHERE id = $4
       RETURNING *`,
      [status || null, actualArrival || null, notes || null, id],
    );
    const updated = rows[0];

    const postCommitEvents = [{
      type: 'SHIPMENT_STATUS_CHANGED',
      payload: {
        shipmentId:     updated.id,
        shipmentNumber: updated.shipment_number,
        status:         updated.status,
        warehouseId:    updated.warehouse_id,
        supplierId:     shipment.supplier_id,
      },
    }];

    // ── Delivered: auto-advance linked PO to received + credit inventory ──
    if (status === 'delivered' && shipment.po_status !== 'received' && shipment.po_status !== 'cancelled') {
      const { rows: items } = await client.query(
        `SELECT poi.product_id, poi.quantity
         FROM purchase_order_items poi
         WHERE poi.purchase_order_id = $1`,
        [shipment.purchase_order_id],
      );

      for (const item of items) {
        // Upsert inventory
        const { rows: [inv] } = await client.query(
          `INSERT INTO inventory_items (warehouse_id, product_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (warehouse_id, product_id)
           DO UPDATE SET quantity    = inventory_items.quantity + EXCLUDED.quantity,
                         updated_at = NOW()
           RETURNING id, warehouse_id, product_id, quantity, reorder_point`,
          [shipment.warehouse_id, item.product_id, item.quantity],
        );

        // Stock movement — reference is the shipment, not the PO
        await client.query(
          `INSERT INTO stock_movements
             (inventory_item_id, warehouse_id, product_id, movement_type, quantity,
              reference_type, reference_id, notes, created_by)
           VALUES ($1, $2, $3, 'IN', $4, 'shipment', $5, $6, $7)`,
          [inv.id, shipment.warehouse_id, item.product_id, item.quantity, id,
           `Received via shipment ${updated.shipment_number}`, scope.userId],
        );

        // Mark PO items as received
        await client.query(
          `UPDATE purchase_order_items
           SET received_quantity = quantity
           WHERE purchase_order_id = $1 AND product_id = $2`,
          [shipment.purchase_order_id, item.product_id],
        );

        postCommitEvents.push({ type: 'INVENTORY_CHANGED', payload: {
          inventoryItemId: inv.id,
          warehouseId:     shipment.warehouse_id,
          productId:       item.product_id,
          newQuantity:     inv.quantity,
          change:          item.quantity,
        }});

        // Auto-resolve low_stock alert if stock now exceeds reorder point
        if (inv.quantity > inv.reorder_point) {
          await client.query(
            `UPDATE alerts SET is_resolved = TRUE, updated_at = NOW()
             WHERE product_id = $1 AND warehouse_id = $2
               AND type = 'low_stock' AND is_resolved = FALSE`,
            [item.product_id, shipment.warehouse_id],
          );
          postCommitEvents.push({ type: 'ALERT_RESOLVED', payload: {
            warehouseId: shipment.warehouse_id,
            productId:   item.product_id,
          }});
        }
      }

      // Advance PO to received
      await client.query(
        `UPDATE purchase_orders
         SET status = 'received', updated_at = NOW()
         WHERE id = $1`,
        [shipment.purchase_order_id],
      );

      postCommitEvents.push({ type: 'PO_STATUS_CHANGED', payload: {
        poId:        shipment.purchase_order_id,
        poNumber:    shipment.po_number,
        status:      'received',
        warehouseId: shipment.warehouse_id,
        supplierId:  shipment.supplier_id,
      }});
    }

    await client.query('COMMIT');
    for (const { type, payload } of postCommitEvents) bus.emit(type, payload);
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getByNumber(shipmentNumber, scope) {
  const { rows } = await db.query(
    `SELECT s.*, w.name AS warehouse_name,
            po.po_number, po.supplier_id, po.status AS po_status,
            sup.name AS supplier_name
     FROM shipments s
     JOIN warehouses w       ON w.id = s.warehouse_id
     JOIN purchase_orders po ON po.id = s.purchase_order_id
     JOIN suppliers sup      ON sup.id = po.supplier_id
     WHERE s.shipment_number = $1`,
    [shipmentNumber],
  );
  const shipment = rows[0];
  if (!shipment) throw new AppError(`Shipment ${shipmentNumber} not found`, 404, 'NOT_FOUND');

  if (scope.role === 'warehouse_staff' && shipment.warehouse_id !== scope.warehouseId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  if (scope.role === 'supplier' && shipment.supplier_id !== scope.supplierId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  return shipment;
}

module.exports = { list, getById, getByNumber, create, updateStatus };
